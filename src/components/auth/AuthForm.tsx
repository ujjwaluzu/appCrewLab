"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { humanizeAuthError } from "@/lib/auth-errors";
import { getAuthCallbackUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    if (isSignup && password.length < 8) {
      setError("Your password should be at least 8 characters.");
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const result = isSignup
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: getAuthCallbackUrl() },
          })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (result.error) {
        setError(humanizeAuthError(result.error.message));
        return;
      }

      if (isSignup && !result.data.session) {
        setNotice("Check your email. We sent you a confirmation link to continue setting up CrewLab.");
        return;
      }

      router.replace(isSignup ? "/onboarding" : "/home");
      router.refresh();
    } catch {
      setError("CrewLab is not connected yet. Check the Supabase environment settings and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (notice) {
    return (
      <div className="animate-fade-in">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Almost there</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-[-0.055em] text-[#17251f]">Check your email.</h1>
        <p className="mt-5 text-base leading-7 text-[#59665d]">{notice}</p>
        <Link href="/auth/login" className="mt-9 inline-flex rounded-full bg-[#17251f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#25372f]">Go to log in</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">{isSignup ? "Create your account" : "Welcome back"}</p>
      <h1 className="text-4xl font-semibold leading-tight tracking-[-0.055em] text-[#17251f]">{isSignup ? "Make room for good work." : "Good to see you again."}</h1>
      <p className="mt-4 text-base leading-7 text-[#59665d]">{isSignup ? "Start with the basics. You can shape your profile next." : "Log in and pick up where you left off."}</p>

      <form onSubmit={handleSubmit} className="mt-9 space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#33433a]">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="form-input" placeholder="you@example.com" aria-invalid={Boolean(error)} />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-semibold text-[#33433a]">Password</label>
            {!isSignup ? <Link href="/auth/reset-password" className="text-xs font-semibold text-[#59665d] underline decoration-[#b7c58b] decoration-2 underline-offset-4 hover:text-[#17251f]">Forgot password?</Link> : null}
          </div>
          <input id="password" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="form-input" placeholder="••••••••" aria-invalid={Boolean(error)} />
        </div>
        {isSignup ? (
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-[#33433a]">Confirm password</label>
            <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="form-input" placeholder="••••••••" aria-invalid={Boolean(error)} />
          </div>
        ) : null}

        {error ? <p className="rounded-xl border border-[#bd5d4d]/25 bg-[#fff3f0] px-4 py-3 text-sm leading-6 text-[#9e4639]" role="alert">{error}</p> : null}

        <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#17251f] px-6 py-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,37,31,0.14)] transition hover:-translate-y-0.5 hover:bg-[#25372f] disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? (isSignup ? "Creating account…" : "Signing in…") : isSignup ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[#69766e]">
        {isSignup ? "Already have an account?" : "New to CrewLab?"}{" "}
        <Link href={isSignup ? "/auth/login" : "/auth/signup"} className="font-semibold text-[#17251f] underline decoration-[#b7c58b] decoration-2 underline-offset-4 hover:decoration-[#17251f]">{isSignup ? "Log in" : "Create an account"}</Link>
      </p>
    </div>
  );
}
