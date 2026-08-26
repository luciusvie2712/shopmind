import Link from "next/link";
import type { ReactNode } from "react";
import authBackground from "@/assets/bg-auth.png";

type AuthShellProps = Readonly<{
  alternateHref: "/login" | "/register";
  alternateLabel: string;
  alternatePrompt: string;
  children: ReactNode;
  description: string;
  supportDescription: string;
  supportTitle: string;
  title: string;
}>;

export function AuthShell({
  alternateHref,
  alternateLabel,
  alternatePrompt,
  children,
  description,
  supportDescription,
  supportTitle,
  title,
}: AuthShellProps) {
  return (
    <main className="auth-shell" data-auth-shell>
      <div
        aria-hidden="true"
        className="auth-background-enter absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${authBackground.src})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-white/10 lg:bg-transparent"
      />

      <div className="app-shell relative flex min-h-[38rem] items-center justify-center py-10 sm:py-14 lg:min-h-[42rem] lg:py-16">
        <aside className="auth-support-enter absolute inset-y-0 left-10 hidden w-64 flex-col justify-center xl:flex">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700">
            ShopMind
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
            {supportTitle}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {supportDescription}
          </p>
        </aside>

        <section
          aria-labelledby="auth-title"
          className="auth-card-enter w-full max-w-[30rem] rounded-panel border border-slate-200/90 bg-white p-6 shadow-float sm:p-9"
        >
          <div className="text-center">
            <h1
              id="auth-title"
              className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl"
            >
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {alternatePrompt}{" "}
              <Link
                href={alternateHref}
                className="font-bold text-teal-700 underline-offset-4 transition-colors hover:text-teal-600 hover:underline"
              >
                {alternateLabel}
              </Link>
            </p>
            <p className="sr-only">{description}</p>
          </div>
          <div className="mt-7">{children}</div>
        </section>
      </div>
    </main>
  );
}
