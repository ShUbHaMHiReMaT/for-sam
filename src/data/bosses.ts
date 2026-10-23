import type { Boss, ChoicePuzzle } from '../game/types'
import { caesarEncrypt, vigenereEncrypt } from '../crypto/classical'
import { encryptSteps, playfairEncrypt, type PlayfairRule } from '../crypto/playfair'
import { SBOX, hex } from '../crypto/aes'
import { modInverse, modPow } from '../crypto/publickey'
import { AES_ROUND_ORDER } from './missions-late'
import { choice, order, playfairAnswers, text } from './helpers'

// ── Sentinel
const S_PLAIN = 'GUARDIANS NEVER FORGET'
const S_SHIFT = 7
const S_CIPHER = caesarEncrypt(S_PLAIN, S_SHIFT)

// ── Letter Eater
const LE_KEY = 'MONARCHY'
const RULE_LABEL: Record<PlayfairRule, string> = { row: 'Same row — shift right', column: 'Same column — shift down', rectangle: 'Rectangle — swap columns' }
function ruleQuestion(id: string, pair: string): ChoicePuzzle {
  const step = encryptSteps(pair, LE_KEY)[0]
  return choice({
    id, tags: ['playfair'], difficulty: 2,
    prompt: `The Letter Eater lunges with the pair “${pair}”. In the ${LE_KEY} square, which rule encrypts it?`,
    widget: 'playfairSquare', widgetProps: { keyword: LE_KEY, highlight: pair },
    hints: ['Find both letters. Compare their rows, then their columns.'],
    explanation: `${pair} uses the ${step.rule} rule and becomes ${step.output}.`,
    options: (['row', 'column', 'rectangle'] as PlayfairRule[]).map((r) => ({
      text: RULE_LABEL[r],
      correct: r === step.rule,
      why: r === step.rule ? `Correct — ${pair} → ${step.output}.` : `Look again: are ${pair[0]} and ${pair[1]} really in the same ${r === 'rectangle' ? 'row or column' : r}?`,
    })),
  })
}
const LE_PLAIN = 'FEED ME NO MORE'
const LE_CIPHER = playfairEncrypt(LE_PLAIN, LE_KEY)

// ── Echo Weaver
const EW_KEY = 'LOOMS'
const EW_PLAIN = 'THREADS UNRAVEL'
const EW_CIPHER = vigenereEncrypt(EW_PLAIN, EW_KEY)

// ── Sovereigns
const SP = 5n, SQ = 11n, SE = 3n
const SN = SP * SQ
const SPHI = (SP - 1n) * (SQ - 1n)
const SD = modInverse(SE, SPHI)
const SM = 7n
const SC = modPow(SM, SE, SN)

// ── Null King
const NK_PLAIN = 'TRUST IS VERIFIED'
const NK_KEY = 'GUARDIAN'
const NK_CIPHER = vigenereEncrypt(NK_PLAIN, NK_KEY)

export const BOSSES: Boss[] = [
  {
    id: 'sentinel', name: 'The Broken Sentinel', title: 'Warden of the Fallen Archive', chapter: 0, art: 'sentinel', color: '#ffb547', arena: 'ruins', xp: 150, costume: 'sentinel',
    intro: [
      { who: 'sentinel', text: 'KEY VERIFICATION REQUIRED. THREE PROTOCOLS. FAILURE IS… EDUCATIONAL.', mood: 'angry' },
      { who: 'aura', text: 'Ooh, it’s a quizzing firewall. My favourite kind of murder robot.', mood: 'smirk' },
    ],
    phases: [
      {
        name: 'Protocol I — Vocabulary', telegraph: 'The Sentinel charges a beam of jumbled definitions…',
        taunt: { who: 'sentinel', text: 'DEFINE YOUR TERMS, INTRUDER.', mood: 'angry' },
        tasks: [
          choice({
            id: 'b0-1', tags: ['basics'], difficulty: 1,
            prompt: 'The Sentinel holds up a scrambled message. What is it called?',
            hints: ['Before encryption it was plaintext. After…?'],
            explanation: 'Scrambled output of encryption is ciphertext.',
            options: [
              { text: 'Ciphertext', correct: true, why: 'Correct.' },
              { text: 'Plaintext', why: 'Plaintext is the readable input.' },
              { text: 'The key', why: 'The key is the secret parameter, not the message.' },
            ],
          }),
          choice({
            id: 'b0-2', tags: ['basics'], difficulty: 1,
            prompt: 'What does decryption need, to turn ciphertext back into plaintext?',
            hints: ['Two things: the method and the secret.'],
            explanation: 'The (public) algorithm and the correct key.',
            options: [
              { text: 'Only the ciphertext', why: 'Without the key, it is supposed to be unreadable.' },
              { text: 'The algorithm and the correct key', correct: true, why: 'Correct.' },
              { text: 'The plaintext', why: 'If you had the plaintext you wouldn’t need to decrypt!' },
            ],
          }),
        ],
      },
      {
        name: 'Protocol II — Shift Storm', telegraph: 'Letters whirl around the Sentinel, each shifted by an unknown amount…',
        taunt: { who: 'sentinel', text: 'MY SHIFT IS SECRET. YOU CANNOT DECODE WHAT YOU CANNOT KEY.', mood: 'smirk' },
        tasks: [
          text({
            id: 'b0-3', tags: ['caesar', 'analysis'], difficulty: 2,
            prompt: 'Decrypt the Sentinel’s battle-cry. The shift is unknown — but there are only 25 possibilities.',
            data: S_CIPHER, dataLabel: 'Battle-cry',
            widget: 'caesarWheel', widgetProps: { shift: 0, interactive: true, sample: S_CIPHER },
            answers: [S_PLAIN],
            hints: ['Turn the wheel until the words make sense.', 'The first word has 9 letters and describes protectors of the Archive.', `The shift is ${S_SHIFT}.`],
            explanation: `Shift ${S_SHIFT} — found by trying keys. That is brute force: feasible whenever the keyspace is tiny.`,
          }),
        ],
      },
      {
        name: 'Protocol III — Core Logic', telegraph: 'The Sentinel’s core opens. One last question guards it.',
        taunt: { who: 'sentinel', text: 'CAESAR PROTECTED EMPERORS. CAESAR WILL PROTECT ME.', mood: 'angry' },
        tasks: [
          choice({
            id: 'b0-4', tags: ['caesar', 'analysis'], difficulty: 1,
            prompt: 'Why can’t Caesar protect the Sentinel’s core today?',
            hints: ['How many keys did you need to try?'],
            explanation: 'Only 25 useful keys: anyone can try them all instantly. Its keyspace is tiny and it preserves letter patterns.',
            options: [
              { text: 'Its keyspace is tiny — all 25 shifts can be tried in seconds.', correct: true, why: 'Exactly.' },
              { text: 'Because the algorithm became public.', why: 'Public algorithms are fine (Kerckhoffs); the problem is the tiny keyspace.' },
              { text: 'It can — if the shift is kept secret.', why: 'A secret shift is still one of only 25.' },
            ],
          }),
        ],
      },
    ],
    defeat: [
      { who: 'sentinel', text: 'KEY… UNDERSTOOD. ARCHIVE… SAFE. RESUMING… SLEEP.', mood: 'sad' },
    ],
    debrief: { title: 'What you proved', points: ['Plaintext, ciphertext, algorithm and key are different things.', 'Decryption needs the algorithm and the right key.', 'Brute force works whenever the keyspace is small — Caesar has only 25 useful keys.'] },
  },
  {
    id: 'eater', name: 'The Letter Eater', title: 'Devourer of Pairs', chapter: 1, art: 'eater', color: '#ffb547', arena: 'library', xp: 220, costume: 'wheatstone',
    intro: [
      { who: 'eater', text: 'Two by two by two… I eat your letters in PAIRS, so your precious frequencies starve.', mood: 'smirk' },
      { who: 'nyra', text: 'It hides behind a Playfair square keyed with MONARCHY. Read its pairs, and the shield cracks.', mood: 'neutral' },
    ],
    phases: [
      {
        name: 'Phase I — The Grid Bites', telegraph: 'The Eater’s jaws form a 5×5 grid…',
        taunt: { who: 'eater', text: 'Which way do my teeth move, Guardian? Row? Column? Corner?', mood: 'smirk' },
        tasks: [ruleQuestion('b1-1', 'MA'), ruleQuestion('b1-2', 'OF'), ruleQuestion('b1-3', 'HI')],
      },
      {
        name: 'Phase II — The Swallowed Message', telegraph: 'It spits out a chain of digraphs — a stolen order.',
        taunt: { who: 'eater', text: 'Read my last meal, if you can.', mood: 'angry' },
        tasks: [
          text({
            id: 'b1-4', tags: ['playfair'], difficulty: 3,
            prompt: `Decrypt the Eater’s message with the ${LE_KEY} square. (Fillers optional.)`,
            data: LE_CIPHER.match(/.{2}/g)!.join(' '), dataLabel: 'Swallowed message',
            widget: 'playfairSquare', widgetProps: { keyword: LE_KEY },
            answers: playfairAnswers(LE_PLAIN, LE_KEY),
            hints: ['Decrypting: row → left, column → up, rectangle → swap columns.', 'The double E in FEED was split with an X.', 'It begins “FE…”'],
            explanation: `${LE_CIPHER} → ${playfairAnswers(LE_PLAIN, LE_KEY)[0]} → “${LE_PLAIN}”.`,
          }),
        ],
      },
      {
        name: 'Phase III — The Empty Stomach', telegraph: 'The Eater is weak. It boasts one last time.',
        taunt: { who: 'eater', text: 'Pairs cannot be counted! I am UNBREAKABLE!', mood: 'angry' },
        tasks: [
          choice({
            id: 'b1-5', tags: ['playfair', 'analysis'], difficulty: 2,
            prompt: 'Explain a limitation of Playfair that makes it insecure by modern standards.',
            hints: ['Single letters are hidden… but what about pairs?'],
            explanation: 'Playfair is a fixed substitution on ~600 possible digraphs. Digraph frequencies (TH, HE, IN…) leak, and a pair and its reverse encrypt to reversed ciphertext. With enough text it is broken by hand — WWI-era codebreakers routinely did it.',
            options: [
              { text: 'Digraph frequencies still leak, and AB/BA encrypt to reversed pairs — statistical attacks break it.', correct: true, why: 'Exactly.' },
              { text: 'It has no key, so anyone can decrypt it.', why: 'It has a key — the keyword square.' },
              { text: 'Nothing; Playfair is still secure if the keyword is long.', why: 'Its structure leaks regardless of keyword length.' },
            ],
          }),
        ],
      },
    ],
    defeat: [
      { who: 'eater', text: 'So… full… of… understanding… ugh.', mood: 'sad' },
      { who: 'nyra', text: 'And THAT’s how you starve a monster.', mood: 'smile' },
    ],
    debrief: { title: 'What you proved', points: ['Playfair encrypts digraphs with a 5×5 key square.', 'Row → right, column → down, rectangle → swap columns; decryption reverses the shifts.', 'Hiding single-letter frequencies is not enough — digraph statistics still leak.'] },
  },
  {
    id: 'weaver', name: 'The Echo Weaver', title: 'Spinner of Repeating Keys', chapter: 2, art: 'weaver', color: '#b77bff', arena: 'maze', xp: 240,
    intro: [
      { who: 'weaver', text: 'My threads change color every step. You will never find the same thread twice…', mood: 'smirk' },
      { who: 'nyra', text: 'Except it does repeat. Every five steps? Seven? Find it.', mood: 'neutral' },
    ],
    phases: [
      {
        name: 'Phase I — Count the Echo', telegraph: 'The Weaver spins a long, shimmering ciphertext…',
        taunt: { who: 'weaver', text: 'How long is my key, little Guardian?', mood: 'smirk' },
        tasks: [
          choice({
            id: 'b2-1', tags: ['vigenere', 'analysis'], difficulty: 3,
            prompt: 'Nyra splits the Weaver’s ciphertext into columns for each guessed key length and measures the average index of coincidence (English ≈ 0.066, random ≈ 0.038): length 3 → 0.041, length 5 → 0.065, length 7 → 0.043. Key length?',
            hints: ['When the guess is right, each column is a plain Caesar cipher — so it looks like English statistically.'],
            explanation: 'Length 5 gives English-like IC (0.065): each column is one Caesar shift. Wrong lengths mix shifts and look random.',
            options: [
              { text: '3', why: '0.041 is close to random — columns mix several shifts.' },
              { text: '5', correct: true, why: 'Yes — English-like IC means each column uses one shift.' },
              { text: '7', why: '0.043 looks random.' },
            ],
          }),
        ],
      },
      {
        name: 'Phase II — Cut the Thread', telegraph: 'With the key length known, the Weaver’s key letters shine through: L-O-O-M-S.',
        taunt: { who: 'weaver', text: 'Knowing my key is not the same as USING it…', mood: 'angry' },
        tasks: [
          text({
            id: 'b2-2', tags: ['vigenere'], difficulty: 3,
            prompt: `Decrypt the Weaver’s binding thread with the recovered key “${EW_KEY}”.`,
            data: EW_CIPHER, dataLabel: 'Binding thread',
            widget: 'vigenereAlign', widgetProps: { text: EW_CIPHER, keyword: EW_KEY, decrypt: true },
            answers: [EW_PLAIN],
            hints: ['Subtract each key letter’s shift (L=11, O=14, M=12, S=18).', 'The first word is THREADS.'],
            explanation: `${EW_CIPHER} − LOOMS… = ${EW_PLAIN}.`,
          }),
        ],
      },
      {
        name: 'Phase III — The Last Strand', telegraph: 'The Weaver tries to re-spin itself with a longer key.',
        taunt: { who: 'weaver', text: 'Then I shall make my key LONGER. As long as the message! Perfect!', mood: 'smirk' },
        tasks: [
          choice({
            id: 'b2-3', tags: ['vigenere', 'analysis'], difficulty: 3,
            prompt: 'A key as long as the message… When does that become a truly unbreakable one-time pad?',
            hints: ['Three conditions — and the Weaver’s habit breaks the last one.'],
            explanation: 'Only if the key is truly random, at least as long as the message, kept secret, and NEVER reused. Reuse lets attackers combine ciphertexts and cancel the key (the Venona project exploited exactly that).',
            options: [
              { text: 'When the key is a long English phrase.', why: 'English keys have structure; the plaintext and key can be attacked together.' },
              { text: 'When it is truly random, never reused and kept secret.', correct: true, why: 'Exactly — the one-time pad conditions.' },
              { text: 'Any key longer than 20 letters.', why: 'Length alone isn’t enough; randomness and no reuse are essential.' },
            ],
          }),
        ],
      },
    ],
    defeat: [{ who: 'weaver', text: 'My echo… fades…', mood: 'sad' }],
    debrief: { title: 'What you proved', points: ['Vigenère is a sequence of Caesar shifts set by a repeating keyword.', 'Repetition leaks the key length (Kasiski, index of coincidence).', 'Only a truly random, never-reused key as long as the message (one-time pad) removes the echo.'] },
  },
  {
    id: 'colossus', name: 'The Iron Colossus', title: 'Engine of Ten Rounds', chapter: 3, art: 'colossus', color: '#c9d2e0', arena: 'forge', xp: 280, costume: 'forge',
    intro: [
      { who: 'colossus', text: 'I AM AES. I AM UNBREAKABLE. MY SEQUENCE HAS BEEN… REARRANGED. I WILL RE-FORGE YOU.', mood: 'angry' },
      { who: 'orion', text: 'Its round controller is scrambled. Fix the order, prove you know the chambers, and it powers down.', mood: 'neutral' },
    ],
    phases: [
      {
        name: 'Phase I — Sequence Fault', telegraph: 'The Colossus’s chest-rings spin out of order…',
        taunt: { who: 'colossus', text: 'MIX. KEY. SHIFT. SUBSTITUTE? OR SUBSTITUTE. SHIFT. MIX. KEY?', mood: 'angry' },
        tasks: [
          order({
            id: 'b3-1', tags: ['aes'], difficulty: 3,
            prompt: 'Restore the AES-128 encryption sequence.',
            items: AES_ROUND_ORDER,
            hints: ['Key material is added before the first round.', 'The final round has no MixColumns.'],
            explanation: 'Initial AddRoundKey → 9 full rounds → final round without MixColumns.',
          }),
          choice({
            id: 'b3-2', tags: ['aes'], difficulty: 2,
            prompt: 'Which AES transformation is the only one that uses the key?',
            hints: ['Its name says so.'],
            explanation: 'AddRoundKey XORs the state with round-key material. The others are fixed, public, key-independent transformations.',
            options: [
              { text: 'SubBytes', why: 'The S-box is a fixed public table.' },
              { text: 'MixColumns', why: 'A fixed matrix — no key.' },
              { text: 'AddRoundKey', correct: true, why: 'Correct.' },
              { text: 'ShiftRows', why: 'A fixed rotation — no key.' },
            ],
          }),
        ],
      },
      {
        name: 'Phase II — Byte Furnace', telegraph: 'Molten bytes pour from the Colossus’s arms.',
        taunt: { who: 'colossus', text: 'SUBSTITUTE THIS, GUARDIAN.', mood: 'angry' },
        tasks: [
          text({
            id: 'b3-3', tags: ['aes'], difficulty: 2,
            prompt: 'SubBytes: what is S(0x00)?',
            answers: [hex(SBOX[0x00]).toUpperCase()],
            placeholder: 'Two hex digits',
            hints: ['0 has no multiplicative inverse, so it is treated as 0 — then the affine transform adds the constant 0x63.'],
            explanation: `S(0x00) = 0x${hex(SBOX[0])} — the affine constant itself.`,
          }),
          text({
            id: 'b3-4', tags: ['aes'], difficulty: 2,
            prompt: 'AddRoundKey: 0xF0 ⊕ 0x3C = ?',
            answers: [hex(0xf0 ^ 0x3c).toUpperCase()],
            placeholder: 'Two hex digits',
            hints: ['1111 0000 ⊕ 0011 1100'],
            explanation: `1111 0000 ⊕ 0011 1100 = 1100 1100 = 0x${hex(0xf0 ^ 0x3c).toUpperCase()}.`,
          }),
        ],
      },
      {
        name: 'Phase III — The Boast', telegraph: 'The Colossus makes its final claim.',
        taunt: { who: 'colossus', text: 'MY DESIGN IS PUBLIC! ANYONE CAN READ IT! THEREFORE I AM WEAK AND YOU MAY SIMPLY READ MY SECRETS!', mood: 'angry' },
        tasks: [
          choice({
            id: 'b3-5', tags: ['aes', 'design'], difficulty: 2,
            prompt: 'Is the Colossus right that a public design makes AES weak?',
            hints: ['Kerckhoffs’s principle.'],
            explanation: 'No. AES’s security rests on the secret key, not on hiding the algorithm. But that means AES security ALSO depends on key secrecy, key generation, the mode and the implementation — not on AES alone.',
            options: [
              { text: 'Yes — public algorithms can be reversed.', why: 'Knowing the algorithm doesn’t reveal the key.' },
              { text: 'No — AES security comes from the key; the design being public is what allowed it to be trusted.', correct: true, why: 'Correct.' },
            ],
          }),
          choice({
            id: 'b3-6', tags: ['modes', 'design'], difficulty: 3,
            prompt: 'The Forge must ship crates that are both confidential and tamper-evident. Which construction?',
            hints: ['One mode provides both.'],
            explanation: 'AES-GCM with a unique nonce per message under each key gives confidentiality and integrity.',
            options: [
              { text: 'AES-ECB', why: 'Leaks patterns, no integrity.' },
              { text: 'AES-CBC with a fixed IV', why: 'Fixed IVs leak equal prefixes, and CBC has no integrity.' },
              { text: 'AES-GCM with a unique nonce per message', correct: true, why: 'Correct.' },
            ],
          }),
        ],
      },
    ],
    defeat: [{ who: 'colossus', text: 'SEQUENCE… RESTORED. ROUNDS… CORRECT. SHUTTING… DOWN… WITH… DIGNITY.', mood: 'sad' }],
    debrief: { title: 'What you proved', points: ['AES-128: initial AddRoundKey, 9 full rounds, final round without MixColumns.', 'Only AddRoundKey uses the key; SubBytes gives nonlinearity, ShiftRows + MixColumns give diffusion.', 'AES security depends on the key, the mode, nonces and the implementation — not on hiding the algorithm.'] },
  },
  {
    id: 'sovereigns', name: 'The Twin Sovereigns', title: 'Aster & Vael', chapter: 4, art: 'sovereigns', color: '#b77bff', arena: 'citadel', xp: 300, costume: 'twin',
    intro: [
      { who: 'sovereigns', text: 'We are two. We hold two keys. We will not cross your bridge unless it holds… under BOTH our weights.', mood: 'angry' },
    ],
    phases: [
      {
        name: 'Phase I — Which Key?', telegraph: 'Aster raises a seal. Vael raises a lock.',
        taunt: { who: 'sovereigns', text: 'Aster wishes to PROVE a decree is hers. Which key does she use?', mood: 'smirk' },
        tasks: [
          choice({
            id: 'b4-1', tags: ['rsa', 'signatures'], difficulty: 2,
            prompt: 'Aster wants everyone to be able to verify that a decree came from her. She signs with…',
            hints: ['Only Aster should be able to produce it; everyone should be able to check it.'],
            explanation: 'Her own PRIVATE key. Anyone verifies with her public key.',
            options: [
              { text: 'Her own private key', correct: true, why: 'Correct.' },
              { text: 'Vael’s public key', why: 'That encrypts something for Vael — it doesn’t prove Aster wrote it.' },
              { text: 'Her own public key', why: 'Anyone has her public key, so it proves nothing.' },
            ],
          }),
        ],
      },
      {
        name: 'Phase II — Forge the Keys', telegraph: `Vael hands you two primes: p = ${SP}, q = ${SQ}, and e = ${SE}.`,
        taunt: { who: 'sovereigns', text: 'Build our private exponent. Then read what Aster sent.', mood: 'neutral' },
        tasks: [
          text({
            id: 'b4-2', tags: ['rsa'], difficulty: 3,
            prompt: `p = ${SP}, q = ${SQ}, e = ${SE}. Compute the private exponent d (with d·e ≡ 1 mod φ).`,
            answers: [String(SD)], placeholder: 'A number',
            widget: 'rsaMini', widgetProps: { p: Number(SP), q: Number(SQ), e: Number(SE) },
            hints: [`n = ${SN}, φ = ${SPHI}.`, `Find d so that ${SE}·d leaves remainder 1 when divided by ${SPHI}.`],
            explanation: `φ = ${SPHI}; ${SE} × ${SD} = ${SE * SD} = ${(SE * SD) / SPHI}·${SPHI} + 1 ⇒ d = ${SD}.`,
          }),
          text({
            id: 'b4-3', tags: ['rsa'], difficulty: 3,
            prompt: `Aster’s ciphertext is c = ${SC}. Decrypt it: m = cᵈ mod n (n = ${SN}).`,
            answers: [String(SM)], placeholder: 'A number',
            hints: ['Use the d you just found. Square-and-multiply keeps numbers small — or use the RSA Lab.', `Check: ${SM}³ mod ${SN} should give ${SC}.`],
            explanation: `${SC}^${SD} mod ${SN} = ${SM}. Check: ${SM}^${SE} = ${SM ** SE} ≡ ${SC} (mod ${SN}).`,
          }),
        ],
      },
      {
        name: 'Phase III — The Eavesdropper’s Trick', telegraph: 'A spy whispers: “I know Aster’s answer is either YES (7) or NO (14).”',
        taunt: { who: 'sovereigns', text: 'Our numbers are secret! The spy cannot know which!', mood: 'smirk' },
        tasks: [
          choice({
            id: 'b4-4', tags: ['rsa', 'design'], difficulty: 3,
            prompt: 'The spy has Vael’s public key and sees c. How can they learn Aster’s answer — and what prevents this in real RSA?',
            hints: ['Textbook RSA is deterministic.'],
            explanation: 'The spy encrypts both guesses with the public key and compares with c. Textbook RSA is deterministic. Randomised padding (RSA-OAEP) makes each encryption different, defeating this.',
            options: [
              { text: 'Encrypt both guesses with the public key and compare; randomised OAEP padding prevents it.', correct: true, why: 'Exactly.' },
              { text: 'They can’t; RSA is secure.', why: 'Textbook RSA leaks low-entropy messages to anyone with the public key.' },
              { text: 'Factor n; use bigger e to prevent it.', why: 'No factoring needed, and e’s size doesn’t fix determinism.' },
            ],
          }),
        ],
      },
    ],
    defeat: [
      { who: 'sovereigns', text: 'The bridge… holds. Aster hears Vael. Vael hears Aster. And no one else.', mood: 'smile' },
    ],
    debrief: { title: 'What you proved', points: ['Encrypt with the recipient’s public key; sign with your own private key.', 'RSA keys: n = pq, φ = (p−1)(q−1), d = e⁻¹ mod φ.', 'Textbook RSA is deterministic — real RSA needs OAEP padding and is usually used in hybrid schemes.'] },
  },
  {
    id: 'assassin', name: 'The Mirror Assassin', title: 'Wearer of Every Face', chapter: 5, art: 'assassin', color: '#ff4fd8', arena: 'frontier', xp: 300,
    intro: [
      { who: 'assassin', text: 'Two travellers, one secret, and me — sitting between them, smiling at both.', mood: 'smirk' },
    ],
    phases: [
      {
        name: 'Phase I — The Middle', telegraph: 'The Assassin splits into two reflections, one facing Nyra, one facing Kael.',
        taunt: { who: 'assassin', text: 'You did your Diffie–Hellman perfectly. Why are you both talking to me?', mood: 'smirk' },
        tasks: [
          choice({
            id: 'b5-1', tags: ['dh'], difficulty: 2,
            prompt: 'Nyra and Kael ran plain Diffie–Hellman. How is the Assassin reading everything?',
            hints: ['Did either of you verify whose public value you received?'],
            explanation: 'Unauthenticated DH is vulnerable to man-in-the-middle: the Assassin ran one exchange with each of you and relays traffic, decrypting and re-encrypting.',
            options: [
              { text: 'It solved the discrete logarithm.', why: 'Unnecessary — it simply substituted its own public values.' },
              { text: 'Man-in-the-middle: it swapped in its own public values with each of you.', correct: true, why: 'Exactly.' },
              { text: 'DH reveals the shared secret on the wire.', why: 'The shared secret is never sent.' },
            ],
          }),
        ],
      },
      {
        name: 'Phase II — Break the Reflection', telegraph: 'The reflections sharpen into blades.',
        taunt: { who: 'assassin', text: 'Try again. I’ll be there again.', mood: 'smirk' },
        tasks: [
          choice({
            id: 'b5-2', tags: ['dh', 'signatures'], difficulty: 3,
            prompt: 'What stops the Assassin next time?',
            hints: ['You need to know whose public value you’re using.'],
            explanation: 'Authenticate the key exchange: sign the DH public values with long-term keys whose public halves are verified (e.g. through certificates). TLS does exactly this.',
            options: [
              { text: 'Use a larger prime p.', why: 'Bigger groups resist discrete-log attacks — but MITM doesn’t need one.' },
              { text: 'Authenticate the exchange: sign the public values with verified long-term keys.', correct: true, why: 'Correct.' },
              { text: 'Keep the generator g secret.', why: 'g is a public parameter; hiding it adds no real security.' },
            ],
          }),
          choice({
            id: 'b5-3', tags: ['signatures', 'hmac'], difficulty: 3,
            prompt: 'The Assassin says: “A shared-key MAC is just as good as a signature.” When is that FALSE?',
            hints: ['Who can create a MAC tag?'],
            explanation: 'With a MAC, anyone holding the shared key can create valid tags, so a third party cannot tell which key holder made it. Signatures can be verified by anyone and created only by the private-key holder.',
            options: [
              { text: 'When a third party must verify exactly who created the message.', correct: true, why: 'Yes — only signatures give publicly verifiable origin.' },
              { text: 'Never; they’re identical.', why: 'They differ in who can create and who can verify.' },
              { text: 'When the message is long.', why: 'Length is irrelevant here.' },
            ],
          }),
        ],
      },
    ],
    defeat: [{ who: 'assassin', text: 'A sealed message… has no face for me to wear…', mood: 'sad' }],
    debrief: { title: 'What you proved', points: ['DH agrees a shared secret over a public channel; it is key agreement, not encryption.', 'Unauthenticated DH is open to man-in-the-middle attacks.', 'Signatures (private key → public verification) authenticate exchanges; MACs only authenticate between key holders.'] },
  },
  {
    id: 'engine', name: 'The Probability Engine', title: 'Every Guess at Once', chapter: 6, art: 'engine', color: '#4dffb8', arena: 'storm', xp: 320, costume: 'storm',
    intro: [{ who: 'engine', text: 'I AM SUPERPOSITION. I AM EVERY KEY. EVERY LOCK OPENS BEFORE ME.', mood: 'angry' }],
    phases: [
      {
        name: 'Phase I — The Overclaim', telegraph: 'The Engine crackles, aiming at every vault at once.',
        taunt: { who: 'engine', text: 'AES-256: SHATTERED. SHA-256: SHATTERED. RSA: SHATTERED.', mood: 'angry' },
        tasks: [
          choice({
            id: 'b6-1', tags: ['pqc'], difficulty: 3,
            prompt: 'Which of the Engine’s claims would actually hold for a large, fault-tolerant quantum computer?',
            hints: ['Shor vs Grover.'],
            explanation: 'Shor’s algorithm breaks RSA and ECC. Grover only gives a quadratic speed-up against AES/SHA-256 — AES-256 keeps a large margin.',
            options: [
              { text: 'All three are shattered.', why: 'Overclaim — AES-256 and SHA-256 remain strong.' },
              { text: 'Only RSA (and ECC) would be broken.', correct: true, why: 'Correct.' },
              { text: 'None — quantum computers can’t affect cryptography.', why: 'Shor’s algorithm would break RSA and ECC.' },
            ],
          }),
        ],
      },
      {
        name: 'Phase II — Tampered Lightning', telegraph: 'The Engine rewrites a weather report mid-flight and recomputes its SHA-256.',
        taunt: { who: 'engine', text: 'NEW REPORT. NEW HASH. PERFECTLY VALID.', mood: 'smirk' },
        tasks: [
          choice({
            id: 'b6-2', tags: ['hmac', 'hash'], difficulty: 2,
            prompt: 'How do the storm-towers catch the forgery?',
            hints: ['The Engine can compute any hash. Can it compute a keyed tag?'],
            explanation: 'Use HMAC (or authenticated encryption) with a key the Engine doesn’t have. Recomputing a plain hash is trivial for anyone.',
            options: [
              { text: 'Compare the SHA-256 again.', why: 'The Engine recomputed it — it matches.' },
              { text: 'Verify an HMAC tag made with a secret key.', correct: true, why: 'Correct.' },
              { text: 'Encrypt the report with SHA-256.', why: 'SHA-256 is not an encryption algorithm.' },
            ],
          }),
        ],
      },
      {
        name: 'Phase III — New Locks', telegraph: 'The Engine turns on the Council’s signatures.',
        taunt: { who: 'engine', text: 'YOUR SIGNATURES ARE ELLIPTIC. THEY ARE MINE, EVENTUALLY.', mood: 'angry' },
        tasks: [
          choice({
            id: 'b6-3', tags: ['pqc', 'signatures'], difficulty: 3,
            prompt: 'Which standard should replace the Council’s elliptic-curve signatures for post-quantum security?',
            hints: ['DSA = Digital Signature Algorithm.'],
            explanation: 'ML-DSA (FIPS 204) is a lattice-based post-quantum signature standard. ML-KEM is for key establishment.',
            options: [
              { text: 'ML-KEM', why: 'ML-KEM establishes keys; it doesn’t sign.' },
              { text: 'ML-DSA', correct: true, why: 'Correct.' },
              { text: 'AES-512', why: 'There is no AES-512, and AES isn’t a signature scheme.' },
            ],
          }),
        ],
      },
    ],
    defeat: [{ who: 'engine', text: 'PROBABILITY OF DEFEAT… COLLAPSED… TO ONE.', mood: 'sad' }],
    debrief: { title: 'What you proved', points: ['Hashes give fingerprints anyone can compute; HMAC needs a secret key.', 'Shor’s algorithm threatens RSA/ECC; Grover only modestly weakens AES/SHA-2.', 'ML-KEM (FIPS 203) for key establishment; ML-DSA (FIPS 204) for signatures.'] },
  },
  {
    id: 'nullking', name: 'The Null King', title: 'Sovereign of Misplaced Trust', chapter: 7, art: 'null', color: '#ff1f3d', arena: 'void', xp: 600, costume: 'null',
    intro: [
      { who: 'null', text: 'You know every algorithm now. Good. Then you will understand exactly how little that matters.', mood: 'neutral' },
      { who: 'aura', text: 'Kael — this isn’t a quiz about ciphers. It’s about systems. Every layer.', mood: 'surprised' },
    ],
    phases: [
      {
        name: 'Stage I — The Trusted Password', telegraph: 'The King conjures a vault: “AES-256. Passphrase: summer2024.”',
        taunt: { who: 'null', text: 'They trusted the algorithm. They never questioned the passphrase.', mood: 'smirk' },
        tasks: [
          choice({
            id: 'b7-1', tags: ['design', 'hash'], difficulty: 3,
            prompt: 'How should a key be derived from a human passphrase?',
            hints: ['Make each guess expensive, and make identical passphrases look different.'],
            explanation: 'Use a slow, salted, memory-hard KDF such as Argon2id (or scrypt/PBKDF2 with high cost) — and encourage long, random passphrases.',
            options: [
              { text: 'SHA-256(passphrase) as the key', why: 'Fast and unsalted: billions of guesses per second.' },
              { text: 'A salted, slow KDF such as Argon2id', correct: true, why: 'Correct.' },
              { text: 'Use the passphrase bytes directly', why: 'Low entropy and wrong length.' },
            ],
          }),
        ],
      },
      {
        name: 'Stage II — The Layer That Failed', telegraph: 'The King shows you three broken vaults. Name the layer that failed in each.',
        taunt: { who: 'null', text: 'Algorithm. Key. Implementation. System. You keep calling them all “encryption.”', mood: 'neutral' },
        tasks: [
          choice({
            id: 'b7-2', tags: ['design'], difficulty: 3,
            prompt: 'Vault A: flawless AES-GCM code — but the key is printed into the server logs every startup. Which layer failed?',
            hints: ['The algorithm and the code are fine.'],
            explanation: 'Key management. The algorithm and implementation are sound; the key’s secrecy was lost.',
            options: [
              { text: 'Algorithm', why: 'AES-GCM is sound.' },
              { text: 'Key management', correct: true, why: 'Correct.' },
              { text: 'Implementation of AES', why: 'The AES code is flawless.' },
            ],
          }),
          choice({
            id: 'b7-3', tags: ['design', 'aes'], difficulty: 3,
            prompt: 'Vault B: the AES code takes measurably longer for some key bytes, and attackers time it remotely. Which layer failed?',
            hints: ['The design of AES says nothing about timing. The code does.'],
            explanation: 'Implementation: a timing side channel. Well-maintained libraries use constant-time code and hardware AES instructions.',
            options: [
              { text: 'Implementation (side channel)', correct: true, why: 'Correct.' },
              { text: 'Algorithm', why: 'AES itself doesn’t require variable timing.' },
              { text: 'Key size', why: 'A bigger key wouldn’t stop timing leaks.' },
            ],
          }),
          choice({
            id: 'b7-4', tags: ['design'], difficulty: 2,
            prompt: 'Vault C: perfect code, perfect keys — but it encrypts with a Vigenère variant. Which layer failed?',
            hints: ['You broke this one in the Labyrinth.'],
            explanation: 'Algorithm: Vigenère is historically broken. A strong system cannot rest on a weak primitive.',
            options: [
              { text: 'Algorithm', correct: true, why: 'Correct.' },
              { text: 'Key management', why: 'The keys were fine — the cipher wasn’t.' },
              { text: 'Nothing failed', why: 'Vigenère falls to Kasiski and frequency analysis.' },
            ],
          }),
        ],
      },
      {
        name: 'Stage III — The Crown of Trust', telegraph: 'The King’s crown flares. The sky fills with unsigned messages.',
        taunt: { who: 'null', text: 'People do not need to break every lock. They only need to find the one that everyone trusts.', mood: 'smirk' },
        tasks: [
          order({
            id: 'b7-5', tags: ['design'], difficulty: 3,
            prompt: 'Build the Guardian’s answer: order the design process from first to last.',
            items: [
              'Threat model: assets, adversaries, threats',
              'Choose standard, reviewed primitives (e.g. AES-GCM, ECDHE/ML-KEM, signatures)',
              'Use a well-maintained library with safe defaults',
              'Protect, separate and rotate keys; use a CSPRNG',
              'Test, monitor and accept outside review',
            ],
            hints: ['Start with what you protect and from whom.', 'End with letting others examine your work.'],
            explanation: 'Threat model → standard primitives → vetted library → key management → review. Trust is earned by verification at every layer.',
          }),
        ],
      },
      {
        name: 'Stage IV — The Last Key', telegraph: 'The King’s final seal: a message, locked with a word you have known since the beginning.',
        taunt: { who: 'null', text: 'Read my last secret, Guardian. You already hold its key. You always did.', mood: 'neutral' },
        tasks: [
          text({
            id: 'b7-6', tags: ['vigenere', 'design'], difficulty: 3,
            prompt: 'Decrypt the King’s final seal. It is a Vigenère cipher. The key is the keyword of the very first Playfair square you built.',
            data: NK_CIPHER, dataLabel: 'The final seal',
            widget: 'vigenereAlign', widgetProps: { text: NK_CIPHER, keyword: '', decrypt: true, editable: true },
            answers: [NK_PLAIN],
            hints: ['Chapter 1, “The Square of Wheatstone.” The keyword protected the Kingdom of Forgotten Letters.', `The key is ${NK_KEY}.`],
            explanation: `With the key ${NK_KEY}: “${NK_PLAIN}.” Not trust given — trust verified.`,
          }),
        ],
      },
    ],
    defeat: [
      { who: 'null', text: '“Trust is verified.” …The council said that too. I would not listen.', mood: 'sad' },
      { who: 'null', text: 'Take the crown, Guardian. It was only ever glass.', mood: 'sad' },
    ],
    debrief: { title: 'What you proved', points: ['Algorithm, key, implementation and system are different layers — each can fail independently.', 'Human secrets need slow, salted KDFs; keys need protection, separation and rotation.', 'Secure design starts with a threat model and ends with outside review.'] },
  },
]

export const bossById = (id: string) => BOSSES.find((b) => b.id === id)
