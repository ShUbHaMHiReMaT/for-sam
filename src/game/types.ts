import type { ReactNode } from 'react'

export type CharacterId = 'kael' | 'nyra' | 'orion' | 'vexa' | 'aura' | 'null' | 'sentinel' | 'eater' | 'weaver' | 'colossus' | 'sovereigns' | 'assassin' | 'engine'

export type Mood = 'neutral' | 'smile' | 'angry' | 'surprised' | 'sad' | 'smirk' | 'closed'

export type AlgoId = 'basics' | 'caesar' | 'substitution' | 'playfair' | 'vigenere' | 'transposition' | 'aes' | 'modes' | 'rsa' | 'dh' | 'signatures' | 'hash' | 'hmac' | 'pqc' | 'analysis' | 'design'

export interface DialogueLine {
  who: CharacterId
  text: string
  mood?: Mood
}

export type LessonBlock =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'callout'; tone: 'info' | 'warn' | 'myth'; title: string; text: string }
  | { t: 'code'; text: string }
  | { t: 'widget'; widget: WidgetId; props?: Record<string, unknown> }

export type WidgetId = 'caesarWheel' | 'playfairSquare' | 'vigenereAlign' | 'aesMini' | 'freqChart' | 'dhMix' | 'hashAvalanche' | 'rsaMini' | 'pipeline'

interface PuzzleBase {
  id: string
  prompt: string
  /** Algorithm(s) whose mastery this trains. */
  tags: AlgoId[]
  hints: string[]
  explanation: string
  difficulty: 1 | 2 | 3
  widget?: WidgetId
  widgetProps?: Record<string, unknown>
  /** Optional ciphertext / data shown prominently. */
  data?: string
  dataLabel?: string
}

export interface TextPuzzle extends PuzzleBase {
  kind: 'text'
  /** Accepted answers. Comparison is case-insensitive, letters/digits only unless `exact`. */
  answers: string[]
  placeholder?: string
  /** Optional per-wrong-answer diagnosis: return a hint if the answer matches a common mistake. */
  diagnose?: (normalizedAnswer: string) => string | null
}

export interface ChoicePuzzle extends PuzzleBase {
  kind: 'choice'
  options: { text: string; correct?: boolean; why: string }[]
}

export interface OrderPuzzle extends PuzzleBase {
  kind: 'order'
  /** Items in the CORRECT order; UI shuffles them. */
  items: string[]
}

export type Puzzle = TextPuzzle | ChoicePuzzle | OrderPuzzle

export type Step =
  | { kind: 'dialogue'; lines: DialogueLine[]; scene?: string }
  | { kind: 'lesson'; title: string; blocks: LessonBlock[]; who?: CharacterId }
  | { kind: 'puzzle'; puzzle: Puzzle; who?: CharacterId }
  | { kind: 'choice'; id: string; prompt: string; who?: CharacterId; options: { id: string; label: string; reply: DialogueLine[]; relationship?: Partial<Record<CharacterId, number>>; lore?: string }[] }
  | { kind: 'boss'; bossId: string }
  | { kind: 'investigate'; id: string; title: string; text: string; clues: { id: string; label: string; detail: string; lore?: string }[] }

export interface Mission {
  id: string
  chapter: number
  title: string
  summary: string
  objective: string
  type: 'story' | 'side' | 'challenge'
  steps: Step[]
  xp: number
  /** missions that must be complete before this one opens */
  requires?: string[]
  /** Final mission: completing it leads to the ending sequence. */
  finale?: boolean
  /** World change shown in the debrief. */
  worldChange: string
}

export interface BossPhase {
  name: string
  taunt: DialogueLine
  telegraph: string
  tasks: Puzzle[]
}

export interface Boss {
  id: string
  name: string
  title: string
  chapter: number
  art: CharacterId
  color: string
  arena: 'ruins' | 'library' | 'maze' | 'forge' | 'citadel' | 'frontier' | 'storm' | 'void'
  intro: DialogueLine[]
  phases: BossPhase[]
  defeat: DialogueLine[]
  debrief: { title: string; points: string[] }
  xp: number
  costume?: string
}

export interface Chapter {
  n: number
  title: string
  region: RegionId
  topic: string
  blurb: string
  missions: string[]
  boss: string
  /** Narrative hook shown after completion. */
  next: string
}

export type RegionId = 'archive' | 'labyrinth' | 'forge' | 'citadel' | 'frontier' | 'storm' | 'wastes' | 'null'

export interface Region {
  id: RegionId
  name: string
  epithet: string
  color: string
  x: number // map coords 0..100
  y: number
  chapters: number[]
  guide: CharacterId
  restored: string
  corrupted: string
}

export interface Achievement {
  id: string
  name: string
  desc: string
  icon: string
  hidden?: boolean
}

export interface LoreEntry {
  id: string
  title: string
  text: string
  source: string
  character?: CharacterId
}

export interface SkillNode {
  id: string
  tree: SkillTreeId
  name: string
  desc: string
  tier: number
  /** human-readable requirement */
  req: string
}

export type SkillTreeId = 'classical' | 'symmetric' | 'publickey' | 'hashing' | 'analysis' | 'design'

export interface Toast {
  id: number
  kind: 'achievement' | 'xp' | 'level' | 'lore' | 'skill' | 'costume' | 'info'
  title: string
  body?: string
  icon?: ReactNode
}
