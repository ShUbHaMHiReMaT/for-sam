import type { AlgoId, ChoicePuzzle, OrderPuzzle, TextPuzzle } from '../game/types'
import { playfairEncrypt, preparePlaintext, stripFillers, playfairDecrypt } from '../crypto/playfair'

/** Normalise a typed answer: uppercase, alphanumerics only, optional 0x prefix removed. */
export function normAnswer(s: string): string {
  return s.toUpperCase().replace(/^\s*0X/, '').replace(/[^A-Z0-9]/g, '')
}

export function text(p: Omit<TextPuzzle, 'kind'>): TextPuzzle {
  return { kind: 'text', ...p }
}

export function choice(p: Omit<ChoicePuzzle, 'kind'>): ChoicePuzzle {
  return { kind: 'choice', ...p }
}

export function order(p: Omit<OrderPuzzle, 'kind'>): OrderPuzzle {
  return { kind: 'order', ...p }
}

/** Accepted Playfair answers: the raw decryption (with fillers), a filler-stripped guess, and the original letters. */
export function playfairAnswers(plain: string, key: string): string[] {
  const c = playfairEncrypt(plain, key)
  const raw = playfairDecrypt(c, key)
  const original = plain.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I')
  return [...new Set([raw, stripFillers(raw), original, preparePlaintext(plain).digraphs.join('')])]
}

export const tags = (...t: AlgoId[]) => t
