import { cn } from "@/lib/utils";

export function PageHeading({
  title,
  description,
  rule = false,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  rule?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8",
        rule && "border-b border-foreground pb-3.5 md:pb-5",
        className,
      )}
    >
      <div>
        <h1 className="type-display-sm md:type-display">{title}</h1>
        {description && (
          <p className="mt-2.5 max-w-[65ch] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 md:gap-[18px]">
          {children}
        </div>
      )}
    </div>
  );
}
