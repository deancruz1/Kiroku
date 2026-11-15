import { cn } from "@/lib/utils";

export type WatchStatus = "watching" | "plan_to_watch" | "completed" | "dropped";

export const STATUS_ORDER: WatchStatus[] = [
  "watching",
  "plan_to_watch",
  "completed",
  "dropped",
];

export const STATUS_LABEL: Record<WatchStatus, string> = {
  watching: "Watching",
  plan_to_watch: "Plan to watch",
  completed: "Completed",
  dropped: "Dropped",
};

const PIXELS = { sm: 13, md: 15 } as const;

export function StatusGlyph({
  status,
  size = "sm",
}: {
  status: WatchStatus;
  size?: keyof typeof PIXELS;
}) {
  const px = PIXELS[size];
  const c = px / 2;
  const r = c - 1;
  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
      />
      {status === "watching" && (
        <path d={`M${c} ${c - r}a${r} ${r} 0 0 1 0 ${2 * r}z`} fill="currentColor" />
      )}
      {status === "completed" && (
        <circle cx={c} cy={c} r={r} fill="currentColor" />
      )}
      {status === "dropped" && (
        <path
          d={`M${c - r * 0.7} ${c + r * 0.7}L${c + r * 0.7} ${c - r * 0.7}`}
          stroke="currentColor"
          strokeWidth={1.4}
        />
      )}
    </svg>
  );
}

export function StatusMark({
  status,
  size = "sm",
  label = true,
  children,
  className,
}: {
  status: WatchStatus;
  size?: keyof typeof PIXELS;
  label?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[7px] whitespace-nowrap",
        status === "watching" && "text-vermilion",
        className,
      )}
    >
      <StatusGlyph status={status} size={size} />
      {label && STATUS_LABEL[status]}
      {children}
    </span>
  );
}
