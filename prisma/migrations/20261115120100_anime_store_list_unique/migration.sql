-- CreateTable
CREATE TABLE "Anime" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleEnglish" TEXT,
    "titleJapanese" TEXT,
    "imageUrl" TEXT,
    "episodes" INTEGER,
    "genres" TEXT[],
    "score" DOUBLE PRECISION,
    "status" TEXT,
    "durationMinutes" INTEGER,
    "season" TEXT,
    "year" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anime_pkey" PRIMARY KEY ("id")
);

-- Remove duplicate collection rows, keeping the lowest id for each (list, show) pair
DELETE FROM "ListAnime" a
USING "ListAnime" b
WHERE a."customListId" = b."customListId"
  AND a."animeId" = b."animeId"
  AND a."id" > b."id";

-- CreateIndex
CREATE UNIQUE INDEX "ListAnime_customListId_animeId_key" ON "ListAnime"("customListId", "animeId");
