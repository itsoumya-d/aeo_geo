import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dashboard } from '../components/Dashboard';
import { useToast } from '../components/Toast';
import { createAudit } from '../services/supabase';
import { Asset, AssetType } from '../types';
import { useAuditStore } from '../stores';
import { useAuth } from '../contexts/AuthContext';
import { saveAuditDraft } from '../utils/auditDraft';
import { normalizeUrl, validateUrl } from '../utils/validation';

export const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const { organization, currentWorkspace } = useAuth();

    const {
        discoveredPages,
        isAnalyzing,
        statusMessage,
        setAssets,
        reset: resetAudit
    } = useAuditStore();

    useEffect(() => {
        resetAudit();
    }, [resetAudit]);

    const handleReset = () => {
        resetAudit();
        navigate('/audit');
    };

    const handleStartAnalysis = async (assets: Asset[]) => {
        const website = assets.find(a => a.type === AssetType.WEBSITE)?.url;
        if (!website) {
            toast.error('Website required', 'Add a website URL to start an audit.');
            return;
        }

        const check = validateUrl(website);
        if (!check.isValid) {
            toast.error('Invalid URL', check.error || 'Enter a valid website URL.');
            return;
        }

        // Credit guard: InputLayer disables the button, but defend here too
        if (organization && organization.audit_credits_remaining <= 0) {
            toast.error('No credits remaining', 'Top up your account to run audits.');
            return;
        }

        const normalizedWebsite = normalizeUrl(website);

        try {
            const normalizedAssets = assets.map(a => a.type === AssetType.WEBSITE ? { ...a, url: normalizedWebsite } : a);
            setAssets(normalizedAssets);

            const audit = await createAudit(normalizedWebsite, currentWorkspace?.id);
            if (!audit) {
                toast.error("Couldn't start audit", 'Please try again.');
                return;
            }

            saveAuditDraft(audit.id, { assets: normalizedAssets, createdAt: Date.now() });
            navigate(`/analysis/${audit.id}`);
        } catch (err: any) {
            console.error('Start audit error:', err);
            toast.error("Couldn't start audit", 'Please try again.');
        }
    };

    return (
        <Dashboard
            report={null}
            onReset={handleReset}
            onStartAnalysis={handleStartAnalysis}
            isAnalyzing={isAnalyzing}
            statusMessage={statusMessage}
            discoveredCount={discoveredPages.length}
            initialTab="overview"
        />
    );
};
