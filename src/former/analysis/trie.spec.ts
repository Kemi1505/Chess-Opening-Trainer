import { OpeningTrie } from "./trie-class"

describe('OpeningTrie', () => {
  let trie: OpeningTrie

  beforeEach(() => {
    trie = new OpeningTrie()
  })

  describe('insert', () => {
    it('should insert an opening and find it at the correct node', () => {
      trie.insert(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], 'Ruy Lopez', 'C60')
      const result = trie.match(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])
      expect(result).not.toBeNull()
      expect(result!.openingName).toBe('Ruy Lopez')
      expect(result!.ecoCode).toBe('C60')
    })

    it('should insert multiple openings that share a prefix', () => {
      trie.insert(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], 'Ruy Lopez', 'C60')
      trie.insert(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], 'Italian Game', 'C50')

      const ruyLopez = trie.match(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])
      const italian = trie.match(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])

      expect(ruyLopez!.openingName).toBe('Ruy Lopez')
      expect(italian!.openingName).toBe('Italian Game')
    })
  })

  describe('match', () => {
    beforeEach(() => {
      // Insert a set of openings for testing
      trie.insert(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], 'Ruy Lopez', 'C60')
      trie.insert(
        ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'],
        'Ruy Lopez: Berlin Defence',
        'C65',
      )
      trie.insert(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], 'Italian Game', 'C50')
      trie.insert(['e4', 'c5'], 'Sicilian Defence', 'B20')
      trie.insert(
        ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
        'Sicilian Najdorf',
        'B90',
      )
    })

    it('should return null for an empty move list', () => {
      const result = trie.match([])
      expect(result).toBeNull()
    })

    it('should return null when no opening matches', () => {
      // d4 openings not in trie
      const result = trie.match(['d4', 'd5', 'c4'])
      expect(result).toBeNull()
    })

    it('should match exact opening sequence', () => {
      const result = trie.match(['e4', 'c5'])
      expect(result).not.toBeNull()
      expect(result!.openingName).toBe('Sicilian Defence')
      expect(result!.ecoCode).toBe('B20')
    })

    it('should return deviation move correctly', () => {
      // Sicilian is identified after 2 moves (i=1, so deviationMove = 2)
      const result = trie.match(['e4', 'c5'])
      expect(result!.deviationMove).toBe(2)
    })

    it('should match deepest variation when game goes deeper', () => {
      // Game follows full Najdorf — should return Najdorf not generic Sicilian
      const result = trie.match([
        'e4', 'c5', 'Nf3', 'd6', 'd4',
        'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6',
      ])
      expect(result!.openingName).toBe('Sicilian Najdorf')
      expect(result!.ecoCode).toBe('B90')
    })

    it('should return last matched opening when game deviates mid-sequence', () => {
      // Game starts as Sicilian Najdorf but deviates on move 10
      // Should return Sicilian Defence (last confirmed match before deviation)
      const result = trie.match([
        'e4', 'c5', 'Nf3', 'd6', 'd4',
        'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', // g6 instead of a6
      ])
      expect(result).not.toBeNull()
      expect(result!.openingName).toBe('Sicilian Defence')
    })

    it('should match Ruy Lopez and not Berlin when game stops at move 5', () => {
      const result = trie.match(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])
      expect(result!.openingName).toBe('Ruy Lopez')
    })

    it('should match Berlin Defence when game continues to move 6', () => {
      const result = trie.match(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'])
      expect(result!.openingName).toBe('Ruy Lopez: Berlin Defence')
    })

    it('should still match even when game has extra moves beyond the opening', () => {
      // Game continues past the opening — should still identify the opening
      const result = trie.match([
        'e4', 'e5', 'Nf3', 'Nc6', 'Bb5',
        'd4', 'exd4', 'Nxd4', // middlegame moves not in trie
      ])
      expect(result!.openingName).toBe('Ruy Lopez')
    })
  })
})