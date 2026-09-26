"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { humanizeAuthError } from "@/lib/auth-errors";
import { getSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/browser";

type ResetMode = "request" | "update" | "success";

export function ResetPasswordForm() {
  const router = useRouter();
  const [mode, setMode] = useState<ResetMode>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && isMounted) {
        setMode("update");
        setNotice("");
        setError("");
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted && data.session) {
        setMode("update");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getSiteUrl("/auth/reset-password"),
      });

      if (resetError) {
        setError(humanizeAuthError(resetError.message));
        return;
      }

      setNotice("If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.");
    } catch {
      setError("We could not send the reset email. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (password.length < 8) {
      setError("Your password should be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });

      if (updateError) {
        setError(humanizeAuthError(updateError.message));
        return;
      }

      await createClient().auth.signOut();
      setPassword("");
      setConfirmPassword("");
      setMode("success");
    } catch {
      setError("We could not update your password. Please request a new reset link and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (mode === "success") {
    return (
      <div className="animate-fade-in">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Password updated</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-[-0.055em] text-[#17251f]">You&apos;re ready to log in.</h1>
        <p className="mt-5 text-base leading-7 text-[#59665d]">Your password has been changed successfully. Use it to continue building with CrewLab.</p>
        <Link href="/auth/login" className="mt-9 inline-flex rounded-full bg-[#17251f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#25372f]">Go to log in</Link>
      </div>
    );
  }

  if (mode === "update") {
    return (
      <div className="animate-fade-in">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Create a new password</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-[-0.055em] text-[#17251f]">Make it something only you know.</h1>
        <p className="mt-4 text-base leading-7 text-[#59665d]">Choose a new password to secure your CrewLab account.</p>

        <form onSubmit={updatePassword} className="mt-9 space-y-5" noValidate>
          <div>
            <label htmlFor="new-password" className="form-label">New password</label>
            <input id="new-password" name="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="form-input" placeholder="At least 8 characters" />
          </div>
          <div>
            <label htmlFor="confirm-new-password" className="form-label">Confirm new password</label>
            <input id="confirm-new-password" name="confirm-new-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="form-input" placeholder="Repeat your password" />
          </div>
          {error ? <p className="rounded-xl border border-[#bd5d4d]/25 bg-[#fff3f0] px-4 py-3 text-sm leading-6 text-[#9e4639]" role="alert">{error}</p> : null}
          <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center rounded-full bg-[#17251f] px-6 py-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,37,31,0.14)] transition hover:-translate-y-0.5 hover:bg-[#25372f] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Updating password..." : "Update password"}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Account recovery</p>
      <h1 className="text-4xl font-semibold leading-tight tracking-[-0.055em] text-[#17251f]">Reset your password.</h1>
      <p className="mt-4 text-base leading-7 text-[#59665d]">Enter your email and we&apos;ll send you a secure link to choose a new password.</p>

      <form onSubmit={requestReset} className="mt-9 space-y-5" noValidate>
        <div>
          <label htmlFor="reset-email" className="form-label">Email</label>
          <input id="reset-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="form-input" placeholder="you@example.com" aria-describedby="reset-help" />
          <p id="reset-help" className="mt-2 text-xs text-[#8a958d]">For your privacy, we&apos;ll show the same confirmation whether or not an account exists.</p>
        </div>
        {notice ? <p className="rounded-xl border border-[#b7c58b]/50 bg-[#f0f5df] px-4 py-3 text-sm leading-6 text-[#40513c]" role="status">{notice}</p> : null}
        {error ? <p className="rounded-xl border border-[#bd5d4d]/25 bg-[#fff3f0] px-4 py-3 text-sm leading-6 text-[#9e4639]" role="alert">{error}</p> : null}
        <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center rounded-full bg-[#17251f] px-6 py-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,37,31,0.14)] transition hover:-translate-y-0.5 hover:bg-[#25372f] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Sending reset link..." : "Send reset link"}</button>
      </form>

      <p className="mt-8 text-center text-sm text-[#69766e]"><Link href="/auth/login" className="font-semibold text-[#17251f] underline decoration-[#b7c58b] decoration-2 underline-offset-4 hover:decoration-[#17251f]">&larr; Back to log in</Link></p>
    </div>
  );
}
