import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent text-base leading-none whitespace-nowrap transition-colors select-none hover:no-underline disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:stroke-[1.75] [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-vermilion bg-vermilion text-vermilion-foreground hover:border-vermilion/90 hover:bg-vermilion/90",
        outline:
          "border-control bg-transparent text-foreground hover:bg-plate aria-expanded:bg-plate",
        secondary:
          "bg-plate text-foreground hover:bg-plate/70 aria-expanded:bg-plate/70",
        ghost:
          "bg-transparent text-muted-foreground hover:text-foreground aria-expanded:text-foreground",
        destructive:
          "border-vermilion bg-transparent text-vermilion hover:bg-vermilion hover:text-vermilion-foreground",
        link: "text-foreground underline decoration-1 underline-offset-3 hover:text-vermilion hover:underline",
      },
      size: {
        default:
          "h-10 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2 text-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-[15px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 px-5 text-[17px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10 rounded-full [&_svg:not([class*='size-'])]:size-[18px]",
        "icon-xs":
          "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-8 rounded-full [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-10 rounded-full [&_svg:not([class*='size-'])]:size-5",
      },
    },
    compoundVariants: [
      {
        variant: "ghost",
        size: ["icon", "icon-xs", "icon-sm", "icon-lg"],
        class: "hover:bg-plate aria-expanded:bg-plate",
      },
      { variant: "ghost", size: "default", class: "px-2" },
      { variant: "link", class: "h-auto min-h-10 px-0" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
