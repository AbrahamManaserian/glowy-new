'use client';

import { usePathname } from 'next/navigation';
import Navbar from '../../components/Navbar';
import CategoriesBar from '../../components/CategoriesBar';
import { Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../context/CategoriesContext';
import LoadingScreen from '../../components/LoadingScreen';
import { LoadingProvider, useLoading } from '../../context/LoadingContext';

function InnerLayout({ children, locale }) {
  const pathname = usePathname();
  const { loading: authLoading } = useAuth();
  const { loading: categoriesLoading } = useCategories();
  const { isLoading: navigationLoading } = useLoading();

  // Show loading screen while contexts are initializing
  // OR during global navigation
  if (authLoading || categoriesLoading) {
    // Initial opaque load
    return <LoadingScreen />;
  }

  // Navigation overlay load
  // We render this ON TOP of the content
  const navLoader = navigationLoading ? <LoadingScreen transparent /> : null;

  // Check if we are in the admin section
  const isAdmin = pathname.includes('/admin');

  if (isAdmin) {
    return (
      <>
        {navLoader}
        <Navbar locale={locale} />
        {children}
      </>
    );
  }

  return (
    <>
      {navLoader}
      <Navbar locale={locale} />
      <CategoriesBar />
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>{children}</div>
    </>
  );
}

export default function LayoutContent({ children, locale }) {
  return (
    <LoadingProvider>
      <InnerLayout locale={locale}>{children}</InnerLayout>
    </LoadingProvider>
  );
}
