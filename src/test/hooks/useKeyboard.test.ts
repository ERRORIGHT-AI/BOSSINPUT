/**
 * Tests for useKeyboard hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useKeyboardStore } from '@/stores';
import * as tauri from '@/lib/tauri';

// Mock Tauri API
vi.mock('@/lib/tauri', () => ({
  keyboardGetState: vi.fn(),
  keyboardLoadConfig: vi.fn(),
  keyboardSaveConfig: vi.fn(),
  keyboardTestKey: vi.fn(),
  keyboardReset: vi.fn(),
}));

describe('useKeyboard', () => {
  const mockGetState = vi.mocked(tauri.keyboardGetState);
  const mockLoadConfig = vi.mocked(tauri.keyboardLoadConfig);
  const mockSaveConfig = vi.mocked(tauri.keyboardSaveConfig);
  const mockTestKey = vi.mocked(tauri.keyboardTestKey);
  const mockReset = vi.mocked(tauri.keyboardReset);

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store before each test
    useKeyboardStore.setState({
      state: {
        isConnected: false,
        deviceId: null,
        firmwareVersion: '',
        productId: null,
        vendorId: null,
      },
      config: {
        layers: [
          { id: 'base', name: 'Base', index: 0 },
          { id: 'layer1', name: 'Layer 1', index: 1 },
        ],
        keyMappings: [],
        encoderMapping: {
          rotateLeft: '',
          rotateRight: '',
          press: '',
        },
      },
      currentLayer: 'base',
      selectedKey: null,
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have default initial state', () => {
      const { result } = renderHook(() => useKeyboardStore());

      expect(result.current.state.isConnected).toBe(false);
      expect(result.current.state.deviceId).toBeNull();
      expect(result.current.config.layers).toHaveLength(2);
      expect(result.current.currentLayer).toBe('base');
      expect(result.current.selectedKey).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('refreshState', () => {
    it('should fetch and update keyboard state', async () => {
      mockGetState.mockResolvedValue({
        isConnected: true,
        deviceId: 'test-device',
        firmwareVersion: '1.0.0',
        productId: 1234,
        vendorId: 5678,
      });

      const { result } = renderHook(() => useKeyboardStore());

      await act(async () => {
        await result.current.refreshState();
      });

      expect(mockGetState).toHaveBeenCalledOnce();
      expect(result.current.state.isConnected).toBe(true);
      expect(result.current.state.deviceId).toBe('test-device');
    });

    it('should handle errors gracefully', async () => {
      mockGetState.mockRejectedValue(new Error('Connection failed'));

      const { result } = renderHook(() => useKeyboardStore());

      await act(async () => {
        await result.current.refreshState();
      });

      expect(result.current.error).toContain('Failed to get keyboard state');
    });
  });

  describe('setCurrentLayer', () => {
    it('should change current layer and deselect key', () => {
      const { result } = renderHook(() => useKeyboardStore());

      act(() => {
        result.current.selectKey(5);
      });

      expect(result.current.selectedKey).toBe(5);

      act(() => {
        result.current.setCurrentLayer('layer1');
      });

      expect(result.current.currentLayer).toBe('layer1');
      expect(result.current.selectedKey).toBeNull();
    });
  });

  describe('updateKeyMapping', () => {
    it('should add new key mapping', () => {
      const { result } = renderHook(() => useKeyboardStore());

      act(() => {
        result.current.updateKeyMapping(0, 'a');
      });

      expect(result.current.config.keyMappings).toHaveLength(1);
      expect(result.current.config.keyMappings[0]).toEqual({
        layer: 'base',
        keyIndex: 0,
        keycode: 'a',
      });
    });

    it('should update existing key mapping', () => {
      const { result } = renderHook(() => useKeyboardStore());

      act(() => {
        result.current.updateKeyMapping(0, 'a');
        result.current.updateKeyMapping(0, 'b');
      });

      expect(result.current.config.keyMappings).toHaveLength(1);
      expect(result.current.config.keyMappings[0].keycode).toBe('b');
    });

    it('should maintain separate mappings per layer', () => {
      const { result } = renderHook(() => useKeyboardStore());

      act(() => {
        result.current.setCurrentLayer('base');
        result.current.updateKeyMapping(0, 'a');
        result.current.setCurrentLayer('layer1');
        result.current.updateKeyMapping(0, 'b');
      });

      const baseMapping = result.current.config.keyMappings.find(
        (m) => m.layer === 'base' && m.keyIndex === 0
      );
      const layer1Mapping = result.current.config.keyMappings.find(
        (m) => m.layer === 'layer1' && m.keyIndex === 0
      );

      expect(baseMapping?.keycode).toBe('a');
      expect(layer1Mapping?.keycode).toBe('b');
    });
  });

  describe('selectKey', () => {
    it('should select a key', () => {
      const { result } = renderHook(() => useKeyboardStore());

      act(() => {
        result.current.selectKey(5);
      });

      expect(result.current.selectedKey).toBe(5);
    });

    it('should deselect when selecting same key', () => {
      const { result } = renderHook(() => useKeyboardStore());

      act(() => {
        result.current.selectKey(5);
        result.current.selectKey(5);
      });

      expect(result.current.selectedKey).toBe(5);
    });

    it('should deselect with null', () => {
      const { result } = renderHook(() => useKeyboardStore());

      act(() => {
        result.current.selectKey(5);
        result.current.selectKey(null);
      });

      expect(result.current.selectedKey).toBeNull();
    });
  });

  describe('saveConfig', () => {
    it('should save config and clear loading state', async () => {
      mockSaveConfig.mockResolvedValue(undefined);

      const { result } = renderHook(() => useKeyboardStore());

      await act(async () => {
        await result.current.saveConfig();
      });

      expect(mockSaveConfig).toHaveBeenCalledOnce();
      expect(result.current.isLoading).toBe(false);
    });

    it('should set error on save failure', async () => {
      mockSaveConfig.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useKeyboardStore());

      await act(async () => {
        await expect(result.current.saveConfig()).rejects.toThrow('Save failed');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('testKey', () => {
    it('should return keycode from test', async () => {
      mockTestKey.mockResolvedValue('space');

      const { result } = renderHook(() => useKeyboardStore());

      let keycode: string;
      await act(async () => {
        keycode = await result.current.testKey(5);
      });

      expect(mockTestKey).toHaveBeenCalledWith(5);
      expect(keycode).toBe('space');
    });
  });

  describe('setError', () => {
    it('should set and clear error', () => {
      const { result } = renderHook(() => useKeyboardStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });
});
