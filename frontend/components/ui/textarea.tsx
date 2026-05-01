import * as React from "react";

import { cn } from "@/lib/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full resize-none rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-white/30 focus:border-cyan focus:ring-2 focus:ring-cyan/15",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
