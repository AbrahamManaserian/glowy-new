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

    // 2. Combine Data Fetching, Verification, Calculation & Order Creation in Transaction
    // We do this to ensure we read data once and maintain consistency (stock checks).

    let orderId;
    let finalCalculation;

    await adminDb.runTransaction(async (t) => {
      // A. Reads: Counter & Products
      const counterRef = adminDb.collection('counters').doc('orders');

      const productRefs = items.map((item) => adminDb.collection('products').doc(item.productId));
      const uniqueProductRefs = [...new Set(productRefs.map((r) => r.path))].map((path) => adminDb.doc(path));

      const [counterDoc, ...productDocs] = await Promise.all([
        t.get(counterRef),
        ...uniqueProductRefs.map((ref) => t.get(ref)),
      ]);

      const productsMap = {};
      productDocs.forEach((doc) => {
        if (doc.exists) productsMap[doc.id] = doc.data();
      });

      // B. Build Verified Cart & Check Stock
      const verifiedCart = items
        .map((item) => {
          const product = productsMap[item.productId];
          if (!product) return null;

          // Find variant details
          let variant = null;
          let availableStock = product.stock || 0;
          let image = product.images?.[0] || product.image; // Fallback image

          if (product.variants && Array.isArray(product.variants) && item.variantId) {
            variant = product.variants.find((v) => v.id === item.variantId);
            if (variant) {
              availableStock = variant.quantity || 0;
              if (variant.image) image = variant.image;
            }
          }

          // Cap Quantity
          const finalQty = Math.min(item.quantity, availableStock);
          if (finalQty <= 0) return null;

          const price = variant ? variant.price : product.price;
          const discount = variant ? variant.discount : product.discount;

          return {
            ...item,
            quantity: finalQty,
            price: Number(price),
            discount: Number(discount),
            image: image,
            slug: product.slug || product.id,
          };
        })
        .filter(Boolean);

      if (verifiedCart.length === 0) {
        throw new Error('All items are out of stock.');
      }

      // C. Calculate Totals (with capped quantities)
      const calculation = calculateCartTotals(verifiedCart, user, null, shippingMethod);
      finalCalculation = calculation; // Export for usage outside transaction

      // D. Generate New ID
      let currentCount = 0;
      if (counterDoc.exists) {
        currentCount = counterDoc.data().count || 0;
      }
      const newCount = currentCount + 1;
      const newOrderId = String(newCount).padStart(7, '0');

      // E. Prepare Order Data
      const discountsApplied = [];
      if (calculation.breakdown.firstShopDiscount > 0)
        discountsApplied.push({ first_shop: calculation.breakdown.firstShopDiscount });
      if (calculation.breakdown.extraDiscount > 0)
        discountsApplied.push({ extra_discount: calculation.breakdown.extraDiscount });
      if (calculation.breakdown.productMarkdown > 0)
        discountsApplied.push({ product_markdown: calculation.breakdown.productMarkdown });
      if (calculation.breakdown.shippingSavings > 0)
        discountsApplied.push({ free_shipping: calculation.breakdown.shippingSavings });

      const finalOrderData = {
        userId: userId || 'guest',
        id: newOrderId,
        itemsSnapshot: verifiedCart.map((i) => {
          const key = `${i.productId}_${i.variantId}`;
          const calc = calculation.itemCalculations[key] || {};
          return {
            productId: i.productId,
            variantId: i.variantId,
            name: i.name,
            quantity: i.quantity,
            slug: i.slug,
            image: i.image,

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

      // F. Commit Writes
      t.set(counterRef, { count: newCount });
      t.set(adminDb.collection('orders').doc(newOrderId), finalOrderData);

      // Update User First Shop Status (if needed)
      if (user && user.firstShop && calculation.breakdown.firstShopDiscount > 0) {
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
💰 <b>Total:</b> ${finalCalculation.total.toLocaleString()} ֏
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
