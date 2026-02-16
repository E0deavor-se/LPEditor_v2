"use client";

import { useEffect, useMemo, useState } from "react";
import EditorLayout from "@/src/components/editor/EditorLayout";
import { getDb } from "@/src/db/db";
import { createProjectFromTemplate } from "@/src/store/editorStore";
import {
  TEMPLATE_OPTIONS,
  TEMPLATE_STORAGE_KEY,
} from "@/src/lib/templateOptions";

type LaunchStage =
  | "loading"
  | "login"
  | "choice"
  | "template"
  | "editor";

const STORAGE_KEYS = {
  loggedIn: "lp-editor-auth",
  hasRun: "lp-editor-has-run",
  lastProject: "lp-editor-last-project",
};

const LOADING_DELAY_MS = 700;

const readFlag = (key: string) =>
  typeof window !== "undefined" && window.localStorage.getItem(key) === "1";

const writeFlag = (key: string, value: boolean) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, value ? "1" : "0");
};

const writeValue = (key: string, value: string) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, value);
};

export default function Home() {
  const [stage, setStage] = useState<LaunchStage>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(
    TEMPLATE_OPTIONS[0]?.id ?? ""
  );

  const emailError = useMemo(() => {
    const trimmed = email.trim();
    if (trimmed.length === 0) {
      return "メールを入力してください / Enter your email.";
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      return "メール形式が正しくありません / Enter a valid email.";
    }
    return "";
  }, [email]);

  const passwordError = useMemo(() => {
    const trimmed = password.trim();
    if (trimmed.length === 0) {
      return "パスワードを入力してください / Enter your password.";
    }
    if (trimmed.length < 8) {
      return "8文字以上にしてください / Use 8+ characters.";
    }
    return "";
  }, [password]);

  const showEmailError = (emailTouched || submitAttempted) && emailError;
  const showPasswordError =
    (passwordTouched || submitAttempted) && passwordError;
  const isFormValid = emailError === "" && passwordError === "";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loggedIn = readFlag(STORAGE_KEYS.loggedIn);
      if (!loggedIn) {
        setStage("login");
        return;
      }
      const hasRun = readFlag(STORAGE_KEYS.hasRun);
      setStage(hasRun ? "choice" : "template");
    }, LOADING_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!isFormValid) {
      return;
    }
    writeFlag(STORAGE_KEYS.loggedIn, true);
    const hasRun = readFlag(STORAGE_KEYS.hasRun);
    setStage(hasRun ? "choice" : "template");
  };

  const handleTemplateStart = async () => {
    const option = TEMPLATE_OPTIONS.find((entry) => entry.id === selectedTemplate);
    if (!option) {
      return;
    }
    writeFlag(STORAGE_KEYS.hasRun, true);
    writeValue(STORAGE_KEYS.lastProject, option.title);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, option.id);
    }
    const project = createProjectFromTemplate(
      option.templateType,
      option.title,
      option.sectionOrder
    );
    try {
      const db = await getDb();
      await db.projects.put({
        id: "project_default",
        data: project,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Failed to save template project", error);
    }
    setStage("editor");
  };

  const handleResume = () => {
    setStage("editor");
  };

  const handleStartFromTemplate = () => {
    setStage("template");
  };

  const handleLogout = () => {
    writeFlag(STORAGE_KEYS.loggedIn, false);
    setStage("login");
  };

  if (stage === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <div className="text-center">
            <p className="text-lg font-semibold">Launching LP Editor</p>
            <p className="text-sm text-slate-500">
              Preparing your workspace...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "login") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),rgba(248,250,252,0))]" />
          <div className="absolute -right-32 top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.16),rgba(248,250,252,0))]" />
          <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(244,114,182,0.12),rgba(248,250,252,0))]" />
        </div>
        <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Workspace Access / ワークスペース
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                LP Editor
              </h1>
              <p className="mt-4 max-w-xl text-base text-slate-600">
                進行中のLP制作をこの端末で引き継ぎます。 / Resume your
                landing page production with a focused, minimal workflow.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Auto Resume",
                  body: "最後の作業をすぐ再開 / Pick up where you left off.",
                },
                {
                  title: "Guided Layouts",
                  body: "テンプレから最短で開始 / Start from curated layouts.",
                },
                {
                  title: "Focused Editing",
                  body: "UIを整理して集中 / Keep distractions away.",
                },
                {
                  title: "Export Ready",
                  body: "ZIP書き出しで即公開 / Ship-ready exports.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-4"
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {card.title}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{card.body}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-slate-200/70 via-white/60 to-slate-100/80 blur" />
            <form
              className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl"
              onSubmit={handleLogin}
            >
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Sign In / ログイン
                </p>
                <h2 className="text-2xl font-semibold">Continue editing</h2>
                <p className="text-sm text-slate-600">
                  アカウントでログインして作業を再開。
                </p>
              </div>
              <div className="mt-6 space-y-4">
                <label className="block text-sm text-slate-700">
                  Email / メール
                  <input
                    className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 ${
                      showEmailError ? "border-rose-400" : "border-slate-300"
                    }`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    type="email"
                    autoComplete="email"
                    required
                  />
                  {showEmailError ? (
                    <p className="mt-2 text-xs text-rose-600">
                      {emailError}
                    </p>
                  ) : null}
                </label>
                <label className="block text-sm text-slate-700">
                  Password / パスワード
                  <div className="relative mt-2">
                    <input
                      className={`w-full rounded-lg border bg-white px-4 py-3 pr-16 text-slate-900 outline-none transition focus:border-slate-900 ${
                        showPasswordError
                          ? "border-rose-400"
                          : "border-slate-300"
                      }`}
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-300 px-2 py-1 text-[10px] text-slate-700 transition hover:border-slate-500"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? "非表示" : "表示"}
                    </button>
                  </div>
                  {showPasswordError ? (
                    <p className="mt-2 text-xs text-rose-600">
                      {passwordError}
                    </p>
                  ) : null}
                </label>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  type="submit"
                  disabled={!isFormValid}
                >
                  Sign in
                </button>
                <button
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100"
                  type="button"
                  onClick={() => {
                    setEmail("demo@lp-editor.local");
                    setPassword("demo-password");
                  }}
                >
                  Quick demo login / デモで入る
                </button>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>Need help? / ヘルプが必要ですか</span>
                <div className="flex items-center gap-3">
                  <a className="transition hover:text-slate-900" href="#">
                    サポート
                  </a>
                  <a className="transition hover:text-slate-900" href="#">
                    FAQ
                  </a>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>
    );
  }

  if (stage === "template") {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-12 px-6 py-16">
          <header>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              First Launch
            </p>
            <h1 className="mt-3 text-4xl font-semibold">Choose a template</h1>
            <p className="mt-3 text-base text-slate-600">
              Start from a curated layout and jump into editing.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-3">
            {TEMPLATE_OPTIONS.map((template) => {
              const isActive = selectedTemplate === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`rounded-2xl border px-5 py-6 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-white"
                      : "border-slate-200 bg-white/80 hover:border-slate-400"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Template
                  </p>
                  <h2 className="mt-3 text-xl font-semibold">{template.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {template.description}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="button"
              onClick={handleTemplateStart}
            >
              Start editing
            </button>
            <button
              className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100"
              type="button"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "choice") {
    const lastProject =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEYS.lastProject)
        : null;

    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-10 px-6 py-16">
          <header>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Welcome Back / 再開
            </p>
            <h1 className="mt-4 text-4xl font-semibold">
              Continue or start fresh
            </h1>
            <p className="mt-3 text-base text-slate-600">
              前回の続きから再開するか、テンプレートから新規に始めるかを選択できます。
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={handleResume}
              className="rounded-2xl border border-slate-200 bg-white/90 p-6 text-left transition hover:border-slate-400"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Resume / 続きから
              </p>
              <h2 className="mt-3 text-xl font-semibold">Last session</h2>
              <p className="mt-2 text-sm text-slate-600">
                {lastProject
                  ? `最後の作業: ${lastProject}`
                  : "前回の作業を復元します。"}
              </p>
            </button>
            <button
              type="button"
              onClick={handleStartFromTemplate}
              className="rounded-2xl border border-slate-200 bg-white/90 p-6 text-left transition hover:border-slate-400"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Templates / テンプレート
              </p>
              <h2 className="mt-3 text-xl font-semibold">Start new</h2>
              <p className="mt-2 text-sm text-slate-600">
                テンプレートを選んで新規で始めます。
              </p>
            </button>
          </div>
          <div>
            <button
              type="button"
              className="text-sm text-slate-500 transition hover:text-slate-900"
              onClick={handleLogout}
            >
              ログアウト
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <EditorLayout />;
}
