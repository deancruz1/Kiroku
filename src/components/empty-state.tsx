import { cn } from "@/lib/utils";

export function EmptyState({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-rule py-3", className)}>
      <p className="italic text-muted-foreground">{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
