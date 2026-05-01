import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Recovery"
      title="Reset access"
      copy="Password resets are token-based and expire quickly so account recovery stays deliberate."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
