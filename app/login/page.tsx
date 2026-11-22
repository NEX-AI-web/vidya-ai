
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";

import {
  auth,
  googleProvider,
  authPersistence,
} from "@/lib/firebase";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  // Email Login
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    clearMessages();

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      await authPersistence;

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      router.replace("/onboarding");
    } catch (err: any) {
      console.error("Login error:", err);

      const errorMessages: Record<string, string> = {
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-credential": "Invalid email or password.",
        "auth/user-disabled": "This account has been disabled.",
        "auth/too-many-requests": "Too many attempts. Please try later.",
        "auth/network-request-failed": "Network error. Check your internet.",
      };

      setError(
        errorMessages[err.code] ||
          err.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Create Account
  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    clearMessages();

    if (!name.trim() || !email.trim() || !password) {
      setError("Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      await authPersistence;

      const result = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(result.user, {
        displayName: name.trim(),
      });

      router.replace("/onboarding");
    } catch (err: any) {
      console.error("Signup error:", err);

      const errorMessages: Record<string, string> = {
        "auth/email-already-in-use":
          "This email is already registered. Please login.",
        "auth/invalid-email":
          "Please enter a valid email address.",
        "auth/weak-password":
          "Please choose a stronger password.",
        "auth/network-request-failed":
          "Network error. Check your internet.",
      };

      setError(
        errorMessages[err.code] ||
          err.message ||
          "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  }

  // Google Login
  async function handleGoogleLogin() {
    clearMessages();
    setLoading(true);

    try {
      await authPersistence;

      await signInWithPopup(auth, googleProvider);

      router.replace("/onboarding");
    } catch (err: any) {
      console.error("Google login error:", err);

      if (err.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was cancelled.");
      } else {
        setError(
          err.message || "Google login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // Forgot Password
  async function handleForgotPassword() {
    clearMessages();

    if (!email.trim()) {
      setError("Enter your registered email address first.");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());

      setSuccess(
        "Password reset link sent. Please check your email."
      );
    } catch (err: any) {
      console.error("Password reset error:", err);

      setError(
        err.message || "Unable to send password reset email."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-10">

      {/* Background Effects */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">

        {/* Branding */}
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl font-black text-white shadow-xl shadow-indigo-500/30">
            V
          </div>

          <p className="mt-4 text-sm font-bold tracking-[.3em] text-cyan-300">
            VIDYA AI
          </p>

          <h1 className="mt-2 text-3xl font-black text-white">
            The Last-Mile Tutor
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Your personal AI learning companion.
          </p>
        </div>

        {/* Login Card */}
        <section className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">

          {/* Login / Signup Switch */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                clearMessages();
              }}
              className={`rounded-lg py-3 text-sm font-bold transition ${
                mode === "login"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                clearMessages();
              }}
              className={`rounded-lg py-3 text-sm font-bold transition ${
                mode === "signup"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === "login"
                ? "Welcome Back!"
                : "Create Your Account"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {mode === "login"
                ? "Login to continue learning with Vidya AI."
                : "Create an account to start your learning journey."}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={
              mode === "login" ? handleLogin : handleSignup
            }
            className="mt-6 space-y-4"
          >

            {mode === "signup" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  className={inputClass}
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email Address
              </label>

              <input
                type="email"
                className={inputClass}
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${inputClass} pr-16`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sm font-semibold text-indigo-600 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-5 py-4 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login to Vidya AI"
                : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">
              OR CONTINUE WITH
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <svg
              viewBox="0 0 48 48"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.24 5.48-4.7 7.18l7.2 5.59c4.2-3.88 7.54-9.64 7.54-17.24Z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a23.95 23.95 0 0 0 0 21.56l7.98-6.19Z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.91-5.79l-7.2-5.59c-2 1.34-4.56 2.13-8.71 2.13-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
              />
            </svg>

            Continue with Google
          </button>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          By continuing, you agree to use Vidya AI for educational purposes.
        </p>

        <p className="mt-3 text-center text-xs font-semibold text-slate-500">
          © 2026 Vidya AI
        </p>
      </div>
    </main>
  );
}
