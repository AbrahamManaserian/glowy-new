'use client';

import { usePathname } from 'next/navigation';
import Navbar from '../../components/Navbar';
import CategoriesBar from '../../components/CategoriesBar';
import { Typography } from '@mui/material';

export default function LayoutContent({ children, locale }) {
  const pathname = usePathname();
  // Check if we are in the admin section
  const isAdmin = pathname.includes('/admin');

  if (isAdmin) {
    // For admin, render Navbar but no max-width container (AdminLayout handles the shell)
    return (
      <>
        <Navbar locale={locale} />
        {/* Categories Bar not needed in admin usually, but keeping consistent if desired. Assuming hide for admin based on standard patterns */}
        {children}
      </>
    );
  }

  return (
    <>
      <Navbar locale={locale} />
      <CategoriesBar />
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>{children}</div>
    </>
  );
}
