import { TrieNode } from "./trie-node"

export class OpeningTrie {
  root: TrieNode = new TrieNode()

  insert(moves: string[], openingName: string, ecoCode: string) {
    let node = this.root

    for (const move of moves) {
      if (!node.children.has(move)) {
        node.children.set(move, new TrieNode())
      }
      node = node.children.get(move)!
    }

    node.openingName = openingName
    node.ecoCode = ecoCode
  }

  match(gameMoves: string[]): {
    openingName: string
    ecoCode: string
    deviationMove: number
  } | null {
    let node = this.root
    let lastMatch: {
      openingName: string
      ecoCode: string
      deviationMove: number
    } | null = null

    for (let i = 0; i < gameMoves.length; i++) {
      const move = gameMoves[i]

      if (!node.children.has(move)) {
        return lastMatch
      }

      node = node.children.get(move)!

      if (node.openingName) {
        lastMatch = {
          openingName: node.openingName,
          ecoCode: node.ecoCode!,
          deviationMove: i + 1,
        }
      }
    }

    return lastMatch
  }
}