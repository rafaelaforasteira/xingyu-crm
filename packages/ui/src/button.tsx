import * as React from "react";
import { cn } from "./cn";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm",
          variant === "secondary" &&
            "bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:opacity-90",
          variant === "ghost" && "bg-transparent hover:bg-black/5 text-[var(--color-text)]",
          variant === "outline" &&
            "border border-[var(--color-border)] bg-white hover:bg-black/[0.02]",
          variant === "danger" && "bg-[var(--color-danger)] text-white hover:opacity-90",
          size === "sm" && "h-8 px-3 text-sm",
          size === "md" && "h-10 px-4 text-sm",
          size === "lg" && "h-11 px-5 text-base",
          size === "icon" && "h-10 w-10",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
