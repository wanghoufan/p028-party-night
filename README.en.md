# Party Night · Bar Social Game

Four or five people, one phone passed around—questions follow your relationship depth and comfort level, and any topic someone turns off never reaches the table.

[简体中文](./README.md) · [Open online](https://party-night-v1-2.vercel.app/)

## What it is

A social icebreaker for a small bar table. The host holds the phone and hands it to each person in turn. Rather than chasing "edgier" prompts, it uses questions with real, repeatable information value so the table actually learns about each other.

The core rule is **boundaries before content**: before the first round, each person can turn off exact topics they do not want; if anyone turns one off, that topic never appears in the session. Sensitive cards also require a live consent gate.

## What it does

- **Setup and rounds**: choose the number of players and relationship type, then play 20 or 25 rounds, one card at a time.
- **One phone, one person**: only one person sees and answers a card, then passes the phone on.
- **Separate axes**: Heat (relationship progression) and Intensity (explicitness) are computed separately, so deep questions exist at low intensity too.
- **Exact-topic filtering**: cards match exact topic tags, and any participant turning one off removes it—rather than a disclaimer buried in settings.
- **Consent gate**: cards touching sensitive boundaries require on-the-spot confirmation; a refusal skips the card with no explanation demanded.
- **Fixed-bank mainline**: official sessions use the frozen fixed question bank, and each card's provenance is checked; AI generation is off by default and cannot be bypassed.
- **Offline and recovery**: session snapshots restore, so a dropped connection does not end the game.
- **Self-contained build**: a static version can be opened directly when no deployment is available.

## Run it

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev            # local development
npm run build          # production build
npm run build:export   # self-contained static export
npm test               # vitest unit tests
npm run test:e2e       # Playwright end-to-end
npm run typecheck
```

### Android shell (Capacitor)

```bash
npm run android:sync     # sync web output into the native project
npm run android:release  # build a release package (signing and version rules in docs)
```

### AI switch

The mainline defaults to `AI_MAINLINE_ENABLED=false`; the server, the generating-page redirect, and the deck-generation entry all reject generation requests. Re-enabling AI requires passing the fixed-bank acceptance gates and explicit human approval—see `docs/pm/PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST.md`.

## Data and privacy

- Answers are used only to advance the current session; nothing is uploaded and no profiles are built.
- Session snapshots stay on-device; there is no account system.
- The repository's question bank is fixed content and contains no real player answers.

## Known limitations

- AI generation is paused; official sessions use the fixed bank only.
- The primary scenario is a 4–5 person bar table; other player counts and settings are not yet accepted.
- The fixed bank is still being filled out, so some topics have limited rounds; "shuffle and replay" is hidden when no legal cards remain.

## Layout

```text
app/          # Next.js pages and routes
lib/          # question bank, router, boundaries, consent logic
scripts/      # static export, fixed-bank manifest, Android build
docs/         # plans, QA, reviews, governance
```

See `docs/pm/PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST.md` for the latest plan.
