import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useToast } from '../Toast';
import { useAuth } from '../../contexts/AuthContext';
import { getTechnicalErrorMessage, toUserMessage } from '../../utils/errors';
import { ReportTemplateEditor } from './ReportTemplateEditor';
import type { ReportTemplate } from '../../utils/reportTemplate';

export const ReportBuilder: React.FC = () => {
    const { organization } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const handleSave = async (template: ReportTemplate) => {
        try {
            if (!organization) throw new Error('Please sign in to an organization before saving.');
            const { error } = await supabase.from('report_templates').insert({
                organization_id: organization.id,
                name: template.name,
                layout: template.layout,
                is_default: false
            });
            if (error) throw error;
            toast.success('Template Saved', 'Your custom report layout has been created.');
            navigate('/settings');
        } catch (error) {
            console.error('Save report template failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
            throw error;
        }
    };

    return <ReportTemplateEditor onSave={handleSave} onBack={() => navigate(-1)} />;
};
