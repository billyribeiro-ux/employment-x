import { DashboardNav } from '@/components/dashboard-nav';
import { CommandPaletteWrapper } from '@/components/command-palette-wrapper';
import { ShortcutHelpOverlay } from '@/components/shortcut-help-overlay';
import { DemoBannerGuard } from '@/components/demo-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoBannerGuard>
      <div className="flex min-h-screen">
        <DashboardNav />
        <main className="flex-1 overflow-y-auto">
          <div className="container py-6">{children}</div>
        </main>
        <CommandPaletteWrapper />
        <ShortcutHelpOverlay />
      </div>
    </DemoBannerGuard>
  );
}
