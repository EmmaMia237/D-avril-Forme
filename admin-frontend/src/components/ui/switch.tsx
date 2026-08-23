import * as React from "react";
import { cn } from "../../lib/utils";

export const Switch = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, checked, ...props }, ref) => (
    <label className={cn("inline-flex items-center gap-2", className)}>
      <input ref={ref} type="checkbox" className="sr-only" checked={checked} {...props} />
      <span className={cn(
        "inline-block h-5 w-9 rounded-full transition-colors",
        checked ? "bg-accent" : "bg-muted",
      )} />
    </label>
  ),
);
Switch.displayName = "Switch";

export default Switch;
