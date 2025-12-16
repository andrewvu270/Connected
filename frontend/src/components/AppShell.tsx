"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageTransition } from "./PageTransition";
import { MobileNav } from "../../components/ui/mobile-nav";
import { ProfileDropdown } from "./ProfileDropdown";

type AppShellProps = {
  title?: string | null;
  subtitle?: string | null;
  actions?: ReactNode;
  children: ReactNode;
};

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center rounded-lg px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap " +
        (active 
          ? "bg-primary-subtle text-primary shadow-sm border border-primary-muted/30" 
          : "text-muted hover:text-text hover:bg-surface-elevated")
      }
    >
      {label}
    </Link>
  );
}

export default function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/practice", label: "Practice" },
    { href: "/feed", label: "Feed" },
    { href: "/learning-path", label: "Lessons" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface/95 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5">
          {/* Logo */}
          <Link href="/" className="text-base sm:text-lg font-bold tracking-tight text-text hover:text-primary transition-colors flex-shrink-0">
            Connected
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <NavLink href="/dashboard" label="Dashboard" />
            <NavLink href="/practice" label="Practice" />
            <NavLink href="/feed" label="Feed" />
            <NavLink href="/learning-path" label="Lessons" />
          </nav>

          {/* Actions and Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {actions && (
              <div className="hidden sm:block">
                {actions}
              </div>
            )}
            
            {/* Desktop Profile Dropdown */}
            <div className="hidden lg:block">
              <ProfileDropdown />
            </div>
            
            {/* Mobile Navigation */}
            <div className="lg:hidden">
              <MobileNav 
                links={navLinks}
                actions={actions}
              />
            </div>
          </div>
        </div>
      </header>

      <PageTransition>
        <main className="mx-auto w-full max-w-7xl px-8 py-12">
          {(title || subtitle) ? (
            <div className="mb-12">
              {title ? <h1 className="text-headline text-text">{title}</h1> : null}
              {subtitle ? <p className="mt-3 max-w-3xl text-body-lg text-muted leading-relaxed">{subtitle}</p> : null}
            </div>
          ) : null}

          {children}
        </main>
      </PageTransition>
    </div>
  );
}
