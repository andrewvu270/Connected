"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import Link from "next/link";

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
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 420 }}>
      <h1 style={{ margin: 0 }}>Login</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Use email + password (MVP)
      </p>

      <label style={{ display: "block", marginTop: 16 }}>
        Email
        <input
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>
        Password
        <input
          value={password}
          type="password"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        />
      </label>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={signIn} style={{ padding: "10px 12px" }}>
          Sign In
        </button>
        <button onClick={signUp} style={{ padding: "10px 12px" }}>
          Sign Up
        </button>
      </div>

      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}

      <p style={{ marginTop: 16 }}>
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
