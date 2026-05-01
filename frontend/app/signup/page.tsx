import { SignupForm } from "@/components/auth/signup-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Create account"
      title="Build discipline"
      copy="Start with empty land and turn completed focus sessions into a world you will want to protect."
    >
      <SignupForm />
    </AuthShell>
  );
}
