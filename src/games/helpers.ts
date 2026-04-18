export function extractMoves(pgn: string): string {
  return pgn
    .replace(/\d+\./g, '')     // remove move numbers
    .replace(/\{.*?\}/g, '')   // remove comments
    .replace(/\s+/g, ' ')      // normalize spaces
    .trim();
}

export function normalizeMoves(moves: string): string {
  return moves
    .replace(/\d+\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}