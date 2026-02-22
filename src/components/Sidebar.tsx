import React from 'react';
import { useUIStore } from '@/stores';
import { useT } from '@/i18n/hook';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';
import { PAGES } from '@/lib/constants';

export const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar } = useUIStore();
  const { t } = useT();

  return (
    <div
      className={cn(
        'flex flex-col bg-bg-sidebar border-r border-border',
        sidebarCollapsed ? 'w-12' : 'w-48',
        'transition-all duration-200'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-border">
        <div className="flex items-center justify-center flex-1">
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold text-text-primary">BOSSINPUT</span>
          )}
          {sidebarCollapsed && <span className="text-lg">🎤</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {PAGES.map((page) => (
          <button
            key={page.id}
            onClick={() => setCurrentPage(page.id as any)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 mx-2 rounded-md text-sm transition-colors',
              'hover:bg-bg-hover',
              currentPage === page.id
                ? 'bg-bg-selected text-accent'
                : 'text-text-secondary'
            )}
            title={sidebarCollapsed ? t(`nav.${page.id}`) : undefined}
          >
            <span className="text-base">{page.icon}</span>
            {!sidebarCollapsed && (
              <span>{t(`nav.${page.id}`)}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer with theme toggle and collapse button */}
      <div className="flex flex-col border-t border-border">
        <div className="flex items-center justify-center h-12">
          {!sidebarCollapsed && (
            <div className="flex gap-1">
              <ThemeToggle />
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md hover:bg-bg-hover transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="w-5 h-5 text-text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
              </button>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex flex-col gap-1">
              <ThemeToggle className="p-1" />
              <button
                onClick={toggleSidebar}
                className="p-1 rounded-md hover:bg-bg-hover transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="w-4 h-4 text-text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
