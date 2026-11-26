import React from 'react';
import { Download, Menu, X } from 'lucide-react';
import { NavView } from '../types/marine';

interface TopNavProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  onExportBriefing: () => void;
}

const NAV_ITEMS: Array<{ id: NavView; label: string }> = [
  { id: 'command', label: 'Command Center' },
  { id: 'pfz', label: 'PFZ Forecasts' },
  { id: 'safety', label: 'Safety Advisories' },
  { id: 'satellites', label: 'Satellite Feeds' },
];

export const TopNav: React.FC<TopNavProps> = ({
  activeView,
  onSelectView,
  onExportBriefing,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#1A354F] bg-[#071525]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-8 px-4 sm:px-6">
        {/* Zone 1: Single-element wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('command')}
          className="font-display text-lg font-bold tracking-tight text-[#E6F1F8] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16C7D9] rounded-sm"
        >
          SAMUDRA AI
        </button>

        {/* Zone 2: 4 single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative py-4 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16C7D9] ${
                  isActive
                    ? 'text-[#16C7D9]'
                    : 'text-[#9FB6C9] hover:text-[#E6F1F8]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-[#16C7D9]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action + mobile menu toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onExportBriefing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#16C7D9] px-4 py-2 text-xs font-semibold text-[#071525] transition-colors hover:bg-[#3BD5E4] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6F1F8]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export Briefing</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#1A354F] text-[#9FB6C9] hover:text-[#E6F1F8] md:hidden"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="border-t border-[#1A354F] bg-[#0D2033] px-4 py-2 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap ${
                    isActive
                      ? 'bg-[#112840] text-[#16C7D9]'
                      : 'text-[#9FB6C9] hover:bg-[#112840]/60 hover:text-[#E6F1F8]'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
};
