import Link from "next/link";

import AppShell from "../src/components/AppShell";
import { Badge } from "../src/components/ui/Badge";
import { Button } from "../src/components/ui/Button";
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from "../src/components/ui/Card";

export default function Page() {
  return (
    <AppShell
      title="Connected"
      subtitle="Micro-lessons, deliberate practice, and a curated feed that makes you more conversational—fast."
      actions={
        <Link href="/login">
          <Button variant="primary">Sign in</Button>
        </Link>
      }
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <section>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">AI-personalized</Badge>
            <Badge>5-minute lessons</Badge>
            <Badge tone="accent">Practice-first</Badge>
          </div>

          <h2 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
            Become effortlessly conversational.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            A tight loop: learn one concept, practice it immediately, and stay current with high-signal stories and talk tracks.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button variant="primary">Get started</Button>
            </Link>
            <Link href="/dashboard">
              <Button>Open dashboard</Button>
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Learn</CardTitle>
                <CardSubtitle>Short lessons that stick.</CardSubtitle>
              </CardHeader>
              <CardContent className="text-sm text-muted">
                Clear, scannable concepts designed for real conversations.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Practice</CardTitle>
                <CardSubtitle>Drills with feedback.</CardSubtitle>
              </CardHeader>
              <CardContent className="text-sm text-muted">
                Roleplay sessions that build confidence through repetition.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Stay current</CardTitle>
                <CardSubtitle>Curated news.</CardSubtitle>
              </CardHeader>
              <CardContent className="text-sm text-muted">
                Balanced categories + smart questions you can use today.
              </CardContent>
            </Card>
          </div>
        </section>

        <aside>
          <Card variant="elevated" className="overflow-hidden">
            <CardHeader>
              <CardTitle>Today’s workflow</CardTitle>
              <CardSubtitle>One thing to learn. One drill to practice. One story to talk about.</CardSubtitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="rounded-xl border border-border bg-bg p-4">
                  <div className="text-xs font-medium text-muted">Brief</div>
                  <div className="mt-1 text-sm font-medium">High-signal summary</div>
                  <div className="mt-1 text-sm text-muted">Read in 2–3 minutes.</div>
                </div>
                <div className="rounded-xl border border-border bg-bg p-4">
                  <div className="text-xs font-medium text-muted">Practice</div>
                  <div className="mt-1 text-sm font-medium">One drill</div>
                  <div className="mt-1 text-sm text-muted">Get feedback after completion.</div>
                </div>
                <div className="rounded-xl border border-border bg-bg p-4">
                  <div className="text-xs font-medium text-muted">Lesson</div>
                  <div className="mt-1 text-sm font-medium">One micro-lesson</div>
                  <div className="mt-1 text-sm text-muted">Applied immediately.</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/feed" className="text-sm text-muted hover:text-text">
                  Explore feed
                </Link>
                <Link href="/learning-path" className="text-sm text-muted hover:text-text">
                  Browse lessons
                </Link>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
