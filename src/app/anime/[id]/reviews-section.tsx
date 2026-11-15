"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { JikanReview } from "@/types/anime";

const INITIAL_SHOW = 2;
const EXPAND_BY = 3;
// Roughly what fits in four clamped lines; shorter reviews need no toggle.
const LONG_REVIEW_CHARS = 400;

function ReviewCard({ review }: { review: JikanReview }) {
  const textId = useId();
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hidden = review.is_spoiler && !showSpoiler;
  const isLong = review.review.length > LONG_REVIEW_CHARS;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Image
            src={review.user.images.jpg.image_url}
            alt=""
            width={24}
            height={24}
            className="rounded-full"
          />
          <span className="font-medium text-sm">{review.user.username}</span>
          <span className="text-yellow-500 text-sm">
            <span aria-hidden="true">★</span>
            <span className="sr-only">Score:</span> {review.score}
          </span>
          {review.is_spoiler && (
            <Badge variant="outline" className="text-xs">
              Spoilers
            </Badge>
          )}
        </div>
        {hidden ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>This review contains spoilers.</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowSpoiler(true)}
            >
              Show review
            </Button>
          </div>
        ) : (
          <>
            <p
              id={textId}
              className={`text-sm text-muted-foreground whitespace-pre-line ${
                expanded ? "" : "line-clamp-4"
              }`}
            >
              {review.review}
            </p>
            {isLong && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs mt-1"
                aria-expanded={expanded}
                aria-controls={textId}
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? "Show less" : "Read full review"}
              </Button>
            )}
          </>
        )}
        <div className="flex gap-1 mt-2">
          {review.tags?.slice(0, 3).map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ReviewsSection({ reviews }: { reviews: JikanReview[] }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_SHOW);

  if (!reviews || reviews.length === 0) return null;

  const canExpand = visibleCount < reviews.length;
  const isExpanded = visibleCount > INITIAL_SHOW;

  function handleExpand() {
    setVisibleCount((prev) => Math.min(prev + EXPAND_BY, reviews.length));
  }

  function handleCollapse() {
    setVisibleCount(INITIAL_SHOW);
  }

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold mb-4">Reviews</h2>
      <div className="space-y-4">
        {reviews.slice(0, INITIAL_SHOW).map((review, index) => (
          <motion.div
            key={review.mal_id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.25,
              delay: index * 0.04,
              ease: "easeOut",
            }}
          >
            <ReviewCard review={review} />
          </motion.div>
        ))}

        <AnimatePresence initial={false}>
          {visibleCount > INITIAL_SHOW && (
            <motion.div
              key="expanded-reviews"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4">
                {reviews
                  .slice(INITIAL_SHOW, visibleCount)
                  .map((review, index) => (
                    <motion.div
                      key={review.mal_id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                      }}
                    >
                      <ReviewCard review={review} />
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {reviews.length > INITIAL_SHOW && (
        <div className="mt-4">
          {canExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={handleExpand}
            >
              <ChevronDown className="h-3 w-3 mr-1" aria-hidden="true" />
              Show more reviews ({reviews.length - visibleCount} left)
            </Button>
          )}
          {isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={handleCollapse}
            >
              <ChevronUp className="h-3 w-3 mr-1" aria-hidden="true" />
              Show less
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
