import CheckoutClient from '../../../components/Checkout/CheckoutClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: 'Checkout' });
  return {
    title: `${t('title')} | Glowy`,
  };
}

export default function CheckoutPage() {
  return <CheckoutClient />;
}
