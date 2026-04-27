import { parsePgnToMoves } from './pgn-parser'

describe('parsePgnToMoves', () => {

  it('should extract clean moves from a standard PGN', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5'
    const result = parsePgnToMoves(pgn)
    expect(result).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])
  })

  it('should remove PGN headers', () => {
    const pgn = `
      [Event "Live Chess"]
      [Site "Chess.com"]
      [White "magnus"]
      [Black "hikaru"]

      1. e4 e5 2. Nf3
    `
    const result = parsePgnToMoves(pgn)
    expect(result).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('should remove comments in curly braces', () => {
    const pgn = '1. e4 {Best move} e5 {Response} 2. Nf3'
    const result = parsePgnToMoves(pgn)
    expect(result).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('should remove variations in parentheses', () => {
    const pgn = '1. e4 e5 (1... c5 2. Nf3) 2. Nf3'
    const result = parsePgnToMoves(pgn)
    expect(result).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('should remove game result 1-0', () => {
    const pgn = '1. e4 e5 2. Nf3 1-0'
    const result = parsePgnToMoves(pgn)
    expect(result).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('should remove game result 0-1', () => {
    const pgn = '1. e4 e5 2. Nf3 0-1'
    const result = parsePgnToMoves(pgn)
    expect(result).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('should remove game result 1/2-1/2', () => {
    const pgn = '1. e4 e5 1/2-1/2'
    const result = parsePgnToMoves(pgn)
    expect(result).toEqual(['e4', 'e5'])
  })

  it('should handle black move continuation dots', () => {
    // Some PGNs write black moves as "1... e5" after a comment
    const pgn = '1. e4 {comment} 1... e5 2. Nf3'
    const result = parsePgnToMoves(pgn)
    expect(result).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('should return empty array for empty string', () => {
    const result = parsePgnToMoves('')
    expect(result).toEqual([])
  })

  it('should handle castling moves', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. O-O'
    const result = parsePgnToMoves(pgn)
    expect(result).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'O-O'])
  })

  it('should handle captures and promotions', () => {
    const pgn = '1. e4 d5 2. exd5 Qxd5'
    const result = parsePgnToMoves(pgn)
    expect(result).toEqual(['e4', 'd5', 'exd5', 'Qxd5'])
  })
})