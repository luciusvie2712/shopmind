import { RegisterForm } from "@/features/auth/register-form";
import { AuthShell } from "@/features/auth/auth-shell";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Persist carts, wishlists, and simulated orders."
      alternatePrompt="Already registered?"
      alternateLabel="Sign in"
      alternateHref="/login"
      supportTitle="Create your account"
      supportDescription="Persist carts, wishlists, and simulated orders."
    >
      <RegisterForm />
    </AuthShell>
  );
}
