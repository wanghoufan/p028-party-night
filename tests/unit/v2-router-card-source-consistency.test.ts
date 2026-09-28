/**
 * C1-8｜双 Router 卡源一致性（共享同一份主线卡源，不改任何过滤 / 排序 / Heat 口径）。
 *
 * 背景（C1-3 发现的结构不一致）：
 * - 生产 `/game` 链走 `createDeckRouter`（`lib/engine/v2-deal.ts`），牌堆来自 `mainlineSsotCards()`
 *   （SSOT 主线 350 + 第一包正式内容 24），**本来就能看到第一包**；
 * - 审计 / MC 链走 `createV2MainlineRouter`（`lib/v2-relationship/v2-router.ts`），上一版直读
 *   SSOT adapter（350）⇒ 看不到第一包 24 张 ⇒ 审计候选集小于生产牌堆，两 Router 卡源漂移。
 *
 * 本单把两个 Router 统一到桥接模块的**同一份卡源** `mainlineRuntimeCards()`
 * （= SSOT adapter 主线 + `FORMAL_TRUTH_CARDS`），`mainlineSsotCards()` 与它逐 id 一致
 * （同一份内容的两种投影：GameCard ↔ V13 卡）。
 *
 * 本文件只锁三件事：
 * 1. `mainlineRuntimeCards()` 与 `mainlineSsotCards()` 逐 id 一致（同一内容，两个投影）；
 * 2. 审计 Router 现在真的能出第一包 Formal 卡（`PN-TRUTH-201~224`）；
 * 3. 三个层级（bucket/pack/global）**与生产 `createDeckRouter` 的候选集合逐字相同** ——
 *    即两 Router 同口径（同卡源、同硬过滤），且既有「Heat 只对 Formal 卡生效」的口径未改。
 */

import { describe, expect, it } from "vitest";

import { createDeckRouter } from "@/lib/engine/v2-deal";
import {
  mainlineRuntimeCards,
  mainlineSsotCards,
  V2_MAINLINE_PACK_IDS,
} from "@/lib/v2-content/v2-card-bridge";
import { createV2MainlineRouter } from "@/lib/v2-relationship/v2-router";
import type { V2RouterInput } from "@/lib/v2-relationship/v2-session";
import {
  createInitialRelationshipState,
  pairKey,
  type RelationshipState,
  type SessionParticipant,
} from "@/lib/v2-relationship/v2-state";

const PACK_ID = "truth-dare";

const TABLE_2M2F: SessionParticipant[] = [
  { playerId: "m1", active: true, pairGender: "male" },
  { playerId: "m2", active: true, pairGender: "male" },
  { playerId: "f1", active: true, pairGender: "female" },
  { playerId: "f2", active: true, pairGender: "female" },
];

const input = (overrides: Partial<V2RouterInput> = {}): V2RouterInput => ({
  relationship: overrides.relationship ?? createInitialRelationshipState(),
  participants: overrides.participants ?? TABLE_2M2F,
  targetPairKey: overrides.targetPairKey ?? pairKey("f1", "m1"),
  intensityLimit: overrides.intensityLimit ?? 5,
  softDedupWindow: overrides.softDedupWindow ?? 5,
  requireFiveTierForPair: overrides.requireFiveTierForPair ?? null,
  ...(overrides.drawSeed === undefined ? {} : { drawSeed: overrides.drawSeed }),
});

const sortedIds = (cards: readonly { cardId: string }[]): string[] =>
  cards.map((card) => card.cardId).sort();

const FORMAL_IDS = mainlineRuntimeCards()
  .map((card) => card.cardId)
  .filter((cardId) => cardId.startsWith("PN-TRUTH-2"));

describe("C1-8｜双 Router 卡源一致性（共享 mainlineRuntimeCards）", () => {
  it("mainlineRuntimeCards() 与 mainlineSsotCards() 逐 id 一致（同一内容的两个投影）", () => {
    const runtimeIds = mainlineRuntimeCards().map((card) => card.cardId);
    const gameCardIds = mainlineSsotCards().map((card) => card.id);
    expect(runtimeIds).toEqual(gameCardIds);
    expect(runtimeIds).toHaveLength(374); // 350 主线 + 24 第一包
  });

  it("审计 Router 现在能出第一包 Formal 卡（PN-TRUTH-201~224 出现在三层候选里）", () => {
    expect(FORMAL_IDS).toHaveLength(24);
    const router = createV2MainlineRouter({ packId: PACK_ID });
    const req = input({ drawSeed: 0 });
    for (const tier of ["bucket", "pack", "global"] as const) {
      const ids = sortedIds(router[tier](req));
      expect(FORMAL_IDS.some((cardId) => ids.includes(cardId)), tier).toBe(true);
    }
  });

  it("三层候选集合与生产 createDeckRouter 逐字相同（同卡源 == 同口径）", () => {
    const mainline = createV2MainlineRouter({ packId: PACK_ID });
    // 生产 Router 的 `global` 覆盖「本局启用玩法」；这里给全部主线玩法，才与主线 Router 的
    // `global`（覆盖全部 6 个 relationship-aware 玩法）同域。
    const deck = createDeckRouter({
      deck: mainlineSsotCards(),
      preferredPackIds: [PACK_ID],
      enabledPackIds: [...V2_MAINLINE_PACK_IDS],
    });

    for (const heat of ["H1", "H2", "H3", "H4"] as const) {
      const relationship: RelationshipState = { ...createInitialRelationshipState(), heat };
      const req = input({ relationship, drawSeed: 7 });
      for (const tier of ["bucket", "pack", "global"] as const) {
        expect(sortedIds(mainline[tier](req)), `${tier}@${heat}`).toEqual(sortedIds(deck[tier](req)));
      }
    }
  });

  it("Heat 档硬过滤口径未改：H1 桶内 Formal 卡集合 == 卡源里 heatMin=1 的 Formal 卡集合（legacy 仍整批豁免）", () => {
    // 旧断言（已作废）：`FORMAL_IDS.every((cardId) => h1.includes(cardId))` —— 它锁的是
    // 「24/24 heatMin=1 ⇒ 24 张全在 H1 桶」这一**已作废口径**（Human 2026-09-28 废止「为能抽到
    // 把新卡 heatMin 全压成 1」）。现表按真实关系深度诚实标注：只有 3 张 heatMin=1，其余 21 张
    // 在当前真实 UI（Heat 恒 H1）抽不到 —— 这是 Human 已明确接受的正确结果，不是缺陷。
    // 新断言仍有实质约束力：H1 桶内 Formal 集合必须与卡源 heatMin/heatMax 派生集合**逐字相同**，
    // 既不空、也不全，且「被收窄掉的 21 张」确实一张都不在桶内。
    const router = createV2MainlineRouter({ packId: PACK_ID });
    const h1 = sortedIds(router.bucket(input({ drawSeed: 0 })));

    const expectedH1Formal = mainlineRuntimeCards()
      .filter((card) => card.cardId.startsWith("PN-TRUTH-2") && card.heatMin <= 1 && 1 <= card.heatMax)
      .map((card) => card.cardId)
      .sort();
    expect(h1.filter((cardId) => cardId.startsWith("PN-TRUTH-2"))).toEqual(expectedH1Formal);
    expect(expectedH1Formal.length).toBeGreaterThan(0);
    expect(expectedH1Formal.length).toBeLessThan(FORMAL_IDS.length); // 确实收窄了，不再 24/24

    const unreachable = FORMAL_IDS.filter((cardId) => !expectedH1Formal.includes(cardId));
    expect(unreachable).toHaveLength(21);
    expect(unreachable.some((cardId) => h1.includes(cardId))).toBe(false);

    // legacy 里存在 heatMin>1 的卡也在 H1 桶内（B3-4 的豁免口径没被本单改回）
    const legacyHighMin = mainlineRuntimeCards()
      .filter((card) => !card.cardId.startsWith("PN-TRUTH-2") && card.heatMin > 1)
      .map((card) => card.cardId);
    expect(legacyHighMin.length).toBeGreaterThan(0);
    expect(legacyHighMin.some((cardId) => h1.includes(cardId))).toBe(true);
  });
});
