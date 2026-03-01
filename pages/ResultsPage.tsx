import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { Dashboard } from '../components/Dashboard';
import { FullPageLoader } from '../components/routing/FullPageLoader';
import { getAudit } from '../services/supabase';
import { Report, Asset } from '../types';
import { NotFoundPage } from './NotFoundPage';
import { analytics } from '../services/analytics';

export const ResultsPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const auditId = id || '';

    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<Report | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!auditId) return;

        setLoading(true);
        getAudit(auditId)
            .then((audit) => {
                if (!audit) {
                    setNotFound(true);
                    return;
                }

                if (audit.status !== 'complete' || !audit.report) {
                    navigate(`/analysis/${auditId}`, { replace: true });
                    return;
                }

                const loaded = audit.report as unknown as Report;
                loaded.id = audit.id;
                loaded.createdAt = audit.completed_at || audit.created_at;
                setReport(loaded);
            })
            .finally(() => setLoading(false));
    }, [auditId, navigate]);

    useEffect(() => {
        if (!report?.id) return;

        const viewedKey = `cognition:results-viewed:${report.id}`;
        if (sessionStorage.getItem(viewedKey)) return;
        sessionStorage.setItem(viewedKey, '1');

        const startedAtRaw = localStorage.getItem('cognition:first-audit-started-at');
        const startedAt = startedAtRaw ? parseInt(startedAtRaw, 10) : NaN;
        const timeToValueSeconds = Number.isFinite(startedAt)
            ? Math.max(0, Math.round((Date.now() - startedAt) / 1000))
            : null;

        analytics.track('First Actionable Insight Viewed', {
            audit_id: report.id,
            overall_score: report.overallScore,
            time_to_value_seconds: timeToValueSeconds,
        });
    }, [report]);

    if (loading) return <DashboardSkeleton />;
    if (notFound) return <NotFoundPage />;
    if (!report) return <DashboardSkeleton />;

    return (
        <Dashboard
            report={report}
            onReset={() => navigate('/dashboard')}
            onStartAnalysis={(_assets: Asset[]) => navigate('/dashboard')}
            isAnalyzing={false}
            statusMessage=""
            discoveredCount={0}
            initialTab="overview"
            showActionHub
        />
    );
};
