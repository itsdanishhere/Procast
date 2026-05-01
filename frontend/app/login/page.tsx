import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Return to your world"
      copy="Your tasks, streak, XP, and unlocks continue exactly where you left them."
    >
      <LoginForm />
    </AuthShell>
  );
}
