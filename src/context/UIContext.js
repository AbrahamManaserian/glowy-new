'use client';

import { createContext, useContext, useState } from 'react';

export const UIContext = createContext();

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

  // Profile Avatar State Sharing (shared between Sidebar and ProfilePage)
  const [pendingAvatar, setPendingAvatar] = useState({ file: null, preview: null });

  return (
    <UIContext.Provider
      value={{
        activeMobileMenu,
        toggleMenu,
        closeMobileMenus,
        isCartOpen,
        toggleCart,
        pendingAvatar,
        setPendingAvatar,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
