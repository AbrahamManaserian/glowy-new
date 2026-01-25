'use client';

import { useTranslations } from 'next-intl';

export default function FragrancePage() {
  const t = useTranslations('Pages');
  return <div>{t('fragrance')}</div>;
}
