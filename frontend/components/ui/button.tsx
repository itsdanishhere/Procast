import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-cyan text-[#071019] shadow-[0_0_32px_rgba(99,179,237,0.32)] hover:bg-[#90cdf4] hover:shadow-[0_0_44px_rgba(99,179,237,0.45)]",
        secondary:
          "border border-white/12 bg-white/[0.06] text-foreground hover:border-white/20 hover:bg-white/[0.1]",
        ghost: "text-muted hover:bg-white/[0.06] hover:text-foreground",
        danger:
          "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15 hover:text-white",
        success:
          "bg-mint text-[#071019] shadow-[0_0_28px_rgba(118,228,167,0.24)] hover:bg-[#9af0be]"
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-5",
        lg: "h-[52px] px-7 text-base",
        icon: "h-10 w-10 p-0"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { buttonVariants };
