"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/section-heading";
import type { JikanReview } from "@/types/anime";

const INITIAL_SHOW = 2;
const EXPAND_BY = 3;
// Roughly what fits in five clamped lines at the 65 character measure;
// shorter reviews need no toggle.
const LONG_REVIEW_CHARS = 320;
const LONG_REVIEW_LINES = 5;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ReviewItem({ review }: { review: JikanReview }) {
  const textId = useId();
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hidden = review.is_spoiler && !showSpoiler;
  const isLong =
    review.review.length > LONG_REVIEW_CHARS ||
    review.review.split("\n").length > LONG_REVIEW_LINES;
  const date = review.date ? formatDate(review.date) : null;
  const tags = review.tags?.slice(0, 3) ?? [];

  return (
    <li className="border-b border-rule py-5 first:pt-0">
      <figure className="max-w-[65ch]">
        <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span>{review.user.username}</span>
          {typeof review.score === "number" && (
            <span>
              <span className="sr-only">Score </span>
              {review.score}
              <span className="text-muted-foreground"> /10</span>
            </span>
          )}
          {date && (
            <span className="text-[15px] text-muted-foreground">{date}</span>
          )}
          {(review.is_spoiler || tags.length > 0) && (
            <span className="text-[15px] text-muted-foreground">
              {[...tags, ...(review.is_spoiler ? ["Spoilers"] : [])].join(", ")}
            </span>
          )}
        </figcaption>

        {hidden ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4">
            <p className="italic text-muted-foreground">
              This review contains spoilers.
            </p>
            <Button
              type="button"
              variant="link"
              className="min-h-10"
              onClick={() => setShowSpoiler(true)}
            >
              Show review
            </Button>
          </div>
        ) : (
          <>
            <blockquote
              id={textId}
              className={`mt-2 border-l-2 border-rule pl-4 whitespace-pre-line ${
                expanded ? "" : "line-clamp-5"
              }`}
            >
              {review.review}
            </blockquote>
            {isLong && (
              <Button
                type="button"
                variant="link"
                className="mt-1 ml-4 min-h-10"
                aria-expanded={expanded}
                aria-controls={textId}
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? "Show less" : "Read more"}
              </Button>
            )}
          </>
        )}
      </figure>
    </li>
  );
}

export function ReviewsSection({ reviews }: { reviews: JikanReview[] }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_SHOW);

  if (!reviews || reviews.length === 0) return null;

  const canExpand = visibleCount < reviews.length;
  const isExpanded = visibleCount > INITIAL_SHOW;

  return (
    <Section title="Reviews">
      <ul>
        {reviews.slice(0, visibleCount).map((review) => (
          <ReviewItem key={review.mal_id} review={review} />
        ))}
      </ul>

      {reviews.length > INITIAL_SHOW && (
        <div className="mt-4 flex flex-wrap gap-x-6">
          {canExpand && (
            <Button
              type="button"
              variant="link"
              className="min-h-10"
              onClick={() =>
                setVisibleCount((prev) =>
                  Math.min(prev + EXPAND_BY, reviews.length),
                )
              }
            >
              Show more reviews ({reviews.length - visibleCount} left)
            </Button>
          )}
          {isExpanded && (
            <Button
              type="button"
              variant="link"
              className="min-h-10"
              onClick={() => setVisibleCount(INITIAL_SHOW)}
            >
              Show fewer reviews
            </Button>
          )}
        </div>
      )}
    </Section>
  );
}
