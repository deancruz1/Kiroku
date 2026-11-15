"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const BOX = {
  xs: "h-10 w-[30px]",
  sm: "h-12 w-9",
  lg: "h-[147px] w-[110px]",
  fluid: "aspect-3/4 w-full",
} as const;

const IMAGE_SIZES = {
  xs: "30px",
  sm: "36px",
  lg: "110px",
  fluid: "(max-width: 640px) 50vw, 200px",
} as const;

export function Poster({
  src,
  title,
  size = "sm",
  standalone = false,
  sizes,
  priority,
  className,
}: {
  src?: string | null;
  title: string;
  size?: keyof typeof BOX;
  standalone?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!src && failedSrc !== src;
  const printTitle = size === "lg" || size === "fluid";

  return (
    <span
      data-slot="poster"
      role={!showImage && standalone ? "img" : undefined}
      aria-label={!showImage && standalone ? title : undefined}
      aria-hidden={!showImage && !standalone ? true : undefined}
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-sm bg-plate",
        BOX[size],
        className,
      )}
    >
      {showImage ? (
        <Image
          src={src}
          alt={standalone ? title : ""}
          fill
          sizes={sizes ?? IMAGE_SIZES[size]}
          priority={priority}
          className="object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        printTitle && (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-end overflow-hidden p-1.5 text-xs leading-[1.15] text-plate-foreground"
          >
            {title}
          </span>
        )
      )}
    </span>
  );
}
