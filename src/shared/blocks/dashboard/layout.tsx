import { ReactNode } from 'react';

import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar';
import { Sidebar as SidebarType } from '@/shared/types/blocks/dashboard';

import { Sidebar } from './sidebar';

export function DashboardLayout({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: SidebarType;
}) {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 14)',
        } as React.CSSProperties
      }
    >
      {sidebar && (
        <Sidebar variant={sidebar.variant || 'inset'} sidebar={sidebar} />
      )}
      <SidebarInset className="bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_94%,white),color-mix(in_oklab,var(--color-secondary)_18%,var(--color-background)))]">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
