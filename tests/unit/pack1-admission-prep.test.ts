/**
 * A8｜admission 待收条件登记（`lib/v2-content/pack1-supplements/pack1-admission-prep.ts`）的机器门禁。
 *
 * 锁死三件事：
 * ① **登记合法**：cardId 唯一、reason 取闭集、boundaryTag 取闭集；
 * ② **只准备不落地**：被登记卡的卡面 `responseMode` 仍 `public`、`boundaryTags` **不含**登记值
 *    （本单不 admission、不改准入逻辑）；
 * ③ **planning-only**：本模块**不被** `lib/**` 任何运行时 / 准入 / manifest 代码 import。
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  PACK1_PENDING_ADMISSION_BOUNDARY_TAGS,
  PACK1_PENDING_ADMISSION_CARD_IDS,
  PACK1_PENDING_ADMISSION_OVERRIDES,
} from "@/lib/v2-content/pack1-supplements/pack1-admission-prep";
import { PACK1_REPLACE_CARDS } from "@/lib/v2-content/pack1-replaces/pack1-replace-cards";
import { PACK1_SUPPLEMENT_CARDS } from "@/lib/v2-content/pack1-supplements/pack1-supplement-cards";
import { FIXED_CONTENT_MANIFEST } from "@/lib/v2-content/fixed-content-manifest";
import { FORMAL_TRUTH_CARDS } from "@/lib/v2-content/formal-truth-pack";
import { FORMAL_TRUTH_BOOTSTRAP_CARDS } from "@/lib/v2-content/formal-truth-bootstrap-pack";

const ALL_CARDS = [...PACK1_REPLACE_CARDS, ...PACK1_SUPPLEMENT_CARDS];
const cardById = new Map(ALL_CARDS.map((card) => [card.cardId, card]));

/** 递归收集 `lib/` 下的 `.ts` 源文件路径。 */
function collectLibSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectLibSources(full));
    else if (full.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("A8｜admission 待收条件登记：合法 / 不落地 / planning-only", () => {
  it("① 登记合法：cardId 唯一升序、reason 闭集、boundaryTag 闭集、registeredIn 非空", () => {
    const ids = PACK1_PENDING_ADMISSION_CARD_IDS;
    expect(ids).toHaveLength(PACK1_PENDING_ADMISSION_OVERRIDES.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
    const allowedTags = new Set<string>(PACK1_PENDING_ADMISSION_BOUNDARY_TAGS);
    const allowedReasons = new Set(["private_response_mode", "boundary_tag"]);
    for (const entry of PACK1_PENDING_ADMISSION_OVERRIDES) {
      expect(entry.reasons.length, entry.cardId).toBeGreaterThan(0);
      for (const reason of entry.reasons) expect(allowedReasons.has(reason), `${entry.cardId} reason`).toBe(true);
      for (const tag of entry.admissionBoundaryTags ?? []) {
        expect(allowedTags.has(tag), `${entry.cardId} tag ${tag}`).toBe(true);
      }
      expect(entry.registeredIn.length, entry.cardId).toBeGreaterThan(0);
      if (entry.admissionResponseMode !== undefined) {
        expect(entry.admissionResponseMode).toBe("private-individual");
      }
    }
  });

  it("② 本单点名的 267 / 277（＋269 / 259）已登记；267/277/269 待私答或 proximity", () => {
    expect(PACK1_PENDING_ADMISSION_CARD_IDS).toContain("PN-TRUTH-267");
    expect(PACK1_PENDING_ADMISSION_CARD_IDS).toContain("PN-TRUTH-277");
    const by267 = PACK1_PENDING_ADMISSION_OVERRIDES.find((e) => e.cardId === "PN-TRUTH-267")!;
    expect(by267.admissionResponseMode).toBe("private-individual");
    expect(by267.admissionBoundaryTags).toContain("proximity");
    const by277 = PACK1_PENDING_ADMISSION_OVERRIDES.find((e) => e.cardId === "PN-TRUTH-277")!;
    expect(by277.admissionBoundaryTags).toContain("location-sensitive");
  });

  it("②' 只准备不落地：被登记卡卡面 responseMode 仍 public、boundaryTags 不含登记值", () => {
    for (const entry of PACK1_PENDING_ADMISSION_OVERRIDES) {
      const card = cardById.get(entry.cardId);
      expect(card, `${entry.cardId} 不在 planning 卡源（登记表与卡源对不上）`).toBeTruthy();
      expect(card!.responseMode, `${entry.cardId} 已把 responseMode 落地（本单不得落地）`).toBe("public");
      for (const tag of entry.admissionBoundaryTags ?? []) {
        expect(card!.boundaryTags, `${entry.cardId} 已把 ${tag} 落到卡面`).not.toContain(tag);
      }
    }
  });

  it("②'' 被登记卡仍未进 Formal / legacy 两轨（本单不 admission）", () => {
    const formal = new Set(FIXED_CONTENT_MANIFEST.tracks.formalFixed.allowedCardIds);
    const legacy = new Set(FIXED_CONTENT_MANIFEST.tracks.legacyCompatibility.allowedCardIds);
    for (const id of PACK1_PENDING_ADMISSION_CARD_IDS) {
      expect(formal.has(id), `${id} 已在 formalFixed`).toBe(false);
      expect(legacy.has(id), `${id} 已在 legacyCompatibility`).toBe(false);
    }
    // 也不在既有运行时包内。
    const runtimeIds = new Set([...FORMAL_TRUTH_CARDS, ...FORMAL_TRUTH_BOOTSTRAP_CARDS].map((c) => c.cardId));
    for (const id of PACK1_PENDING_ADMISSION_CARD_IDS) expect(runtimeIds.has(id), id).toBe(false);
  });

  it("③ planning-only：本模块不被 lib/** 任何运行时/准入/manifest 代码 import", () => {
    const moduleFile = join("lib", "v2-content", "pack1-supplements", "pack1-admission-prep.ts");
    const sources = collectLibSources(join(process.cwd(), "lib")).filter(
      (file) => !file.endsWith("pack1-admission-prep.ts"),
    );
    expect(sources.length).toBeGreaterThan(50);
    // 只看**真实 import 语句**（`from "..."` / `import("...")`）；注释里提到文件名不算（本单在卡注释里引用过）。
    const importRe = (mod: string) => new RegExp(`(?:from\\s*|import\\s*\\(\\s*)["'][^"']*${mod}["']`);
    const imported = sources.filter((file) => importRe("pack1-admission-prep").test(readFileSync(file, "utf8")));
    expect(imported, `被运行时 import：${imported.join(" / ")}`).toEqual([]);
    // 同理，语义签名模块也不得被运行时 import（同为 planning-only 审计视图）。
    const semanticImported = sources.filter(
      (file) => !file.endsWith("pack1-semantic-axes.ts") && importRe("pack1-semantic-axes").test(readFileSync(file, "utf8")),
    );
    expect(semanticImported, `语义模块被运行时 import：${semanticImported.join(" / ")}`).toEqual([]);
    // 自证：本文件路径真实存在（防路径写错导致 test 空转）。
    expect(statSync(join(process.cwd(), moduleFile)).isFile()).toBe(true);
  });
});
