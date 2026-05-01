import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

export function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const score = getPasswordStrength(password);
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
  const colors = ["bg-danger", "bg-amber", "bg-amber", "bg-mint", "bg-mint"];

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-xs font-bold">
        <span className="text-muted">Password strength</span>
        <span className={cn(score >= 4 ? "text-mint" : score >= 2 ? "text-amber" : "text-danger")}>
          {labels[Math.max(0, score - 1)]}
        </span>
      </div>
      <Progress value={(score / 5) * 100} indicatorClassName={colors[Math.max(0, score - 1)]} />
    </div>
  );
}
