'use client';

import { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export function UIProvider({ children }) {
  // 'nav' | 'user' | 'filter' | 'cart' | null
  const [activeDrawer, setActiveDrawer] = useState(null);

  // Backward compatibility / Helper derived state
  const activeMobileMenu =
    activeDrawer === 'nav' || activeDrawer === 'user' || activeDrawer === 'filter' ? activeDrawer : null;
  const isCartOpen = activeDrawer === 'cart';

  const toggleMenu = (menuId) => {
    setActiveDrawer((prev) => (prev === menuId ? null : menuId));
  };

  const closeMobileMenus = () => {
    setActiveDrawer(null);
  };

  const toggleCart = () => {
    setActiveDrawer((prev) => (prev === 'cart' ? null : 'cart'));
  };

  return (
    <UIContext.Provider value={{ activeMobileMenu, toggleMenu, closeMobileMenus, isCartOpen, toggleCart }}>
      {children}
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
