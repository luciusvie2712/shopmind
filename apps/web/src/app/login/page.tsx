import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Welcome back
      </h1>
      <p className="mb-7 mt-2 text-slate-600">
        Sign in to access your saved shopping data.
      </p>
      <LoginForm />
    </main>
  );
}
