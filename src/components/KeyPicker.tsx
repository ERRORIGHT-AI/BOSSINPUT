import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { KEYCODES } from '@/lib/constants';
import { useT } from '@/i18n/hook';
import { cn } from '@/lib/utils';

export interface KeyPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (keycode: string) => void;
  currentValue?: string;
}

const KEYCODE_CATEGORIES = {
  'Letters': KEYCODES.filter(k => k.length === 1 && k >= 'a' && k <= 'z'),
  'Numbers': KEYCODES.filter(k => k.length === 1 && k >= '0' && k <= '9'),
  'Function': KEYCODES.filter(k => k.startsWith('f')),
  'Modifiers': ['lctrl', 'lshift', 'lalt', 'lmeta', 'rctrl', 'rshift', 'ralt', 'rmeta'],
  'Special': ['space', 'enter', 'tab', 'escape', 'backspace'],
  'Media': KEYCODES.filter(k => k.startsWith('audio_') || k.startsWith('media_')),
};

export const KeyPicker: React.FC<KeyPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentValue,
}) => {
  const { t } = useT();
  const [search, setSearch] = useState('');

  const filteredKeys = useMemo(() => {
    if (!search) return null;
    const lower = search.toLowerCase();
    return KEYCODES.filter(k => k.toLowerCase().includes(lower));
  }, [search]);

  const handleSelect = (keycode: string) => {
    onSelect(keycode);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('keyboard.keyConfig.keycode')}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="ghost" onClick={() => onSelect('')}>
            {t('keyboard.keyConfig.reset')}
          </Button>
        </>
      }
    >
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('common.search')}
        className="w-full px-3 py-2 bg-bg-hover border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
      />

      {/* Filtered Results */}
      {filteredKeys && (
        <div className="mt-4 grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
          {filteredKeys.map((key) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={cn(
                'px-2 py-1.5 text-sm rounded border border-border',
                'hover:border-accent hover:bg-bg-hover',
                currentValue === key && 'border-accent bg-bg-selected text-accent'
              )}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {/* Categories */}
      {!filteredKeys && (
        <div className="mt-4 space-y-4 max-h-64 overflow-y-auto">
          {Object.entries(KEYCODE_CATEGORIES).map(([category, keys]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-text-secondary mb-2">{category}</h4>
              <div className="grid grid-cols-6 gap-2">
                {keys.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleSelect(key)}
                    className={cn(
                      'px-2 py-1.5 text-sm rounded border border-border',
                      'hover:border-accent hover:bg-bg-hover',
                      currentValue === key && 'border-accent bg-bg-selected text-accent'
                    )}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};
