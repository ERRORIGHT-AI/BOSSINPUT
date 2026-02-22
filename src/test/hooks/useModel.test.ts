/**
 * Tests for useModel hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModelStore } from '@/stores';
import * as tauri from '@/lib/tauri';

// Mock Tauri API
vi.mock('@/lib/tauri', () => ({
  modelGetList: vi.fn(),
  modelSetActive: vi.fn(),
  modelGetActive: vi.fn(),
  modelDownload: vi.fn(),
  modelCancelDownload: vi.fn(),
  modelGetDownloadProgress: vi.fn(),
  modelDelete: vi.fn(),
}));

describe('useModel', () => {
  const mockGetList = vi.mocked(tauri.modelGetList);
  const mockSetActive = vi.mocked(tauri.modelSetActive);
  const mockGetActive = vi.mocked(tauri.modelGetActive);
  const mockDownload = vi.mocked(tauri.modelDownload);
  const mockCancelDownload = vi.mocked(tauri.modelCancelDownload);
  const mockGetDownloadProgress = vi.mocked(tauri.modelGetDownloadProgress);
  const mockDelete = vi.mocked(tauri.modelDelete);

  beforeEach(() => {
    vi.clearAllMocks();
    useModelStore.setState({
      models: [
        {
          id: 'parakeet-v3-cpu',
          name: 'Parakeet V3 CPU',
          description: 'Fast CPU model',
          size: 478 * 1024 * 1024,
          status: 'not-downloaded',
          downloadProgress: 0,
        },
        {
          id: 'parakeet-v3-gpu',
          name: 'Parakeet V3 GPU',
          description: 'Fast GPU model',
          size: 478 * 1024 * 1024,
          status: 'not-downloaded',
          downloadProgress: 0,
        },
      ],
      activeModelId: null,
      downloadQueue: new Set(),
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have default models', () => {
      const { result } = renderHook(() => useModelStore());

      expect(result.current.models).toHaveLength(2);
      expect(result.current.models[0].id).toBe('parakeet-v3-cpu');
      expect(result.current.activeModelId).toBeNull();
    });
  });

  describe('init', () => {
    it('should load models from backend', async () => {
      mockGetList.mockResolvedValue([
        {
          id: 'parakeet-v3-cpu',
          name: 'Parakeet V3 CPU',
          description: 'Fast CPU model',
          size: 478 * 1024 * 1024,
          status: 'downloaded',
          downloadProgress: 100,
        },
      ]);
      mockGetActive.mockResolvedValue('parakeet-v3-cpu');

      const { result } = renderHook(() => useModelStore());

      await act(async () => {
        await result.current.init();
      });

      expect(mockGetList).toHaveBeenCalledOnce();
      expect(mockGetActive).toHaveBeenCalledOnce();
      expect(result.current.models[0].status).toBe('downloaded');
      expect(result.current.activeModelId).toBe('parakeet-v3-cpu');
    });

    it('should use defaults on backend failure', async () => {
      mockGetList.mockRejectedValue(new Error('Backend error'));
      mockGetActive.mockRejectedValue(new Error('Backend error'));

      const { result } = renderHook(() => useModelStore());

      await act(async () => {
        await result.current.init();
      });

      // Should have 3 default models from AVAILABLE_MODELS constant
      expect(result.current.models.length).toBeGreaterThan(0);
      expect(result.current.activeModelId).toBe('parakeet-v3-cpu');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('setActiveModel', () => {
    it('should set active model', async () => {
      mockSetActive.mockResolvedValue(undefined);

      const { result } = renderHook(() => useModelStore());

      await act(async () => {
        await result.current.setActiveModel('parakeet-v3-cpu');
      });

      expect(mockSetActive).toHaveBeenCalledWith('parakeet-v3-cpu');
      expect(result.current.activeModelId).toBe('parakeet-v3-cpu');
      expect(result.current.models[0].status).toBe('active');
    });

    it('should set error on failure', async () => {
      mockSetActive.mockRejectedValue(new Error('Model not found'));

      const { result } = renderHook(() => useModelStore());

      await act(async () => {
        await expect(result.current.setActiveModel('invalid')).rejects.toThrow('Model not found');
      });

      expect(result.current.error).toContain('Failed to set active model');
    });
  });

  describe('downloadModel', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start model download', async () => {
      mockDownload.mockResolvedValue(undefined);

      const { result } = renderHook(() => useModelStore());

      await act(async () => {
        await result.current.downloadModel('parakeet-v3-cpu');
      });

      expect(mockDownload).toHaveBeenCalledWith('parakeet-v3-cpu');
      expect(result.current.models[0].status).toBe('downloading');
      expect(result.current.downloadQueue.has('parakeet-v3-cpu')).toBe(true);
    });

    it('should not start download if already downloading', async () => {
      mockDownload.mockResolvedValue(undefined);
      useModelStore.setState({
        downloadQueue: new Set(['parakeet-v3-cpu']),
      });

      const { result } = renderHook(() => useModelStore());

      await act(async () => {
        await result.current.downloadModel('parakeet-v3-cpu');
      });

      expect(mockDownload).not.toHaveBeenCalled();
    });
  });

  describe('cancelDownload', () => {
    it('should cancel active download', async () => {
      mockCancelDownload.mockResolvedValue(undefined);
      useModelStore.setState({
        downloadQueue: new Set(['parakeet-v3-cpu']),
        models: [
          {
            id: 'parakeet-v3-cpu',
            name: 'Parakeet V3 CPU',
            description: 'Fast CPU model',
            size: 478 * 1024 * 1024,
            status: 'downloading',
            downloadProgress: 50,
          },
        ],
      });

      const { result } = renderHook(() => useModelStore());

      await act(async () => {
        await result.current.cancelDownload('parakeet-v3-cpu');
      });

      expect(mockCancelDownload).toHaveBeenCalledWith('parakeet-v3-cpu');
      expect(result.current.models[0].status).toBe('not-downloaded');
      expect(result.current.models[0].downloadProgress).toBe(0);
      expect(result.current.downloadQueue.has('parakeet-v3-cpu')).toBe(false);
    });
  });

  describe('deleteModel', () => {
    it('should delete downloaded model', async () => {
      mockDelete.mockResolvedValue(undefined);
      useModelStore.setState({
        models: [
          {
            id: 'parakeet-v3-cpu',
            name: 'Parakeet V3 CPU',
            description: 'Fast CPU model',
            size: 478 * 1024 * 1024,
            status: 'downloaded',
            downloadProgress: 100,
          },
        ],
        activeModelId: 'parakeet-v3-cpu',
      });

      const { result } = renderHook(() => useModelStore());

      await act(async () => {
        await result.current.deleteModel('parakeet-v3-cpu');
      });

      expect(mockDelete).toHaveBeenCalledWith('parakeet-v3-cpu');
      expect(result.current.models[0].status).toBe('not-downloaded');
      expect(result.current.activeModelId).toBeNull();
    });
  });

  describe('refreshModels', () => {
    it('should refresh models list', async () => {
      mockGetList.mockResolvedValue([
        {
          id: 'parakeet-v3-cpu',
          name: 'Parakeet V3 CPU',
          description: 'Fast CPU model',
          size: 478 * 1024 * 1024,
          status: 'active',
          downloadProgress: 100,
        },
      ]);

      const { result } = renderHook(() => useModelStore());

      await act(async () => {
        await result.current.refreshModels();
      });

      expect(mockGetList).toHaveBeenCalledOnce();
      expect(result.current.models[0].status).toBe('active');
    });
  });

  describe('updateModelProgress', () => {
    it('should update download progress', () => {
      const { result } = renderHook(() => useModelStore());

      act(() => {
        result.current.updateModelProgress('parakeet-v3-cpu', 75);
      });

      expect(result.current.models[0].downloadProgress).toBe(75);
    });
  });

  describe('setError', () => {
    it('should set error state', () => {
      const { result } = renderHook(() => useModelStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');
    });

    it('should clear error when set to null', () => {
      const { result } = renderHook(() => useModelStore());

      act(() => {
        result.current.setError('Test error');
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });
});
