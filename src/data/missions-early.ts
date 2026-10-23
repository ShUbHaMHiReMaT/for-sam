import type { Mission } from '../game/types'
import { caesarEncrypt, atbash, substitutionEncrypt, keywordAlphabet, letterCounts, vigenereEncrypt, transpositionEncrypt, transpositionDecrypt } from '../crypto/classical'
import { buildSquare, playfairEncrypt, encryptSteps } from '../crypto/playfair'
import { choice, text, playfairAnswers, normAnswer } from './helpers'

// ───────────────────────────── CHAPTER 0 — THE AWAKENING ─────────────────────────────

const C0_PLAIN = 'RESTORE THE SIGNAL'
const C0_CIPHER = caesarEncrypt(C0_PLAIN, 3)

export const m0: Mission = {
  id: 'm0-terminal',
  chapter: 0,
  title: 'The Damaged Terminal',
  summary: 'Something in the ruins is still trying to speak. Restore the Archive terminal and learn the four words every Guardian must know.',
  objective: 'Learn plaintext, ciphertext, key, encryption and decryption — then decrypt the terminal’s distress signal.',
  type: 'story',
  xp: 120,
  worldChange: 'The Archive terminal flickers to life. The first lantern in the Forgotten Archive is lit.',
  steps: [
    {
      kind: 'dialogue', scene: 'ruins', lines: [
        { who: 'aura', text: 'Oh! Oh oh oh. A heartbeat. A REAL heartbeat. Do you know how long I’ve been talking to dust?', mood: 'surprised' },
        { who: 'kael', text: 'Okay. The glowing rock is talking. That’s fine. That’s normal.', mood: 'surprised' },
        { who: 'aura', text: 'I am not a rock. I am AURA-7, last index of the Great Archive. And that “rock” on your wrist is the Last Key. It chose you.', mood: 'smile' },
        { who: 'kael', text: 'It chose wrong. I’m a scavenger. I can’t even read half the signs out here.', mood: 'sad' },
        { who: 'aura', text: 'Perfect. Then we start at the beginning. The terminal behind you is broadcasting something — scrambled. Let’s learn why.', mood: 'smile' },
      ],
    },
    {
      kind: 'lesson', who: 'aura', title: 'The Four Words of Power',
      blocks: [
        { t: 'p', text: 'Every secret in the Cipherverse — from a soldier’s note to a bank transfer — is built from the same parts.' },
        { t: 'list', items: [
          'Plaintext — the readable message. “MEET AT DAWN.”',
          'Ciphertext — the scrambled result. “PHHW DW GDZQ.” It should reveal nothing useful without the key.',
          'Algorithm (cipher) — the public recipe for scrambling and unscrambling.',
          'Key — the secret value that makes the recipe produce THIS ciphertext and not another.',
          'Encryption turns plaintext into ciphertext using a key. Decryption reverses it using the right key.',
        ] },
        { t: 'widget', widget: 'pipeline' },
        { t: 'callout', tone: 'info', title: 'Kerckhoffs’s principle (1883)', text: 'A cipher should stay secure even if everything about it except the key is public. Modern cryptography assumes the attacker knows the algorithm. The secret is the key — and only the key.' },
        { t: 'callout', tone: 'myth', title: 'Misconception', text: '“Encoding” is not encryption. Base64 or Morse code transform text with NO key — anyone can reverse them. Encryption needs a secret key.' },
      ],
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: choice({
        id: 'p0-key', tags: ['basics'], difficulty: 1,
        prompt: 'The terminal’s manual says: “Shift every letter back by 3 to read messages.” The screen shows KHOOR. Which part is the KEY?',
        hints: ['The algorithm is the general method. The key is the specific secret setting that method uses.'],
        explanation: 'The algorithm is “shift letters”; the key is the amount, 3. KHOOR is ciphertext and HELLO is plaintext.',
        options: [
          { text: 'KHOOR', why: 'That is the ciphertext — the scrambled output.' },
          { text: 'The number 3', correct: true, why: 'Yes. The method (shift) is the algorithm; the specific secret setting (3) is the key.' },
          { text: '“Shift every letter”', why: 'That is the algorithm. By Kerckhoffs’s principle we assume attackers know it.' },
          { text: 'HELLO', why: 'That is the plaintext — what we recover by decrypting.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: choice({
        id: 'p0-kerckhoffs', tags: ['basics', 'design'], difficulty: 1,
        prompt: 'A rusted plaque reads: “Our seal is unbreakable because no outsider knows how it works.” What would a Guardian say?',
        hints: ['Ask: what happens the day someone DOES learn how it works?'],
        explanation: 'Security through obscurity fails the moment the design leaks — and designs always leak. Good ciphers are public, heavily studied, and rely only on a secret key.',
        options: [
          { text: 'Wise. Secret designs are the strongest designs.', why: 'Designs leak through reverse engineering, insiders and theft. Once leaked, the “security” is gone forever.' },
          { text: 'Risky. Security should rest on the key, so the design can be public and examined.', correct: true, why: 'Exactly — Kerckhoffs’s principle. Public scrutiny finds flaws before attackers do, and a leaked key can be replaced; a leaked design cannot.' },
          { text: 'Irrelevant. Only the length of the message matters.', why: 'Message length matters for some attacks, but it is not the point here.' },
        ],
      }),
    },
    {
      kind: 'lesson', who: 'aura', title: 'The Shift Cipher',
      blocks: [
        { t: 'p', text: 'The terminal uses the oldest trick in the Archive: the Caesar (shift) cipher. Each letter moves a fixed number of places along the alphabet, wrapping from Z back to A.' },
        { t: 'p', text: 'With shift 3: A→D, B→E, … X→A, Y→B, Z→C. To decrypt, shift back by the same amount.' },
        { t: 'widget', widget: 'caesarWheel', props: { shift: 3 } },
        { t: 'callout', tone: 'warn', title: 'Security analysis', text: 'There are only 25 useful keys. An attacker can simply try them all (brute force) in seconds. Caesar teaches the IDEA of a key — it protects nothing today.' },
      ],
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: text({
        id: 'p0-signal', tags: ['caesar', 'basics'], difficulty: 1,
        prompt: 'Decrypt the terminal’s distress signal. It was encrypted with a Caesar shift of 3. Use the wheel if you like.',
        data: C0_CIPHER, dataLabel: 'Incoming signal (ciphertext)',
        widget: 'caesarWheel', widgetProps: { shift: 3 },
        answers: [C0_PLAIN],
        placeholder: 'Type the plaintext…',
        hints: ['Decrypting means shifting each letter BACK by 3: U→R, H→E…', `The first word starts with ${C0_PLAIN[0]}${C0_PLAIN[1]}…`],
        explanation: `Each letter of ${C0_CIPHER} moved back three places gives ${C0_PLAIN}. Same algorithm, same key, opposite direction.`,
        diagnose: (a) => (a === normAnswer(caesarEncrypt(C0_CIPHER, 3)) ? 'You shifted FORWARD by 3 — that encrypts again. Decryption shifts backward.' : null),
      }),
    },
    {
      kind: 'choice', id: 'c0-why', who: 'aura', prompt: 'AURA-7 tilts its geometric head. “Why did you touch the Key, Kael?”',
      options: [
        { id: 'curious', label: '“Scavenger instinct. If it glows, it’s worth something.”', reply: [{ who: 'aura', text: 'Honest! Greedy, but honest. The Key likes honesty.', mood: 'smile' }], relationship: { aura: 1 } },
        { id: 'pulled', label: '“It felt like it was… calling me.”', reply: [{ who: 'aura', text: 'It was. It has been calling for three hundred years. You are the first one who answered.', mood: 'neutral' }], relationship: { aura: 2 } },
        { id: 'sarcasm', label: '“I tripped. Next question.”', reply: [{ who: 'aura', text: 'My seventh core finds that hilarious. The other six are concerned.', mood: 'smirk' }], relationship: { aura: 1 } },
      ],
    },
    {
      kind: 'investigate', id: 'i0-terminal', title: 'Terminal Archive Logs',
      text: 'The restored terminal exposes fragments of old logs. Inspect anything that catches your eye — or move on when ready.',
      clues: [
        { id: 'log1', label: 'LOG 0001 — “founding”', detail: 'A Guardian council record about the first secret.', lore: 'l-origin' },
        { id: 'log2', label: 'LOG 3122 — “sentinel status”', detail: '“Sentinel unit 4 corrupted. It now rejects all keys and attacks all visitors. It still believes it is protecting the Archive.”' },
        { id: 'log3', label: '[SEALED SHELF] — corrupted entry', detail: 'A sealed index the corruption skipped. It names the Keymaker.', lore: 'null-1' },
      ],
    },
    {
      kind: 'dialogue', scene: 'ruins', lines: [
        { who: 'aura', text: 'Uh-oh. The signal woke something up. Something big, with a firewall for a face.', mood: 'surprised' },
        { who: 'sentinel', text: 'INTRUDER. PRESENT YOUR KEY. EXPLAIN YOUR KEY. OR BE DELETED.', mood: 'angry' },
        { who: 'kael', text: 'Explain it? I just learned what it is!', mood: 'surprised' },
        { who: 'aura', text: 'Then let’s prove you learned it. Every correct answer cracks its shield. Wrong answers? It hits back — but I’ll patch you up. You cannot lose what you’ve learned.', mood: 'smile' },
      ],
    },
    { kind: 'boss', bossId: 'sentinel' },
    {
      kind: 'dialogue', scene: 'ruins', lines: [
        { who: 'aura', text: 'The Sentinel’s core is calm. And look — the Archive lanterns are lighting up, one by one.', mood: 'smile' },
        { who: 'nyra', text: 'Well, well. Someone actually opened that terminal. I’ve been trying for a month.', mood: 'smirk' },
        { who: 'kael', text: 'Who are you?', mood: 'surprised' },
        { who: 'nyra', text: 'Nyra Sol. Professional pattern-finder. And you just broadcast our location to the entire Kingdom of Forgotten Letters. Come on — before the Letter Eater finds us.', mood: 'neutral' },
      ],
    },
  ],
}

// ─────────────────────── CHAPTER 1 — THE KINGDOM OF FORGOTTEN LETTERS ───────────────────────

const ORACLE_KEY = keywordAlphabet('LANTERN')
const ORACLE_PLAIN = 'THE KEEPERS OF THE ELDER ARCHIVE BELIEVED THEIR SEALS WERE ETERNAL. THE SEALS WERE BROKEN BEFORE THE SEVENTH EVENING.'
const ORACLE_CIPHER = substitutionEncrypt(ORACLE_PLAIN, ORACLE_KEY)
const oracleCounts = letterCounts(ORACLE_CIPHER)
const ORACLE_TOP = Object.entries(oracleCounts).sort((a, b) => b[1] - a[1])[0][0]
const MIRROR_PLAIN = 'MIRROR MIRROR'
const MIRROR_CIPHER = atbash(MIRROR_PLAIN)

export const m1a: Mission = {
  id: 'm1-oracle',
  chapter: 1,
  title: 'The Frequency Oracle',
  summary: 'The Kingdom’s Oracle speaks only in substituted letters. Nyra thinks a pattern hides in plain sight.',
  objective: 'Understand monoalphabetic substitution and break it with frequency analysis.',
  type: 'story',
  requires: ['m0-terminal'],
  xp: 150,
  worldChange: 'The Oracle’s voice returns. Shop signs in the Kingdom of Forgotten Letters become readable again.',
  steps: [
    {
      kind: 'dialogue', scene: 'library', lines: [
        { who: 'nyra', text: 'Welcome to the Kingdom of Forgotten Letters. Everyone here writes in substitution now — every letter swapped for another.', mood: 'neutral' },
        { who: 'kael', text: 'Like Caesar?', mood: 'neutral' },
        { who: 'nyra', text: 'Bigger. Caesar shifts the whole alphabet together. Substitution can map each letter to ANY other letter. Scrambled alphabet, not a slid one.', mood: 'smirk' },
        { who: 'aura', text: 'That’s 26! possible keys — about 4 × 10²⁶. More than the grains of sand on every beach of the Cipherverse.', mood: 'smile' },
        { who: 'nyra', text: 'And I can still break it before my tea gets cold. Watch.', mood: 'smirk' },
      ],
    },
    {
      kind: 'lesson', who: 'nyra', title: 'Monoalphabetic Substitution & Frequency Analysis',
      blocks: [
        { t: 'p', text: 'A monoalphabetic substitution replaces each plaintext letter with one fixed ciphertext letter. E always becomes, say, Q. Every single time.' },
        { t: 'p', text: 'That consistency is the weakness. Languages have fingerprints: in English, E, T, A, O, I, N are common; Q, Z, J, X are rare. The ciphertext keeps the same fingerprint — just with letters renamed.' },
        { t: 'widget', widget: 'freqChart', props: { text: ORACLE_CIPHER } },
        { t: 'p', text: 'Frequency analysis was described by the 9th-century scholar al-Kindi. Combined with common words (THE, AND) and patterns (doubled letters), it breaks substitution ciphers by hand.' },
        { t: 'callout', tone: 'myth', title: 'Misconception', text: 'A huge keyspace does NOT guarantee security. Substitution has ~2⁸⁸ keys, yet statistics break it without trying keys at all. Attackers look for shortcuts, not brute force.' },
      ],
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: text({
        id: 'p1-freq', tags: ['substitution', 'analysis'], difficulty: 2,
        prompt: `In the Oracle’s message, the most frequent ciphertext letter is “${ORACLE_TOP}”. Which plaintext letter does it most likely represent?`,
        data: ORACLE_CIPHER, dataLabel: 'The Oracle speaks',
        widget: 'freqChart', widgetProps: { text: ORACLE_CIPHER },
        answers: ['E'],
        placeholder: 'One letter',
        hints: ['Which letter appears most often in ordinary English text?', 'Look at the tallest bar for English — it is about 12.7% of letters.'],
        explanation: `E is the most common English letter (~12.7%). In this message “${ORACLE_TOP}” appears ${oracleCounts[ORACLE_TOP]} times, so ${ORACLE_TOP} → E is the best first guess. Analysts then try T, A, O… and check the words that appear.`,
      }),
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: text({
        id: 'p1-mirror', tags: ['substitution'], difficulty: 1,
        prompt: 'The palace gate uses the “Mirror Alphabet” — A↔Z, B↔Y, C↔X… (historically called Atbash). Decode the gate word.',
        data: MIRROR_CIPHER, dataLabel: 'Gate inscription',
        answers: [MIRROR_PLAIN],
        hints: ['A pairs with Z, B with Y. So N pairs with M.', 'The phrase is a word repeated twice.'],
        explanation: `Atbash is a substitution with NO key at all — once you know the method, it is broken. ${MIRROR_CIPHER} → ${MIRROR_PLAIN}.`,
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: choice({
        id: 'p1-keyspace', tags: ['substitution', 'analysis'], difficulty: 2,
        prompt: 'Substitution has about 4 × 10²⁶ keys; Caesar has 25. Why do both fall quickly?',
        hints: ['Is brute force the only way to attack a cipher?'],
        explanation: 'Caesar falls to brute force; substitution falls to statistics. Both preserve the plaintext’s letter-frequency fingerprint, so a large keyspace is necessary but never sufficient.',
        options: [
          { text: 'Both preserve letter frequencies, so statistical attacks skip the key search.', correct: true, why: 'Right — the structure of the plaintext leaks through.' },
          { text: 'Computers can try 4 × 10²⁶ keys in a second.', why: 'Not even close — that would still take enormous time. The real attack is statistical.' },
          { text: 'They don’t; substitution is secure if the keyword is long.', why: 'Keyword length doesn’t change the one-letter-to-one-letter mapping that leaks frequencies.' },
        ],
      }),
    },
    {
      kind: 'investigate', id: 'i1-plaza', title: 'The Oracle Plaza',
      text: 'With the Oracle speaking again, the plaza carvings are legible.',
      clues: [
        { id: 'wall', label: 'Soldier’s carving', detail: 'A carving of a general and a shifted alphabet.', lore: 'l-caesar' },
        { id: 'journal', label: 'Nyra’s dropped journal', detail: 'A page slips out of Nyra’s coat.', lore: 'l-nyra' },
      ],
    },
    {
      kind: 'dialogue', scene: 'library', lines: [
        { who: 'nyra', text: 'The Oracle’s fine now. But the Letter Eater learned. Its newest messages aren’t single letters anymore.', mood: 'neutral' },
        { who: 'aura', text: 'Pairs. It’s eating letters two at a time. That’s a Playfair square — the Kingdom’s old royal cipher.', mood: 'surprised' },
      ],
    },
  ],
}

const PF_KEY = 'GUARDIAN'
const pfSquare = buildSquare(PF_KEY)
const PF_ROW1 = pfSquare[0].join('')
const PF_PAIR = 'KE'
const PF_PAIR_STEP = encryptSteps(PF_PAIR, PF_KEY)[0]
const PF_MSG = 'LIGHT THE LANTERN'
const PF_CIPHER = playfairEncrypt(PF_MSG, PF_KEY)

export const m1b: Mission = {
  id: 'm1-square',
  chapter: 1,
  title: 'The Square of Wheatstone',
  summary: 'To fight the Letter Eater you must think in pairs. Learn the 5×5 Playfair square.',
  objective: 'Build a Playfair key square, prepare digraphs, and apply the row, column and rectangle rules.',
  type: 'story',
  requires: ['m1-oracle'],
  xp: 180,
  worldChange: 'The royal square glows above the Kingdom’s gate. Pairs of letters stop vanishing from the streets.',
  steps: [
    {
      kind: 'lesson', who: 'aura', title: 'The Playfair Cipher (1854)',
      blocks: [
        { t: 'p', text: 'Invented by Charles Wheatstone and promoted by Lord Playfair, it encrypts DIGRAPHS (pairs of letters) instead of single letters. That hides single-letter frequencies — E is no longer always the same symbol.' },
        { t: 'h', text: '1 · Build the 5×5 key square' },
        { t: 'p', text: 'Write the keyword’s letters (skipping repeats), then the rest of the alphabet. 26 letters don’t fit in 25 cells, so our convention merges J into I.' },
        { t: 'widget', widget: 'playfairSquare', props: { keyword: PF_KEY } },
        { t: 'h', text: '2 · Prepare the plaintext' },
        { t: 'list', items: [
          'Remove spaces and punctuation; replace J with I.',
          'Split into pairs. If a pair would contain the same letter twice (LL), insert X between them: BALLOON → BA LX LO ON.',
          'If one letter is left over, pad with X.',
        ] },
        { t: 'h', text: '3 · Encrypt each pair' },
        { t: 'list', items: [
          'Same row → take the letter to the RIGHT of each (wrap around).',
          'Same column → take the letter BELOW each (wrap around).',
          'Otherwise they form a rectangle → each letter takes the letter in its own row at the OTHER letter’s column.',
        ] },
        { t: 'callout', tone: 'info', title: 'Conventions differ', text: 'Historical users varied: some merged I/J, some dropped Q; some used other filler letters. CIPHERVERSE uses I/J merged, X as filler (Q if the doubled letter is X), right/down shifts for encryption.' },
      ],
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: text({
        id: 'p1-row1', tags: ['playfair'], difficulty: 1,
        prompt: `Build the key square for the keyword “${PF_KEY}”. What are the five letters of the FIRST row?`,
        answers: [PF_ROW1],
        placeholder: 'Five letters',
        hints: ['Write the keyword without repeated letters: G U A R D I N…', 'The first row is just the first five letters of that sequence.'],
        explanation: `GUARDIAN without repeats is G U A R D I N. The first five fill row one: ${PF_ROW1}.`,
        diagnose: (a) => (a === 'GUARD' ? null : a.startsWith('GUARDI') ? 'Only five letters fit in a row.' : null),
      }),
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: choice({
        id: 'p1-prepare', tags: ['playfair'], difficulty: 1,
        prompt: 'How is the plaintext BALLOON prepared into digraphs?',
        hints: ['Split into pairs from the left. Stop when a pair would repeat a letter.'],
        explanation: 'BA, then L L would repeat, so insert X: LX. Continue: LO, ON. Result: BA LX LO ON.',
        options: [
          { text: 'BA LL OO N', why: 'Playfair can’t encrypt a pair with two identical letters, and the odd letter needs padding.' },
          { text: 'BA LX LO ON', correct: true, why: 'Correct — a filler X splits the double L, and the remaining letters pair up evenly.' },
          { text: 'BA LO ON', why: 'You can’t just delete a letter; the message would change.' },
          { text: 'BAL LOO NX', why: 'Playfair works in pairs, not triples.' },
        ],
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: text({
        id: 'p1-pair', tags: ['playfair'], difficulty: 2,
        prompt: `Using the ${PF_KEY} square, encrypt the digraph “${PF_PAIR}”. Which rule applies, and what is the result?`,
        widget: 'playfairSquare', widgetProps: { keyword: PF_KEY, highlight: PF_PAIR },
        answers: [PF_PAIR_STEP.output],
        placeholder: 'Two letters',
        hints: [`Find K and E in the square. Are they in the same row, the same column, or neither?`, `This is the ${PF_PAIR_STEP.rule} rule.`],
        explanation: `K and E use the ${PF_PAIR_STEP.rule} rule, giving ${PF_PAIR_STEP.output}.`,
        diagnose: (a) => (a === PF_PAIR_STEP.output.split('').reverse().join('') ? 'Close! Keep the order: the first output letter comes from the FIRST input letter’s row.' : null),
      }),
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: text({
        id: 'p1-lantern', tags: ['playfair'], difficulty: 3,
        prompt: `Decrypt the Letter Eater’s intercepted order (key: ${PF_KEY}). Decryption reverses the rules: row → LEFT, column → UP, rectangle → same as before.`,
        data: PF_CIPHER.match(/.{2}/g)!.join(' '), dataLabel: 'Intercepted digraphs',
        widget: 'playfairSquare', widgetProps: { keyword: PF_KEY },
        answers: playfairAnswers(PF_MSG, PF_KEY),
        placeholder: 'Decrypted message (fillers optional)',
        hints: ['Take one pair at a time and locate both letters in the square.', 'The rectangle rule is its own inverse. The row/column rules move the opposite way.', `The message begins “LI…”`],
        explanation: `The pairs decrypt to ${playfairAnswers(PF_MSG, PF_KEY)[0]}. Any X between doubled letters (TT → TX T) is a filler a human reader removes: ${PF_MSG}.`,
      }),
    },
    {
      kind: 'choice', id: 'c1-letters', who: 'nyra', prompt: 'Nyra watches you work the square. “Not bad for a scavenger. Why do you think the old kings trusted this?”',
      options: [
        { id: 'hidden', label: '“Because pairs hide the single-letter patterns you love.”', reply: [{ who: 'nyra', text: 'Hide, not erase. Pairs have patterns too — just more of them. Remember that.', mood: 'smirk' }], relationship: { nyra: 2 } },
        { id: 'hard', label: '“Because it’s hard to do by hand, so it felt safe.”', reply: [{ who: 'nyra', text: '“Feels hard” and “is hard” are different things. Most broken locks felt hard.', mood: 'neutral' }], relationship: { nyra: 1 } },
      ],
    },
    {
      kind: 'investigate', id: 'i1-gate', title: 'The Royal Gate',
      text: 'Above the gate, the square glows. A brass plaque below is worn smooth by centuries of hands.',
      clues: [
        { id: 'plaque', label: 'Brass plaque', detail: 'An inscription about the square’s name.', lore: 'l-wheatstone' },
      ],
    },
    {
      kind: 'dialogue', scene: 'library', lines: [
        { who: 'eater', text: 'Hungry… hungry for PAIRS. Give me your letters, little Guardian. Two by two by two…', mood: 'angry' },
        { who: 'nyra', text: 'That’s our cue. It hides its core behind Playfair shields. Read its pairs and it starves.', mood: 'smirk' },
      ],
    },
    { kind: 'boss', bossId: 'eater' },
    {
      kind: 'dialogue', scene: 'library', lines: [
        { who: 'aura', text: 'The Kingdom of Forgotten Letters remembers. Chapter complete!', mood: 'smile' },
        { who: 'nyra', text: 'Don’t celebrate yet. The Letter Eater was a scout. Whoever sent it knew we were coming — the next region is a maze that rearranges itself with a key.', mood: 'neutral' },
        { who: 'kael', text: 'A maze that changes with a key? So the key repeats… and repetition is a pattern.', mood: 'smirk' },
        { who: 'nyra', text: 'Now you’re thinking like me. That’s either great or terrible.', mood: 'smile' },
      ],
    },
  ],
}

// ─────────────────────── CHAPTER 2 — THE LABYRINTH OF SHIFTING SHADOWS ───────────────────────

const V_KEY = 'ECHO'
const V_PLAIN = 'SHADOW'
const V_CIPHER = vigenereEncrypt(V_PLAIN, V_KEY)
const V_ENC_PLAIN = 'TURN LEFT'
const V_ENC_KEY = 'MAZE'
const V_ENC_CIPHER = vigenereEncrypt(V_ENC_PLAIN, V_ENC_KEY)
const T_KEY = 'WALL'
const T_PLAIN = 'THE EXIT IS NORTH'
const T_CIPHER = transpositionEncrypt(T_PLAIN, T_KEY)

export const m2a: Mission = {
  id: 'm2-echoes',
  chapter: 2,
  title: 'Corridors of Echoes',
  summary: 'The Labyrinth shifts each step by a repeating keyword. Learn the Vigenère cipher — and why its repetition echoes.',
  objective: 'Encrypt and decrypt with Vigenère; understand polyalphabetic substitution and key repetition.',
  type: 'story',
  requires: ['m1-square'],
  xp: 180,
  worldChange: 'The first ring of the Labyrinth stops shifting. Footprints stay where you leave them.',
  steps: [
    {
      kind: 'dialogue', scene: 'maze', lines: [
        { who: 'nyra', text: 'Every corridor here shifts by a different amount. Left wall: 4. Next: 2. Next: 7… then it repeats.', mood: 'neutral' },
        { who: 'aura', text: 'That is the Vigenère cipher. Once nicknamed “le chiffre indéchiffrable” — the indecipherable cipher.', mood: 'neutral' },
        { who: 'kael', text: 'Let me guess. It got deciphered.', mood: 'smirk' },
        { who: 'aura', text: 'In the 1800s. Babbage and Kasiski. The nickname aged badly.', mood: 'smile' },
      ],
    },
    {
      kind: 'lesson', who: 'aura', title: 'Vigenère: Many Caesars at Once',
      blocks: [
        { t: 'p', text: 'Write a keyword under the plaintext, repeating it. Each key letter is a Caesar shift: A=0, B=1, … Z=25. Encrypt each plaintext letter with the shift beneath it.' },
        { t: 'widget', widget: 'vigenereAlign', props: { text: 'ATTACK AT DAWN', keyword: 'LEMON' } },
        { t: 'p', text: 'Because the shift keeps changing, the same plaintext letter becomes different ciphertext letters. This is POLYALPHABETIC substitution — it flattens the frequency fingerprint.' },
        { t: 'callout', tone: 'warn', title: 'The echo', text: 'The key repeats. When a repeated plaintext fragment lines up with the same part of the key, it produces the SAME ciphertext fragment. The distance between such repeats is a multiple of the key length. That is the Kasiski examination.' },
        { t: 'callout', tone: 'info', title: 'One-time pad', text: 'If the key is truly random, as long as the message, and NEVER reused, the scheme becomes a one-time pad — information-theoretically secure, but impractical to distribute keys for. Reuse even once and it breaks.' },
      ],
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: text({
        id: 'p2-enc', tags: ['vigenere'], difficulty: 2,
        prompt: `Encrypt “${V_ENC_PLAIN}” with the keyword “${V_ENC_KEY}”. (Spaces don’t consume key letters.)`,
        widget: 'vigenereAlign', widgetProps: { text: V_ENC_PLAIN, keyword: V_ENC_KEY },
        answers: [V_ENC_CIPHER],
        hints: ['T + M(12) = F. U + A(0) = U.', 'The key under TURNLEFT is MAZEMAZE.'],
        explanation: `TURNLEFT under MAZEMAZE gives ${V_ENC_CIPHER.replace(/\s/g, '')}. Each column is its own Caesar shift.`,
      }),
    },
    {
      kind: 'puzzle', who: 'aura', puzzle: text({
        id: 'p2-dec', tags: ['vigenere'], difficulty: 2,
        prompt: `A wall glyph reads “${V_CIPHER}”. The corridor key is “${V_KEY}”. Decrypt it.`,
        widget: 'vigenereAlign', widgetProps: { text: V_CIPHER, keyword: V_KEY, decrypt: true },
        answers: [V_PLAIN],
        hints: ['Decrypt by shifting BACK by each key letter.', 'E=4, C=2, H=7, O=14.'],
        explanation: `${V_CIPHER} minus ECHOEC gives ${V_PLAIN}.`,
      }),
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: choice({
        id: 'p2-kasiski', tags: ['vigenere', 'analysis'], difficulty: 3,
        prompt: 'Nyra spots the trigram “QXV” repeating at distances 12, 18 and 30 in a long ciphertext. What key length is most likely?',
        hints: ['Repeats are spaced by multiples of the key length.', 'Find the greatest common divisor of 12, 18 and 30.'],
        explanation: 'gcd(12, 18, 30) = 6. The key length is probably 6 (or a divisor like 3 or 2). Each column of every 6th letter is then a plain Caesar cipher — broken by frequency analysis.',
        options: [
          { text: '5', why: '5 does not divide 12 or 18.' },
          { text: '6', correct: true, why: 'Yes — 6 divides all three distances and is the largest number that does.' },
          { text: '60', why: '60 is a common multiple, not a common divisor. The key must fit inside each gap.' },
          { text: '12', why: '12 doesn’t divide 18 or 30.' },
        ],
      }),
    },
    {
      kind: 'choice', id: 'c2-vexa', who: 'vexa', prompt: 'A figure in a mirrored mask drops from the ceiling. “Cute trick. Know who taught Kasiski’s method to the Guardians? Nobody. They exiled the people who used it.” What do you say?',
      options: [
        { id: 'listen', label: '“Then teach me. I’d rather learn from the people who were right.”', reply: [{ who: 'vexa', text: '…Huh. Nobody’s said that to me in a long time. Don’t make me regret it.', mood: 'smirk' }], relationship: { vexa: 2, nyra: -1 } },
        { id: 'wary', label: '“Who are you, and why should I trust you?”', reply: [{ who: 'vexa', text: 'You shouldn’t. Trust is the Null King’s favourite weapon. Verify me instead.', mood: 'neutral' }], relationship: { vexa: 1 } },
        { id: 'hostile', label: '“Get out of the way.”', reply: [{ who: 'vexa', text: 'Bold. Wrong, but bold. I’ll be around when you need someone who breaks things.', mood: 'angry' }], relationship: { vexa: -1, nyra: 1 } },
      ],
    },
  ],
}

export const m2b: Mission = {
  id: 'm2-pillars',
  chapter: 2,
  title: 'The Pillar Grid',
  summary: 'The Labyrinth’s heart doesn’t change letters at all. It rearranges them.',
  objective: 'Learn columnar transposition and how it differs from substitution.',
  type: 'story',
  requires: ['m2-echoes'],
  xp: 160,
  worldChange: 'The pillars slide back into order. The way to the Echo Weaver’s chamber opens.',
  steps: [
    {
      kind: 'lesson', who: 'orion', title: 'Transposition Ciphers',
      blocks: [
        { t: 'p', text: 'A transposition cipher keeps every letter but changes their ORDER. Columnar transposition writes the message in rows under a keyword, then reads the columns in the alphabetical order of the keyword’s letters.' },
        { t: 'code', text: 'Key: Z E B R A S  → read order: A(5) B(3) E(2) R(4) S(6) Z(1)\n     W E A R E D\n     I S C O V E\n     R E D F L E\n     E A T O N C\n     E X X X X X' },
        { t: 'callout', tone: 'info', title: 'Tell-tale sign', text: 'Because letters are only moved, the ciphertext has EXACTLY the same letter frequencies as English. If frequencies look like English but words don’t, suspect transposition.' },
        { t: 'callout', tone: 'info', title: 'Why it matters now', text: 'Modern ciphers like AES combine substitution (confusion) and permutation (diffusion) many times over. Alone, each is weak. Layered carefully, they are strong.' },
      ],
    },
    {
      kind: 'dialogue', lines: [
        { who: 'orion', text: 'Orion Kai. Strategist, Twin-Key Citadel. Former. Nyra said you’d need someone who counts.', mood: 'neutral' },
        { who: 'nyra', text: 'I said someone who won’t stop counting.', mood: 'smirk' },
        { who: 'orion', text: 'Same thing. The pillar grid has four columns. Keyword: WALL. Let’s read it.', mood: 'neutral' },
      ],
    },
    {
      kind: 'puzzle', who: 'orion', puzzle: text({
        id: 'p2-pillars', tags: ['transposition'], difficulty: 2,
        prompt: `Decrypt the pillar message. Columnar transposition, keyword “${T_KEY}” (repeated letters read left to right; padding X).`,
        data: T_CIPHER, dataLabel: 'Pillar inscription',
        answers: [transpositionDecrypt(T_CIPHER, T_KEY), T_PLAIN],
        hints: ['WALL sorts to A, L, L, W → read columns 2, 3, 4, 1.', `There are ${T_CIPHER.length / 4} rows. Split the ciphertext into 4 columns of that length and place them back.`],
        explanation: `Columns were read in order A-L-L-W. Putting them back row by row gives ${transpositionDecrypt(T_CIPHER, T_KEY)} — “${T_PLAIN}” plus padding.`,
      }),
    },
    {
      kind: 'puzzle', who: 'nyra', puzzle: choice({
        id: 'p2-tell', tags: ['transposition', 'analysis'], difficulty: 2,
        prompt: 'A ciphertext’s letter frequencies match English almost perfectly, but it reads as gibberish. What is it most likely?',
        hints: ['Which kind of cipher leaves letters untouched?'],
        explanation: 'Transposition preserves every letter, so the frequency profile stays English. Substitution renames letters, so the profile is shuffled.',
        options: [
          { text: 'A transposition cipher', correct: true, why: 'Yes — same letters, new order.' },
          { text: 'A Caesar cipher', why: 'Caesar shifts the whole profile sideways — E’s spike would appear under a different letter.' },
          { text: 'A Vigenère cipher', why: 'Vigenère flattens frequencies; they would not look like English.' },
        ],
      }),
    },
    {
      kind: 'investigate', id: 'i2-maze', title: 'Labyrinth Walls',
      text: 'Behind the pillars: a strategist’s brief, pinned with a Citadel seal.',
      clues: [
        { id: 'brief', label: 'Citadel strategy brief', detail: 'Orion’s signature is at the bottom.', lore: 'l-orion' },
      ],
    },
    {
      kind: 'dialogue', scene: 'maze', lines: [
        { who: 'weaver', text: 'Every thread I spin… spins again… and again… and again… You cannot find a pattern in an echo, Guardian.', mood: 'smirk' },
        { who: 'nyra', text: 'An echo IS a pattern. Kael, find the key length and we cut its threads.', mood: 'angry' },
      ],
    },
    { kind: 'boss', bossId: 'weaver' },
    {
      kind: 'dialogue', scene: 'maze', lines: [
        { who: 'orion', text: 'Classical era: closed. Every cipher so far fell for the same reason — the structure of language leaked through.', mood: 'neutral' },
        { who: 'aura', text: 'Next, the Iron Forge. Where the Guardians built ciphers meant for machines: mathematics designed so that NOTHING leaks.', mood: 'smile' },
        { who: 'vexa', text: '(from the shadows) “Designed” isn’t “guaranteed.” Bring me what you learn in the Forge. The Wastes have stories about broken machines.', mood: 'smirk' },
      ],
    },
  ],
}
