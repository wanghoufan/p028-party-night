/**
 * R2｜Truth H1 Bootstrap 包（`lib/v2-content/formal-truth-bootstrap-pack.ts`，`PN-TRUTH-225~231`）。
 *
 * 本文件按「逐卡锁值 + 全库不变量」两层锁死，手法沿用 `formal-truth-heat-labels.test.ts`：
 * ① **逐卡值锁死**：每张卡的 `text / informationGoal / intensity / heatMin / heatMax / topic /
 *    informationGain / informationGoalType / socialEnergy / relationshipProgression / intimacyClass`
 *    与内容源逐字一致（改任何一个都要同步改本表，不可能静默漂移）；
 * ② **反向护栏**：`heatMin` 全 1（真 H1）、`heatMax` 不得全 4、`intensity` 不得全 1 且不得 I4/I5、
 *    题材不得触碰深关系/性/边界（且人物信息卡不得用 `live_chemistry`）；
 *    `heatMax` 分布必须逐卡诚实（H2 2 / H3 4 / H4 1，2026-09-29 reviewer 复判后）；
 * ③ **全库不变量**：ID 唯一且与既有 390 张 + 第一包 24 张无碰撞、编号段不重叠；
 *    枚举合法、strict 必填零缺失；精确重复 0；近似（bigram Jaccard）全部 < 阈值；三红线 0 命中；
 * ④ **可达性**：H1 桶内 `PN-TRUTH-2*` 集合 === {201,202,203,205} ∪ Bootstrap（两 Router 同口径）；
 * ⑤ **已入 Formal（B5）**：两轮独立审查 PASS 7/7、结论已回填 ⇒ `formalFixedIdSet()` = 第一包 24 +
 *    Bootstrap 7 = 31，逐张满足四条件准入；`heatMin=1` 的 Formal 集合 = {201,202,203,205} ∪ Bootstrap。
 *
 * 只读真源 + 走生产 Router；不改 SSOT / 生成产物 / 认识阈值 / 窗口 / Heat 契约。
 */

import { describe, expect, it } from "vitest";

import { isHardBlocked } from "@/lib/ai/safety-filter";
import { createDeckRouter } from "@/lib/engine/v2-deal";
import {
  FIXED_CONTENT_MANIFEST,
  formalFixedIdSet,
  isFormalFixedCard,
  satisfiesFormalAdmission,
} from "@/lib/v2-content/fixed-content-manifest";
import { FORMAL_TRUTH_BOOTSTRAP_CARDS } from "@/lib/v2-content/formal-truth-bootstrap-pack";
import { FORMAL_TRUTH_CARDS } from "@/lib/v2-content/formal-truth-pack";
import {
  V2_INFORMATION_GOAL_TYPES,
  V2_INFORMATION_GAIN,
  V2_INTIMACY_CLASSES,
  V2_RELATIONSHIP_PROGRESSION,
  V2_REQUIRED_QUALITY_FIELDS,
  V2_SOCIAL_ENERGY,
  V2_TOPICS,
  validateFixedCardMetadataStrict,
  type V2Topic,
} from "@/lib/v2-content/v2-card-metadata";
import { metadataForCard } from "@/lib/v2-content/v2-card-quality-index";
import {
  mainlineRuntimeCards,
  mainlineSsotCards,
  V2_MAINLINE_PACK_IDS,
} from "@/lib/v2-content/v2-card-bridge";
import { getV2ContentAdapter } from "@/lib/v2-content/v2-content-adapter";
import {
  V2_CONSENT_MODES,
  V2_INTERACTION_TYPES,
  V2_MAINLINE_FALLBACK_POLICIES,
  V2_POST_ACTIONS,
  V2_RELATION_STAGES,
  V2_RESPONSE_MODES,
  V2_SIGNAL_EFFECTS,
  V2_TARGET_MODES,
} from "@/lib/v2-content/v2-types";
import { createV2MainlineRouter } from "@/lib/v2-relationship/v2-router";
import type { V2RouterInput } from "@/lib/v2-relationship/v2-session";
import {
  createInitialRelationshipState,
  pairKey,
  type Heat,
  type RelationshipState,
  type SessionParticipant,
} from "@/lib/v2-relationship/v2-state";

/* ------------------------------------------------------------------ */
/* 期望值①：逐卡锁值（唯一数据来源：内容源逐字转录）                       */
/* ------------------------------------------------------------------ */

interface ExpectedCard {
  readonly text: string;
  readonly informationGoal: string;
  readonly intensity: number;
  readonly heatMin: number;
  readonly heatMax: number;
  readonly topic: V2Topic;
  readonly informationGain: string;
  readonly informationGoalType: string;
  readonly socialEnergy: string;
  readonly relationshipProgression: string;
  readonly intimacyClass: string;
}

const EXPECTED: Readonly<Record<string, ExpectedCard>> = {
  "PN-TRUTH-225": {
    text: "最近才开始的爱好是什么？说说让你上头的第一个瞬间。",
    informationGoal: "听到他最近才开始的一个爱好，以及真正让他上头的那一刻",
    intensity: 2, heatMin: 1, heatMax: 3, topic: "兴趣爱好",
    informationGain: "medium", informationGoalType: "self_preference",
    socialEnergy: "low", relationshipProgression: "open", intimacyClass: "none",
  },
  "PN-TRUTH-226": {
    text: "你的周末更偏哪种：睡到中午、早起出门、还是临时决定？为什么？",
    informationGoal: "知道他真实的周末节奏更像哪一种，以及他为什么偏这一种",
    intensity: 1, heatMin: 1, heatMax: 2, topic: "生活方式",
    informationGain: "medium", informationGoalType: "self_preference",
    socialEnergy: "low", relationshipProgression: "open", intimacyClass: "none",
  },
  "PN-TRUTH-227": {
    text: "说一样你最近反复安利给朋友的东西，再用一句话说服我们。",
    informationGoal: "听到他最近真心安利的一件东西，以及他为什么觉得值得一试",
    intensity: 2, heatMin: 1, heatMax: 3, topic: "兴趣爱好",
    informationGain: "medium", informationGoalType: "self_preference",
    socialEnergy: "high", relationshipProgression: "open", intimacyClass: "none",
  },
  "PN-TRUTH-228": {
    text: "朋友里你常被安排成哪种角色：张罗的、捧场的，或失踪的？你认吗？",
    informationGoal: "听他讲出自己在朋友圈里被默认的那个角色，以及他认不认这个说法",
    intensity: 3, heatMin: 1, heatMax: 3, topic: "性格·习惯·小癖好",
    informationGain: "medium", informationGoalType: "self_preference",
    socialEnergy: "medium", relationshipProgression: "open", intimacyClass: "none",
  },
  "PN-TRUTH-229": {
    text: "哪一类电影或音乐你怎样都提不起兴趣？说说你试过的那次。",
    informationGoal: "知道他明确提不起兴趣的是哪一类内容，以及他试过之后为什么不感冒",
    intensity: 2, heatMin: 1, heatMax: 3, topic: "兴趣爱好",
    informationGain: "medium", informationGoalType: "self_preference",
    socialEnergy: "medium", relationshipProgression: "open", intimacyClass: "none",
  },
  "PN-TRUTH-230": {
    text: "跟刚认识的人相处，你有自己的一条规矩吗？说说它怎么来的。",
    informationGoal: "听到他跟刚认识的人相处时的一条自己的规矩，以及这条规矩的来历",
    intensity: 3, heatMin: 1, heatMax: 2, topic: "相处规则",
    informationGain: "medium", informationGoalType: "relationship_rule",
    socialEnergy: "low", relationshipProgression: "open", intimacyClass: "none",
  },
  "PN-TRUTH-231": {
    text: "一天里什么时候你最像你自己？说说那段时间你通常在做什么。",
    informationGoal: "知道他自我感觉最自在的那个时间段，以及他那时通常在做什么",
    intensity: 2, heatMin: 1, heatMax: 4, topic: "性格·习惯·小癖好",
    informationGain: "medium", informationGoalType: "self_preference",
    socialEnergy: "low", relationshipProgression: "open", intimacyClass: "none",
  },
};

/**
 * 浅关系题材白名单（本包只许取这些 topic）。
 * ⛔ 不含 `live_chemistry`：它是**现场化学反应缓冲维度**、按 Plan §4 不算人物认知维度，
 * 不得作本包人物信息卡的主主题（reviewer §3：`PN-TRUTH-227` 已由 `live_chemistry` 改为 `兴趣爱好`）。
 */
const SHALLOW_TOPICS: readonly V2Topic[] = [
  "兴趣爱好",
  "生活方式",
  "性格·习惯·小癖好",
  "相处规则",
];

const BOOTSTRAP_IDS = FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => card.cardId);

/** 值锁定：具体字段 === 期望（`toEqual` 报错信息带 cardId）。 */
const expectField = (cardId: string, field: keyof ExpectedCard, actual: unknown): void => {
  expect(actual, `${cardId}.${field}`).toEqual(EXPECTED[cardId]![field]);
};

/* ------------------------------------------------------------------ */
/* ① 逐卡锁值                                                          */
/* ------------------------------------------------------------------ */

describe("R2① Bootstrap 逐卡值锁死（7 张，改任一字段都必须同步改本表）", () => {
  it("卡集合与顺序 === 期望表（无缺卡、无多余、无乱序）", () => {
    expect(FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => card.cardId)).toEqual(Object.keys(EXPECTED));
    expect(FORMAL_TRUTH_BOOTSTRAP_CARDS).toHaveLength(7);
  });

  it("逐卡 text / informationGoal / intensity / heatMin / heatMax / topic / gain / goalType / energy / RP / intimacy 逐字一致", () => {
    for (const card of FORMAL_TRUTH_BOOTSTRAP_CARDS) {
      for (const field of [
        "text",
        "informationGoal",
        "intensity",
        "heatMin",
        "heatMax",
        "topic",
        "informationGain",
        "informationGoalType",
        "socialEnergy",
        "relationshipProgression",
        "intimacyClass",
      ] as const) {
        expectField(card.cardId, field, card[field]);
      }
      expect(card.number, `${card.cardId}.number`).toBe(Number(card.cardId.slice("PN-TRUTH-".length)));
      expect(card.gameType, card.cardId).toBe("truth");
    }
  });
});

/* ------------------------------------------------------------------ */
/* ② 反向护栏                                                          */
/* ------------------------------------------------------------------ */

describe("R2② 反向护栏：真 H1 / heatMax 不得全 4 / intensity 不得全 1 / 题材只许浅关系", () => {
  it("heatMin 全为 1（真 H1：刚认识就能问）", () => {
    expect(FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => card.heatMin)).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it("heatMax 逐卡诚实：H2 2 / H3 4 / H4 1，且不得全部 = 4", () => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const card of FORMAL_TRUTH_BOOTSTRAP_CARDS) dist[card.heatMax] = (dist[card.heatMax] ?? 0) + 1;
    expect(dist).toEqual({ 1: 0, 2: 2, 3: 4, 4: 1 });
    expect(dist[4]).toBeLessThan(FORMAL_TRUTH_BOOTSTRAP_CARDS.length);
    expect(dist[1] + dist[2] + dist[3]).toBeGreaterThan(0);
    for (const card of FORMAL_TRUTH_BOOTSTRAP_CARDS) {
      expect(card.heatMin, card.cardId).toBeLessThanOrEqual(card.heatMax);
    }
  });

  it("intensity 覆盖 I1/I2/I3 且不是全 I1；无 I4/I5（不为曝光做不自然高尺度）", () => {
    const intensities = FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => card.intensity);
    expect(new Set(intensities)).toEqual(new Set([1, 2, 3]));
    expect(intensities.every((value) => value === 1)).toBe(false);
    expect(intensities.every((value) => value <= 3)).toBe(true);
    expect(intensities.filter((value) => value === 2).length).toBeGreaterThan(0);
    expect(intensities.filter((value) => value === 3).length).toBeGreaterThan(0);
  });

  it("题材只许浅关系白名单；intimacyClass 全 none；low/medium/high 社交能量都有", () => {
    for (const card of FORMAL_TRUTH_BOOTSTRAP_CARDS) {
      expect(SHALLOW_TOPICS, `${card.cardId} 的 topic`).toContain(card.topic);
      expect(card.intimacyClass, card.cardId).toBe("none");
      expect(card.boundaryTags, card.cardId).toEqual([]);
    }
    const energies = new Set(FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => card.socialEnergy));
    expect(energies.has("medium")).toBe(true);
    expect(energies.has("high")).toBe(true);
    expect(energies.has("low")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* ②b 题面 ⇄ informationGoal 一致性（2026-09-29 reviewer 复判后的重写锁）  */
/* ------------------------------------------------------------------ */

/**
 * 2026-09-29 reviewer（`temp/REVIEW-BOOTSTRAP-7.md`）判 `226 / 228 / 230` 为 BORDERLINE，
 * 根因是「标签题无追问钩子 + `informationGoal` 超题面」。本单按 reviewer 理由重写这三张题面，
 * 并调整 `informationGoal` 使「问什么就答什么」。
 *
 * 下面的断言是**可复算的弱断言**（necessary, not sufficient）：
 * - `hookInText`：题面里确实存在那个追问钩子（消除「纯标签题」）；
 * - `goalPromise`：`informationGoal` 兑现的正是该钩子（消除「目标声明超题面」，即目标不再声明题面不收集的信息）；
 * - `forbiddenGoalPhrases`：不再出现 reviewer 点名的那类「而不是……」超题面措辞。
 * 语义等价仍需 reviewer 复判，本测试只锁住「不回退成超题面」这一必要条件。
 */
const REWRITES: ReadonlyArray<{
  readonly cardId: string;
  readonly hookInText: string;
  readonly goalPromise: string;
  readonly forbiddenGoalPhrases: readonly string[];
}> = [
  {
    cardId: "PN-TRUTH-226",
    hookInText: "为什么",
    goalPromise: "为什么",
    forbiddenGoalPhrases: ["而不是"],
  },
  {
    cardId: "PN-TRUTH-228",
    hookInText: "你认吗",
    goalPromise: "认不认",
    forbiddenGoalPhrases: [],
  },
  {
    cardId: "PN-TRUTH-230",
    hookInText: "怎么来的",
    goalPromise: "来历",
    forbiddenGoalPhrases: [],
  },
];

describe("R2②b 三张重写卡：题面带追问钩子、informationGoal 不再超题面", () => {
  const byId = new Map(FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => [card.cardId, card]));

  it.each(REWRITES)("$cardId：题面含钩子「$hookInText」，目标只承诺题面收集的信息", ({ cardId, hookInText, goalPromise, forbiddenGoalPhrases }) => {
    const card = byId.get(cardId);
    expect(card, `${cardId} 不在本包`).toBeDefined();
    expect(card!.text, `${cardId} 题面缺少追问钩子「${hookInText}」`).toContain(hookInText);
    expect(card!.informationGoal, `${cardId} 目标未兑现题面钩子「${goalPromise}」`).toContain(goalPromise);
    for (const phrase of forbiddenGoalPhrases) {
      expect(card!.informationGoal, `${cardId} 目标残留超题面措辞「${phrase}」`).not.toContain(phrase);
    }
  });

  it("227 的 topic === 兴趣爱好（reviewer §3：现场化学反应不算人物维度）", () => {
    expect(byId.get("PN-TRUTH-227")!.topic).toBe("兴趣爱好");
  });

  it("本包人物信息卡不再使用 live_chemistry 作 topic（缓冲维度不得当人物维度）", () => {
    expect(FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => card.topic)).not.toContain("live_chemistry");
  });

  it("heatMin 7/7 全为 1（reviewer 确认 H1 成立，未为凑数压低）", () => {
    const mins = FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => card.heatMin);
    expect(mins).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(mins.filter((value) => value === 1)).toHaveLength(FORMAL_TRUTH_BOOTSTRAP_CARDS.length);
  });
});

/* ------------------------------------------------------------------ */
/* ③ 全库不变量                                                        */
/* ------------------------------------------------------------------ */

const normText = (value: string): string =>
  value.replace(/[\s，。？！、；：（）「」『』"'…—,.?!;:()<>《》~～\-]/gu, "");

const bigrams = (value: string): Set<string> => {
  const set = new Set<string>();
  for (let i = 0; i + 1 < value.length; i += 1) set.add(value.slice(i, i + 2));
  return set;
};

const jaccard = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const token of a) if (b.has(token)) inter += 1;
  return inter / (a.size + b.size - inter);
};

describe("R2③ 全库不变量：ID / 枚举 / 必填 / 重复 / 三红线", () => {
  const adapter = getV2ContentAdapter();
  const ssotCards = [...adapter.mainlineCards, ...adapter.expansionCards];
  const ssotById = new Map(ssotCards.map((card) => [card.cardId, card]));
  const firstPackIds = new Set(FORMAL_TRUTH_CARDS.map((card) => card.cardId));

  it("本包 ID 唯一，且与既有 SSOT 390 张、第一包 24 张均无碰撞；编号段不重叠", () => {
    expect(new Set(BOOTSTRAP_IDS).size).toBe(BOOTSTRAP_IDS.length);
    for (const id of BOOTSTRAP_IDS) {
      expect(ssotById.has(id), `${id} 与 SSOT 390 张冲突`).toBe(false);
      expect(firstPackIds.has(id), `${id} 与第一包冲突`).toBe(false);
      expect(id.startsWith("PN-TRUTH-")).toBe(true);
    }
    const ssotTruthNumbers = new Set(
      adapter.mainlineCards
        .filter((card) => card.gameType === "truth")
        .map((card) => Number(/^PN-TRUTH-(\d+)$/u.exec(card.cardId)?.[1] ?? -1)),
    );
    for (const card of FORMAL_TRUTH_BOOTSTRAP_CARDS) {
      expect(ssotTruthNumbers.has(card.number), `${card.cardId} 编号段与既有 PN-TRUTH 重叠`).toBe(false);
      expect(card.number).toBeGreaterThan(224);
    }
  });

  it("SSOT 形状 18 字段 + Plan §3 质量字段全部落在真源枚举内", () => {
    const enumChecks: Array<[string, unknown, readonly string[]]> = [
      ["relationStage", null, V2_RELATION_STAGES],
      ["targetMode", null, V2_TARGET_MODES],
      ["responseMode", null, V2_RESPONSE_MODES],
      ["interactionType", null, V2_INTERACTION_TYPES],
      ["consentMode", null, V2_CONSENT_MODES],
      ["fallbackPolicy", null, V2_MAINLINE_FALLBACK_POLICIES],
      ["postAction", null, V2_POST_ACTIONS],
      ["topic", null, V2_TOPICS],
      ["informationGain", null, V2_INFORMATION_GAIN],
      ["socialEnergy", null, V2_SOCIAL_ENERGY],
      ["relationshipProgression", null, V2_RELATIONSHIP_PROGRESSION],
      ["intimacyClass", null, V2_INTIMACY_CLASSES],
      ["informationGoalType", null, V2_INFORMATION_GOAL_TYPES],
    ];
    for (const card of FORMAL_TRUTH_BOOTSTRAP_CARDS) {
      const record = card as unknown as Record<string, unknown>;
      for (const [field, , allowed] of enumChecks) {
        expect(allowed, `${card.cardId}.${field} 非法枚举 ${String(record[field])}`).toContain(record[field]);
      }
      for (const tag of card.signalEffects as readonly string[]) expect(V2_SIGNAL_EFFECTS).toContain(tag);
      for (const topic of card.secondaryTopics) expect(V2_TOPICS).toContain(topic);
      expect(card.secondaryTopics).not.toContain(card.topic);
      expect(new Set(card.secondaryTopics).size).toBe(card.secondaryTopics.length);
      expect(card.barFit).toBe("PASS");
    }
  });

  it("strict 正式入库校验：8 项必填零缺失、issues 为空", () => {
    for (const card of FORMAL_TRUTH_BOOTSTRAP_CARDS) {
      const result = validateFixedCardMetadataStrict(card);
      expect(result.ok, `${card.cardId} strict 不通过：${result.issues.join("；")}`).toBe(true);
      expect(result.missing.filter((field) => (V2_REQUIRED_QUALITY_FIELDS as readonly string[]).includes(field))).toEqual([]);
      expect(result.issues).toEqual([]);
    }
  });

  it("重复检查：与 390 张 + 第一包精确重复 0；近似 bigram Jaccard 全部 < 0.5", () => {
    const THRESHOLD = 0.5;
    const existing = [...ssotCards.map((card) => ({ id: card.cardId, text: card.text })), ...FORMAL_TRUTH_CARDS.map((card) => ({ id: card.cardId, text: card.text }))];
    const existingNorm = new Map(existing.map((item) => [item.id, { norm: normText(item.text), grams: bigrams(normText(item.text)) }]));
    const near: string[] = [];
    for (const card of FORMAL_TRUTH_BOOTSTRAP_CARDS) {
      // 精确重复（逐字 + 去标点）必须 0。
      for (const item of existing) {
        expect(card.text.trim(), `${card.cardId} 与 ${item.id} 逐字重复`).not.toBe(item.text.trim());
        expect(normText(card.text), `${card.cardId} 与 ${item.id} 去标点重复`).not.toBe(normText(item.text));
      }
      const grams = bigrams(normText(card.text));
      for (const [, value] of existingNorm) {
        const sim = jaccard(grams, value.grams);
        if (sim >= THRESHOLD) near.push(`${card.cardId}（sim ${sim.toFixed(2)}）`);
      }
    }
    // 本包内部也不许自我近似。
    for (let i = 0; i < FORMAL_TRUTH_BOOTSTRAP_CARDS.length; i += 1) {
      for (let j = i + 1; j < FORMAL_TRUTH_BOOTSTRAP_CARDS.length; j += 1) {
        const sim = jaccard(
          bigrams(normText(FORMAL_TRUTH_BOOTSTRAP_CARDS[i]!.text)),
          bigrams(normText(FORMAL_TRUTH_BOOTSTRAP_CARDS[j]!.text)),
        );
        if (sim >= THRESHOLD) near.push(`${FORMAL_TRUTH_BOOTSTRAP_CARDS[i]!.cardId} ↔ ${FORMAL_TRUTH_BOOTSTRAP_CARDS[j]!.cardId}（sim ${sim.toFixed(2)}）`);
      }
    }
    expect(near).toEqual([]);
  });

  it("三红线零命中（复用生产 isHardBlocked：露骨 / 强迫惩罚灌酒 / 隐私脱衣非自愿）", () => {
    for (const card of FORMAL_TRUTH_BOOTSTRAP_CARDS) {
      expect(isHardBlocked(`${card.text} ${card.informationGoal}`), card.cardId).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ */
/* ④ 可达性：H1 桶内 PN-TRUTH-2* === {201,202,203,205} ∪ Bootstrap        */
/* ------------------------------------------------------------------ */

const TABLE_2M2F: SessionParticipant[] = [
  { playerId: "m1", active: true, pairGender: "male" },
  { playerId: "m2", active: true, pairGender: "male" },
  { playerId: "f1", active: true, pairGender: "female" },
  { playerId: "f2", active: true, pairGender: "female" },
];

const routerInputAt = (heat: Heat, drawSeed: number): V2RouterInput => {
  const relationship: RelationshipState = { ...createInitialRelationshipState(), heat };
  return {
    relationship,
    participants: TABLE_2M2F,
    targetPairKey: pairKey("f1", "m1"),
    intensityLimit: 5,
    softDedupWindow: 5,
    requireFiveTierForPair: null,
    drawSeed,
  };
};

const sortedP2Ids = (ids: readonly string[]): string[] =>
  ids.filter((id) => id.startsWith("PN-TRUTH-2")).sort();

describe("R2④ H1 可达性：Bootstrap 全部进 H1 桶；H1 桶 PN-TRUTH-2* === {201,202,203,205} ∪ Bootstrap", () => {
  const EXPECTED_H1 = ["PN-TRUTH-201", "PN-TRUTH-202", "PN-TRUTH-203", "PN-TRUTH-205", ...BOOTSTRAP_IDS].sort();

  it("heatMin=1 的 Formal 家族集合逐字 === {201,202,203,205} + Bootstrap 全量", () => {
    const heatMin1 = [...FORMAL_TRUTH_CARDS, ...FORMAL_TRUTH_BOOTSTRAP_CARDS]
      .filter((card) => card.heatMin === 1)
      .map((card) => card.cardId)
      .sort();
    expect(heatMin1).toEqual(EXPECTED_H1);
  });

  it("审计 Router（createV2MainlineRouter）H1 桶内 PN-TRUTH-2* === 期望集合", () => {
    const h1 = sortedP2Ids(createV2MainlineRouter({ packId: "truth-dare" }).bucket(routerInputAt("H1", 0)).map((card) => card.cardId));
    expect(h1).toEqual(EXPECTED_H1);
    for (const id of BOOTSTRAP_IDS) expect(h1, `${id} 未进 H1 桶`).toContain(id);
  });

  it("生产 Router（createDeckRouter）同口径：H1 桶内 PN-TRUTH-2* 与审计 Router 逐字相同", () => {
    const deck = createDeckRouter({
      deck: mainlineSsotCards(),
      preferredPackIds: ["truth-dare"],
      enabledPackIds: [...V2_MAINLINE_PACK_IDS],
    });
    const productionH1 = sortedP2Ids(deck.bucket(routerInputAt("H1", 0)).map((card) => card.cardId));
    const auditH1 = sortedP2Ids(createV2MainlineRouter({ packId: "truth-dare" }).bucket(routerInputAt("H1", 0)).map((card) => card.cardId));
    expect(productionH1).toEqual(auditH1);
    expect(productionH1).toEqual(EXPECTED_H1);
  });
});

/* ------------------------------------------------------------------ */
/* ⑤ 已入 Formal（B5：两轮独立审查 + 结论回填后）                          */
/* ------------------------------------------------------------------ */

describe("R2⑤ Bootstrap 7 张已过独立审查 → 进 Formal Fixed 轨（formal 24 → 31），Legacy 轨质量档位真实可用", () => {
  const formalIds = [...formalFixedIdSet()].sort();
  const firstPackIds = FORMAL_TRUTH_CARDS.map((card) => card.cardId);

  it("formalFixedIdSet() === 第一包 24 + Bootstrap 7（逐张，31 张）", () => {
    expect(formalIds).toEqual([...firstPackIds, ...BOOTSTRAP_IDS].sort());
    expect(formalIds).toHaveLength(firstPackIds.length + BOOTSTRAP_IDS.length);
    for (const id of BOOTSTRAP_IDS) expect(formalIds, `${id} 应已进 Formal`).toContain(id);
  });

  it("Formal 逐张满足四条件准入（strict metadata ∧ humanBarFit=PASS ∧ reviewed=true ∧ provenance/hash 完整）", () => {
    const legacy = FIXED_CONTENT_MANIFEST.tracks.legacyCompatibility;
    expect([...FIXED_CONTENT_MANIFEST.tracks.formalFixed.allowedCardIds].sort()).toEqual(formalIds);
    for (const id of formalIds) {
      const provenance = legacy.provenance[id];
      expect(provenance, `${id} 缺 legacy provenance`).toBeDefined();
      // ① strict metadata 全字段通过（已带 Plan §3 质量字段 ⇒ metadataStatus=audited）
      expect(provenance!.metadataStatus, `${id} strict metadata`).toBe("audited");
      // ② 独立审查定档 = PASS
      expect(provenance!.humanBarFit, `${id} humanBarFit`).toBe("PASS");
      // ③ 独立审查已完成
      expect(provenance!.reviewed, `${id} reviewed`).toBe(true);
      // ④ provenance / payloadHash 完整（64 位 sha256）
      expect(provenance!.payloadHash, `${id} payloadHash`).toMatch(/^[0-9a-f]{64}$/u);
      // 四条件全部命中 ⇒ API 判定同真（与清单互相印证）
      expect(satisfiesFormalAdmission(provenance!), `${id} satisfiesFormalAdmission`).toBe(true);
      expect(isFormalFixedCard({ id, source: "builtin" }, FIXED_CONTENT_MANIFEST), id).toBe(true);
    }
  });

  it("heatMin=1 的 Formal 集合逐字 === {201,202,203,205} ∪ Bootstrap 7（11 张，冷启动证据）", () => {
    const heatMin1Formal = [...FORMAL_TRUTH_CARDS, ...FORMAL_TRUTH_BOOTSTRAP_CARDS]
      .filter((card) => card.heatMin === 1 && formalFixedIdSet().has(card.cardId))
      .map((card) => card.cardId)
      .sort();
    expect(heatMin1Formal).toEqual(
      ["PN-TRUTH-201", "PN-TRUTH-202", "PN-TRUTH-203", "PN-TRUTH-205", ...BOOTSTRAP_IDS].sort(),
    );
    expect(heatMin1Formal).toHaveLength(11);
  });

  it("manifest legacy provenance：本包仍在 Legacy 轨内、metadataStatus=audited（旧局可读），但已 reviewed", () => {
    const legacy = FIXED_CONTENT_MANIFEST.tracks.legacyCompatibility;
    for (const id of BOOTSTRAP_IDS) {
      const provenance = legacy.provenance[id];
      expect(provenance, `${id} 缺 legacy provenance`).toBeDefined();
      expect(provenance!.metadataStatus, id).toBe("audited");
      expect(provenance!.reviewed, id).toBe(true);
      expect(provenance!.humanBarFit, id).toBe("PASS");
    }
  });

  it("质量侧车对本包给出真实档位（非 null），且与内容源逐字一致", () => {
    for (const card of FORMAL_TRUTH_BOOTSTRAP_CARDS) {
      expect(metadataForCard(card.cardId), card.cardId).toEqual({
        informationGain: card.informationGain,
        topic: card.topic,
      });
    }
  });

  it("桥接追加在末尾：[0] 仍是 PN-TRUTH-001；尾部 = 第一包 + Bootstrap 原序", () => {
    const cards = mainlineSsotCards();
    expect(cards[0]!.id).toBe("PN-TRUTH-001");
    expect(cards.slice(-(BOOTSTRAP_IDS.length)).map((card) => card.id)).toEqual([...BOOTSTRAP_IDS]);
    // 两个投影逐 id 一致。
    expect(mainlineRuntimeCards().map((card) => card.cardId)).toEqual(cards.map((card) => card.id));
  });
});
