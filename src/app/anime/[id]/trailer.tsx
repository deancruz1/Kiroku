"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

export function Trailer({
  youtubeId,
  thumbnail,
  title,
}: {
  youtubeId: string;
  thumbnail: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // The button is gone once playing starts, so focus goes to the player
  // straight away rather than dropping to the page.
  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  return (
    <div className="relative aspect-video max-w-3xl bg-plate">
      {playing ? (
        <iframe
          ref={frameRef}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
          title={`${title} trailer`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => frameRef.current?.focus()}
          className="size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 cursor-pointer overflow-hidden"
        >
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width: 767px) 100vw, 768px"
            className="object-cover"
          />
          <span className="absolute bottom-4 left-4 inline-flex h-10 items-center gap-2 rounded-sm border border-foreground bg-background px-4 text-[17px] text-foreground transition-colors group-hover:bg-plate">
            <Play aria-hidden="true" className="size-4 fill-current" />
            Play
            <span className="sr-only"> the trailer for {title}</span>
          </span>
        </button>
      )}
    </div>
  );
}
