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
        'flex flex-col bg-bg-sidebar/80 backdrop-blur-xl border-r border-border',
        sidebarCollapsed ? 'w-16' : 'w-56',
        'transition-all duration-300 ease-in-out'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/50">
        <div className="flex items-center justify-center flex-1">
          {!sidebarCollapsed && (
            <span className="text-sm font-bold tracking-wider text-text-primary">BOSSINPUT</span>
          )}
          {sidebarCollapsed && <span className="text-xl inline-block hover:scale-110 transition-transform">🎧</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-1">
        {PAGES.map((page) => {
          const isActive = currentPage === page.id;
          return (
            <button
              key={page.id}
              onClick={() => setCurrentPage(page.id as any)}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 mx-3 rounded-lg text-sm transition-all duration-200',
                'hover:bg-bg-hover',
                isActive
                  ? 'bg-bg-selected text-accent shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
              title={sidebarCollapsed ? t(`nav.${page.id}`) : undefined}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent rounded-r-full shadow-[0_0_8px_var(--theme-accent)]" />
              )}
              
              <span className={cn('text-lg transition-transform duration-200', isActive ? 'scale-110' : 'group-hover:scale-110')}>
                {page.icon}
              </span>
              
              {!sidebarCollapsed && (
                <span className="font-medium whitespace-nowrap overflow-hidden">
                  {t(`nav.${page.id}`)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer with theme toggle and collapse button */}
      <div className="flex flex-col border-t border-border/50 p-2">
        <div className="flex items-center justify-center h-12">
          {!sidebarCollapsed && (
            <div className="flex gap-2 w-full px-2 justify-between">
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
