# CIPHERVERSE — The War of Broken Realms

*Every secret has a key. Every key has a cost.*

A cinematic, story-driven web game that teaches cryptography, from Caesar and Playfair to AES, RSA, Diffie–Hellman, SHA-256/HMAC, AES-GCM and post-quantum cryptography. Every cipher output in the game is computed by real, tested code.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 69 tests: crypto test vectors, progression, content integrity
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Requires Node 18+ (tested on Node 22). No backend or database is needed.

## What's inside

| Area | Where |
| --- | --- |
| Cinematic intro (6 scenes, ~70 s, subtitles, skip, reduced motion, synthesized score) | `src/pages/Intro.tsx`, `src/components/IntroScenes.tsx`, `src/components/GlyphField.tsx` |
| 8 chapters + 3 side quests, data-driven mission engine | `src/data/missions-*.ts`, `src/pages/MissionPlayer.tsx` |
| 8 multi-phase boss battles (shields tied to correct answers; no fail state that removes progress) | `src/data/bosses.ts`, `src/components/BossBattle.tsx` |
| 3 endings, including a secret one (5 hidden lore fragments + Vexa’s trust + the “open designs” choice) | `src/game/meta.ts`, `src/pages/Ending.tsx` |
| 9 interactive labs: Caesar, Playfair, Vigenère/Transposition, AES, Modes (ECB/CBC/CTR/GCM), RSA, DH, Hash/HMAC, Cryptanalysis | `src/labs/` |
| Encyclopedia (what / why / problem / I-O / keys / example / lab / misconception / security / real use / quiz / references) | `src/data/encyclopedia.ts` |
| XP, levels, ranks, mastery, 6 skill trees, 24 achievements, 8 costumes, lore, daily challenge, practice, certification exam | `src/game/`, `src/pages/` |
| Original SVG character art with moods and costumes | `src/components/Portrait.tsx` |
| Synthesized audio (Web Audio API, no external assets), mute = suspended audio context | `src/audio/engine.ts` |

## Cryptography correctness

- **Classical ciphers** (`src/crypto/classical.ts`, `playfair.ts`) are tested against textbook examples, e.g. Playfair *HIDE THE GOLD IN THE TREE STUMP* → `BMODZBXDNABEKUDMUIXMMOUVIF`. The Playfair lab states its conventions (I/J merged or Q omitted; X filler).
- **AES** (`src/crypto/aes.ts`) is an *educational* implementation built for step-by-step tracing. It is validated against the FIPS-197 Appendix A, B and C vectors (AES-128/192/256, encrypt and decrypt) and cross-checked against Web Crypto in tests and live in the lab. It is **not constant-time and is not used to protect anything.**
- **Real primitives** (SHA-256, HMAC-SHA256, AES-GCM, the CSPRNG) come from the browser's Web Crypto API (`src/crypto/webcrypto.ts`). They're tested against FIPS 180-4 and RFC 4231 vectors.
- **RSA and DH** use deliberately tiny BigInt parameters. The UI labels them as toy, textbook versions and explains OAEP/PSS, hybrid encryption and authentication.

## Privacy and saves

Guest mode only: progress auto-saves to `localStorage` (versioned and migration-safe). Settings has **export/import/reset** for saves. No accounts, passwords or keys are stored, and nothing from the labs leaves the browser.

## Accessibility and devices

- Keyboard-navigable, with a skip link and ARIA labels on interactive grids and controls.
- Reduced-motion mode (follows the OS setting or can be forced), a screen-shake toggle and a high-contrast mode.
- Subtitle size and text-speed settings; the optional narrator voice respects mute.
- Responsive from 360 px phones to desktop, with no horizontal page scroll. On phones, map panels open as bottom sheets and navigation is in a drawer.

## Not built yet

- Server-side accounts and sync (the architecture keeps all state in one reducer, `src/game/state.ts`, so adding a backend later is straightforward).
- Recorded voice acting: narration uses optional speech synthesis, and subtitles are always on.
