export function parsePgnToMoves(pgn: string): string[] {
  return pgn
    .replace(/\[.*?\]/gs, '')              // remove headers
    .replace(/\{.*?\}/gs, '')              // remove comments
    .replace(/\(.*?\)/gs, '')              // remove variations
    .replace(/\d+\.(\.\.)?/g, '')          // remove move numbers
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, '') // remove result
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}