import { useTranslations } from 'next-intl';

export default function GiftCardsPage() {
  const t = useTranslations('Pages');
  return <div>{t('gift cards')}</div>;
}
