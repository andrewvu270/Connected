"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import Link from "next/link";

import { supabase } from "../../src/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function signIn() {
    setStatus(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Signed in");
    window.location.href = "/practice";
  }

  async function signUp() {
    setStatus(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Signed up. If email confirmation is enabled, check your inbox.");
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
