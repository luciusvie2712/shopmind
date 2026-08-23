import { RegisterForm } from "@/features/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Create your account
      </h1>
      <p className="mb-7 mt-2 text-slate-600">
        Persist carts, wishlists, and simulated orders.
      </p>
      <RegisterForm />
    </main>
  );
}
