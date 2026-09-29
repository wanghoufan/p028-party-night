/**
 * A4b｜Golden 12（`lib/v2-content/golden12/`）的**机器门禁**。
 *
 * 锁死六件事：
 * ① **逐卡值锁**：题面 / Heat / intensity / category / followUpHook / expectedAnswerShape
 *    ＋全部既有必填质量字段（`V2_REQUIRED_QUALITY_FIELDS`）逐卡锁死，改动即红；
 * ② **字数**：题面 ≤30 个中文字（`countHanzi` 可复算）；
 * ③ **结构**：`heatMin` 分布由实际产出派生（不硬编码 3/3/3/3），与逐卡锁值表二次对账；
 *    类别覆盖按矩阵模块的重叠口径复算达标；
 * ④ **ID 号段**：`PN-TRUTH-232~243` 连续 12 个、全库（SSOT＋KEEP 运行时＋归档退役＋本批）
 *    经 `analyzeTruthIdSpace` 扫描 0 collision；
 * ⑤ **planning-only 锁**：`category / followUpHook / expectedAnswerShape` **未进入**
 *    `GameCard` 正式 schema、`V2_REQUIRED_QUALITY_FIELDS`、桥接转发卡（Runtime 投影）；
 *    且 Golden 12 本轮**不进任何运行时卡池 / Formal 清单**（等 Product Reviewer 内部闸）；
 * ⑥ **consent**：`body_preference` 卡全部 `consentMode="skip-anytime"`、卡面源码带
 *    「偏好 ≠ 授权」注释（逐卡一条，删注释即红）。
 * ⑦ **A4b-fix 改写锁**（按 `temp/GOLDEN12-REVIEW-1.md` 内部风格闸结论）：233 `followUpHook`
 *    已由 `none` 换出且不与 232/234 重复；12 张题面互不重复、与既有 KEEP 5 无重复；
 *    `followUpHook` 八值覆盖不退化；`intensity` 分布派生且上界压平到 I3。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { gameCardSchema } from "@/lib/domain/schemas";
import {
  GOLDEN_BODY_INTIMACY_CARD_IDS,
  GOLDEN_BODY_INTIMACY_CONSENT_NOTE,
  GOLDEN_12_CARDS,
  GOLDEN_12_CARD_IDS,
  GOLDEN_FOLLOW_UP_HOOKS,
} from "@/lib/v2-content/golden12/golden-12-cards";
import {
  countHanzi,
  golden12MatrixMarkdown,
  goldenAnswerShapeDistribution,
  goldenCategoryCoverage,
  goldenCategoryRequirementsMet,
  goldenFollowUpHookDistribution,
  goldenHeatMinDistribution,
  goldenIntensityDistribution,
  GOLDEN_12_MATRIX,
} from "@/lib/v2-content/golden12/golden-12-matrix";
import { analyzeTruthIdSpace, parseTruthCardNumber } from "@/lib/v2-content/card-id-space";
import { getV2ContentAdapter } from "@/lib/v2-content/v2-content-adapter";
import { FIXED_CONTENT_MANIFEST } from "@/lib/v2-content/fixed-content-manifest";
import { FORMAL_TRUTH_BOOTSTRAP_CARDS } from "@/lib/v2-content/formal-truth-bootstrap-pack";
import { FORMAL_TRUTH_CARDS } from "@/lib/v2-content/formal-truth-pack";
import { RETIRED_TRUTH_CARD_IDS } from "@/lib/v2-content/archive/retired-truth-pack-2026-09-29";
import { V2_REQUIRED_QUALITY_FIELDS } from "@/lib/v2-content/v2-card-metadata";
import { validateFixedCardMetadataStrict } from "@/lib/v2-content/v2-card-metadata";
import {
  mainlineRuntimeCards,
  mainlineSsotCards,
} from "@/lib/v2-content/v2-card-bridge";

const PLANNING_ONLY_FIELDS = ["category", "followUpHook", "expectedAnswerShape"] as const;

/** 既有 KEEP 5（内部风格闸对照集，本批不得与之语义重复）。 */
const KEEP_5_IDS = ["PN-TRUTH-203", "PN-TRUTH-205", "PN-TRUTH-209", "PN-TRUTH-227", "PN-TRUTH-229"] as const;

/** 去标点取纯汉字串：用于「换标点即绕过」的去重口径。 */
function stripNonHanzi(text: string): string {
  return text.replace(/[^\u4e00-\u9fff]/gu, "");
}

/* ------------------------------------------------------------------ */
/* ① 逐卡值锁                                                          */
/* ------------------------------------------------------------------ */

describe("A4b① Golden 12 逐卡值锁死", () => {
  /** 逐卡期望值（题面 + Heat + intensity + planning 字段 + 全部必填质量字段）。 */
  const LOCKED: Record<
    string,
    {
      text: string;
      intensity: number;
      heatMin: number;
      heatMax: number;
      category: string;
      followUpHook: string;
      expectedAnswerShape: string;
      topic: string;
      informationGain: string;
      informationGoal: string;
      socialEnergy: string;
      relationshipProgression: string;
      intimacyClass: string;
      informationGoalType: string;
      secondaryTopics: readonly string[];
      consentMode: string;
      boundaryTags: readonly string[];
    }
  > = {
    "PN-TRUTH-232": {
      text: "今晚你更想认识新人，还是放松一下？",
      intensity: 1, heatMin: 1, heatMax: 3,
      category: "quick_know", followUpHook: "social_style", expectedAnswerShape: "binary",
      topic: "生活方式", informationGain: "medium",
      informationGoal: "知道他今晚来场子是想认识人还是只想放松",
      socialEnergy: "medium", relationshipProgression: "open", intimacyClass: "none",
      informationGoalType: "self_preference", secondaryTopics: ["性格·习惯·小癖好"],
      consentMode: "skip-anytime", boundaryTags: [],
    },
    "PN-TRUTH-233": {
      text: "微醺之后，你是看谁都顺眼，还是越来越挑？",
      intensity: 1, heatMin: 1, heatMax: 3,
      category: "quick_know", followUpHook: "attraction", expectedAnswerShape: "binary",
      topic: "生活方式", informationGain: "medium",
      informationGoal: "知道他微醺之后是看谁都顺眼还是越来越挑",
      socialEnergy: "low", relationshipProgression: "open", intimacyClass: "none",
      informationGoalType: "self_preference", secondaryTopics: ["性格·习惯·小癖好"],
      consentMode: "skip-anytime", boundaryTags: [],
    },
    "PN-TRUTH-234": {
      text: "你今晚是自己来的，还是被人拉来的？",
      intensity: 1, heatMin: 1, heatMax: 3,
      category: "quick_know", followUpHook: "initiative", expectedAnswerShape: "binary",
      topic: "性格·习惯·小癖好", informationGain: "medium",
      informationGoal: "知道他今晚是自己来的还是被朋友拉来的",
      socialEnergy: "medium", relationshipProgression: "open", intimacyClass: "none",
      informationGoalType: "self_preference", secondaryTopics: ["生活方式"],
      consentMode: "skip-anytime", boundaryTags: [],
    },
    "PN-TRUTH-235": {
      text: "第一眼更容易抓到你的是穿着还是气质？",
      intensity: 2, heatMin: 2, heatMax: 4,
      category: "attraction", followUpHook: "attraction", expectedAnswerShape: "binary",
      topic: "择偶偏好", informationGain: "medium",
      informationGoal: "知道他第一眼更容易被穿着还是气质打动",
      socialEnergy: "medium", relationshipProgression: "open", intimacyClass: "none",
      informationGoalType: "self_preference", secondaryTopics: ["性格·习惯·小癖好"],
      consentMode: "skip-anytime", boundaryTags: [],
    },
    "PN-TRUTH-236": {
      text: "刚认识时，你更看对方的谈吐还是打扮？",
      intensity: 2, heatMin: 2, heatMax: 3,
      category: "attraction", followUpHook: "attraction", expectedAnswerShape: "binary",
      topic: "择偶偏好", informationGain: "medium",
      informationGoal: "知道他一见面更先看对方的谈吐还是打扮",
      socialEnergy: "medium", relationshipProgression: "open", intimacyClass: "none",
      informationGoalType: "self_preference", secondaryTopics: ["生活方式"],
      consentMode: "skip-anytime", boundaryTags: [],
    },
    "PN-TRUTH-237": {
      text: "你更容易被话多的人吸引，还是安静的人？",
      intensity: 2, heatMin: 2, heatMax: 3,
      category: "attraction", followUpHook: "social_style", expectedAnswerShape: "binary",
      topic: "择偶偏好", informationGain: "medium",
      informationGoal: "知道他更容易被话多的人还是安静的人吸引",
      socialEnergy: "medium", relationshipProgression: "open", intimacyClass: "none",
      informationGoalType: "self_preference", secondaryTopics: ["性格·习惯·小癖好"],
      consentMode: "skip-anytime", boundaryTags: [],
    },
    "PN-TRUTH-238": {
      text: "对方一直看你，你会回看还是装没看到？",
      intensity: 2, heatMin: 3, heatMax: 4,
      category: "flirt", followUpHook: "eye_contact", expectedAnswerShape: "binary",
      topic: "live_chemistry", informationGain: "medium",
      informationGoal: "知道对方注视他时他会回看还是回避",
      socialEnergy: "medium", relationshipProgression: "deepen", intimacyClass: "none",
      informationGoalType: "live_observation", secondaryTopics: ["择偶偏好"],
      consentMode: "skip-anytime", boundaryTags: [],
    },
    "PN-TRUTH-239": {
      text: "今晚遇到有感觉的人，你会主动要联系方式吗？",
      intensity: 3, heatMin: 3, heatMax: 4,
      category: "flirt", followUpHook: "contact_preference", expectedAnswerShape: "yes_no",
      topic: "live_chemistry", informationGain: "medium",
      informationGoal: "知道他对有感觉的人会不会当场主动要联系方式",
      socialEnergy: "high", relationshipProgression: "deepen", intimacyClass: "none",
      informationGoalType: "live_observation", secondaryTopics: ["择偶偏好"],
      consentMode: "skip-anytime", boundaryTags: ["social-account"],
    },
    "PN-TRUTH-240": {
      text: "有人主动坐你旁边，你是加分还是有压力？",
      intensity: 2, heatMin: 3, heatMax: 4,
      category: "flirt", followUpHook: "flirt_target", expectedAnswerShape: "binary",
      topic: "live_chemistry", informationGain: "medium",
      informationGoal: "知道有人主动坐到他旁边时他是加分还是有压力",
      socialEnergy: "high", relationshipProgression: "deepen", intimacyClass: "none",
      informationGoalType: "live_observation", secondaryTopics: ["恋爱观"],
      consentMode: "skip-anytime", boundaryTags: [],
    },
    "PN-TRUTH-241": {
      text: "你最常被人夸的是哪一点？",
      intensity: 3, heatMin: 4, heatMax: 4,
      // A4c（Reviewer 复议一）：题面已改自夸向，四字段随题面同源换。
      category: "quick_know", followUpHook: "attraction", expectedAnswerShape: "short_phrase",
      topic: "择偶偏好", informationGain: "medium",
      informationGoal: "知道他最常被人夸的是哪一点",
      socialEnergy: "high", relationshipProgression: "deepen", intimacyClass: "none",
      informationGoalType: "self_preference", secondaryTopics: ["择偶偏好"],
      consentMode: "skip-anytime", boundaryTags: [],
    },
    "PN-TRUTH-242": {
      text: "第一眼，你最容易注意异性的哪里？",
      intensity: 3, heatMin: 4, heatMax: 4,
      category: "body_preference", followUpHook: "body_preference", expectedAnswerShape: "one_word",
      topic: "择偶偏好", informationGain: "medium",
      informationGoal: "知道他第一眼最容易注意异性身体的哪个部位",
      socialEnergy: "high", relationshipProgression: "deepen", intimacyClass: "none",
      informationGoalType: "self_preference", secondaryTopics: ["性观念·亲密态度"],
      consentMode: "skip-anytime", boundaryTags: [],
    },
    "PN-TRUTH-243": {
      text: "对有感觉的人，拥抱还是牵手更让你心动？",
      intensity: 3, heatMin: 4, heatMax: 4,
      category: "body_preference", followUpHook: "contact_preference", expectedAnswerShape: "binary",
      topic: "亲密边界", informationGain: "medium",
      informationGoal: "知道对喜欢的人他更容易被拥抱还是牵手打动",
      socialEnergy: "medium", relationshipProgression: "deepen", intimacyClass: "attitude",
      informationGoalType: "self_preference", secondaryTopics: ["性观念·亲密态度"],
      consentMode: "skip-anytime", boundaryTags: [],
    },
  };

  it("恰 12 张，ID 恰为 PN-TRUTH-232~243 连续且唯一", () => {
    expect(GOLDEN_12_CARDS).toHaveLength(12);
    expect(GOLDEN_12_CARD_IDS).toEqual(
      Array.from({ length: 12 }, (_, index) => `PN-TRUTH-${232 + index}`),
    );
    expect(new Set(GOLDEN_12_CARD_IDS).size).toBe(12);
    for (const card of GOLDEN_12_CARDS) {
      expect(card.number, card.cardId).toBe(parseTruthCardNumber(card.cardId));
      expect(card.gameType, card.cardId).toBe("truth");
    }
  });

  it("逐卡锁值：题面 / Heat / intensity / planning 字段 / 全部必填质量字段与冻结表一致", () => {
    expect(Object.keys(LOCKED).sort()).toEqual([...GOLDEN_12_CARD_IDS].sort());
    for (const card of GOLDEN_12_CARDS) {
      expect(card, card.cardId).toMatchObject(LOCKED[card.cardId]!);
    }
  });

  it("逐卡 strict 门禁：8 项必填质量字段零缺失、barFit=PASS、枚举合法", () => {
    for (const card of GOLDEN_12_CARDS) {
      const strict = validateFixedCardMetadataStrict(card);
      expect(strict.ok, `${card.cardId} strict：${strict.issues.join("；")}`).toBe(true);
      expect(card.barFit, card.cardId).toBe("PASS");
    }
  });
});

/* ------------------------------------------------------------------ */
/* ② 字数                                                              */
/* ------------------------------------------------------------------ */

describe("A4b② 字数：题面 ≤30 个中文字（可复算）", () => {
  it("逐卡 countHanzi ≤ 30，且无一空题面", () => {
    for (const card of GOLDEN_12_CARDS) {
      const hanzi = countHanzi(card.text);
      expect(hanzi, `${card.cardId}「${card.text}」= ${hanzi} 中文字`).toBeLessThanOrEqual(30);
      expect(card.text.length, card.cardId).toBeGreaterThan(0);
    }
  });

  it("矩阵行字数与 countHanzi 复算一致（矩阵不手填）", () => {
    for (const row of GOLDEN_12_MATRIX) {
      expect(row.hanziCount, row.cardId).toBe(countHanzi(row.text));
    }
  });
});

/* ------------------------------------------------------------------ */
/* ③ 结构（分布由实际产出派生，不硬编码 3/3/3/3）                        */
/* ------------------------------------------------------------------ */

describe("A4b③ 结构：heatMin 分布按实际产出派生 + 类别覆盖达标", () => {
  it("heatMin 分布＝逐卡锁值表独立复算的结果（两次派生对账，无硬编码档数）", () => {
    const fromCards = goldenHeatMinDistribution();
    const fromLock: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const card of GOLDEN_12_CARDS) {
      const locked = card.heatMin;
      expect(locked, card.cardId).toBeGreaterThanOrEqual(1);
      expect(locked, card.cardId).toBeLessThanOrEqual(4);
      expect(card.heatMax, card.cardId).toBeGreaterThanOrEqual(card.heatMin);
      expect(card.heatMax, card.cardId).toBeLessThanOrEqual(4);
      expect(card.intensity, card.cardId).toBeGreaterThanOrEqual(1);
      expect(card.intensity, card.cardId).toBeLessThanOrEqual(5);
      fromLock[locked] = (fromLock[locked] ?? 0) + 1;
    }
    expect(fromCards).toEqual(fromLock);
  });

  it("类别覆盖按重叠口径达到 Human 要求（quick_know≥2 / attraction≥3 / flirt≥3 / body_preference≥2 / follow_up_hook≥4）", () => {
    const { ok, gaps } = goldenCategoryRequirementsMet();
    expect(gaps, gaps.join("；")).toEqual([]);
    expect(ok).toBe(true);
    const coverage = goldenCategoryCoverage();
    expect(coverage.quick_know).toBeGreaterThanOrEqual(2);
    expect(coverage.attraction).toBeGreaterThanOrEqual(3);
    expect(coverage.flirt).toBeGreaterThanOrEqual(3);
    expect(coverage.body_preference).toBeGreaterThanOrEqual(2);
    expect(coverage.follow_up_hook).toBeGreaterThanOrEqual(4);
  });

  it("followUpHook / expectedAnswerShape 分布由卡源派生且各值合法（无卡落在枚举外）", () => {
    const hookDist = goldenFollowUpHookDistribution();
    const shapeDist = goldenAnswerShapeDistribution();
    expect(Object.values(hookDist).reduce((sum, count) => sum + count, 0)).toBe(12);
    expect(Object.values(shapeDist).reduce((sum, count) => sum + count, 0)).toBe(12);
  });

  it("矩阵 Markdown 含全部 12 个 cardId（报告可直接引用，不手抄）", () => {
    const markdown = golden12MatrixMarkdown();
    for (const id of GOLDEN_12_CARD_IDS) expect(markdown).toContain(id);
  });
});

/* ------------------------------------------------------------------ */
/* ④ ID 号段（扫描器校验，0 碰撞）                                       */
/* ------------------------------------------------------------------ */

describe("A4b④ ID 号段：经 card-id-space 扫描器全库校验 0 碰撞", () => {
  const adapter = getV2ContentAdapter();

  it("全库（SSOT + KEEP 运行时 + 归档退役 + Golden 12）0 collision；本批占满 232~243", () => {
    const ssotIds = [...adapter.mainlineCards, ...adapter.expansionCards].map((card) => card.cardId);
    const keepIds = [
      ...FORMAL_TRUTH_CARDS.map((card) => card.cardId),
      ...FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => card.cardId),
    ];
    const libraryIds = [...ssotIds, ...keepIds, ...RETIRED_TRUTH_CARD_IDS, ...GOLDEN_12_CARD_IDS];
    const report = analyzeTruthIdSpace(libraryIds);
    expect(report.collisions, report.collisions.join(",")).toEqual([]);
    expect(report.malformed, report.malformed.join(",")).toEqual([]);
    expect(report.maxTruthNumber).toBe(243);
    expect(report.suggestedNextTruthStart).toBe(244);
  });

  it("Golden 12 与归档退役卡、KEEP 运行时卡无任何 ID 交集", () => {
    const golden = new Set(GOLDEN_12_CARD_IDS);
    for (const id of RETIRED_TRUTH_CARD_IDS) expect(golden.has(id), id).toBe(false);
    for (const card of [...FORMAL_TRUTH_CARDS, ...FORMAL_TRUTH_BOOTSTRAP_CARDS]) {
      expect(golden.has(card.cardId), card.cardId).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ */
/* ⑤ planning-only 锁 + 先不进 Formal                                   */
/* ------------------------------------------------------------------ */

describe("A4b⑤ planning-only 锁：三个设计字段未进 Runtime / GameCard 正式 schema", () => {
  it("gameCardSchema（GameCard 正式 schema）不含 category / followUpHook / expectedAnswerShape", () => {
    const shapeKeys = Object.keys(gameCardSchema.shape);
    for (const field of PLANNING_ONLY_FIELDS) {
      expect(shapeKeys).not.toContain(field);
    }
  });

  it("V2_REQUIRED_QUALITY_FIELDS 不含三个 planning 字段", () => {
    for (const field of PLANNING_ONLY_FIELDS) {
      expect(V2_REQUIRED_QUALITY_FIELDS).not.toContain(field);
    }
  });

  it("桥接运行时投影（mainlineSsotCards / mainlineRuntimeCards）不转发三个 planning 字段", () => {
    const gameCards = mainlineSsotCards();
    expect(gameCards.length).toBeGreaterThan(0);
    for (const card of gameCards) {
      for (const field of PLANNING_ONLY_FIELDS) expect(card, card.id).not.toHaveProperty(field);
    }
    const runtimeCards = mainlineRuntimeCards();
    expect(runtimeCards.length).toBeGreaterThan(0);
    for (const card of runtimeCards) {
      for (const field of PLANNING_ONLY_FIELDS) expect(card, card.cardId).not.toHaveProperty(field);
    }
  });

  it("Golden 12 本轮不进任何运行时卡池 / manifest 两轨（先不进 Formal，等内部闸）", () => {
    const golden = new Set(GOLDEN_12_CARD_IDS);
    for (const card of mainlineSsotCards()) expect(golden.has(card.id), card.id).toBe(false);
    for (const card of mainlineRuntimeCards()) expect(golden.has(card.cardId), card.cardId).toBe(false);
    const formalAllowed = new Set(FIXED_CONTENT_MANIFEST.tracks.formalFixed.allowedCardIds);
    const legacyAllowed = new Set(FIXED_CONTENT_MANIFEST.tracks.legacyCompatibility.allowedCardIds);
    for (const id of GOLDEN_12_CARD_IDS) {
      expect(formalAllowed.has(id), `${id} 已在 formalFixed`).toBe(false);
      expect(legacyAllowed.has(id), `${id} 已在 legacyCompatibility`).toBe(false);
    }
  });

  it("管线可接：Golden 卡形状为 FormalTruthCard 超集（含 SSOT 18 字段全部键），admission 只需一行 spread", () => {
    const V13_KEYS = [
      "schemaVersion", "cardId", "gameType", "number", "text", "intensity", "heatMin", "heatMax",
      "relationStage", "targetMode", "responseMode", "interactionType", "consentMode",
      "matchRequired", "boundaryTags", "fallbackPolicy", "signalEffects", "postAction",
    ] as const;
    for (const card of GOLDEN_12_CARDS) {
      for (const key of V13_KEYS) expect(card, `${card.cardId} 缺 ${key}`).toHaveProperty(key);
    }
  });
});

/* ------------------------------------------------------------------ */
/* ⑥ consent（偏好 ≠ 授权）                                             */
/* ------------------------------------------------------------------ */

describe("A4b⑥ consent：body_preference 卡可跳过且卡面带「偏好 ≠ 授权」注释", () => {
  const CARDS_SOURCE_PATH = join("lib", "v2-content", "golden12", "golden-12-cards.ts");

  it("body_preference 卡派生清单与卡源一致，且全部 consentMode=skip-anytime", () => {
    const expected = GOLDEN_12_CARDS
      .filter((card) => card.category === "body_preference")
      .map((card) => card.cardId);
    expect([...GOLDEN_BODY_INTIMACY_CARD_IDS].sort()).toEqual([...expected].sort());
    expect(GOLDEN_BODY_INTIMACY_CARD_IDS.length).toBeGreaterThanOrEqual(2);
    for (const card of GOLDEN_12_CARDS) {
      expect(card.consentMode, card.cardId).toBe("skip-anytime");
    }
  });

  it("consent 注释常量写明「偏好 ≠ 授权，后续动作需独立同意」", () => {
    expect(GOLDEN_BODY_INTIMACY_CONSENT_NOTE).toContain("偏好 ≠ 授权");
    expect(GOLDEN_BODY_INTIMACY_CONSENT_NOTE).toContain("独立同意");
    expect(GOLDEN_BODY_INTIMACY_CONSENT_NOTE).toContain("skip-anytime");
  });

  it("卡面源码逐张 body_preference 卡带一行 consent 注释（删注释即红）", () => {
    const source = readFileSync(CARDS_SOURCE_PATH, "utf8");
    const noteCommentCount = source.split("// 偏好 ≠ 授权").length - 1;
    // A4c（REVIEW-2 复议一）：241 已离开 body_preference（category=quick_know），
    // 其上方那条 consent 注释按「保守留存」保留，并在注释里补写「本卡已非身体偏好类」。
    // 故注释条数 = body_preference 卡数 + 保守留存 1 条。
    const CONSERVATIVE_RETAINED = 1;
    expect(
      noteCommentCount,
      `consent 注释 ${noteCommentCount} 条 ≠ body_preference 卡 ${GOLDEN_BODY_INTIMACY_CARD_IDS.length} 张 + 保守留存 ${CONSERVATIVE_RETAINED} 条`,
    ).toBe(GOLDEN_BODY_INTIMACY_CARD_IDS.length + CONSERVATIVE_RETAINED);
    expect(source).toContain("本卡已非身体偏好类");
  });
});

/* ------------------------------------------------------------------ */
/* ⑦ A4b-fix 改写锁（依据 temp/GOLDEN12-REVIEW-1.md 内部风格闸结论）     */
/* ------------------------------------------------------------------ */

describe("A4b⑦ 改写锁：233 hook 换出 / 题面去重 / 分布不退化", () => {
  const cardById = new Map(GOLDEN_12_CARDS.map((card) => [card.cardId, card]));

  it("233 的 followUpHook 已由 none 换出，且不与 232 / 234 的 hook 重复", () => {
    const c233 = cardById.get("PN-TRUTH-233");
    expect(c233, "PN-TRUTH-233 缺失").toBeTruthy();
    expect(c233!.followUpHook, "233 仍为 none（未换出）").not.toBe("none");
    expect(GOLDEN_FOLLOW_UP_HOOKS as readonly string[]).toContain(c233!.followUpHook);
    expect(c233!.followUpHook, "233 不得与 232 同 hook").not.toBe(cardById.get("PN-TRUTH-232")!.followUpHook);
    expect(c233!.followUpHook, "233 不得与 234 同 hook").not.toBe(cardById.get("PN-TRUTH-234")!.followUpHook);
  });

  it("12 张题面互不重复（去标点后仍唯一，且无一张整句被另一张吞并）", () => {
    const hanzi = GOLDEN_12_CARDS.map((card) => stripNonHanzi(card.text));
    expect(new Set(hanzi).size).toBe(12);
    for (let i = 0; i < hanzi.length; i += 1) {
      for (let j = 0; j < hanzi.length; j += 1) {
        if (i === j) continue;
        expect(
          hanzi[i]!.includes(hanzi[j]!),
          `${GOLDEN_12_CARD_IDS[i]} 整句吞并 ${GOLDEN_12_CARD_IDS[j]}`,
        ).toBe(false);
      }
    }
  });

  it("与既有 KEEP 5（203/205/209/227/229）无重复（去标点全等 + 双向整句包含）", () => {
    const runtimeTextById = new Map(
      [...FORMAL_TRUTH_CARDS, ...FORMAL_TRUTH_BOOTSTRAP_CARDS].map((card) => [card.cardId, card.text]),
    );
    const keepHanzi: string[] = [];
    for (const id of KEEP_5_IDS) {
      const text = runtimeTextById.get(id);
      expect(text, `KEEP ${id} 不在运行时包内，去重断言会失去依据`).toBeTruthy();
      keepHanzi.push(stripNonHanzi(text!));
    }
    for (const card of GOLDEN_12_CARDS) {
      const golden = stripNonHanzi(card.text);
      for (let k = 0; k < KEEP_5_IDS.length; k += 1) {
        expect(golden, `${card.cardId} 与 KEEP ${KEEP_5_IDS[k]} 题面重复`).not.toBe(keepHanzi[k]);
        expect(golden.includes(keepHanzi[k]!), `${card.cardId} 整句吞并 KEEP ${KEEP_5_IDS[k]}`).toBe(false);
        expect(keepHanzi[k]!.includes(golden), `KEEP ${KEEP_5_IDS[k]} 整句吞并 ${card.cardId}`).toBe(false);
      }
    }
  });

  it("followUpHook 覆盖不得退化：none 之外 7 个枚举值仍全部被用到（不为凑枚举保留冷卡）", () => {
    const dist = goldenFollowUpHookDistribution();
    const used = (Object.entries(dist) as Array<[string, number]>)
      .filter(([, count]) => count > 0)
      .map(([hook]) => hook)
      .sort();
    expect(used).toEqual(
      [
        "attraction",
        "body_preference",
        "contact_preference",
        "eye_contact",
        "flirt_target",
        "initiative",
        "social_style",
      ].sort(),
    );
    expect(dist.none, "233 已换出 none，本批不应再有冷卡占位").toBe(0);
  });

  it("intensity 分布由卡源派生：12 张全覆盖、上界压平到 I3（241 已由 4 降 3）", () => {
    const dist = goldenIntensityDistribution();
    expect(Object.values(dist).reduce((sum, count) => sum + count, 0)).toBe(12);
    for (const card of GOLDEN_12_CARDS) {
      expect(card.intensity, card.cardId).toBeGreaterThanOrEqual(1);
      expect(card.intensity, card.cardId).toBeLessThanOrEqual(5);
    }
    // 内部闸结论：241 I4→I3，全批不再有 I4/I5（H4 头部压平，不反向抬高 242/243）。
    expect(dist[4]).toBe(0);
    expect(dist[5]).toBe(0);
  });
});
