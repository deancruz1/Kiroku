import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <span data-slot="native-select" className="relative inline-flex">
      <select
        className={cn(
          "h-10 cursor-pointer appearance-none rounded-none border-0 border-b border-control bg-transparent pr-7 pl-0.5 text-base text-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive [&>option]:bg-raised [&>option]:text-foreground",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-1 size-3 -translate-y-1/2 stroke-[2.5] text-control"
      />
    </span>
  )
}

export { NativeSelect }
