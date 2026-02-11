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

    // 6. Save to Firestore with Sequential ID (Atomic Transaction)
    // Determine if we need to remove firstShop bonus BEFORE transaction to keep it clean
    const shouldRemoveFirstShop = user && user.firstShop && calculation.breakdown.firstShopDiscount > 0;

    let orderId;

    await adminDb.runTransaction(async (t) => {
      // A. Get current order count
      const counterRef = adminDb.collection('counters').doc('orders');
      const counterDoc = await t.get(counterRef);

      let currentCount = 0;
      if (counterDoc.exists) {
        currentCount = counterDoc.data().count || 0;
      }

      // B. Generate new ID
      const newCount = currentCount + 1;
      const newOrderId = String(newCount).padStart(7, '0');

      // C. Update Counter
      t.set(counterRef, { count: newCount });

      // D. Save Order with custom ID
      const orderRef = adminDb.collection('orders').doc(newOrderId);
      t.set(orderRef, { ...orderData, id: newOrderId }); // Saving ID in doc for convenience

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
