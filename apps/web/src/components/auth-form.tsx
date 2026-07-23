"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "../lib/auth-client";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/create";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "sign-up";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = isSignUp
      ? await signUp.email({ email, password, name })
      : await signIn.email({ email, password });

    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Something went wrong");
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    await signIn.social({ provider: "google", callbackURL: next });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        {isSignUp ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mb-6 text-sm text-muted">
        {isSignUp
          ? "Start printing your first poster in minutes."
          : "Sign in to upload, customise, and track orders."}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {isSignUp && (
          <Field
            label="Name"
            type="text"
            value={name}
            onChange={setName}
            autoComplete="name"
            required
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={8}
        />

        {error && (
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-md bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        OR
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={handleGoogle}
        className="rounded-md border border-border px-4 py-2.5 font-medium transition hover:bg-border/40"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-muted">
        {isSignUp ? "Already have an account? " : "New here? "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-medium text-accent hover:underline"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-card px-3 py-2 outline-none focus:border-accent"
      />
    </label>
  );
}
