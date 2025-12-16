"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type PageTransitionProps = {
    children: ReactNode;
};

export function PageTransition({ children }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{
                duration: 0.5,
                ease: [0.25, 0.1, 0.25, 1] // Custom ease out curve
            }}
        >
            {children}
        </motion.div>
    );
}
