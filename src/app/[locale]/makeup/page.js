'use client';

import { useTranslations } from 'next-intl';

export default function MakeupPage() {
  const t = useTranslations('Pages');
  return <div>{t('makeup')}</div>;
}
