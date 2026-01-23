import React from 'react';
import { Report } from '../../types';
import { SearchVisibility } from '../SearchVisibility';

interface SearchTabProps {
    report: Report;
}

export const SearchTab: React.FC<SearchTabProps> = ({ report }) => {
    return (
        <div className="animate-in fade-in">
            <SearchVisibility report={report} auditId={report.id} />
        </div>
    );
};
