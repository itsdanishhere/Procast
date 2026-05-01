import * as React from "react";

import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 text-sm text-foreground outline-none transition placeholder:text-white/30 focus:border-cyan focus:ring-2 focus:ring-cyan/15",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
