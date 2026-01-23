import { create } from 'zustand';
import { Report, Asset, DiscoveredPage, AnalysisStatus } from '../types';

interface AuditState {
    // Current analysis state
    assets: Asset[];
    discoveredPages: DiscoveredPage[];
    report: Report | null;
    isAnalyzing: boolean;
    statusMessage: string;
    analysisStatus: AnalysisStatus;

    // Actions
    setAssets: (assets: Asset[]) => void;
    setDiscoveredPages: (pages: DiscoveredPage[]) => void;
    setReport: (report: Report | null) => void;
    setIsAnalyzing: (analyzing: boolean) => void;
    setStatusMessage: (message: string) => void;
    setAnalysisStatus: (status: AnalysisStatus) => void;
    reset: () => void;
}

const initialState = {
    assets: [],
    discoveredPages: [],
    report: null,
    isAnalyzing: false,
    statusMessage: '',
    analysisStatus: AnalysisStatus.IDLE,
};

export const useAuditStore = create<AuditState>((set) => ({
    ...initialState,

    setAssets: (assets) => set({ assets }),
    setDiscoveredPages: (pages) => set({ discoveredPages: pages }),
    setReport: (report) => set({ report }),
    setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
    setStatusMessage: (message) => set({ statusMessage: message }),
    setAnalysisStatus: (status) => set({ analysisStatus: status }),

    reset: () => set(initialState),
}));
