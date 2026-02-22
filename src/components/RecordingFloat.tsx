import React from 'react';
import { useVoiceStore } from '@/stores';
import { useT } from '@/i18n/hook';
import { Button } from './Button';

export const RecordingFloat: React.FC = () => {
  const { t } = useT();
  const { isRecording, stopRecording } = useVoiceStore();
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      setElapsed(0);
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
      <div className="bg-bg-primary/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl p-6 w-[280px]">
        {/* Recording indicator */}
        <div className="flex items-center justify-center mb-4">
          <span className="text-error text-lg animate-pulse mr-2">🔴</span>
          <span className="text-text-primary">{t('voice.toasts.recordingStarted')}</span>
        </div>

        {/* Time */}
        <div className="mb-4">
          <div className="h-1 bg-bg-hover rounded-full overflow-hidden">
            <div className="h-full bg-error animate-pulse" style={{ width: '100%' }} />
          </div>
          <p className="text-center text-2xl font-mono text-text-primary mt-2">
            {formatTime(elapsed)}
          </p>
        </div>

        {/* Stop button */}
        <Button
          variant="danger"
          className="w-full"
          onClick={stopRecording}
        >
          ■ {t('voice.toasts.recordingStopped')}
        </Button>
      </div>
    </div>
  );
};
