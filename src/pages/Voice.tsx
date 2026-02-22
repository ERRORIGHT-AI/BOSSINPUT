import React, { useEffect } from 'react';
import { useVoiceStore, useModelStore, useUIStore } from '@/stores';
import { useT } from '@/i18n/hook';
import { Button, RecordingFloat } from '@/components';
import { SUPPORTED_LANGUAGES, TRIGGER_MODES } from '@/lib/constants';
import { audioListDevices, audioSetDevice } from '@/lib/tauri';
import type { AudioDevice } from '@/lib/tauri';

export const VoicePage: React.FC = () => {
  const { t } = useT();
  const {
    triggerMode,
    voiceShortcut,
    currentModel,
    language,
    pasteMethod,
    autoPunctuation,
    showPreview,
    updateSettings,
    testMicrophone,
  } = useVoiceStore();

  const { models } = useModelStore();
  const { addToast } = useUIStore();
  const [testing, setTesting] = React.useState(false);
  const [audioDevices, setAudioDevices] = React.useState<AudioDevice[]>([]);
  const [micLevel, setMicLevel] = React.useState<number | null>(null);

  useEffect(() => {
    audioListDevices()
      .then(setAudioDevices)
      .catch((err) => console.error('Failed to list audio devices:', err));
  }, []);

  const handleSettingChange = async (setting: string, value: unknown) => {
    try {
      await updateSettings({ [setting]: value });
      addToast({ type: 'success', title: t('voice.toasts.settingsSaved') });
    } catch (error) {
      // Error handled in store
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMicLevel(null);
    try {
      const result = await testMicrophone();
      if (result.success) {
        setMicLevel(Math.round(result.level));
        addToast({ type: 'success', title: t('voice.toasts.micTestSuccess') });
      } else {
        addToast({ type: 'error', title: t('voice.toasts.micTestFailed') });
      }
    } catch (error) {
      addToast({ type: 'error', title: t('voice.toasts.micTestFailed') });
    } finally {
      setTesting(false);
    }
  };

  const handleDeviceChange = async (deviceName: string) => {
    try {
      await audioSetDevice(deviceName);
      const devices = await audioListDevices();
      setAudioDevices(devices);
      addToast({ type: 'success', title: t('voice.toasts.settingsSaved') });
    } catch (error) {
      addToast({ type: 'error', title: String(error) });
    }
  };

  const currentModelInfo = models.find((m) => m.id === currentModel);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary">{t('voice.title')}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Microphone Section */}
          <div className="p-4 bg-bg-secondary rounded-lg border border-border">
            <h2 className="text-sm font-semibold text-text-secondary mb-4">
              {t('voice.microphone')}
            </h2>

            <div className="space-y-4">
              {/* Input Device Selector */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  {t('voice.selectMicrophone')}
                </label>
                {audioDevices.length > 0 ? (
                  <select
                    value={audioDevices.find((d) => d.isSelected)?.name || ''}
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-hover border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    {audioDevices.map((device) => (
                      <option key={device.name} value={device.name}>
                        {device.name}
                        {device.isDefault ? ` ${t('voice.deviceDefault')}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-text-tertiary">{t('voice.noDevicesFound')}</p>
                )}
                <p className="text-xs text-text-tertiary mt-1">
                  {t('voice.selectMicrophoneDescription')}
                </p>
              </div>

              {/* Test Microphone */}
              <div>
                <Button
                  variant="secondary"
                  onClick={handleTest}
                  disabled={testing}
                  className="w-full"
                >
                  {testing ? t('common.loading') : t('voice.testRecording')}
                </Button>
                {micLevel !== null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                      <span>{t('voice.micLevel', { level: micLevel })}</span>
                    </div>
                    <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${micLevel}%`,
                          backgroundColor: micLevel > 5 ? '#4ec9b0' : '#f48771',
                        }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-text-tertiary mt-1 text-center">
                  {t('voice.testDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Transcription Section */}
          <div className="p-4 bg-bg-secondary rounded-lg border border-border">
            <h2 className="text-sm font-semibold text-text-secondary mb-4">
              {t('voice.transcription')}
            </h2>

            <div className="space-y-4">
              {/* Trigger Mode */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  {t('voice.triggerMode')}
                </label>
                <select
                  value={triggerMode}
                  onChange={(e) => handleSettingChange('triggerMode', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-hover border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  {TRIGGER_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-text-tertiary mt-1">
                  {t(`voice.modeDescription.${triggerMode}`)}
                </p>
              </div>

              {/* Voice Shortcut */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  {t('voice.voiceShortcut')}
                </label>
                <input
                  type="text"
                  value={voiceShortcut}
                  onChange={(e) => handleSettingChange('voiceShortcut', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-hover border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  {t('voice.voiceShortcutDescription')}
                </p>
              </div>

              {/* Current Model */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  {t('voice.currentModel')}
                </label>
                <div className="flex items-center justify-between px-3 py-2 bg-bg-hover border border-border rounded-md">
                  <span className="text-sm text-text-primary">
                    {currentModelInfo?.name || currentModel}
                  </span>
                  <span className="text-xs text-success">● Ready</span>
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  {t('voice.language')}
                </label>
                <select
                  value={language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-hover border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Output Section */}
          <div className="p-4 bg-bg-secondary rounded-lg border border-border">
            <h2 className="text-sm font-semibold text-text-secondary mb-4">
              {t('voice.output')}
            </h2>

            <div className="space-y-4">
              {/* Paste Method */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  {t('voice.pasteMethod')}
                </label>
                <select
                  value={pasteMethod}
                  onChange={(e) => handleSettingChange('pasteMethod', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-hover border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="clipboard">{t('voice.pasteMethods.clipboard')}</option>
                  <option value="direct">{t('voice.pasteMethods.direct')}</option>
                </select>
                <p className="text-xs text-text-tertiary mt-1">
                  {t(`voice.pasteMethodDescription.${pasteMethod}`)}
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPunctuation}
                    onChange={(e) => handleSettingChange('autoPunctuation', e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-bg-hover text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="text-sm text-text-primary">{t('voice.autoPunctuation')}</span>
                    <p className="text-xs text-text-tertiary">{t('voice.autoPunctuationDescription')}</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPreview}
                    onChange={(e) => handleSettingChange('showPreview', e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-bg-hover text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="text-sm text-text-primary">{t('voice.showPreview')}</span>
                    <p className="text-xs text-text-tertiary">{t('voice.showPreviewDescription')}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recording Float */}
      <RecordingFloat />
    </div>
  );
};
