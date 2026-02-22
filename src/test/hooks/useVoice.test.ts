/**
 * Tests for useVoice hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceStore } from '@/stores';
import * as tauri from '@/lib/tauri';

// Mock Tauri API
vi.mock('@/lib/tauri', () => ({
  voiceStartRecording: vi.fn(),
  voiceStopRecording: vi.fn(),
  voiceGetStatus: vi.fn(),
  voiceGetSettings: vi.fn(),
  voiceUpdateSettings: vi.fn(),
  voiceTestMicrophone: vi.fn(),
}));

describe('useVoice', () => {
  const mockStartRecording = vi.mocked(tauri.voiceStartRecording);
  const mockStopRecording = vi.mocked(tauri.voiceStopRecording);
  const mockGetStatus = vi.mocked(tauri.voiceGetStatus);
  const mockGetSettings = vi.mocked(tauri.voiceGetSettings);
  const mockUpdateSettings = vi.mocked(tauri.voiceUpdateSettings);
  const mockTestMicrophone = vi.mocked(tauri.voiceTestMicrophone);

  beforeEach(() => {
    vi.clearAllMocks();
    useVoiceStore.setState({
      triggerMode: 'toggle',
      voiceShortcut: 'F13',
      currentModel: 'parakeet-v3-cpu',
      language: 'auto',
      pasteMethod: 'clipboard',
      autoPunctuation: true,
      showPreview: true,
      status: {
        state: 'idle',
        modelLoaded: true,
        lastTranscription: null,
      },
      transcriptionHistory: [],
      isRecording: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have default voice settings', () => {
      const { result } = renderHook(() => useVoiceStore());

      expect(result.current.triggerMode).toBe('toggle');
      expect(result.current.voiceShortcut).toBe('F13');
      expect(result.current.currentModel).toBe('parakeet-v3-cpu');
      expect(result.current.language).toBe('auto');
      expect(result.current.pasteMethod).toBe('clipboard');
      expect(result.current.autoPunctuation).toBe(true);
      expect(result.current.showPreview).toBe(true);
    });

    it('should have idle status', () => {
      const { result } = renderHook(() => useVoiceStore());

      expect(result.current.status.state).toBe('idle');
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('startRecording', () => {
    it('should start recording and update state', async () => {
      mockStartRecording.mockResolvedValue(undefined);

      const { result } = renderHook(() => useVoiceStore());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockStartRecording).toHaveBeenCalledOnce();
      expect(result.current.isRecording).toBe(true);
      expect(result.current.status.state).toBe('recording');
    });

    it('should set error on failure', async () => {
      mockStartRecording.mockRejectedValue(new Error('Mic error'));

      const { result } = renderHook(() => useVoiceStore());

      await act(async () => {
        await expect(result.current.startRecording()).rejects.toThrow('Mic error');
      });

      expect(result.current.error).toContain('Failed to start recording');
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('stopRecording', () => {
    it('should stop recording and return transcription', async () => {
      mockStopRecording.mockResolvedValue({
        text: 'Hello world',
        language: 'en',
        confidence: 0.95,
        timestamp: Date.now(),
      });

      const { result } = renderHook(() => useVoiceStore());

      // First start recording
      mockStartRecording.mockResolvedValue(undefined);
      await act(async () => {
        await result.current.startRecording();
      });

      // Then stop
      await act(async () => {
        const transcription = await result.current.stopRecording();
        expect(transcription.text).toBe('Hello world');
      });

      expect(mockStopRecording).toHaveBeenCalledOnce();
      expect(result.current.isRecording).toBe(false);
      expect(result.current.status.state).toBe('idle');
      expect(result.current.status.lastTranscription).toBe('Hello world');
      expect(result.current.transcriptionHistory).toHaveLength(1);
    });

    it('should set error on stop failure', async () => {
      mockStopRecording.mockRejectedValue(new Error('Transcription failed'));

      const { result } = renderHook(() => useVoiceStore());

      await act(async () => {
        await expect(result.current.stopRecording()).rejects.toThrow('Transcription failed');
      });

      expect(result.current.error).toContain('Failed to stop recording');
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('should update voice settings', async () => {
      mockUpdateSettings.mockResolvedValue(undefined);

      const { result } = renderHook(() => useVoiceStore());

      await act(async () => {
        await result.current.updateSettings({ language: 'zh-CN' });
      });

      expect(mockUpdateSettings).toHaveBeenCalledWith({ language: 'zh-CN' });
      expect(result.current.language).toBe('zh-CN');
    });

    it('should set error on update failure', async () => {
      mockUpdateSettings.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useVoiceStore());

      await act(async () => {
        await expect(result.current.updateSettings({ language: 'fr' })).rejects.toThrow('Update failed');
      });

      expect(result.current.error).toContain('Failed to update settings');
    });
  });

  describe('testMicrophone', () => {
    it('should test microphone and return result', async () => {
      mockTestMicrophone.mockResolvedValue({
        success: true,
        level: 0.75,
      });

      const { result } = renderHook(() => useVoiceStore());

      let result_data: { success: boolean; level: number } | undefined;
      await act(async () => {
        result_data = await result.current.testMicrophone();
      });

      expect(mockTestMicrophone).toHaveBeenCalledOnce();
      expect(result_data?.success).toBe(true);
      expect(result_data?.level).toBe(0.75);
    });

    it('should handle test failure gracefully', async () => {
      mockTestMicrophone.mockResolvedValue({
        success: false,
        level: 0,
      });

      const { result } = renderHook(() => useVoiceStore());

      let result_data: { success: boolean; level: number } | undefined;
      await act(async () => {
        result_data = await result.current.testMicrophone();
      });

      expect(result_data?.success).toBe(false);
      // No error is set for failed mic test, just returned result
    });
  });

  describe('refreshStatus', () => {
    it('should refresh voice status from backend', async () => {
      mockGetStatus.mockResolvedValue({
        state: 'processing',
        modelLoaded: true,
        lastTranscription: 'Previous text',
      });

      const { result } = renderHook(() => useVoiceStore());

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(mockGetStatus).toHaveBeenCalledOnce();
      expect(result.current.status.state).toBe('processing');
      expect(result.current.status.lastTranscription).toBe('Previous text');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useVoiceStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
