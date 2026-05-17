import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { useEffect } from "react";

export default function Auth() {
  const { user, loading, signInWithGoogle, signInWithGithub } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden bg-[var(--background)]">
      <div className="pointer-events-none absolute inset-x-8 top-16 h-px bg-[linear-gradient(90deg,transparent,var(--edge-strong),transparent)]" />
      <div className="pointer-events-none absolute bottom-24 left-1/2 h-40 w-px rotate-45 bg-[linear-gradient(180deg,transparent,var(--accent-warm),transparent)] opacity-40" />

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-[var(--primary)] mb-6 shadow-[0_18px_45px_-24px_var(--glow-strong)] animate-pulse-glow">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="var(--primary-foreground)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="var(--primary-foreground)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="var(--primary-foreground)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--foreground)] mb-2">
            purplexity
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] max-w-xs mx-auto leading-relaxed">
            AI-powered search that thinks deeper.
            <br />
            Get comprehensive answers with real sources.
          </p>
        </div>

        {/* Auth buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={signInWithGoogle}
            className="
              group w-full flex items-center justify-center gap-3
              px-6 py-3.5 rounded-lg
              bg-[#f2efe5] text-[#17201c]
              font-medium text-sm
              transition-all duration-200
              cursor-pointer
              hover:shadow-[0_18px_36px_-28px_rgba(242,239,229,0.8)]
              hover:scale-[1.01]
              active:scale-[0.99]
            "
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={signInWithGithub}
            className="
              group w-full flex items-center justify-center gap-3
              px-6 py-3.5 rounded-lg
              bg-[var(--surface-glass)] border border-[var(--border)]
              text-[var(--foreground)]
              font-medium text-sm
              transition-all duration-200
              cursor-pointer
              hover:border-[var(--edge-strong)]
              hover:bg-[var(--surface-glass-hover)]
              hover:scale-[1.01]
              active:scale-[0.99]
            "
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[var(--muted-foreground)] mt-8 opacity-50">
          By continuing, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
