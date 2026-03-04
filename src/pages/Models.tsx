import React, { useEffect } from 'react';
import { useModelStore } from '@/stores';
import { useT } from '@/i18n/hook';
import { Button, Modal } from '@/components';
import { cn } from '@/lib/utils';

export const ModelsPage: React.FC = () => {
  const { t } = useT();
  const {
    models,
    activeModelId,
    downloadQueue,
    error,
    init,
    setActiveModel,
    downloadModel,
    cancelDownload,
    deleteModel,
    setError,
  } = useModelStore();

  const [customModelModal, setCustomModelModal] = React.useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  const handleSetActive = async (modelId: string) => {
    try {
      await setActiveModel(modelId);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleDownload = (modelId: string) => {
    downloadModel(modelId);
  };

  const handleCancelDownload = (modelId: string) => {
    cancelDownload(modelId);
  };

  const handleDelete = async (modelId: string) => {
    try {
      await deleteModel(modelId);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleAddCustom = () => {
    setCustomModelModal(true);
  };

  const getStatusText = (status: string) => {
    return t(`models.status.${status}`);
  };

  const activeModel = models.find((m) => m.id === activeModelId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary">{t('models.title')}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error rounded-md text-error text-sm">
            {error}
            <button onClick={() => setError(null)} className="float-right">
              ✕
            </button>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Active Model */}
          <div className="relative p-5 rounded-2xl bg-bg-secondary border border-border/50 shadow-sm overflow-hidden">
            {/* Background glow effect */}
            <div className="absolute top-0 right-0 -m-8 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
            
            <h2 className="text-sm font-medium text-text-tertiary mb-4 uppercase tracking-wider">
              {t('models.activeModel')}
            </h2>

            {activeModel ? (
              <div className="p-5 bg-bg-primary/50 border border-accent/30 rounded-xl shadow-[0_0_15px_var(--theme-accent)_inset] backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-text-primary">
                    {activeModel.name} ●
                  </h3>
                  <span className="text-xs text-success">{getStatusText('active')}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span>{formatSize(activeModel.size)}</span>
                  <span>•</span>
                  <span>{activeModel.features.join(' • ')}</span>
                  <span>•</span>
                  <span>{t('models.speed', { speed: activeModel.speed })}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-text-tertiary">{t('common.loading')}</div>
            )}
          </div>

          {/* Available Models */}
          <div className="p-5 bg-bg-secondary rounded-2xl border border-border/50 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
                {t('models.availableModels')}
              </h2>
              <Button variant="secondary" onClick={handleAddCustom}>
                + {t('models.addCustomModel')}
              </Button>
            </div>

            <div className="space-y-3">
              {models.map((model) => {
                if (model.id === activeModelId) return null;

                const isDownloading = downloadQueue.has(model.id);

                return (
                  <div
                    key={model.id}
                    className={cn(
                      'p-5 rounded-xl border transition-all duration-300',
                      'hover:-translate-y-1 hover:shadow-lg',
                      model.status === 'error'
                        ? 'border-error/50 bg-error/5 hover:shadow-error/10'
                        : 'border-border/50 bg-bg-primary hover:border-border-focus hover:shadow-accent/5'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-text-primary mb-1">
                          {model.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-text-secondary">
                          <span>{formatSize(model.size)}</span>
                          <span>•</span>
                          <span>{model.features.join(' • ')}</span>
                        </div>
                      </div>
                      <span className="text-xs text-text-tertiary">
                        {getStatusText(model.status)}
                      </span>
                    </div>

                    {/* Download Progress */}
                    {isDownloading && (
                      <div className="mb-4 mt-2">
                        <div className="h-2 bg-bg-secondary rounded-full overflow-hidden border border-border/50">
                          <div
                            className="h-full bg-accent relative transition-all duration-300 ease-out"
                            style={{ width: `${model.downloadProgress}%` }}
                          >
                            {/* Shimmer effect inside progress bar */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[progress_1.5s_ease-in-out_infinite]" />
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-accent font-medium">{t('common.downloading')}</span>
                          <span className="text-xs text-text-tertiary font-mono">{model.downloadProgress}%</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {model.status === 'not-downloaded' && !isDownloading && (
                        <Button
                          size="sm"
                          onClick={() => handleDownload(model.id)}
                        >
                          {t('models.download', { size: formatSize(model.size) })}
                        </Button>
                      )}

                      {isDownloading && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCancelDownload(model.id)}
                        >
                          {t('models.cancelDownload')}
                        </Button>
                      )}

                      {model.status === 'downloaded' && (
                        <>
                          <Button size="sm" onClick={() => handleSetActive(model.id)}>
                            {t('models.load')}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDelete(model.id)}
                          >
                            {t('models.delete')}
                          </Button>
                        </>
                      )}

                      {model.status === 'error' && (
                        <Button
                          size="sm"
                          onClick={() => handleDownload(model.id)}
                        >
                          {t('models.retryDownload')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Model Modal */}
      <Modal
        isOpen={customModelModal}
        onClose={() => setCustomModelModal(false)}
        title={t('models.addCustomModel')}
      >
        <div className="text-center py-8">
          <p className="text-text-primary mb-4">{t('models.customModelComingSoon')}</p>
          <p className="text-text-secondary text-sm">
            Custom model support requires tensor alignment validation.
            This feature will be available in a future update.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setCustomModelModal(false)}>
            {t('common.close')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
