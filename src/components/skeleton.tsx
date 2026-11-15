import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-sm bg-plate motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
