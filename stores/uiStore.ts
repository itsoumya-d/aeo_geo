import { create } from 'zustand';

interface UIState {
    // Theme
    theme: 'dark' | 'light';

    // Modal states
    showOnboarding: boolean;
    showTopUp: boolean;

    // Loading states
    isExporting: boolean;

    // Actions
    setTheme: (theme: 'dark' | 'light') => void;
    toggleTheme: () => void;
    setShowOnboarding: (show: boolean) => void;
    setShowTopUp: (show: boolean) => void;
    setIsExporting: (exporting: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    theme: 'dark',
    showOnboarding: false,
    showTopUp: false,
    isExporting: false,

    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set((state) => ({
        theme: state.theme === 'dark' ? 'light' : 'dark'
    })),
    setShowOnboarding: (show) => set({ showOnboarding: show }),
    setShowTopUp: (show) => set({ showTopUp: show }),
    setIsExporting: (exporting) => set({ isExporting: exporting }),
}));
