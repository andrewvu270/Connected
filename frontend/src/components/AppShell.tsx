"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
        "inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium transition " +
        (active ? "bg-card text-text shadow-soft" : "text-muted hover:text-text")
      }
    >
      {label}
    </Link>
  );
}

export default function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Connected
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/practice" label="Practice" />
              <NavLink href="/feed" label="Feed" />
              <NavLink href="/brief" label="Brief" />
              <NavLink href="/learning-path" label="Lessons" />
              <NavLink href="/mascot" label="Mascot" />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {actions ? <div className="hidden sm:block">{actions}</div> : null}
            <NavLink href="/profile" label="Profile" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        {(title || subtitle) ? (
          <div className="mb-8">
            {title ? <h1 className="text-2xl font-semibold tracking-tight">{title}</h1> : null}
            {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p> : null}
          </div>
        ) : null}

        {children}
      </main>
    </div>
  );
}
