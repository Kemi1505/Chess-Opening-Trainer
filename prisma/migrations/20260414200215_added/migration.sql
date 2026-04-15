-- CreateTable
CREATE TABLE "OpeningMoves" (
    "id" TEXT NOT NULL,
    "eco_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pgn_moves" TEXT NOT NULL,

    CONSTRAINT "OpeningMoves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpeningMoves_pgn_moves_key" ON "OpeningMoves"("pgn_moves");
