export const calculateCartTotals = (cart, user, selectedItemsKeys = null, shippingMethod = 'standard') => {
  // Constants
  const FIRST_SHOP_DISCOUNT_PERCENT = 20;
  const EXTRA_DISCOUNT_THRESHOLD = 20000;
  const TARGET_DISCOUNT_PERCENT = 10;
  const FREE_SHIPPING_THRESHOLD = 5000;
  const STANDARD_SHIPPING_COST = 1000;
  const EXPRESS_SHIPPING_COST = 3000;
  const BONUS_PERCENT = 0.03;

  const isFirstShop = user?.firstShop === true;
  // If user is undefined/null, treat as guest. If user exists but emailVerified is missing/false, it's false.
  const isVerified = user?.emailVerified;

  // Eligibility
  const isFirstShopEligible = isFirstShop && isVerified;

  // Helper: Check if item is selected
  const isSelected = (item) => {
    if (!selectedItemsKeys) return true; // If no specific selection, assume all
    const key = `${item.productId}_${item.variantId}`;
    return selectedItemsKeys.includes(key);
  };

  // 1. Calculate Pure Subtotal (Original Prices) of SELECTED items
  const subtotal = cart.reduce((acc, item) => {
    if (!isSelected(item)) return acc;
    return acc + (item.price || 0) * item.quantity;
  }, 0);

  // Logic Setup
  const isThresholdMet = !isFirstShopEligible && subtotal >= EXTRA_DISCOUNT_THRESHOLD;
  const remainingForExtraDiscount = !isFirstShopEligible
    ? Math.max(0, EXTRA_DISCOUNT_THRESHOLD - subtotal)
    : 0;

  // 2. Calculate Savings
  let totalProductMarkdown = 0;
  let totalExtraDiscount = 0;
  let firstShopDiscountAmount = 0;

  // We also want to calculate per-item values for display purposes
  const itemCalculations = cart.reduce((acc, item) => {
    const key = `${item.productId}_${item.variantId}`;
    // Initialize default values
    const calcParams = {
      key,
      originalPrice: item.price || 0,
      quantity: item.quantity,
      existingDiscountPercent: item.discount || 0,
      markdownPerUnit: 0,
      markdownAmount: 0,
      itemFirstShopDiscount: 0,
      itemExtraDiscount: 0,
      finalUnitPrice: item.price || 0,
      extraPercentApplied: 0,
      isSelected: isSelected(item),
    };

    const originalPrice = item.price || 0;
    const existingDiscountPercent = item.discount || 0;

    // A. Regular Markdown
    const markdownPerUnit = Math.round(originalPrice * (existingDiscountPercent / 100));
    calcParams.markdownPerUnit = markdownPerUnit;
    calcParams.markdownAmount = markdownPerUnit * item.quantity;

    if (calcParams.isSelected) {
      totalProductMarkdown += calcParams.markdownAmount;
    }

    // B. Extra/First Shop
    if (isFirstShopEligible) {
      const targetFirstShopAmount = Math.round(originalPrice * (FIRST_SHOP_DISCOUNT_PERCENT / 100));
      const gap = Math.max(0, targetFirstShopAmount - markdownPerUnit);

      calcParams.itemFirstShopDiscount = gap * item.quantity;

      if (calcParams.isSelected) {
        firstShopDiscountAmount += calcParams.itemFirstShopDiscount;
      }
    } else if (isThresholdMet) {
      const discountGap = Math.max(0, TARGET_DISCOUNT_PERCENT - existingDiscountPercent);
      if (discountGap > 0) {
        calcParams.extraPercentApplied = discountGap;
        const extraDiscountPerUnit = Math.round(originalPrice * (discountGap / 100));
        calcParams.itemExtraDiscount = extraDiscountPerUnit * item.quantity;

        if (calcParams.isSelected) {
          totalExtraDiscount += calcParams.itemExtraDiscount;
        }
      }
    }

    const totalReductions =
      calcParams.markdownAmount + calcParams.itemExtraDiscount + calcParams.itemFirstShopDiscount;
    // Calculate unit price based on selected status? No, price is price.
    // However, if we want to show the specific unit price *achieved* through these discounts:
    calcParams.finalUnitPrice =
      item.quantity > 0 ? (originalPrice * item.quantity - totalReductions) / item.quantity : 0;

    acc[key] = calcParams;
    return acc;
  }, {});

  // 3. Shipping Logic
  const payableBeforeShipping =
    subtotal - totalProductMarkdown - totalExtraDiscount - firstShopDiscountAmount;

  // Shipping applies if subtotal > 0
  let shippingCost = 0;
  let shippingSavings = 0;

  if (subtotal > 0) {
    if (shippingMethod === 'express') {
      shippingCost = EXPRESS_SHIPPING_COST;
    } else {
      // Standard
      if (payableBeforeShipping <= FREE_SHIPPING_THRESHOLD) {
        shippingCost = STANDARD_SHIPPING_COST;
      } else {
        shippingCost = 0;
        shippingSavings = STANDARD_SHIPPING_COST;
      }
    }
  }

  const total = payableBeforeShipping + shippingCost;
  const totalSavings = totalProductMarkdown + totalExtraDiscount + firstShopDiscountAmount + shippingSavings;

  // Bonus Points
  const bonusAmount = (payableBeforeShipping * BONUS_PERCENT).toFixed(0);

  return {
    subtotal,
    breakdown: {
      productMarkdown: totalProductMarkdown,
      extraDiscount: totalExtraDiscount,
      firstShopDiscount: firstShopDiscountAmount,
      shippingSavings,
    },
    shippingCost,
    total,
    totalSavings,
    payableBeforeShipping,
    bonusAmount,
    meta: {
      isFirstShopEligible,
      remainingForExtraDiscount,
      isGuest: !user,
      isVerified,
      thresholds: {
        targetDiscountPercent: TARGET_DISCOUNT_PERCENT,
        extraDiscount: EXTRA_DISCOUNT_THRESHOLD,
        freeShipping: FREE_SHIPPING_THRESHOLD,
      },
    },
    itemCalculations,
  };
};
