import * as React from "react";
import { cn } from "../../lib/utils";

// Lightweight passthroughs implementing the same named exports the admin pages expect.
export const Select = ({ children, className, ...props }: any) => {
  return (
    <div className={cn("inline-block w-full", className)} {...props}>
      {children}
    </div>
  );
};

export const SelectTrigger = ({ children, className, ...props }: any) => (
  <div className={cn("w-full", className)} {...props}>
    {children}
  </div>
);

export const SelectContent = ({ children, className, ...props }: any) => (
  <div className={cn("mt-1 w-full rounded-md border border-input bg-popover p-1", className)} {...props}>
    {children}
  </div>
);

export const SelectItem = ({ children, value, className, ...props }: any) => (
  <div data-value={value} className={cn("px-2 py-1 text-sm hover:bg-accent/10 cursor-pointer", className)} {...props}>
    {children}
  </div>
);

export const SelectValue = ({ children, className, ...props }: any) => (
  <span className={cn("inline-block", className)} {...props}>{children}</span>
);

export default Select;
