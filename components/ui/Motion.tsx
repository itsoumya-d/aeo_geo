import React from 'react';
import { motion, HTMLMotionProps, useReducedMotion } from 'framer-motion';

interface MotionWrapperProps extends HTMLMotionProps<'div'> {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
}

export const FadeIn: React.FC<MotionWrapperProps> = ({
    children,
    delay = 0,
    duration = 0.65,
    className,
    ...props
}) => {
    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export const SlideUp: React.FC<MotionWrapperProps> = ({
    children,
    delay = 0,
    duration = 0.7,
    className,
    ...props
}) => {
    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 42, scale: 0.975 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export const StaggerContainer: React.FC<MotionWrapperProps & { staggerDelay?: number }> = ({
    children,
    staggerDelay = 0.1,
    className,
    ...props
}) => {
    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
                hidden: { opacity: reduceMotion ? 1 : 0 },
                show: {
                    opacity: 1,
                    transition: {
                        staggerChildren: reduceMotion ? 0 : staggerDelay
                    }
                }
            }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
};

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
