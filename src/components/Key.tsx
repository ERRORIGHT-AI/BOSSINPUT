import React from 'react';
import { cn } from '@/lib/utils';

export interface KeyProps {
  keycode?: string;
  label?: string;
  isSelected?: boolean;
  isVoiceKey?: boolean;
  hasCustomMapping?: boolean;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'w-10 h-10 text-xs',
  md: 'w-14 h-14 text-sm',
  lg: 'w-16 h-16 text-base',
};

export const Key: React.FC<KeyProps> = ({
  keycode = '',
  label,
  isSelected = false,
  isVoiceKey = false,
  hasCustomMapping = false,
  onClick,
  onContextMenu,
  size = 'md',
}) => {
  const displayLabel = label || keycode || '';

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'relative flex items-center justify-center rounded-md font-mono font-medium',
        'border transition-all duration-150',
        'hover:border-accent/50',
        sizeStyles[size],
        isSelected
          ? 'bg-bg-selected border-accent text-accent'
          : 'bg-[#333333] border-transparent text-text-primary',
        isVoiceKey && 'shadow-[0_0_8px_rgba(78,201,160,0.5)]'
      )}
    >
      {isVoiceKey ? '🎤' : displayLabel}

      {/* Custom mapping indicator */}
      {hasCustomMapping && !isSelected && (
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-success" />
      )}
    </button>
  );
};
