export class TrieNode {
  children: Map<string, TrieNode> = new Map()
  openingName: string | null = null
  ecoCode: string | null = null
}