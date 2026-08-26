import { LoginForm } from "@/features/auth/login-form";
import { AuthShell } from "@/features/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in to your account"
      description="Sign in to access your saved shopping data."
      alternatePrompt="Don't have an account?"
      alternateLabel="Create one"
      alternateHref="/register"
      supportTitle="Welcome back"
      supportDescription="Sign in to access your saved shopping data."
    >
      <LoginForm />
    </AuthShell>
  );
}
