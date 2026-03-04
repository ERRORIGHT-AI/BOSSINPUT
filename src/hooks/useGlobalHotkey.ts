import { useEffect, useRef } from 'react';
import { hotkeyToggleRecording, hotkeyGetShortcut } from '@/lib/tauri';
import { useVoiceStore } from '@/stores';

interface ParsedHotkey {
  keys: string[];
  modifiers: {
    meta: boolean;
    control: boolean;
    alt: boolean;
    shift: boolean;
  };
  mainKey: string;
}

/**
 * Parse a shortcut string like "Control+Space" or "Meta+Shift+V"
 * into structured components for matching
 */
function parseShortcut(shortcut: string): ParsedHotkey | null {
  if (!shortcut) return null;

  const parts = shortcut.split('+').map((s) => s.trim().toLowerCase());
  const modifiers = { meta: false, control: false, alt: false, shift: false };
  const keys: string[] = [];

  for (const part of parts) {
    switch (part) {
      case 'meta':
      case 'cmd':
      case 'command':
        modifiers.meta = true;
        keys.push('meta');
        break;
      case 'control':
      case 'ctrl':
        modifiers.control = true;
        keys.push('control');
        break;
      case 'alt':
      case 'option':
        modifiers.alt = true;
        keys.push('alt');
        break;
      case 'shift':
        modifiers.shift = true;
        keys.push('shift');
        break;
      default:
        // Main key - store as-is for comparison
        break;
    }
  }

  // Extract main key (last non-modifier part)
  const mainKeyPart = parts[parts.length - 1];
  const mainKey = mainKeyPart === 'meta' || mainKeyPart === 'control' ||
                  mainKeyPart === 'alt' || mainKeyPart === 'shift'
    ? ''
    : parts[parts.length - 1];

  if (!mainKey) return null;

  return { keys, modifiers, mainKey: mainKey.toLowerCase() };
}

/**
 * Check if a keyboard event matches the parsed hotkey
 */
function eventMatchesHotkey(event: KeyboardEvent, hotkey: ParsedHotkey): boolean {
  // Check modifiers
  if (hotkey.modifiers.meta !== event.metaKey) return false;
  if (hotkey.modifiers.control !== event.ctrlKey) return false;
  if (hotkey.modifiers.alt !== event.altKey) return false;
  if (hotkey.modifiers.shift !== event.shiftKey) return false;

  // Check main key
  const eventKey = event.key.toLowerCase();

  // Handle single character keys
  if (hotkey.mainKey.length === 1) {
    return eventKey === hotkey.mainKey;
  }

  // Handle special keys
  switch (hotkey.mainKey) {
    case 'space':
      return event.code === 'Space';
    case 'escape':
    case 'esc':
      return event.key === 'Escape';
    case 'enter':
    case 'return':
      return event.key === 'Enter';
    case 'tab':
      return event.key === 'Tab';
    case 'backspace':
      return event.key === 'Backspace';
    case 'delete':
      return event.key === 'Delete';
    case 'arrowup':
      return event.key === 'ArrowUp';
    case 'arrowdown':
      return event.key === 'ArrowDown';
    case 'arrowleft':
      return event.key === 'ArrowLeft';
    case 'arrowright':
      return event.key === 'ArrowRight';
    default:
      // Check for F1-F24
      if (hotkey.mainKey.match(/^f[1-9]$/i) || hotkey.mainKey.match(/^f1[0-9]$/i) || hotkey.mainKey.match(/^f2[0-4]$/i)) {
        return eventKey === hotkey.mainKey.toLowerCase();
      }
      // Fallback to direct comparison
      return eventKey === hotkey.mainKey;
  }
}

/**
 * Hook to listen for global hotkey and trigger recording toggle
 *
 * This hook attaches a keyboard event listener to the window
 * that checks if the pressed keys match the configured shortcut.
 * When matched, it toggles the voice recording state.
 */
export function useGlobalHotkey(enabled: boolean = true) {
  const lastTriggerTime = useRef<number>(0);
  const cooldownMs = 300; // Prevent rapid double-triggering

  useEffect(() => {
    if (!enabled) return;

    let parsedHotkey: ParsedHotkey | null = null;
    let isDestroyed = false;

    // Load the current shortcut
    hotkeyGetShortcut()
      .then((shortcut) => {
        if (isDestroyed) return;
        parsedHotkey = parseShortcut(shortcut);
        if (!parsedHotkey) {
          console.warn('Failed to parse hotkey:', shortcut);
        }
      })
      .catch((err) => {
        console.error('Failed to get hotkey:', err);
      });

    // Debounce flag to prevent duplicate handling
    let isHandling = false;

    const handleKeyDown = async (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )) {
        return;
      }

      // Don't trigger if no hotkey is configured
      if (!parsedHotkey) return;

      // Debounce: prevent rapid double-triggers
      const now = Date.now();
      if (now - lastTriggerTime.current < cooldownMs) return;
      if (isHandling) return;

      // Check if event matches the hotkey
      if (eventMatchesHotkey(event, parsedHotkey)) {
        event.preventDefault();
        event.stopPropagation();

        isHandling = true;
        lastTriggerTime.current = now;

        try {
          const isRecording = await hotkeyToggleRecording();

          // If recording started, sync with voice store
          const voiceStore = useVoiceStore.getState();
          if (isRecording) {
            voiceStore.startRecording();
          } else {
            voiceStore.stopRecording();
          }
        } catch (err) {
          console.error('Failed to toggle recording via hotkey:', err);
        } finally {
          isHandling = false;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase

    return () => {
      isDestroyed = true;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled]);
}
