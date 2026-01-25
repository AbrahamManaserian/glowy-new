import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['am', 'ru', 'en'],

  // Used when no locale matches
  defaultLocale: 'am',

  // The prefix strategy
  localePrefix: 'as-needed',

  // Disable automatic locale detection to force defaultLocale
  localeDetection: false,
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
