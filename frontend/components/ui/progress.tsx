import { cn } from "@/lib/cn";

export function Progress({
  value,
  className,
  indicatorClassName
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-white/[0.08]", className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r from-cyan to-mint", indicatorClassName)}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
