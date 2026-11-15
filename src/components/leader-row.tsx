import { cn } from "@/lib/utils";

export function LeaderList({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return <ul className={cn("m-0 list-none p-0", className)} {...props} />;
}

export function LeaderRow({
  label,
  value,
  share,
  muted = false,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  share?: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "flex items-baseline gap-2.5 py-[7px] text-lg leading-[1.45]",
        muted && "text-muted-foreground",
        className,
      )}
    >
      <span className="inline-flex items-center gap-[9px] whitespace-nowrap">
        {label}
      </span>
      <span aria-hidden="true" className="leader" />
      <span className="min-w-[3ch] text-right">{value}</span>
      {share !== undefined && (
        <span className="min-w-[4.5ch] text-right text-base text-muted-foreground">
          {share}
        </span>
      )}
    </li>
  );
}
