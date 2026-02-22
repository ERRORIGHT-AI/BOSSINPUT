import React from 'react';
import { useUIStore } from '@/stores';
import { useT } from '@/i18n/hook';
import { cn } from '@/lib/utils';

export const StatusBar: React.FC = () => {
  const { t } = useT();
  const { statusBarInfo } = useUIStore();

  return (
    <div className="flex items-center justify-between px-4 py-1 bg-bg-primary border-t border-border text-xs">
      <div className="flex items-center gap-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className={cn(
            statusBarInfo.status === 'recording' ? 'animate-pulse' : '',
            'w-2 h-2 rounded-full',
            statusBarInfo.status === 'ready' ? 'bg-success' :
            statusBarInfo.status === 'recording' ? 'bg-error' :
            statusBarInfo.status === 'processing' ? 'bg-warning' :
            'bg-error'
          )} />
          <span className="text-text-secondary">
            {t(`statusBar.status.${statusBarInfo.status}`)}
          </span>
        </div>

        {/* Voice Shortcut */}
        <div className="text-text-secondary">
          <span className="text-text-tertiary">{t('statusBar.shortcut')}</span>
        </div>

        {/* Model */}
        {statusBarInfo.currentModel && (
          <div className="text-text-secondary">
            <span className="text-text-tertiary">Model: </span>
            {statusBarInfo.currentModel}
          </div>
        )}
      </div>

      {/* Keyboard Status */}
      <div className="flex items-center gap-2">
        <span className="text-text-secondary">{t('statusBar.keyboard')}:</span>
        <span className={cn(
          'w-2 h-2 rounded-full',
          statusBarInfo.keyboardConnected ? 'bg-success' : 'bg-text-tertiary'
        )} />
      </div>
    </div>
  );
};
