'use client';

import { JevProvider, JevStatus, useJev } from 'jev-ui';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { askJev } from 'jev-ui/action';

/**
 * The remembered answers are per screen. Without this, navigating from the dropdown demo
 * to the chart demo leaves `menu_order` sitting in the chart's answer panel, because the
 * provider lives in the root layout and survives client-side navigation.
 */
function ResetOnNavigate() {
  const pathname = usePathname();
  const { reset } = useJev();
  useEffect(() => {
    reset();
  }, [pathname, reset]);
  return null;
}

export function JevRoot({ children }: { children: ReactNode }) {
  return (
    <JevProvider
      resolve={askJev}
      state={{
        app: {
          product: 'Northwind Analytics',
          user: 'ana',
          role: 'analyst',
          familiarity: 'returning',
        },
        time_spent: 'short',
      }}
    >
      <ResetOnNavigate />
      {children}
      <JevStatus />
    </JevProvider>
  );
}
