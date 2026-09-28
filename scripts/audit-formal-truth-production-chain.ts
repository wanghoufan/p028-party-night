/**
 * C1-8｜§十八 第一段｜Formal Truth 真实生产链落盘证据。
 *
 * 与 `tests/integration/v2-formal-truth-production-chain.test.ts` 同一条链、同一批断言对象，
 * 差别只在本文件把逐轮证据落成 JSON 产物（测试是门禁，本文件是证据）。
 *
 * 链：`startRound`（唯一出题入口 → createDeckRouter 生产 Router）→
 *     `resolveRoundAndReduce(session,'complete',roundDisclosureSignal(...))` →
 *     `eventForRoundTerminal`（卡侧 metadata 走生产 sidecar）→ `reduceV2SessionEvents`
 *     → `relationshipEffectiveCardCount` / `Heat`。
 *
 * 产物：`docs/qa/content-audit/FORMAL-TRUTH-PRODUCTION-CHAIN.json`
 */
import { writeFileSync } from "node:fs";

import { DEFAULT_BOUNDARIES } from "@/lib/domain/constants";
import type { GameCard, GameSession, Player, SessionConfig } from "@/lib/domain/schemas";
import {
  createSession,
  resolveRoundAndReduce,
  roundDisclosureSignal,
  startRound,
} from "@/lib/engine/session-engine";
import { relationshipOf } from "@/lib/engine/v2-deal";
import { mainlineSsotCardsByPack } from "@/lib/v2-content/v2-card-bridge";
import { metadataForCard } from "@/lib/v2-content/v2-card-quality-index";
import { HEAT_THRESHOLDS } from "@/lib/v2-relationship/v2-state";

const ROOT = process.cwd();
const PACK_ID = "truth-dare";
const FIXED_DRAW_SEED = 1;

const players = (): Player[] =>
  ["a", "b", "c", "d"].map((id) => ({ id, displayName: `玩家${id}`, active: true, createdAt: "x", lastUsedAt: "x" }));
const participants = () => [
  { playerId: "a", active: true, pairGender: "male" as const },
  { playerId: "b", active: true, pairGender: "female" as const },
  { playerId: "c", active: true, pairGender: "male" as const },
  { playerId: "d", active: true, pairGender: "female" as const },
];
const config = (): SessionConfig => ({
  players: players(), relationship: "friends", vibes: ["funny"], intensity: 5,
  boundaries: DEFAULT_BOUNDARIES, enabledPackIds: [PACK_ID], mode: "single",
});

const PACK_CARDS = mainlineSsotCardsByPack(PACK_ID);
const FORMAL_CARDS = PACK_CARDS.filter((c) => c.id.startsWith("PN-TRUTH-2"));
const LEGACY_CARDS = PACK_CARDS.filter((c) => !c.id.startsWith("PN-TRUTH-2"));

const drive = (deck: readonly GameCard[], drawSeed: number, maxRounds = 20) => {
  let session: GameSession = createSession(config(), [...deck], participants());
  const rounds: Record<string, unknown>[] = [];
  for (let i = 0; i < maxRounds; i += 1) {
    const dealt = startRound(session, () => 0, { drawSeed });
    if (!dealt.currentRound) break;
    const cardId = dealt.currentRound.cardId;
    const meta = metadataForCard(cardId);
    session = resolveRoundAndReduce(
      dealt, "complete",
      roundDisclosureSignal({ selfDisclosed: true, disclosedPlayerIds: [["a", "b"][i % 2]!] }),
    );
    const rel = relationshipOf(session);
    rounds.push({
      round: i + 1, cardId, formal: cardId.startsWith("PN-TRUTH-2"),
      informationGain: meta.informationGain, topic: meta.topic,
      effectiveCount: rel.relationshipEffectiveCardCount, heat: rel.heat,
    });
  }
  return { rounds, finalHeat: relationshipOf(session).heat, finalEffective: relationshipOf(session).relationshipEffectiveCardCount };
};

const firstIndexByHeat = (rounds: { heat: string }[]): Record<string, number | null> => {
  const out: Record<string, number | null> = {};
  for (const band of HEAT_THRESHOLDS) {
    const idx = rounds.findIndex((r) => r.heat === band.heat);
    out[band.heat] = idx === -1 ? null : idx + 1;
  }
  return out;
};

/* 情形 1：全包真实牌堆（seed=1）——Formal 可真抽到、metadata 进 event、Heat 到 H2 */
const fullPack = drive(PACK_CARDS, FIXED_DRAW_SEED);
/* 情形 2：仅 Formal 24 张（真实生产卡子集）——Heat 逐档到 H4 */
const formalOnly = drive(FORMAL_CARDS, FIXED_DRAW_SEED);
/* 情形 3：负向对照（仅 legacy）——sidecar 恒 null ⇒ 有效计数 0 / Heat 恒 H1 */
const legacyOnly = drive(LEGACY_CARDS, FIXED_DRAW_SEED);

/* 全包 200 seed 扫描：生产实况的 Heat 到达率（诚实口径，不挑 seed） */
const SWEEP = 200;
const sweep = { sessions: SWEEP, reachedH2: 0, reachedH3: 0, reachedH4: 0, effectiveSum: 0, heatDistribution: {} as Record<string, number> };
for (let seed = 1; seed <= SWEEP; seed += 1) {
  const res = drive(PACK_CARDS, seed);
  sweep.effectiveSum += res.finalEffective;
  sweep.heatDistribution[res.finalHeat] = (sweep.heatDistribution[res.finalHeat] ?? 0) + 1;
  const order = ["H1", "H2", "H3", "H4"];
  if (order.indexOf(res.finalHeat) >= 1) sweep.reachedH2 += 1;
  if (order.indexOf(res.finalHeat) >= 2) sweep.reachedH3 += 1;
  if (order.indexOf(res.finalHeat) >= 3) sweep.reachedH4 += 1;
}

const out = {
  generator: "scripts/audit-formal-truth-production-chain.ts",
  requirement: "§十八：Formal Truth → Router 可出 → metadata 进入 production event → effective count 推进 → Heat H1→H2/H3/H4",
  chain: [
    "startRound（唯一出题入口 → drawDeckCard → createDeckRouter 生产 Router 三层计数）",
    "resolveRoundAndReduce(session,'complete',roundDisclosureSignal({selfDisclosed, disclosedPlayerIds}))",
    "eventForRoundTerminal（卡侧 metadata 由 metadataForCard 读生产 sidecar；轮侧披露由正式信号提供）",
    "reduceV2SessionEvents → relationshipEffectiveCardCount / heatForEffectiveCount",
  ],
  disclosure: "本文件与 integration 测试均不注入 metadata override；第一包 24 张的 informationGain/topic 来自生产 sidecar 真实投影。",
  seed: FIXED_DRAW_SEED,
  table: "2男2女（a男/b女/c男/d女，合法 pair 全程可用）",
  scenarioFullPack: {
    deck: `mainlineSsotCardsByPack('${PACK_ID}')（${PACK_CARDS.length} 张，含第一包 ${FORMAL_CARDS.length} 张）`,
    rounds: fullPack.rounds,
    finalHeat: fullPack.finalHeat,
    finalEffective: fullPack.finalEffective,
    firstReachRoundByHeat: firstIndexByHeat(fullPack.rounds as { heat: string }[]),
  },
  scenarioFormalOnly: {
    deck: `第一包 Formal 24 张（PN-TRUTH-201~224，真实生产卡）`,
    rounds: formalOnly.rounds,
    finalHeat: formalOnly.finalHeat,
    finalEffective: formalOnly.finalEffective,
    firstReachRoundByHeat: firstIndexByHeat(formalOnly.rounds as { heat: string }[]),
    note: "牌堆只有 Formal 卡 ⇒ 每张 completed 都是有效信息轮 ⇒ Heat 逐档 H1→H2→H3→H4，逐档首次到达计数 = HEAT_THRESHOLDS 的 min+1（4/8/13）。",
  },
  scenarioLegacyOnly: {
    deck: `仅 legacy 卡（${LEGACY_CARDS.length} 张，无第一包）`,
    rounds: legacyOnly.rounds,
    finalHeat: legacyOnly.finalHeat,
    finalEffective: legacyOnly.finalEffective,
    firstReachRoundByHeat: firstIndexByHeat(legacyOnly.rounds as { heat: string }[]),
    note: "负向对照：legacy 卡 sidecar 恒 null ⇒ isEffectiveInformationRound fail-closed ⇒ 有效计数恒 0、Heat 恒 H1。",
  },
  fullPackSeedSweep: { ...sweep, effectiveMean: +(sweep.effectiveSum / SWEEP).toFixed(2) },
};

writeFileSync(`${ROOT}/docs/qa/content-audit/FORMAL-TRUTH-PRODUCTION-CHAIN.json`, JSON.stringify(out, null, 2));

console.log("Formal Truth 真实生产链证据已落盘");
console.log("全包 seed=1：轮", fullPack.rounds.length, "｜effective", fullPack.finalEffective, "｜Heat", fullPack.finalHeat,
  "｜首达", JSON.stringify(out.scenarioFullPack.firstReachRoundByHeat));
console.log("仅 Formal seed=1：轮", formalOnly.rounds.length, "｜effective", formalOnly.finalEffective, "｜Heat", formalOnly.finalHeat,
  "｜首达", JSON.stringify(out.scenarioFormalOnly.firstReachRoundByHeat));
console.log("仅 legacy seed=1：轮", legacyOnly.rounds.length, "｜effective", legacyOnly.finalEffective, "｜Heat", legacyOnly.finalHeat);
console.log("全包 200 seed：", JSON.stringify(out.fullPackSeedSweep));
