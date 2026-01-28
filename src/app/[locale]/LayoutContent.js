'use client';

import { usePathname } from 'next/navigation';
import Navbar from '../../components/Navbar';

export default function LayoutContent({ children, locale }) {
  const pathname = usePathname();
  // Check if we are in the admin section
  const isAdmin = pathname.includes('/admin');

  if (isAdmin) {
    // For admin, render Navbar but no max-width container (AdminLayout handles the shell)
    return (
      <>
        <Navbar locale={locale} />
        {children}
      </>
    );
  }

  return (
    <>
      <Navbar locale={locale} />
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>{children}</div>
    </>
  );
}
