import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-text-primary flex items-center justify-center px-6 py-16">
            <div className="max-w-lg w-full text-center">
                {/* Animated 404 illustration */}
                <div className="relative inline-flex items-center justify-center mb-12">
                    {/* Floating orbit rings */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                        className="absolute w-48 h-48 rounded-full border border-primary/10"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        className="absolute w-32 h-32 rounded-full border border-primary/20"
                    >
                        {/* Orbiting dot */}
                        <motion.div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
                    </motion.div>

                    {/* Core glow */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.2)]"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <Zap className="w-10 h-10 text-primary" />
                        </motion.div>
                    </motion.div>
                </div>

                {/* Text */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="text-8xl font-black text-white/[0.06] tracking-tighter font-display mb-0 leading-none select-none">
                        404
                    </div>
                    <h1 className="text-2xl font-display font-bold text-white -mt-4 mb-3">
                        Page not found
                    </h1>
                    <p className="text-text-secondary text-sm leading-relaxed mb-10 max-w-sm mx-auto">
                        This page seems to have drifted out of our AI index. Let's get you back on track.
                    </p>
                </motion.div>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="flex flex-col sm:flex-row gap-3 justify-center"
                >
                    <Link to="/">
                        <Button variant="secondary" className="w-full sm:w-auto">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Home
                        </Button>
                    </Link>
                    <Link to="/dashboard">
                        <Button className="w-full sm:w-auto">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Go to Dashboard
                        </Button>
                    </Link>
                </motion.div>
            </div>
        </div>
    );
};
