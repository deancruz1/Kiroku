import { cn } from "@/lib/utils";

export function InlineMessage({
  tone = "error",
  className,
  ...props
}: React.ComponentProps<"p"> & { tone?: "error" | "success" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      data-tone={tone}
      className={cn(
        "text-base",
        tone === "error" ? "text-vermilion" : "text-foreground",
        className,
      )}
      {...props}
    />
  );
}
