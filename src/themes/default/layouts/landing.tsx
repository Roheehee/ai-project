import { ReactNode } from 'react';

import { getThemeBlock } from '@/core/theme';
import {
  Footer as FooterType,
  Header as HeaderType,
} from '@/shared/types/blocks/landing';

export default async function LandingLayout({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: HeaderType;
  footer: FooterType;
}) {
  const Header = await getThemeBlock('header');
  const Footer = await getThemeBlock('footer');

  return (
    <div className="min-h-screen w-full">
      <Header header={header} />
      <main className="relative overflow-x-hidden pt-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),transparent_38%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.14),transparent_28%)]"
        />
        {children}
      </main>
      <Footer footer={footer} />
    </div>
  );
}
