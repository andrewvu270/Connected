"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import Link from "next/link";

import { Button } from "../../src/components/ui/Button";
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from "../../src/components/ui/Card";
import { Input } from "../../src/components/ui/Input";
import { login, signup } from "../../src/lib/authClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function signIn() {
    setStatus(null);
    try {
      const session = await login(email, password);
      if (!session.access_token) {
        setStatus("Signed in, but no session returned (email confirmation may be enabled). Check your inbox.");
        return;
      }
      setStatus("Signed in");
      window.location.href = "/practice";
    } catch (e: any) {
      setStatus(e?.message ?? "Login failed");
    }
  }

  async function signUp() {
    setStatus(null);
    try {
      const session = await signup(email, password);
      if (!session.access_token) {
        setStatus("Signed up. If email confirmation is enabled, check your inbox.");
        return;
      }
      setStatus("Signed up");
      window.location.href = "/practice";
    } catch (e: any) {
      setStatus(e?.message ?? "Signup failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Connected
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardSubtitle>Use email + password.</CardSubtitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="text-muted">Email</span>
              <Input value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-muted">Password</span>
              <Input
                value={password}
                type="password"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              />
            </label>

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Button variant="primary" onClick={signIn}>
                Sign in
              </Button>
              <Button onClick={signUp}>Create account</Button>
            </div>

            {status ? <div className="text-sm text-muted">{status}</div> : null}
          </CardContent>
        </Card>

        <div className="mt-6 text-sm text-muted">
          <Link href="/" className="hover:text-text">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
