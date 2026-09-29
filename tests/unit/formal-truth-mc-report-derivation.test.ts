/**
 * B6｜第一包 MC / 报告的**可复算护栏**（沿用 `formal-truth-production-chain-note.test.ts` 的思路，
 * 把「note 必须由实测派生」这条纪律扩展到 MC 产物与 `FORMAL-TRUTH-MC.md` 的 summary/结论）。
 *
 * 背景：Bootstrap 7 张（`PN-TRUTH-225~231`）过审入 Formal 后，`heatMin=1` 的 Formal 由 3 → 11，
 * 旧的 MC 报告里残留了「仅 Formal 24 张 / H1 可计数 3 / 缺口 1 / 库存 = 0（实践不可抽）/
 * H1 全为 intensity=1 / 也离不开 H1」等手写结论——这些在数据上已全部为假。
 * 本文件把「报告与产物不得自相矛盾」编成红灯会亮的门禁，五组断言：
 *
 * 1. **口径 B（当前真实 UI）不变式**：无披露 ⇒ effective 恒 0、Heat 恒 H1、互选窗口 0；
 * 2. **口径 A（Engine）**：H2 reach > 0、effective > 0——证明「A 离开 H1」且**不把 A 当 B**；
 * 3. **A/B 关键数值不混用**：报告两个口径章节的数字分别等于 MC 的 modeB / modeA；
 * 4. **heatMin=1 的 Formal 集合**（= H1 桶可抽）与产物、报告逐字一致（防报告引用过期数字）；
 * 5. **报告没有与实测矛盾的硬编码结论**（扫描旧口径字符串 + 按数据现判「缺 / 不缺」）。
 *
 * 只读产物与真源：不写盘、不跑模拟、不改任何判定 / 阈值 / 卡内容。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { formalFixedIdSet } from "@/lib/v2-content/fixed-content-manifest";
import { mainlineRuntimeCards } from "@/lib/v2-content/v2-card-bridge";
import { HEAT_THRESHOLDS } from "@/lib/v2-relationship/v2-state";

const DIR = join(process.cwd(), "docs/qa/content-audit");
const mc = JSON.parse(readFileSync(join(DIR, "FORMAL-TRUTH-MC.json"), "utf8")) as McArtifact;
const chain = JSON.parse(readFileSync(join(DIR, "FORMAL-TRUTH-PRODUCTION-CHAIN.json"), "utf8")) as Record<string, unknown>;
const REPORT = readFileSync(join(DIR, "FORMAL-TRUTH-MC.md"), "utf8");

interface ModeSummary {
  sessions: number;
  sessionsCompleted20: number;
  sessionRate: number;
  deadEndSessions: number;
  deadEndRate: number;
  totalDraws: number;
  effectivePerSession: number;
  heatAtDraw: Record<string, number>;
  sessionsReachingH2: number;
  sessionsReachingH3: number;
  sessionsReachingH4: number;
  mutualWindowReached: number;
  longestLowZeroRunMean: number;
  formalExposedIds: string[];
}
interface McArtifact {
  cardSource: { packTotal: number; formalTotal: number; legacyTotal: number };
  staticHeatAvailability: { heat: string; legalCount: number; formalLegal: number; formalLegalIds: string[] }[];
  h1Formal: { count: number; ids: string[]; byIntensity: Record<string, number> };
  formalCountableUpTo: { heatMinLe1: number; heatMinLe2: number; heatMinLe3: number; heatMinLe4: number };
  modeA: ModeSummary;
  modeB: ModeSummary;
  readingGuide?: string;
}

const thresholdOf = (heat: string): number => HEAT_THRESHOLDS.find((band) => band.heat === heat)!.min;
const H2_MIN = thresholdOf("H2");
const ENGINE = mc.modeB;
const UI = mc.modeA;

const H1_BAND = mc.staticHeatAvailability.find((band) => band.heat === "H1")!;
const H1_FORMAL_IDS_MC = [...H1_BAND.formalLegalIds].sort();
const H1_FORMAL_IDS_H1FIELD = [...mc.h1Formal.ids].sort();
const H1_FORMAL_COUNT = H1_FORMAL_IDS_MC.length;

/** 独立复算：heatMin=1 且 H1 合法的 Formal（用 manifest 真源 ∩ 生产桥接卡源，不复用 MC 产物）。 */
const independentlyDerived = ((): string[] => {
  const formal = formalFixedIdSet();
  return mainlineRuntimeCards()
    .filter((card) => formal.has(card.cardId) && card.heatMin <= 1 && 1 <= card.heatMax)
    .map((card) => card.cardId)
    .sort();
})();

const sumHeat = (m: Record<string, number>): number => Object.values(m).reduce((a, b) => a + b, 0);

/** 报告第 2 章「当前 UI 实际可抽到的 Formal」那一行。 */
const uiLine = ((): string => {
  const line = REPORT.split("\n").find((row) => row.includes("当前 UI 实际可抽到的 Formal 张数"));
  expect(line, "报告缺少「当前 UI 实际可抽到的 Formal 张数」一行").toBeDefined();
  return line!;
})();
const reportIdsUIIndex = uiLine.indexOf("——");
const reportClaimedCount = Number(/当前 UI 实际可抽到的 Formal 张数\*\*：\*\*(\d+) 张\*\*/u.exec(uiLine)?.[1]);
const reportClaimedIds = (uiLine.slice(reportIdsUIIndex).match(/PN-TRUTH-\d+/gu) ?? []).sort();

const h1Expected = ["PN-TRUTH-201", "PN-TRUTH-202", "PN-TRUTH-203", "PN-TRUTH-205"];

describe("B6① 口径 B（当前真实 UI）不变式：无披露 ⇒ effective 恒 0 / Heat 恒 H1 / 互选窗口 0", () => {
  it("modeA 的 heatAtDraw 全部落在 H1，H2/H3/H4 均为 0", () => {
    expect(UI.heatAtDraw.H1).toBe(UI.totalDraws);
    expect(UI.heatAtDraw.H2 ?? 0).toBe(0);
    expect(UI.heatAtDraw.H3 ?? 0).toBe(0);
    expect(UI.heatAtDraw.H4 ?? 0).toBe(0);
  });

  it("modeA：effective 恒 0、到达 H2/H3/H4 = 0/0/0、互选窗口 0（口径 B 的硬事实）", () => {
    expect(UI.effectivePerSession).toBe(0);
    expect(UI.sessionsReachingH2).toBe(0);
    expect(UI.sessionsReachingH3).toBe(0);
    expect(UI.sessionsReachingH4).toBe(0);
    expect(UI.mutualWindowReached).toBe(0);
  });

  it("口径 B 抽到的 Formal 是 H1 集合的子集（恒 H1 ⇒ 抽不到 heatMin≥2 的卡）", () => {
    expect(UI.formalExposedIds.length).toBeGreaterThan(0);
    for (const id of UI.formalExposedIds) {
      expect(H1_FORMAL_IDS_MC, `口径 B 不应抽到 H1 集合以外的 ${id}`).toContain(id);
    }
  });
});

describe("B6② 口径 A（Engine / 显式 disclosure）：H2 reach > 0 且 effective > 0（不把 A 当 B）", () => {
  it("modeB：到达 H2 的局 > 0，effective/局 > 0（Bootstrap 入 Formal 后冷启门在 Engine 侧已跨过）", () => {
    expect(ENGINE.sessionsReachingH2).toBeGreaterThan(0);
    expect(ENGINE.effectivePerSession).toBeGreaterThan(0);
  });

  it("modeB 的 heatAtDraw 覆盖多档（确认披露信号真的在推进 Heat，而非恒 H1）", () => {
    const nonH1 = (ENGINE.heatAtDraw.H2 ?? 0) + (ENGINE.heatAtDraw.H3 ?? 0) + (ENGINE.heatAtDraw.H4 ?? 0);
    expect(nonH1).toBeGreaterThan(0);
    expect(sumHeat(ENGINE.heatAtDraw)).toBe(ENGINE.totalDraws);
  });
});

describe("B6③ A/B 关键数值不混用：报告两章数字分别等于 MC 的 modeB / modeA", () => {
  it("口径 A 章（§1.2）出现 modeB 的 H2 到达率", () => {
    expect(REPORT).toContain(`| H2 到达率（到达 H2 的 seed 局比例） | ${ENGINE.sessionsReachingH2}/${ENGINE.sessions}`);
    expect(REPORT).toContain(`| 跑满 20 轮 | ${ENGINE.sessionsCompleted20}（`);
    expect(REPORT).toContain(`| 到达 H2 / H3 / H4 局数 | ${ENGINE.sessionsReachingH2} / ${ENGINE.sessionsReachingH3} / ${ENGINE.sessionsReachingH4} |`);
  });

  it("口径 B 章（§2）锁定 effective 恒 0、heatAtDraw 恒 H1、到达 0/0/0", () => {
    expect(REPORT).toContain(`- effective count **恒 ${UI.effectivePerSession}**`);
    expect(REPORT).toContain(`heatAtDraw H1 ${UI.totalDraws} / H2 0 / H3 0 / H4 0`);
    expect(REPORT).toContain(`到达 H2/H3/H4 = ${UI.sessionsReachingH2}/${UI.sessionsReachingH3}/${UI.sessionsReachingH4}`);
    // 口径 B 的 wording 必须仍是「恒 H1 / amount 0」，不得写成 A 的推进结论
    expect(REPORT).toMatch(/Heat 恒 H1/);
  });
});

describe("B6④ heatMin=1 的 Formal（H1 桶可抽）集合与产物、报告逐字一致", () => {
  it("独立复算 === MC.staticHeatAvailability.H1.formalLegalIds === MC.h1Formal.ids", () => {
    expect(independentlyDerived).toEqual(H1_FORMAL_IDS_MC);
    expect(H1_FORMAL_IDS_H1FIELD).toEqual(H1_FORMAL_IDS_MC);
    expect(mc.h1Formal.count).toBe(H1_FORMAL_COUNT);
  });

  it("该集合 === {201,202,203,205} ∪ Bootstrap（225~231）——与内容侧护栏同源", () => {
    const bootstrap = ["PN-TRUTH-225", "PN-TRUTH-226", "PN-TRUTH-227", "PN-TRUTH-228", "PN-TRUTH-229", "PN-TRUTH-230", "PN-TRUTH-231"];
    expect(H1_FORMAL_IDS_MC).toEqual([...h1Expected, ...bootstrap].sort());
    expect(mc.formalCountableUpTo.heatMinLe1).toBe(H1_FORMAL_COUNT);
  });

  it("报告印出的张数与清单 === 产物（防报告引用过期数字）", () => {
    expect(reportClaimedCount).toBe(H1_FORMAL_COUNT);
    expect(reportClaimedIds).toEqual(H1_FORMAL_IDS_MC);
  });
});

describe("B6⑤ 报告不得含与实测数据矛盾的硬编码结论（旧口径字符串 + 缺/不缺现判）", () => {
  it("清除旧口径字符串：不再出现「仅 Formal 24 张 / 缺口 - / 库存 = 0（实践不可抽）」", () => {
    expect(REPORT).not.toContain("仅 Formal 24 张");
    expect(REPORT).not.toMatch(/缺口\s*-\d+/);
    expect(REPORT).not.toContain("库存 = 0（实践不可抽）");
  });

  it("H1 可计数 ≥ H2 门槛 ⇒ 不得再声称「Heat 也离不开 H1」（库存门结论须与数据一致）", () => {
    if (H1_FORMAL_COUNT >= H2_MIN) {
      expect(REPORT).not.toContain("Heat **也离不开 H1**");
      expect(REPORT).toContain("H1→H2 冷启门：库存侧已解除");
    }
  });

  it("H1 卡强度构成非全 I1 时，不得再声称「全为 intensity=1」", () => {
    const keys = Object.keys(mc.h1Formal.byIntensity);
    const allI1 = keys.length === 1 && keys[0] === "1";
    if (!allI1) {
      expect(REPORT).not.toContain("张 H1 Formal 全为");
      expect(REPORT).toContain("强度构成已非全 I1");
    }
  });

  it("报告的生产链表「仅 Formal」行张数 === MC 的 formalTotal，且终态 Heat === 链产物实测", () => {
    const fo = chain.scenarioFormalOnly as { finalHeat: string; finalEffective: number };
    expect(REPORT).toContain(`| 仅 Formal ${mc.cardSource.formalTotal} 张 |`);
    expect(REPORT).toContain(`| H4 | ${fo.finalEffective} |`);
    expect(fo.finalHeat).toBe("H4");
    expect(fo.finalEffective).toBeGreaterThan(0);
  });

  it("MC 产物自身的说明文字也不含过期卡段（readingGuide 不得再写 PN-TRUTH-201~224）", () => {
    expect(String(mc.readingGuide)).not.toContain("201~224");
  });
});
