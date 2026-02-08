'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../../firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';

const ShopContext = createContext();

export const useShop = () => useContext(ShopContext);

export const ShopProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load initial state
  useEffect(() => {
    let unsubscribe = () => {};

    const safeGetStorage = (key, validateItem) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
          console.warn(`[ShopContext] ${key} is not an array, resetting.`);
          localStorage.removeItem(key);
          return [];
        }

        const validItems = parsed.filter(validateItem);
        if (validItems.length !== parsed.length) {
          console.warn(`[ShopContext] Found invalid items in ${key}, cleaning up.`);
          localStorage.setItem(key, JSON.stringify(validItems));
        }
        return validItems;
      } catch (e) {
        console.error(`[ShopContext] Error reading ${key} from localStorage:`, e);
        localStorage.removeItem(key);
        return [];
      }
    };

    const isValidCartItem = (item) => item && typeof item === 'object' && item.productId && item.variantId;
    const isValidWishlistItem = (item) => item && typeof item === 'object' && item.id;

    const loadState = async () => {
      if (user) {
        // Sync LocalStorage to Firebase if exists (User just logged in)
        const localCart = safeGetStorage('cart', isValidCartItem);
        const localWishlist = safeGetStorage('wishlist', isValidWishlistItem);

        if (localCart.length > 0 || localWishlist.length > 0) {
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);

          let finalCart = localCart;
          let finalWishlist = localWishlist;

          if (docSnap.exists()) {
            const data = docSnap.data();
            const remoteCart = data.cart || [];
            const remoteWishlist = data.wishlist || [];

            // Merge Cart (Combine quantities)
            finalCart = [...remoteCart];
            localCart.forEach((lItem) => {
              const existingIdx = finalCart.findIndex(
                (rItem) => rItem.productId === lItem.productId && rItem.variantId === lItem.variantId,
              );
              if (existingIdx > -1) {
                finalCart[existingIdx].quantity += lItem.quantity;
              } else {
                finalCart.push(lItem);
              }
            });

            // Merge Wishlist (Unique items)
            finalWishlist = [...remoteWishlist];
            localWishlist.forEach((lItem) => {
              if (!finalWishlist.some((rItem) => rItem.id === lItem.id)) {
                finalWishlist.push(lItem);
              }
            });
          }

          // Save merged data
          await setDoc(userRef, { cart: finalCart, wishlist: finalWishlist }, { merge: true });

          // Clear LocalStorage
          localStorage.removeItem('cart');
          localStorage.removeItem('wishlist');
        }

        // Firebase Mode Listener
        const userRef = doc(db, 'users', user.uid);
        unsubscribe = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCart(data.cart || []);
            setWishlist(data.wishlist || []);
          } else {
            // Create user doc if not exists (though AuthContext handles this usually)
            setCart([]);
            setWishlist([]);
          }
          setIsInitialized(true);
        });
      } else {
        // LocalStorage Mode
        const localCart = safeGetStorage('cart', isValidCartItem);
        const localWishlist = safeGetStorage('wishlist', isValidWishlistItem);
        setCart(localCart);
        setWishlist(localWishlist);
        setIsInitialized(true);
      }
    };

    loadState();

    return () => unsubscribe();
  }, [user]);

  // Sync back to LS for guest users when state changes
  useEffect(() => {
    if (!user && isInitialized) {
      localStorage.setItem('cart', JSON.stringify(cart));
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
  }, [cart, wishlist, user, isInitialized]);

  const addToCart = async (product, variant, quantity = 1) => {
    // Generate a unique item ID (could be variant ID or composite)
    // We store minimal ref + snapshot for display
    const variantId = variant?.id || 'default';
    const cartItemId = `${product.id}_${variantId}`;

    // Construct the item object
    const newItem = {
      productId: product.id,
      variantId: variantId,
      quantity: quantity,
      // Snapshot data for UI
      name: product.name,
      slug: product.slug || product.id, // Fallback to ID if slug missing
      price: variant?.price || product.price || 0,
      discount: variant?.discount || product.discount || 0,
      image: variant?.image || product.mainImage || '',
      attributes: variant?.attributes || {},
      addedAt: new Date().toISOString(),
    };

    let newCart = [...cart];
    const existingItemIndex = newCart.findIndex(
      (item) => item.productId === product.id && item.variantId === variantId,
    );

    if (existingItemIndex > -1) {
      // Update quantity
      newCart[existingItemIndex].quantity += quantity;
    } else {
      // Add new
      newCart.push(newItem);
    }

    // State update first (Optimistic)
    setCart(newCart);

    // Persist
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { cart: newCart }).catch(async (err) => {
        // If doc doesn't exist, set it (fallback)
        if (err.code === 'not-found') {
          await setDoc(userRef, { cart: newCart }, { merge: true });
        }
      });
    }
  };

  const removeFromCart = async (productId, variantId) => {
    const newCart = cart.filter((item) => !(item.productId === productId && item.variantId === variantId));
    setCart(newCart);
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { cart: newCart });
    }
  };

  const updateCartQuantity = async (productId, variantId, newQuantity) => {
    if (newQuantity < 1) return;

    const newCart = cart.map((item) => {
      if (item.productId === productId && item.variantId === variantId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    setCart(newCart);

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { cart: newCart });
    }
  };

  const addToWishlist = async (product) => {
    const exists = wishlist.some((item) => item.id === product.id);
    let newWishlist = [...wishlist];

    if (exists) {
      // Remove if exists (Toggle behavior is common, or just ignore?)
      // User asked to "add", but usually hearts are toggles
      newWishlist = newWishlist.filter((item) => item.id !== product.id);
    } else {
      newWishlist.push({
        id: product.id,
        name: product.name,
        image: product.mainImage,
        price: product.price,
        addedAt: new Date().toISOString(),
      });
    }

    setWishlist(newWishlist);

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { wishlist: newWishlist }).catch(async (err) => {
        if (err.code === 'not-found') {
          await setDoc(userRef, { wishlist: newWishlist }, { merge: true });
        }
      });
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some((item) => item.id === productId);
  };

  // Bulk update cart items (e.g. after price refresh)
  const updateCartItems = async (updatedItems) => {
    // updatedItems: array of objects with { productId, variantId, ...updates }
    const newCart = cart.map((item) => {
      const update = updatedItems.find(
        (u) => u.productId === item.productId && u.variantId === item.variantId,
      );
      if (update) {
        return { ...item, ...update };
      }
      return item;
    });

    // Only update if changes were made
    if (JSON.stringify(newCart) !== JSON.stringify(cart)) {
      setCart(newCart);
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { cart: newCart });
      }
    }
  };

  const clearCart = async () => {
    setCart([]);
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { cart: [] });
    }
  };

  const getCartCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <ShopContext.Provider
      value={{
        cart,
        wishlist,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        addToWishlist,
        isInWishlist,
        getCartCount,
        updateCartItems,
        clearCart,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};
