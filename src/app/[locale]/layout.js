import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme';
import Navbar from '../../components/Navbar';
import { AuthContextProvider } from '../../context/AuthContext';
import '../globals.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

export const metadata = {
  title: 'Glowy Perfume & Cosmetics',
  description: 'Online store for perfume and cosmetics',
};

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <NextIntlClientProvider messages={messages}>
              <AuthContextProvider>
                <Navbar locale={locale} />
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>{children}</div>
              </AuthContextProvider>
            </NextIntlClientProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
