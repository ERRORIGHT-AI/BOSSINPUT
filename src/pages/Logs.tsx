import React from 'react';
import { useT } from '@/i18n/hook';

export const LogsPage: React.FC = () => {
  const { t } = useT();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary">{t('nav.logs')}</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-secondary">Logs coming soon...</p>
      </div>
    </div>
  );
};
