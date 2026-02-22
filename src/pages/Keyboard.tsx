import React, { useEffect } from 'react';
import { useKeyboardStore, useVoiceStore } from '@/stores';
import { useUIStore } from '@/stores';
import { useT } from '@/i18n/hook';
import { Key, Button } from '@/components';

const KEYBOARD_LAYOUT = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

const ENCODER_KEY = 99; // Arbitrary number for encoder

export const KeyboardPage: React.FC = () => {
  const { t } = useT();
  const {
    config,
    currentLayer,
    selectedKey,
    isLoading,
    error,
    setCurrentLayer,
    selectKey,
    saveConfig,
    setError,
  } = useKeyboardStore();

  const { addToast } = useUIStore();
  const { refreshStatus } = useVoiceStore();

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const getKeyMapping = (keyIndex: number) => {
    return config.keyMappings.find(
      (m) => m.layer === currentLayer && m.keyIndex === keyIndex
    );
  };

  const handleKeyClick = (keyIndex: number) => {
    selectKey(keyIndex);
  };

  const handleSave = async () => {
    try {
      await saveConfig();
      addToast({ type: 'success', title: t('keyboard.toasts.saved') });
    } catch (err) {
      // Error already handled in store
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary">{t('keyboard.title')}</h1>
        <div className="flex items-center gap-2">
          <select
            value={currentLayer}
            onChange={(e) => setCurrentLayer(e.target.value)}
            className="px-3 py-1.5 bg-bg-hover border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {config.layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error rounded-md text-error text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-error hover:text-error/80"
            >
              ✕
            </button>
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          {/* Keyboard Grid */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-text-secondary mb-4">
              {t('keyboard.keyMappings')}
            </h2>
            <div className="inline-block bg-bg-secondary p-4 rounded-lg border border-border">
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 64px)' }}>
                {KEYBOARD_LAYOUT.flat().map((keyIndex) => {
                  const mapping = getKeyMapping(keyIndex);
                  return (
                    <Key
                      key={keyIndex}
                      keycode={mapping?.keycode}
                      isSelected={selectedKey === keyIndex}
                      hasCustomMapping={!!mapping}
                      onClick={() => handleKeyClick(keyIndex)}
                    />
                  );
                })}

                {/* Encoder */}
                <div className="col-span-3 flex justify-center mt-2">
                  <Key
                    keycode="encoder"
                    label="🎛️"
                    isSelected={selectedKey === ENCODER_KEY}
                    onClick={() => handleKeyClick(ENCODER_KEY)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Selected Key Info */}
          {selectedKey !== null && (
            <div className="mb-6 p-4 bg-bg-secondary rounded-lg border border-border">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">
                {t('keyboard.selected')}: {selectedKey === ENCODER_KEY ? 'Encoder' : `Key ${selectedKey}`}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">{t('keyboard.keyConfig.keycode')}:</span>
                <span className="text-sm font-mono text-text-primary">
                  {selectedKey === ENCODER_KEY
                    ? '🎛️ Encoder'
                    : getKeyMapping(selectedKey)?.keycode || '(unmapped)'}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
