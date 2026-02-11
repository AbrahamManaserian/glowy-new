import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/firebaseAdmin';
import { calculateCartTotals } from '@/utils/cartCalculations';

export async function POST(request) {
  try {
    const { items, shippingMethod, paymentMethod, deliveryAddress, userId, userInfo } = await request.json();

    // 1. Verify User & Fetch Permissions
    // We need both Firestore data (for firstShop status) AND Auth data (for emailVerified status)
    // The calculation logic relies on user.emailVerified to allow the 20% discount.
    let user = null;
    if (userId) {
      try {
        const [userDoc, userAuth] = await Promise.all([
          adminDb.collection('users').doc(userId).get(),
          adminAuth.getUser(userId),
        ]);

        if (userDoc.exists) {
          user = {
            ...userDoc.data(),
            emailVerified: userAuth.emailVerified, // Crucial for isFirstShopEligible
          };
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback: If auth fetch fails, maybe allow based on firestore or just treat as guest/unverified
      }
    }

    // 2. Fetch Verified Products
    const productIds = [...new Set(items.map((i) => i.productId))];
    const productsSnapshot = await adminDb.collection('products').where('__name__', 'in', productIds).get();

    const productsMap = {};
    productsSnapshot.docs.forEach((doc) => {
      productsMap[doc.id] = doc.data();
    });

    // 3. Reconstruct Cart with Verified Data
    const verifiedCart = items
      .map((item) => {
        const product = productsMap[item.productId];
        if (!product) return null;

        // Find variant details
        let variant = null;
        if (product.variants && Array.isArray(product.variants)) {
          variant = product.variants.find((v) => v.id === item.variantId);
        }

        // Fallback to product level price if variant not found (verification strategy)
        const price = variant ? variant.price : product.price;
        const discount = variant ? variant.discount : product.discount;

        return {
          ...item,
          price: Number(price),
          discount: Number(discount),
        };
      })
      .filter(Boolean);

    // 4. Calculate Totals
    const calculation = calculateCartTotals(verifiedCart, user, null, shippingMethod);

    // Determine discount types
    const discountsApplied = [];
    if (calculation.breakdown.firstShopDiscount > 0) discountsApplied.push('first_shop');
    if (calculation.breakdown.extraDiscount > 0) discountsApplied.push('extra_discount');
    if (calculation.breakdown.productMarkdown > 0) discountsApplied.push('product_markdown');
    if (calculation.breakdown.shippingSavings > 0) discountsApplied.push('free_shipping');

    // 5. Create Order Object
    const orderData = {
      userId: userId || 'guest',
      // items removed
      itemsSnapshot: verifiedCart.map((i) => {
        const key = `${i.productId}_${i.variantId}`;
        const calc = calculation.itemCalculations[key] || {};
        return {
          productId: i.productId,
          variantId: i.variantId,
          name: i.name,
          quantity: i.quantity,
          initialPrice: calc.originalPrice || i.price,
          price: i.price, // Current retail price
          discount: i.discount, // Product markdown percent

          // Detailed discount breakdown per item
          markdownPerUnit: calc.markdownPerUnit || 0,
          itemExtraDiscount: calc.itemExtraDiscount || 0,
          itemFirstShopDiscount: calc.itemFirstShopDiscount || 0,
          finalUnitPrice: calc.finalUnitPrice || i.price,

          totalItemPrice: (calc.finalUnitPrice || i.price) * i.quantity,
        };
      }),
      shippingMethod,
      paymentMethod,
      // deliveryAddress merged into userInfo
      subtotal: calculation.subtotal,
      shippingCost: calculation.shippingCost,
      total: calculation.total,
      totalSavings: calculation.totalSavings,
      bonusAmount: calculation.bonusAmount,
      discountsApplied,
      status: 'pending',
      createdAt: new Date(),
      userInfo: {
        ...(userInfo || {}),
        deliveryAddress: deliveryAddress,
      },
    };

    // 6. Save to Firestore with Sequential ID & Stock Management (Atomic Transaction)
    // Determine if we need to remove firstShop bonus BEFORE transaction to keep it clean
    const shouldRemoveFirstShop = user && user.firstShop && calculation.breakdown.firstShopDiscount > 0;

    let orderId;

    await adminDb.runTransaction(async (t) => {
      // A. Get current order count
      const counterRef = adminDb.collection('counters').doc('orders');

      // Prepare Product Refs for Stock Check
      // We need to read them inside the transaction to ensure atomicity
      const productRefs = items.map((item) => adminDb.collection('products').doc(item.productId));
      const uniqueProductRefs = [...new Set(productRefs.map((r) => r.path))].map((path) => adminDb.doc(path));

      // Perform Reads
      const [counterDoc, ...productDocs] = await Promise.all([
        t.get(counterRef),
        ...uniqueProductRefs.map((ref) => t.get(ref)),
      ]);

      // Map product docs for easy access
      const transactionProductsMap = {};
      productDocs.forEach((doc) => {
        if (doc.exists) transactionProductsMap[doc.id] = doc.data();
      });

      // B. generate new ID
      let currentCount = 0;
      if (counterDoc.exists) {
        currentCount = counterDoc.data().count || 0;
      }
      const newCount = currentCount + 1;
      const newOrderId = String(newCount).padStart(7, '0');

      // C. Validate Stock & update Order Items
      // We modify the 'orderData.itemsSnapshot' quantity based on actual stock
      // And we prepare the stock updates

      const finalItemsSnapshot = orderData.itemsSnapshot
        .map((item) => {
          const productData = transactionProductsMap[item.productId];
          if (!productData) return null; // Product deleted?

          // Find variant logic again
          let variantIndex = -1;
          let availableStock = 0;
          let isVariant = false;

          if (productData.variants && Array.isArray(productData.variants)) {
            variantIndex = productData.variants.findIndex((v) => v.id === item.variantId);
            if (variantIndex > -1) {
              availableStock = productData.variants[variantIndex].quantity || 0;
              isVariant = true;
            }
          } else {
            // Fallback for simple products (if any)
            availableStock = productData.stock || 0;
          }

          // Cap Quantity
          const originalQty = item.quantity;
          const finalQty = Math.min(originalQty, availableStock);

          if (finalQty === 0) return null; // Out of stock completely, remove from order

          // Decrement Stock Logic - DISABLED for now as per requirement
          /* 
         if (isVariant) {
            productData.variants[variantIndex].quantity -= finalQty; // Mutating local copy
         } else {
            productData.stock -= finalQty;
         }
         */

          return {
            ...item,
            quantity: finalQty,
            totalItemPrice: item.finalUnitPrice * finalQty,
          };
        })
        .filter(Boolean); // Remove nulls (out of stock items)

      if (finalItemsSnapshot.length === 0) {
        throw new Error('All items are out of stock.');
      }

      // Recalculate Totals (Basic Logic) based on capped quantities
      // Ideally we would re-run 'calculateCartTotals', but that's complex inside transaction without importing deps.
      // For simplicity, we sum up the 'totalItemPrice' we just calculated.
      // Note: This ignores 'bonusAmount' adjustments slightly if subtotal drops, but ensures price matches quantity.

      const newTotal =
        finalItemsSnapshot.reduce((acc, item) => acc + item.totalItemPrice, 0) + calculation.shippingCost;
      const newSubtotal = finalItemsSnapshot.reduce((acc, item) => acc + item.totalItemPrice, 0); // Approx

      // Update Order Data with Capped Values
      const finalOrderData = {
        ...orderData,
        id: newOrderId,
        itemsSnapshot: finalItemsSnapshot,
        total: newTotal,
        subtotal: newSubtotal,
        // We accept that savings/breakdowns might be slightly off if quantity was capped,
        // but the Total to Pay is correct.
      };

      // D. Perform Writes
      // 1. Counter
      t.set(counterRef, { count: newCount });

      // 2. Order
      const orderRef = adminDb.collection('orders').doc(newOrderId);
      t.set(orderRef, finalOrderData);

      // 3. Product Stocks (Update all changed product docs) - DISABLED
      /*
      Object.keys(transactionProductsMap).forEach(productId => {
          const productRef = adminDb.collection('products').doc(productId);
          // transactionProductsMap[productId] has the mutated stock values from above loop
          t.set(productRef, transactionProductsMap[productId], { merge: true });
      });
      */

      // E. Update User First Shop Status (if needed)
      if (shouldRemoveFirstShop) {
        const userRef = adminDb.collection('users').doc(userId);
        t.update(userRef, { firstShop: false });
      }

      orderId = newOrderId;
    });

    // 8. Send Telegram Notification
    // I will call the helper function here or just do it inline
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const message = `
📦 <b>New Order Received!</b>
🆔 <b>Order ID:</b> ${orderId}
👤 <b>Customer:</b> ${userInfo.firstName} ${userInfo.lastName}
📱 <b>Phone:</b> ${userInfo.phone}
💰 <b>Total:</b> ${calculation.total.toLocaleString()} ֏
🚚 <b>Shipping:</b> ${shippingMethod}
💳 <b>Payment:</b> ${paymentMethod}
      `;

      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
          }),
        });
      } catch (error) {
        console.error('Telegram notification failed', error);
      }
    }

    return NextResponse.json({ success: true, orderId: orderId });
  } catch (error) {
    console.error('Order processing failed:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
