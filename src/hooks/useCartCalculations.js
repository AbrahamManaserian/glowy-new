import { useMemo } from 'react';
import { calculateCartTotals } from '../utils/cartCalculations';

export const useCartCalculations = (cart, user, selectedItemsKeys = null, shippingMethod = 'standard') => {
  return useMemo(() => {
    return calculateCartTotals(cart, user, selectedItemsKeys, shippingMethod);
  }, [cart, user, selectedItemsKeys, shippingMethod]);
};
