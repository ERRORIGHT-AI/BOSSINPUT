import { create } from 'zustand';
import type { Page, ModalType, Theme, ToastNotification, StatusBarInfo } from '@/types';

interface UIStore {
  // Navigation
  currentPage: Page;
  sidebarCollapsed: boolean;

  // Modals
  activeModal: ModalType;
  modalData: Record<string, unknown> | null;

  // Status bar
  showStatusBar: boolean;
  statusBarInfo: StatusBarInfo;

  // Theme
  theme: Theme;

  // Toasts
  toasts: ToastNotification[];

  // Loading states
  globalLoading: boolean;

  // Actions
  setCurrentPage: (page: Page) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (modal: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setTheme: (theme: Theme) => void;
  setShowStatusBar: (show: boolean) => void;
  updateStatusBarInfo: (info: Partial<StatusBarInfo>) => void;
  addToast: (toast: Omit<ToastNotification, 'id'>) => void;
  removeToast: (id: string) => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Navigation
  currentPage: 'keyboard',
  sidebarCollapsed: false,

  // Modals
  activeModal: 'none',
  modalData: null,

  // Status bar
  showStatusBar: true,
  statusBarInfo: {
    status: 'ready',
    keyboardConnected: false,
    currentModel: null,
    voiceShortcut: 'F13',
  },

  // Theme
  theme: 'dark',

  // Toasts
  toasts: [],

  // Loading
  globalLoading: false,

  // Actions
  setCurrentPage: (page: Page) => {
    set({ currentPage: page });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },

  openModal: (modal: ModalType, data?: Record<string, unknown>) => {
    set({ activeModal: modal, modalData: data || null });
  },

  closeModal: () => {
    set({ activeModal: 'none', modalData: null });
  },

  setTheme: (theme: Theme) => {
    set({ theme });
    // Apply theme to document
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  },

  setShowStatusBar: (show: boolean) => {
    set({ showStatusBar: show });
  },

  updateStatusBarInfo: (info: Partial<StatusBarInfo>) => {
    set((state) => ({
      statusBarInfo: { ...state.statusBarInfo, ...info },
    }));
  },

  addToast: (toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastNotification = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration
    const duration = toast.duration || 3000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  setGlobalLoading: (loading: boolean) => {
    set({ globalLoading: loading });
  },
}));
