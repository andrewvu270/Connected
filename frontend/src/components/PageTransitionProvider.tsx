"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type PageTransitionProviderProps = {
    children: ReactNode;
};

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
    const pathname = usePathname();

    return (
        <AnimatePresence mode="wait">
            <div key={pathname}>
                {children}
            </div>
        </AnimatePresence>
    );
}
