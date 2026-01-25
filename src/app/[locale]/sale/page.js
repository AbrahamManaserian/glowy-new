'use client';

import { useTranslations } from 'next-intl';

export default function SalePage() {
  const t = useTranslations('Pages');
  return <div>{t('sale')}</div>;
}
