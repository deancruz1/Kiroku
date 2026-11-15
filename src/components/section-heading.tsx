import { cn } from "@/lib/utils";

export function SectionHeading({
  as: Tag = "h2",
  rule = "none",
  aside,
  children,
  className,
  ...props
}: React.ComponentProps<"h2"> & {
  as?: "h2" | "h3";
  rule?: "none" | "below";
  aside?: React.ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "flex items-baseline gap-3 type-heading-sm md:type-heading",
        rule === "below" && "border-b border-foreground pb-2",
        className,
      )}
      {...props}
    >
      {children}
      {aside && (
        <span className="ml-auto text-base font-normal text-muted-foreground">
          {aside}
        </span>
      )}
    </Tag>
  );
}

export function Section({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-12 border-t border-foreground pt-3", className)}>
      <h2 className="mb-5 type-heading">{title}</h2>
      {children}
    </section>
  );
}
