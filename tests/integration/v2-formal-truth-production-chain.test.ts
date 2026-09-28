/**
 * C1-8｜§十八 第一段：第一包 Formal Truth 的**真实生产链**验证。
 *
 * 要证明的链（全部走生产代码，测试只提供两支**正式输入**：真实牌堆 + 正式披露信号）：
 *
 * ```
 * 真实牌堆（mainlineSsotCardsByPack('truth-dare')，含第一包 24 张 Formal）
 *   → startRound（唯一出题入口：drawDeckCard → createDeckRouter → 生产 Router 三层计数）
 *   → resolveRoundAndReduce(session, 'complete', roundDisclosureSignal({ selfDisclosed, disclosedPlayerIds }))
 *   → eventForRoundTerminal（卡侧 metadata 由 metadataForCard 读生产 sidecar；轮侧披露由正式信号提供）
 *   → reduceV2SessionEvents → relationshipEffectiveCardCount / Heat（heatForEffectiveCount）
 * ```
 *
 * 纪律：
 * - **不**注入任何 metadata override（`setCardQualityIndexOverrides` 在本文件里一次都不调用）——
 *   第一包 24 张的 `informationGain`/`topic` 来自生产 sidecar（bridge → quality index 的真实投影）；
 * - **不**直接赋值 relationship / effective count / heat；这些一律由上面的生产链派生后读回；
 * - 认识阈值 / 窗口 / Heat 契约 / D6 / `isEffectiveInformationRound` fail-closed 一律不动。
 *
 * 三个情形：
 * 1. 全包（生产真实牌堆，124 张）seed=1：证明 Formal 卡确实被 Router 抽出、metadata 进 production
 *    event、有效计数推进、Heat 从 H1 进入 H2；
 * 2. 仅 Formal 24 张（真实生产卡，只是牌堆取子集）seed=1：证明同一条链能把 Heat 逐档推到 **H4**；
 * 3. 仅 legacy 卡（无第一包）：负向对照 —— sidecar 恒 null ⇒ 有效计数恒 0、Heat 恒 H1（fail-closed 成立）。
 */

import { describe, expect, it } from "vitest";

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
import { heatForEffectiveCount } from "@/lib/v2-relationship/v2-state";

const PACK_ID = "truth-dare";
const FIXED_DRAW_SEED = 1;
const EXPLICIT_TIMEOUT_MS = 30_000;

const players = (): Player[] =>
  ["a", "b", "c", "d"].map((id) => ({
    id,
    displayName: `玩家${id}`,
    active: true,
    createdAt: "x",
    lastUsedAt: "x",
  }));

/** 2 男 2 女：合法边 a::b / a::d / b::c / c::d，pair 路由全程可用。 */
const participants = () => [
  { playerId: "a", active: true, pairGender: "male" as const },
  { playerId: "b", active: true, pairGender: "female" as const },
  { playerId: "c", active: true, pairGender: "male" as const },
  { playerId: "d", active: true, pairGender: "female" as const },
];

const config = (): SessionConfig => ({
  players: players(),
  relationship: "friends",
  vibes: ["funny"],
  intensity: 5,
  boundaries: DEFAULT_BOUNDARIES,
  enabledPackIds: [PACK_ID],
  mode: "single",
});

const PACK_CARDS = mainlineSsotCardsByPack(PACK_ID);
const FORMAL_CARDS = PACK_CARDS.filter((card) => card.id.startsWith("PN-TRUTH-2"));
const LEGACY_CARDS = PACK_CARDS.filter((card) => !card.id.startsWith("PN-TRUTH-2"));

interface RoundEvidence {
  round: number;
  cardId: string;
  formal: boolean;
  informationGain: string | null;
  topic: string | null;
  effectiveCount: number;
  heat: string;
}

/** 真实生产链驱动：出题 → completed + 本人披露（host 持机逐人递交，轮转答题人）。 */
function driveProductionChain(deck: readonly GameCard[], maxRounds = 20): RoundEvidence[] {
  let session: GameSession = createSession(config(), [...deck], participants());
  const evidence: RoundEvidence[] = [];
  for (let i = 0; i < maxRounds; i += 1) {
    const dealt = startRound(session, () => 0, { drawSeed: FIXED_DRAW_SEED });
    if (!dealt.currentRound) break; // 耗尽：生产给不出卡（本局到此为止）
    const cardId = dealt.currentRound.cardId;
    session = resolveRoundAndReduce(
      dealt,
      "complete",
      roundDisclosureSignal({ selfDisclosed: true, disclosedPlayerIds: [["a", "b"][i % 2]!] }),
    );
    const relationship = relationshipOf(session);
    evidence.push({
      round: i + 1,
      cardId,
      formal: cardId.startsWith("PN-TRUTH-2"),
      informationGain: metadataForCard(cardId).informationGain,
      topic: metadataForCard(cardId).topic,
      effectiveCount: relationship.relationshipEffectiveCardCount,
      heat: relationship.heat,
    });
  }
  return evidence;
}

const lastHeat = (evidence: RoundEvidence[]): string => evidence.at(-1)!.heat;
const maxEffective = (evidence: RoundEvidence[]): number =>
  Math.max(...evidence.map((row) => row.effectiveCount));

describe("C1-8｜Formal Truth → Router → production event → effective count → Heat（真实生产链）", () => {
  it("① 全包真实牌堆：Formal 卡被 Router 抽出、metadata 进 production event、有效计数推进、Heat H1→H2", () => {
    const evidence = driveProductionChain(PACK_CARDS);

    expect(evidence).toHaveLength(20); // 全包牌堆足够跑满 20 轮
    const formalRows = evidence.filter((row) => row.formal);
    expect(formalRows.length, "必须在本局真实抽到第一包 Formal 卡").toBeGreaterThanOrEqual(1);

    // Formal 行：卡侧 metadata 由生产 sidecar 读出（真实值，非测试注入）
    for (const row of formalRows) {
      expect(row.informationGain, `${row.cardId} 的 sidecar informationGain 必须非 null`).not.toBeNull();
      expect(row.topic, `${row.cardId} 的 sidecar topic 必须非 null`).not.toBeNull();
    }
    // legacy 行：sidecar 恒 null（未补标）⇒ fail-closed 不计有效轮
    for (const row of evidence.filter((r) => !r.formal)) {
      expect(row.informationGain, `${row.cardId} 未补标应保持 null`).toBeNull();
      expect(row.topic).toBeNull();
    }

    expect(maxEffective(evidence), "有效信息轮必须真的推进").toBeGreaterThanOrEqual(4);
    // Heat 是 effective count 的纯派生
    expect(lastHeat(evidence)).toBe(heatForEffectiveCount(maxEffective(evidence)));
    expect(evidence[0]!.heat, "开局在 H1").toBe("H1");
    expect(lastHeat(evidence), "全包 seed=1 本局应到达 H2").toBe("H2");
    expect(evidence.map((row) => row.heat)).toContain("H2");
  }, EXPLICIT_TIMEOUT_MS);

  it("② 仅 Formal 24 张（真实生产卡子集）：同一条链把 Heat 逐档推到 H4（H1→H2→H3→H4 全到达）", () => {
    expect(FORMAL_CARDS).toHaveLength(24);
    const evidence = driveProductionChain(FORMAL_CARDS);

    // 牌堆只有 Formal 卡 ⇒ 每一张 completed 都是有效信息轮
    expect(evidence.every((row) => row.formal)).toBe(true);
    expect(evidence.every((row) => row.informationGain !== null && row.topic !== null)).toBe(true);
    expect(evidence.map((row) => row.effectiveCount)).toEqual(
      evidence.map((_, index) => index + 1),
    );

    const heatSequence = evidence.map((row) => row.heat);
    for (const heat of ["H2", "H3", "H4"] as const) {
      expect(heatSequence, `必须真的到达 ${heat}`).toContain(heat);
    }
    // 逐档到达证据：每档首次出现时的有效计数与 HEAT_THRESHOLDS 一致
    const firstIndexByHeat = new Map<string, number>();
    heatSequence.forEach((heat, index) => {
      if (!firstIndexByHeat.has(heat)) firstIndexByHeat.set(heat, index + 1);
    });
    expect(firstIndexByHeat.get("H2")).toBe(4);
    expect(firstIndexByHeat.get("H3")).toBe(8);
    expect(firstIndexByHeat.get("H4")).toBe(13);
    expect(maxEffective(evidence)).toBeGreaterThanOrEqual(13);
    expect(lastHeat(evidence)).toBe("H4");
  }, EXPLICIT_TIMEOUT_MS);

  it("③ 负向对照：仅 legacy 卡（无第一包）⇒ sidecar 恒 null，有效计数恒 0、Heat 恒 H1（fail-closed）", () => {
    const evidence = driveProductionChain(LEGACY_CARDS);
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((row) => !row.formal)).toBe(true);
    expect(evidence.every((row) => row.informationGain === null && row.topic === null)).toBe(true);
    expect(maxEffective(evidence)).toBe(0);
    expect(evidence.every((row) => row.heat === "H1")).toBe(true);
  }, EXPLICIT_TIMEOUT_MS);
});
