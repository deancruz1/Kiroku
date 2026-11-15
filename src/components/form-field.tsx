"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { InlineMessage } from "@/components/inline-message";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  error,
  id,
  className,
  "aria-describedby": describedBy,
  ...props
}: React.ComponentProps<"input"> & {
  label: React.ReactNode;
  error?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const describe = [describedBy, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={inputId} className="mb-1.5 text-sm text-muted-foreground">
        {label}
      </label>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe || undefined}
        {...props}
      />
      {error && (
        <InlineMessage id={errorId} className="mt-1.5">
          {error}
        </InlineMessage>
      )}
    </div>
  );
}
