import React from 'react';
import { Report } from '../../types';
import { SentinelDashboard } from '../SentinelDashboard';

interface SearchTabProps {
    report: Report;
}

export const SearchTab: React.FC<SearchTabProps> = ({ report }) => {
    return (
        <div className="animate-in fade-in">
            <SentinelDashboard />
        </div>
    );
};
