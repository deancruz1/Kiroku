"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { JikanReview } from "@/types/anime";

const INITIAL_SHOW = 2;
const EXPAND_BY = 3;

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
        {reviews.slice(0, visibleCount).map((review, index) => (
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
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Image
                    src={review.user.images.jpg.image_url}
                    alt={review.user.username}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span className="font-medium text-sm">
                    {review.user.username}
                  </span>
                  <span className="text-yellow-500 text-sm">
                    ★ {review.score}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {review.review}
                </p>
                <div className="flex gap-1 mt-2">
                  {review.tags?.slice(0, 3).map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
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
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Image
                              src={review.user.images.jpg.image_url}
                              alt={review.user.username}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                            <span className="font-medium text-sm">
                              {review.user.username}
                            </span>
                            <span className="text-yellow-500 text-sm">
                              ★ {review.score}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-4">
                            {review.review}
                          </p>
                          <div className="flex gap-1 mt-2">
                            {review.tags?.slice(0, 3).map((tag: string) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
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
              <ChevronDown className="h-3 w-3 mr-1" />
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
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
