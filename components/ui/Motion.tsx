import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface MotionWrapperProps extends HTMLMotionProps<'div'> {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
}

export const FadeIn: React.FC<MotionWrapperProps> = ({
    children,
    delay = 0,
    duration = 0.5,
    className,
    ...props
}) => (
    <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration, delay, ease: "easeOut" }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);

export const SlideUp: React.FC<MotionWrapperProps> = ({
    children,
    delay = 0,
    duration = 0.5,
    className,
    ...props
}) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration, delay, ease: "easeOut" }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);

export const StaggerContainer: React.FC<MotionWrapperProps & { staggerDelay?: number }> = ({
    children,
    staggerDelay = 0.1,
    className,
    ...props
}) => (
    <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        variants={{
            hidden: { opacity: 0 },
            show: {
                opacity: 1,
                transition: {
                    staggerChildren: staggerDelay
                }
            }
        }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);

export const ScaleIn: React.FC<MotionWrapperProps> = ({
    children,
    delay = 0,
    duration = 0.4,
    className,
    ...props
}) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration, delay }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);
