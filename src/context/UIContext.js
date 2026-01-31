'use client';

import { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export function UIProvider({ children }) {
  // 'nav' | 'user' | 'filter' | null
  const [activeMobileMenu, setActiveMobileMenu] = useState(null);

  const toggleMenu = (menuId) => {
    setActiveMobileMenu((prev) => (prev === menuId ? null : menuId));
  };

  const closeMobileMenus = () => {
    setActiveMobileMenu(null);
  };

  return (
    <UIContext.Provider value={{ activeMobileMenu, toggleMenu, closeMobileMenus }}>
      {children}
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
