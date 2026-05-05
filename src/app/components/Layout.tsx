import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="md:flex md:min-h-screen">
      <DesktopSidebar />
      <main className="flex-1 min-w-0 pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
