import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { VectorLab } from '../VectorLab';
import { useAuditStore } from '../../stores';

export const OptimizationTab: React.FC = () => {
    const { report } = useAuditStore();

    if (!report?.vectorMap?.length) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
            >
                <div className="bg-primary/10 p-4 rounded-2xl mb-4">
                    <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Optimization data not yet available</h3>
                <p className="text-sm text-slate-400 max-w-sm">
                    Run your first audit to generate vector optimization data for your brand.
                </p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <VectorLab data={report.vectorMap} />
        </motion.div>
    );
};
