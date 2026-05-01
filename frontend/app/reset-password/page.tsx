import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="New password"
      title="Secure your account"
      copy="Choose a stronger password before returning to your focus world."
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
