"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  tone = "rule",
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & {
  tone?: "rule" | "ink"
}) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      data-tone={tone}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        tone === "ink" ? "bg-foreground" : "bg-rule",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
