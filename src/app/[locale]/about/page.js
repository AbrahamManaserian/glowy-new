'use client';

import { useTranslations } from 'next-intl';

export default function AboutPage() {
  const t = useTranslations('Pages');
  return <div>{t('about')}</div>;
}
