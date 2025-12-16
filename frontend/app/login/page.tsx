"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import Link from "next/link";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
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
    <main className="min-h-screen bg-gradient-to-br from-bg via-surface to-primary-subtle/20 flex items-center justify-center px-8 py-16">
      <div className="w-full max-w-lg">
        <div className="text-center mb-3xl">
          <Link href="/" className="inline-block text-2xl font-bold tracking-tight text-text hover:text-primary transition-colors mb-lg">
            Connected
          </Link>
          <p className="text-body-lg text-muted">Welcome back to your learning journey</p>
        </div>

        <Card variant="elevated" className="shadow-2xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-headline">Sign in</CardTitle>
            <CardDescription className="text-body">Enter your credentials to continue learning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-xl">
            <div className="space-y-sm">
              <label className="text-body-sm font-medium text-text-secondary">Email</label>
              <Input 
                variant="filled"
                placeholder="Enter your email"
                value={email} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} 
              />
            </div>

            <div className="space-y-sm">
              <label className="text-body-sm font-medium text-text-secondary">Password</label>
              <Input
                variant="filled"
                placeholder="Enter your password"
                value={password}
                type="password"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-lg pt-lg">
              <Button variant="primary" size="lg" className="w-full shadow-lg hover:shadow-xl" onClick={signIn}>
                Sign in
              </Button>
              <Button variant="secondary" size="lg" className="w-full" onClick={signUp}>
                Create new account
              </Button>
            </div>

            {status && (
              <div className={`rounded-xl p-lg text-center text-body-sm ${
                status.includes('failed') || status.includes('error') 
                  ? 'bg-error-subtle text-error border border-error/20' 
                  : 'bg-success-subtle text-success border border-success/20'
              }`}>
                {status}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-2xl text-center">
          <Link href="/" className="text-body-sm text-muted hover:text-text transition-colors font-medium">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
