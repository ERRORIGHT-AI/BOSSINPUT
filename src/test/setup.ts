import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock i18next
vi.mock('i18next', () => ({
  init: vi.fn(),
  use: vi.fn(),
  changeLanguage: vi.fn(),
  t: vi.fn((key) => key),
}));

// Mock navigator language
Object.defineProperty(navigator, 'language', {
  value: 'en',
  writable: true,
});
