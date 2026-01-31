'use client';

import { useTransition, useEffect } from 'react';
import { useRouter as useBaseRouter, Link as BaseLink } from '../i18n/routing';
import { useLoading } from '../context/LoadingContext';

export function useTransitionRouter() {
  const router = useBaseRouter();
  const { setLoading } = useLoading();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLoading(isPending);
  }, [isPending, setLoading]);

  return {
    ...router,
    push: (href, options) => {
      startTransition(() => {
        router.push(href, options);
      });
    },
    replace: (href, options) => {
      startTransition(() => {
        router.replace(href, options);
      });
    },
    refresh: () => {
      startTransition(() => {
        router.refresh();
      });
    },
  };
}

export function TransitionLink({ children, href, onClick, ...props }) {
  const router = useTransitionRouter();

  const handleClick = (e) => {
    if (onClick) onClick(e);

    // Allow default behavior for modifier keys (new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;

    e.preventDefault();
    router.push(href);
  };

  return (
    <BaseLink href={href} onClick={handleClick} {...props}>
      {children}
    </BaseLink>
  );
}
