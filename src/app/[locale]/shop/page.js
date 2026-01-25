'use client';

import { useTranslations } from 'next-intl';

export default function ShopPage() {
  const t = useTranslations('Pages');
  return <div>{t('shop')}</div>;
}
