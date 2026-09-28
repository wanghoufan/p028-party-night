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
 * 四个情形（口径随 A3「Heat 标注必须诚实」+ A5「双口径」更新，见各条的 ⚠️）：
 * 1. 全包（生产真实牌堆，124 张）seed=1：**当前真实 UI（Heat 恒 H1）下**第一包里只有
 *    201/202/203 三张 `heatMin=1` 进得了 H1 桶，且它们全为 I1、在建堆里输给 legacy 的高强度档
 *    ⇒ 本局 0 张 Formal、有效计数恒 0、Heat 恒 H1（Human 2026-09-28 已接受「深关系题在当前 UI
 *    暂时抽不到」是正确结果）；
 * 2. 仅 Formal 24 张（真实生产卡，只是牌堆取子集）seed=1：同一条链在 H1 只够走 3 张
 *    （201/202/203，全部 `heatMin=1`）后判 `PACK_EXHAUSTED`（桶空、窗口放宽仍空、本包尚有 21 张，
 *    按 D8 交 Host，不自动洗牌/结束）；
 *    ⚠️ 旧的「H1→H2→H3→H4 逐档可达」断言锁的是**已作废的「24/24 heatMin=1」口径**。
 *    engine / 显式 disclosure 口径下四档仍全部有货（H2/H3/H4 可抽 12/21/19 张），证据见
 *    `tests/unit/formal-truth-heat-labels.test.ts`（A3④）——本文件不手搓 relationship / heat。
 * 3. 仅 legacy 卡（无第一包）：负向对照 —— sidecar 恒 null ⇒ 有效计数恒 0、Heat 恒 H1（fail-closed 成立）。
 * 4. **当前真实 UI 口径（A5 新增，可执行门禁）**：`roundDisclosureForCurrentRound()` 恒 `undefined`
 *    ⇒ 无披露生产者 ⇒ 即便牌堆全是可计数的 Formal 卡（201/202/203 真的被抽出、sidecar 有 metadata），
 *    有效计数仍恒 0、Heat 仍恒 H1。这条把「口径 B」从报告文字变成红灯会亮的测试。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

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
import { mainlineRuntimeCards, mainlineSsotCardsByPack } from "@/lib/v2-content/v2-card-bridge";
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

/**
 * 当前真实 UI 同款驱动：`app/game/page.tsx` 的 `applyRoundSignal` 调
 * `roundDisclosureForCurrentRound()` **恒得 `undefined`** ⇒ `resolveRoundAndReduce(session, "complete", undefined)`。
 * 本函数**不提供第三参**（未判定），复刻当前生产 UI 的披露行为，用于把「口径 B」变成可执行门禁。
 */
function driveProductionChainCurrentUI(deck: readonly GameCard[], maxRounds = 20): RoundEvidence[] {
  let session: GameSession = createSession(config(), [...deck], participants());
  const evidence: RoundEvidence[] = [];
  for (let i = 0; i < maxRounds; i += 1) {
    const dealt = startRound(session, () => 0, { drawSeed: FIXED_DRAW_SEED });
    if (!dealt.currentRound) break; // 耗尽：生产给不出卡
    const cardId = dealt.currentRound.cardId;
    session = resolveRoundAndReduce(dealt, "complete"); // 无披露信号（未判定）
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
  it("① 全包真实牌堆：本局 0 张 Formal（诚实 Heat 标注 + 当前 UI 恒 H1）、有效计数恒 0、Heat 恒 H1", () => {
    const evidence = driveProductionChain(PACK_CARDS);

    expect(evidence).toHaveLength(20); // 全包牌堆足够跑满 20 轮（legacy 卡豁免 Heat，不会断粮）

    // ⚠️ A3 口径变更：旧断言为「必须真实抽到 ≥1 张 Formal、有效计数 ≥4、本局到达 H2」，
    // 那是「24/24 heatMin=1」这一**已作废口径**下的结论。现按真实关系深度诚实标注后，
    // H1 桶内只剩 201/202/203（全 I1），在建堆里输给 legacy 高强度档 ⇒ 本局一张都抽不到。
    const formalRows = evidence.filter((row) => row.formal);
    expect(formalRows).toHaveLength(0);

    // 归因护栏（不是「卡没了」）：H1 桶里确实仍有 heatMin=1 的三张，只是排不到 top 强度档。
    const h1Formal = mainlineRuntimeCards()
      .filter((card) => card.cardId.startsWith("PN-TRUTH-2") && card.heatMin <= 1 && 1 <= card.heatMax)
      .map((card) => card.cardId);
    expect(h1Formal).toEqual(["PN-TRUTH-201", "PN-TRUTH-202", "PN-TRUTH-203"]);

    // legacy 行：sidecar 恒 null（未补标）⇒ fail-closed 不计有效轮
    for (const row of evidence) {
      expect(row.informationGain, `${row.cardId} 未补标应保持 null`).toBeNull();
      expect(row.topic).toBeNull();
    }

    expect(maxEffective(evidence), "当前 UI 下有效信息轮无法推进（Human 已接受）").toBe(0);
    // Heat 是 effective count 的纯派生
    expect(lastHeat(evidence)).toBe(heatForEffectiveCount(maxEffective(evidence)));
    expect(evidence.every((row) => row.heat === "H1")).toBe(true);
    expect(lastHeat(evidence)).toBe("H1");
  }, EXPLICIT_TIMEOUT_MS);

  it("② 仅 Formal 24 张（真实生产卡子集）：H1 下只够走 3 张后 PACK_EXHAUSTED，Heat 恒 H1", () => {
    expect(FORMAL_CARDS).toHaveLength(24);
    const evidence = driveProductionChain(FORMAL_CARDS);

    // 牌堆只有 Formal 卡 ⇒ 每一张 completed 都是有效信息轮
    expect(evidence.every((row) => row.formal)).toBe(true);
    expect(evidence.every((row) => row.informationGain !== null && row.topic !== null)).toBe(true);
    expect(evidence.map((row) => row.effectiveCount)).toEqual(
      evidence.map((_, index) => index + 1),
    );

    // ⚠️ A3 口径变更：旧断言「H1→H2→H3→H4 逐档可达（H2@4 / H3@8 / H4@13）」依赖
    // 「24 张全部 heatMin=1」。现只有 3 张 heatMin=1（201/202/203，全 I1）在 H1 可抽；
    // 第 4 轮起桶空 → 窗口放宽仍空 → 本包尚有 21 张 ⇒ 生产判 PACK_EXHAUSTED（D8 交 Host）。
    expect(evidence.map((row) => row.cardId).sort()).toEqual([
      "PN-TRUTH-201",
      "PN-TRUTH-202",
      "PN-TRUTH-203",
    ]);
    expect(evidence).toHaveLength(3);
    expect(evidence.map((row) => row.heat)).toEqual(["H1", "H1", "H1"]);
    expect(maxEffective(evidence)).toBe(3);
    expect(lastHeat(evidence)).toBe("H1");
    // 「逐档可达」的机制未坏，只是被「当前 UI 无 disclosure ⇒ Heat 恒 H1」卡住：
    // engine / 显式 disclosure 口径下 H2/H3/H4 分别可抽 12/21/19 张（见 formal-truth-heat-labels.test.ts A3④）。
  }, EXPLICIT_TIMEOUT_MS);

  it("③ 负向对照：仅 legacy 卡（无第一包）⇒ sidecar 恒 null，有效计数恒 0、Heat 恒 H1（fail-closed）", () => {
    const evidence = driveProductionChain(LEGACY_CARDS);
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((row) => !row.formal)).toBe(true);
    expect(evidence.every((row) => row.informationGain === null && row.topic === null)).toBe(true);
    expect(maxEffective(evidence)).toBe(0);
    expect(evidence.every((row) => row.heat === "H1")).toBe(true);
  }, EXPLICIT_TIMEOUT_MS);

  it("④ 当前真实 UI 口径（A5）：roundDisclosureForCurrentRound 恒 undefined ⇒ 无披露生产者，Formal 卡抽到也不计有效轮、Heat 恒 H1", () => {
    /* (1) 生产者级：源码扫描证明生产页面没有产出 disclosure signal（口径 B 的根因）。 */
    const page = readFileSync(join(process.cwd(), "app/game/page.tsx"), "utf8");
    const start = page.indexOf("function roundDisclosureForCurrentRound(");
    expect(start).toBeGreaterThan(-1);
    const producerBody = page.slice(start, page.indexOf("\n}", start));
    expect(producerBody, "当前 UI 的披露生产者必须恒返回 undefined").toMatch(/return undefined;/);
    // 一旦未来接入真实采集通道，本条会变红 —— 届时须同步撤销「口径 B」表述并重跑 MC。
    expect(producerBody).not.toMatch(/return roundDisclosureSignal/);
    expect(producerBody).not.toMatch(/selfDisclosed/);
    // 页面确实把这个「未判定」结果喂给唯一轮终态入口 applyRoundSignal。
    const applyStart = page.indexOf("function applyRoundSignal");
    expect(applyStart).toBeGreaterThan(-1);
    expect(page.slice(applyStart, page.indexOf("\n}", applyStart))).toMatch(
      /roundDisclosureForCurrentRound\(\)/,
    );

    /* (2) 行为级：即便牌堆全是可计数的 Formal 卡，没有披露信号 ⇒ fail-closed ⇒ 有效计数 0 / Heat H1。 */
    const evidence = driveProductionChainCurrentUI(FORMAL_CARDS);
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((row) => row.formal)).toBe(true);
    // sidecar 有 metadata（不是「卡没标」）……
    expect(evidence.every((row) => row.informationGain !== null && row.topic !== null)).toBe(true);
    // ……但缺「本人披露」⇒ 一个有效轮都不计，Heat 纹丝不动。
    expect(evidence.map((row) => row.effectiveCount)).toEqual(evidence.map(() => 0));
    expect(maxEffective(evidence)).toBe(0);
    expect(evidence.every((row) => row.heat === "H1")).toBe(true);
    expect(lastHeat(evidence)).toBe("H1");
  }, EXPLICIT_TIMEOUT_MS);
});
