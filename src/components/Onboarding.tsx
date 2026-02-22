/**
 * Onboarding Component
 * First-time user experience for setting up BOSSINPUT
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { useAppStore, useKeyboardStore, useModelStore, useVoiceStore } from '@/stores';
import { cn } from '@/lib/utils';

type OnboardingStep = 'welcome' | 'keyboard' | 'model' | 'permissions' | 'test' | 'complete';

interface OnboardingProps {
  onComplete: () => void;
}

const stepOrder: OnboardingStep[] = ['welcome', 'keyboard', 'model', 'permissions', 'test', 'complete'];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const { completeOnboarding } = useAppStore();
  const { state: keyboardState, refreshState } = useKeyboardStore();
  const { downloadModel, models, setActiveModel } = useModelStore();
  const { startRecording, stopRecording, isRecording } = useVoiceStore();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [accessibilityPermissionGranted, setAccessibilityPermissionGranted] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const currentIndex = stepOrder.indexOf(currentStep);
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === stepOrder.length - 1;

  // Detect keyboard on step 1
  useEffect(() => {
    if (currentStep === 'keyboard' && !keyboardState.isConnected) {
      setIsDetecting(true);
      const timer = setTimeout(async () => {
        await refreshState();
        setIsDetecting(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, keyboardState.isConnected, refreshState]);

  // Check permissions on step 3
  useEffect(() => {
    if (currentStep === 'permissions') {
      // Check if permissions are granted
      // In a real app, this would call Tauri commands to check permissions
      setMicPermissionGranted(false);
      setAccessibilityPermissionGranted(false);
    }
  }, [currentStep]);

  const handleNext = async () => {
    if (isLastStep) {
      await completeOnboarding();
      onComplete();
    } else {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
    onComplete();
  };

  const handleStartDownload = async () => {
    const parakeetModel = models.find((m) => m.id === 'parakeet-v3-cpu');
    if (parakeetModel && parakeetModel.status !== 'downloaded') {
      setIsDownloading(true);
      await downloadModel('parakeet-v3-cpu');

      // Simulate progress updates (in real app, would come from store)
      const interval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + 5;
        });
      }, 500);

      // In real implementation, store updates would handle this
      // For demo, we'll simulate completion
      setTimeout(() => {
        clearInterval(interval);
        setDownloadProgress(100);
        setIsDownloading(false);
        setActiveModel('parakeet-v3-cpu');
      }, 10000);
    }
  };

  const handleRequestPermission = (type: 'microphone' | 'accessibility') => {
    // In real app, this would open system preferences
    if (type === 'microphone') {
      setMicPermissionGranted(true);
    } else {
      setAccessibilityPermissionGranted(true);
    }
  };

  const handleTestRecording = async () => {
    setTestResult(null);
    try {
      await startRecording();
      // Simulate recording
      setTimeout(async () => {
        const result = await stopRecording();
        if (result.text) {
          setTestResult(result.text);
        }
      }, 2000);
    } catch (error) {
      setTestResult('error');
    }
  };

  // Render step content
  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-6">👋</div>
            <h2 className="text-2xl font-semibold mb-2">{t('onboarding.welcome.title')}</h2>
            <p className="text-text-secondary mb-8">{t('onboarding.welcome.subtitle')}</p>
            <div className="text-sm text-text-secondary">
              <p className="mb-2">✅ Keyboard configuration</p>
              <p className="mb-2">✅ Voice transcription</p>
              <p>✅ Model management</p>
            </div>
          </div>
        );

      case 'keyboard':
        return (
          <div className="py-8">
            <h2 className="text-xl font-semibold mb-4">{t('onboarding.step1.title')}</h2>
            <p className="text-text-secondary mb-6">{t('onboarding.step1.description')}</p>

            <div className="bg-bg-secondary rounded-lg p-6 text-center">
              {isDetecting ? (
                <div>
                  <div className="animate-pulse text-4xl mb-4">🔍</div>
                  <p className="text-text-secondary">{t('onboarding.step1.detecting')}</p>
                  <div className="mt-4 h-1 bg-bg-hover rounded-full overflow-hidden">
                    <div className="h-full bg-accent animate-progress w-full" />
                  </div>
                </div>
              ) : keyboardState.isConnected ? (
                <div>
                  <div className="text-4xl mb-4">✅</div>
                  <p className="text-success font-medium">{t('onboarding.step1.detected')}</p>
                  <p className="text-sm text-text-secondary mt-2">
                    {keyboardState.deviceId || 'BOSSINPUT Keypad'}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-4">⚠️</div>
                  <p className="text-warning">{t('onboarding.step1.notDetected')}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => refreshState()}
                  >
                    {t('common.retry')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 'model':
        return (
          <div className="py-8">
            <h2 className="text-xl font-semibold mb-4">{t('onboarding.step2.title')}</h2>
            <p className="text-text-secondary mb-2">{t('onboarding.step2.description')}</p>
            <p className="text-sm text-text-secondary mb-6">{t('onboarding.step2.description2')}</p>

            <div className="bg-bg-secondary rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-3xl">🧠</div>
                <div className="flex-1">
                  <p className="font-medium">Parakeet V3 (CPU)</p>
                  <p className="text-sm text-text-secondary">~478 MB • x5 Realtime</p>
                </div>
                {isDownloading ? (
                  <span className="text-accent text-sm">{t('onboarding.step2.downloading')}</span>
                ) : downloadProgress === 100 ? (
                  <span className="text-success text-sm">{t('onboarding.step2.complete')}</span>
                ) : (
                  <span className="text-text-secondary text-sm">Not downloaded</span>
                )}
              </div>

              {isDownloading && (
                <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              )}

              {!isDownloading && downloadProgress < 100 && (
                <Button
                  variant="primary"
                  className="w-full mt-4"
                  onClick={handleStartDownload}
                >
                  {t('onboarding.step2.startDownload')}
                </Button>
              )}
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="py-8">
            <h2 className="text-xl font-semibold mb-4">{t('onboarding.step3.title')}</h2>
            <p className="text-text-secondary mb-6">{t('onboarding.step3.description')}</p>

            <div className="space-y-4">
              {/* Microphone Permission */}
              <div className="bg-bg-secondary rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🎤</div>
                    <div>
                      <p className="font-medium">{t('onboarding.step3.microphone.title')}</p>
                      <p className="text-sm text-text-secondary">
                        {t('onboarding.step3.microphone.description')}
                      </p>
                    </div>
                  </div>
                  {micPermissionGranted ? (
                    <span className="text-success text-sm flex items-center gap-1">
                      ✓ {t('onboarding.step3.microphone.granted')}
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRequestPermission('microphone')}
                    >
                      {t('onboarding.step3.microphone.button')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Accessibility Permission */}
              <div className="bg-bg-secondary rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">♿</div>
                    <div>
                      <p className="font-medium">{t('onboarding.step3.accessibility.title')}</p>
                      <p className="text-sm text-text-secondary">
                        {t('onboarding.step3.accessibility.description')}
                      </p>
                    </div>
                  </div>
                  {accessibilityPermissionGranted ? (
                    <span className="text-success text-sm flex items-center gap-1">
                      ✓ {t('onboarding.step3.accessibility.granted')}
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRequestPermission('accessibility')}
                    >
                      {t('onboarding.step3.accessibility.button')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="py-8">
            <h2 className="text-xl font-semibold mb-4">{t('onboarding.step4.title')}</h2>
            <p className="text-text-secondary mb-6">{t('onboarding.step4.description')}</p>

            <div className="bg-bg-secondary rounded-lg p-6 text-center">
              {isRecording ? (
                <div>
                  <div className="text-4xl mb-4 animate-pulse">🔴</div>
                  <p className="text-accent">Recording...</p>
                </div>
              ) : testResult ? (
                <div>
                  <div className="text-4xl mb-4">✅</div>
                  <p className="text-success font-medium mb-2">{t('onboarding.step4.testSuccess')}</p>
                  <p className="text-text-secondary italic">"{testResult}"</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-4">🎙️</div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleTestRecording}
                  >
                    {t('onboarding.step4.testRecord')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-2xl font-semibold mb-2">{t('onboarding.complete.title')}</h2>
            <p className="text-text-secondary mb-6">{t('onboarding.complete.description')}</p>

            <div className="bg-bg-secondary rounded-lg p-6 text-left mb-6">
              <p className="font-medium mb-4">{t('onboarding.complete.quickStart')}</p>
              <ol className="space-y-2 text-sm text-text-secondary">
                <li className="flex gap-3">
                  <span className="text-accent font-medium">1.</span>
                  {t('onboarding.complete.quickStart1')}
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-medium">2.</span>
                  {t('onboarding.complete.quickStart2')}
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-medium">3.</span>
                  {t('onboarding.complete.quickStart3')}
                </li>
              </ol>
            </div>

            <p className="text-sm text-text-secondary">
              {t('onboarding.complete.readyToUse')}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/95 backdrop-blur-sm">
      <div className="bg-bg-secondary border border-border rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-bg-hover">
          <div
            className={cn(
              'h-full bg-accent transition-all duration-300',
              currentStep === 'complete' && 'bg-success'
            )}
            style={{ width: `${((currentIndex + 1) / stepOrder.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-border">
          <div className="flex gap-2">
            {!isFirstStep && currentStep !== 'complete' && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                {t('onboarding.back')}
              </Button>
            )}
            {(currentStep === 'keyboard' && !keyboardState.isConnected) ||
            (currentStep === 'model' && downloadProgress < 100 && !isDownloading) ||
            (currentStep === 'permissions' && (!micPermissionGranted || !accessibilityPermissionGranted)) ? (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                {t('onboarding.skip')}
              </Button>
            ) : null}
          </div>

          <Button
            variant="primary"
            onClick={handleNext}
            disabled={
              (currentStep === 'model' && isDownloading) ||
              (currentStep === 'permissions' && (!micPermissionGranted || !accessibilityPermissionGranted))
            }
          >
            {isLastStep ? t('onboarding.finish') : t('onboarding.next')}
          </Button>
        </div>
      </div>
    </div>
  );
};
