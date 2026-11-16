import Link from "next/link";
import { cn } from "@/lib/utils";

const STYLES = {
  sm: { title: "text-[17px] leading-[1.25]", jp: "mt-0.5 truncate text-[13px]" },
  md: { title: "text-lg leading-[1.25]", jp: "mt-0.5 truncate text-[13px]" },
  lg: { title: "text-[22px] leading-[1.2]", jp: "mt-1 text-sm" },
} as const;

export function ShowTitle({
  title,
  japanese,
  href,
  size = "md",
  className,
}: {
  title: string;
  japanese?: string | null;
  href?: string;
  size?: keyof typeof STYLES;
  className?: string;
}) {
  const style = STYLES[size];
  return (
    <div className={cn("min-w-0", className)}>
      {href ? (
        // The show page's prefetch runs generateMetadata, which costs an
        // upstream request per visible show.
        <Link href={href} prefetch={false} className={cn("block", style.title)}>
          {title}
        </Link>
      ) : (
        <span className={cn("block", style.title)}>{title}</span>
      )}
      {japanese && japanese !== title && (
        <span lang="ja" className={cn("block text-muted-foreground", style.jp)}>
          {japanese}
        </span>
      )}
    </div>
  );
}
