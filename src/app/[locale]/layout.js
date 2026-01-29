import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import theme from '../../theme';
import { AuthContextProvider } from '../../context/AuthContext';
import { CategoriesProvider } from '../../context/CategoriesContext';
import '../globals.css';
import LayoutContent from './LayoutContent';

export const metadata = {
  title: 'Glowy',
  description: 'Your beauty store',
  icons: {
    icon: '/favcon.ico',
  },
};

export default async function CreateLayout({ children, params }) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <AppRouterCacheProvider>
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider theme={theme}>
              <AuthContextProvider>
                <CategoriesProvider>
                  <LayoutContent locale={locale}>{children}</LayoutContent>
                </CategoriesProvider>
              </AuthContextProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
