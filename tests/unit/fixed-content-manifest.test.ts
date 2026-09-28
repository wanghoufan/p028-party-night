import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getV2ContentAdapter } from "@/lib/v2-content/v2-content-adapter";
import { expansionSsotCards, mainlineSsotCards } from "@/lib/v2-content/v2-card-bridge";
import { validateFixedCardMetadataStrict } from "@/lib/v2-content/v2-card-metadata";
import {
  FIXED_CONTENT_MANIFEST,
  FIXED_PAYLOAD_HASH_PATTERN,
  FORMAL_FIXED_ADMISSION_REQUIREMENTS,
  cardsOutsideManifest,
  classifyMainlineCard,
  countCardsOutsideManifest,
  fixedContentCards,
  formalFixedIdSet,
  isFixedMainlineCard,
  isFormalFixedCard,
  satisfiesFormalAdmission,
  type FixedCardProvenance,
  type FixedHumanBarFit,
} from "@/lib/v2-content/fixed-content-manifest";
import {
  EMPTY_HUMAN_FIXED_REVIEW,
  buildFixedContentTracks,
  fixedSnapshotHash,
  verifyFixedContentManifest,
  type BuildFixedContentManifestOptions,
  type HumanFixedReview,
  type ReviewerKind,
} from "@/lib/v2-content/fixed-content-manifest-build";
import { BUILTIN_SEED_CARDS } from "@/lib/game-packs/built-in-seeds";
import { FORMAL_TRUTH_CARDS } from "@/lib/v2-content/formal-truth-pack";
import type { GameCard } from "@/lib/domain/schemas";

/**
 * P1-3 + Human Step 4｜FixedContentManifest 两轨（Legacy Compatibility / Formal Fixed）。
 *
 * 锁死四件事：
 * ① 两轨结构分明：legacy 414 张（冻结快照 390 + 第一包正式内容 24；可缺新 metadata 者仍 390），
 *    formal = 第一包人审 `humanBarFit=PASS` 的卡（当前 24，本包全量入库）；
 *    **数量不写死在断言里**，一律从人审输入 `docs/qa/content-audit-v2/BAR-FIT-HUMAN-REVIEW.json`
 *    ＋冻结卡派生（下一轮人审改动不会再让测试变红）；
 * ② Formal 准入是**严格四条件**、**无任何宽松开关**——缺 strict metadata / humanBarFit≠PASS /
 *    reviewed≠true / hash 不全，逐条都进不了 Formal；
 * ③ `reviewed` 只来自独立审查输入（`docs/qa/content-audit-v2/BAR-FIT-HUMAN-REVIEW.json`），
 *    **不**由 metadata 齐全或 machineVerdict 推高；
 * ④ 构建产物可复现（重复构建 + 乱序输入 → 两轨同一 hash），strict 门禁 fail-closed；
 * ⑤ Change C｜`reviewerKind`（human | ai-role）必填且校验，缺失/非法 fail-closed 抛错；
 *    身份写入 `buildInfo.reviewerKind`，但**不参与准入判定**（human 与 ai-role 行为对称）。
 */

const frozenCards = (): GameCard[] => [...mainlineSsotCards(), ...expansionSsotCards()];

/** 人审输入真源（只读，构建期与测试共用）：`reviewed` / `humanBarFit` 的唯一合法来源。 */
const HUMAN_REVIEW_PATH = "docs/qa/content-audit-v2/BAR-FIT-HUMAN-REVIEW.json";
interface HumanReviewFile {
  source: string;
  reviewedAt: string;
  /** 独立 reviewer 身份（Change C）：真人 `human` / AI 角色 `ai-role`。 */
  reviewerKind: string;
  entries: Record<string, { reviewed: boolean; humanBarFit: FixedHumanBarFit }>;
}
const loadHumanReviewFile = (): HumanReviewFile =>
  JSON.parse(readFileSync(join(process.cwd(), HUMAN_REVIEW_PATH), "utf8")) as HumanReviewFile;

/** 第一包正式内容的 cardId 集合（顺序与内容源一致）。 */
const PACK_IDS = FORMAL_TRUTH_CARDS.map((card) => card.cardId);

const adapter = getV2ContentAdapter();
const buildOptions = (overrides: Partial<BuildFixedContentManifestOptions> = {}): BuildFixedContentManifestOptions => ({
  batchId: "V1.3-frozen-fixed-content",
  contentVersion: `content-v${adapter.provenance.mainline.schemaVersion}`,
  generatedBy: "tests/unit/fixed-content-manifest.test.ts",
  source: adapter.provenance.mainline.memberPath,
  ssotMainlineSha256: adapter.provenance.mainline.sha256,
  ssotExpansionSha256: adapter.provenance.expansion.sha256,
  ssotSchemaVersion: adapter.provenance.mainline.schemaVersion,
  ...overrides,
});

/** 逐卡独立审查输入（只有它能把 reviewed / humanBarFit 置真）。默认身份 ai-role（第一包真实身份）。 */
const humanReview = (
  entries: Record<string, { reviewed: boolean; humanBarFit: FixedHumanBarFit }>,
  reviewerKind: ReviewerKind = "ai-role",
): HumanFixedReview => ({
  source: "tests/unit/fixed-content-manifest.test.ts",
  reviewedAt: "2026-09-28",
  reviewerKind,
  entries,
});

const card = (overrides: Partial<GameCard> & Pick<GameCard, "id">): GameCard => ({
  packId: "truth-dare", type: "truth", content: "说一件今天的开心事",
  intensity: 1, tags: [], boundaryTags: [], minPlayers: 2, participantMode: "all", source: "builtin",
  ...overrides,
});

/** 带齐 Plan §3 必填质量字段的「已审 metadata」卡（strict 应通过）。 */
const audited = (id: string): GameCard => card({
  id,
  topic: "恋爱观",
  barFit: "PASS",
  informationGain: "high",
  informationGoal: "说出对方最想一起去的一座城市",
  socialEnergy: "medium",
  relationshipProgression: "open",
  intimacyClass: "none",
  informationGoalType: "self_preference",
} as Partial<GameCard> & Pick<GameCard, "id">);

describe("Human Step 4｜两轨在代码与产物结构上分开", () => {
  it("Legacy Compatibility 轨 = 冻结快照 390 + 第一包正式内容 24（共 414），逐卡有 provenance，且明确不是正式 Fixed Content", () => {
    const legacy = FIXED_CONTENT_MANIFEST.tracks.legacyCompatibility;
    expect(FIXED_CONTENT_MANIFEST.snapshotVersion).toBe(`fixed-snapshot@content-v${adapter.provenance.mainline.schemaVersion}`);
    expect(legacy.track).toBe("legacyCompatibility");
    expect(legacy.isFormalFixedContent).toBe(false);
    expect(legacy.snapshotHash).toMatch(FIXED_PAYLOAD_HASH_PATTERN);
    expect(legacy.allowedCardIds).toHaveLength(414);
    expect(legacy.counts).toMatchObject({
      total: 414,
      mainline: 374,
      expansion: 40,
      legacyMetadata: 390,
      auditedMetadata: 24,
    });
    for (const id of legacy.allowedCardIds) {
      expect(legacy.provenance[id], `${id} 缺 provenance`).toBeTruthy();
      expect(legacy.provenance[id]!.payloadHash).toMatch(FIXED_PAYLOAD_HASH_PATTERN);
      // P1-4：机器预筛与独立定档分层，两条都留痕，互不替代。
      expect(["PASS", "SUSPECT", "HARD_FAIL_PATTERN"]).toContain(legacy.provenance[id]!.machineVerdict);
    }
    // Human Step 4 ＋ 独立审查输入落地（C1-5）：旧 390 张无审查 ⇒ 仍 UNREVIEWED / reviewed=false；
    // 第一包 24 张已由 product-reviewer 逐卡独立定档 ⇒ reviewed=true（只来自审查输入，非 metadata）。
    const legacyOnlyIds = legacy.allowedCardIds.filter((id) => legacy.provenance[id]!.metadataStatus === "legacy");
    const auditedIds = legacy.allowedCardIds.filter((id) => legacy.provenance[id]!.metadataStatus === "audited");
    expect(legacyOnlyIds).toHaveLength(390);
    expect(auditedIds).toHaveLength(24);
    for (const id of legacyOnlyIds) {
      // 无独立审查输入的卡：不得被 metadata 齐全或机器档位推高为「已审」。
      expect(legacy.provenance[id]!.humanBarFit, id).toBe("UNREVIEWED");
      expect(legacy.provenance[id]!.reviewed, id).toBe(false);
    }
    for (const id of auditedIds) {
      // 独立定档只可能是三值之一，且 reviewed 必须与「有定档」自洽。
      expect(["PASS", "BORDERLINE", "FAIL"], id).toContain(legacy.provenance[id]!.humanBarFit);
      expect(legacy.provenance[id]!.reviewed, id).toBe(true);
    }
    // 第一包 24 张＝metadataStatus=audited（带齐 Plan §3 质量字段）；旧 390 张仍为 legacy。
    expect(legacy.provenance["PN-TRUTH-201"]!.metadataStatus).toBe("audited");
    expect(legacy.provenance["PN-TRUTH-001"]!.metadataStatus).toBe("legacy");
  });

  it("Formal Fixed 轨 = 冻结卡中「strict metadata ∧ 人审 reviewed ∧ humanBarFit=PASS」者；被拒原因如实计数（全部按输入派生，不硬编码数量）", () => {
    const formal = FIXED_CONTENT_MANIFEST.tracks.formalFixed;
    const legacy = FIXED_CONTENT_MANIFEST.tracks.legacyCompatibility;
    expect(formal.track).toBe("formalFixed");
    expect(formal.isFormalFixedContent).toBe(true);
    expect(formal.admission).toBe("strict");
    expect(formal.requirements).toEqual([...FORMAL_FIXED_ADMISSION_REQUIREMENTS]);

    // ── 期望值全部由「冻结卡 + 人审输入」派生（人审改动不再让本断言变红）──────────────
    const review = loadHumanReviewFile();
    const frozen = frozenCards();
    // ① 本包每张都必须有人审 entry：防空输入让下面的派生集合全空、断言空转通过。
    for (const id of PACK_IDS) expect(review.entries[id], `${id} 缺人审 entry`).toBeDefined();
    // ② 期望 Formal = strict metadata 通过 ∧ 人审 reviewed=true ∧ humanBarFit=PASS（全库范围）。
    const expectedFormalIds = frozen
      .filter((frozenCard) => {
        const entry = review.entries[frozenCard.id];
        return (
          validateFixedCardMetadataStrict(frozenCard).ok &&
          entry?.reviewed === true &&
          entry.humanBarFit === "PASS"
        );
      })
      .map((frozenCard) => frozenCard.id)
      .sort();

    // ③ 入库清单必须与派生集合逐项一致（不是只看数量对），且逐张满足四条准入。
    expect([...formal.allowedCardIds]).toEqual(expectedFormalIds);
    for (const id of formal.allowedCardIds) {
      expect(satisfiesFormalAdmission(legacy.provenance[id]), id).toBe(true);
    }
    expect(formal.counts).toMatchObject({
      total: expectedFormalIds.length,
      mainline: expectedFormalIds.filter((id) => legacy.provenance[id]!.cardSet === "mainline").length,
      expansion: expectedFormalIds.filter((id) => legacy.provenance[id]!.cardSet === "expansion").length,
      legacyMetadata: 0,
      auditedMetadata: expectedFormalIds.length,
    });
    // ④ Formal 集合 hash 必须能由产物 provenance 的真 hash 复算（不是随手写的常量）。
    expect(formal.snapshotHash).toBe(
      fixedSnapshotHash(
        expectedFormalIds.map((id) => ({ cardId: id, payloadHash: legacy.provenance[id]!.payloadHash })),
      ),
    );
    // ⑤ 被拒原因按同一输入派生逐项对账（总数 = 全库 − Formal 集合）。
    const expectedRejection = {
      total: frozen.length - expectedFormalIds.length,
      missingStrictMetadata: frozen.filter((frozenCard) => !validateFixedCardMetadataStrict(frozenCard).ok).length,
      humanBarFitNotPass: frozen.filter(
        (frozenCard) => (review.entries[frozenCard.id]?.humanBarFit ?? "UNREVIEWED") !== "PASS",
      ).length,
      notHumanReviewed: frozen.filter((frozenCard) => review.entries[frozenCard.id]?.reviewed !== true).length,
      provenanceIncomplete: 0,
    };
    expect(formal.rejectedFromFormal).toEqual(expectedRejection);
    expect(formalFixedIdSet().size).toBe(expectedFormalIds.length);
  });

  it("第一包：humanBarFit=PASS 者全数入 Formal，≠PASS 者一个都不入（双向 fail-closed，集合按人审输入派生）", () => {
    const legacy = FIXED_CONTENT_MANIFEST.tracks.legacyCompatibility;
    const formalIds = new Set(FIXED_CONTENT_MANIFEST.tracks.formalFixed.allowedCardIds);
    const review = loadHumanReviewFile();

    // 逐张双向断言：产物 Formal 归属必须严格等于「人审 humanBarFit=PASS」。
    // 循环覆盖本包全部卡，**即使 ≠PASS 集合为空也不会空转**（每张都显式判一次）。
    const packPass: string[] = [];
    const packNotPass: string[] = [];
    for (const id of PACK_IDS) {
      const provenance = legacy.provenance[id];
      expect(provenance, `${id} 缺 provenance`).toBeDefined();
      const entry = review.entries[id];
      expect(entry, `${id} 缺人审 entry`).toBeDefined();
      // 产物 provenance 必须与人审输入真源逐卡一致（不虚报审没审过）。
      expect(provenance!.humanBarFit, id).toBe(entry!.humanBarFit);
      expect(provenance!.reviewed, id).toBe(entry!.reviewed);
      const isPass = entry!.humanBarFit === "PASS";
      // 正向：PASS ⇒ 必在 Formal；反向：非 PASS ⇒ 必不在 Formal。逐卡显式，不空转。
      expect(formalIds.has(id), `${id}（humanBarFit=${entry!.humanBarFit}）的 Formal 归属`).toBe(isPass);
      (isPass ? packPass : packNotPass).push(id);
    }

    // 集合级复核：本包 ∩ Formal === 本包 humanBarFit=PASS 的集合（两边独立算，防逐卡断言被绕过）。
    const packInFormal = [...formalIds].filter((id) => PACK_IDS.includes(id)).sort();
    const expectedPackPass = PACK_IDS.filter((id) => review.entries[id]!.humanBarFit === "PASS").sort();
    expect(packInFormal).toEqual(expectedPackPass);
    // 全量切分自证：PASS + 非 PASS 恰为该包全量，无遗漏、无重复。
    expect(packPass.sort()).toEqual(expectedPackPass);
    expect(packPass.length + packNotPass.length).toBe(PACK_IDS.length);
    expect(new Set(packPass).size + new Set(packNotPass).size).toBe(PACK_IDS.length);
  });

  it("固定库快照外 ID 数 = 0（主线+扩圈全在 Legacy 清单内）", () => {
    const frozen = frozenCards();
    expect(countCardsOutsideManifest(frozen)).toBe(0);
    expect(cardsOutsideManifest(frozen)).toEqual([]);
    expect(verifyFixedContentManifest(FIXED_CONTENT_MANIFEST, frozen)).toMatchObject({ ok: true, outsideIds: [] });
  });

  it("旧 seed-* 库整库落在快照外（证明「不是 AI」不再是准入理由）", () => {
    expect(BUILTIN_SEED_CARDS.length).toBeGreaterThan(0);
    expect(countCardsOutsideManifest(BUILTIN_SEED_CARDS)).toBe(BUILTIN_SEED_CARDS.length);
    expect(classifyMainlineCard(BUILTIN_SEED_CARDS[0]!)).toBe("alien");
  });
});

describe("P1-3｜准入是正向允许清单（不是「非 AI 即放行」）", () => {
  const fixed = mainlineSsotCards()[0]!;
  const custom: GameCard = card({ id: "custom-x", packId: "custom-pack", source: "custom", type: "custom" });
  const ai: GameCard = card({ id: "ai-x", source: "ai" });
  const alien: GameCard = BUILTIN_SEED_CARDS[0]!;

  it("classification：fixed / custom / ai / alien 四类各归各位", () => {
    expect(classifyMainlineCard(fixed)).toBe("fixed");
    expect(classifyMainlineCard(custom)).toBe("custom");
    expect(classifyMainlineCard(ai)).toBe("ai");
    expect(classifyMainlineCard(alien)).toBe("alien");
  });

  it("isFixedMainlineCard 只认 builtin ∧ ID ∈ 当前冻结快照", () => {
    expect(isFixedMainlineCard(fixed)).toBe(true);
    expect(isFixedMainlineCard(custom)).toBe(false);
    expect(isFixedMainlineCard(ai)).toBe(false);
    expect(isFixedMainlineCard(alien)).toBe(false);
    expect(isFixedMainlineCard(card({ id: "PN-TRUTH-999" }))).toBe(false);
    expect(isFixedMainlineCard(card({ id: "unknown-builtin-1" }))).toBe(false);
  });

  it("fixedContentCards 只留冻结库卡：快照外 builtin 与 custom/ai 全部出局", () => {
    const kept = fixedContentCards([fixed, custom, ai, alien]).map((item) => item.id);
    expect(kept).toEqual([fixed.id]);
  });
});

describe("Human Step 4｜Formal 准入严格四条件：任一条不满足都不得入 Formal", () => {
  /**
   * 反例矩阵：每张卡单独构建，检查它是否进了 Formal 轨。
   * `humanBarFit=PASS` + `reviewed=true` 只能由独立审查输入给出。
   */
  it("① 缺 strict metadata（旧卡）＋独立 PASS → 仍不进 Formal，但 reviewed/humanBarFit 如实记录审查结论", () => {
    const built = buildFixedContentTracks(
      [card({ id: "PN-TRUTH-LEGACY" })],
      buildOptions(),
      humanReview({ "PN-TRUTH-LEGACY": { reviewed: true, humanBarFit: "PASS" } }),
    );
    expect(built.formalCount).toBe(0);
    expect(built.manifest.tracks.formalFixed.rejectedFromFormal.missingStrictMetadata).toBe(1);
    expect(built.manifest.tracks.legacyCompatibility.provenance["PN-TRUTH-LEGACY"]).toMatchObject({
      metadataStatus: "legacy",
      reviewed: true,
      humanBarFit: "PASS",
    });
  });

  it("② 有 strict metadata 但 humanBarFit≠PASS（BORDERLINE）→ 不进 Formal", () => {
    const built = buildFixedContentTracks(
      [audited("PN-TRUTH-BORDERLINE")],
      buildOptions(),
      humanReview({ "PN-TRUTH-BORDERLINE": { reviewed: true, humanBarFit: "BORDERLINE" } }),
    );
    expect(built.formalCount).toBe(0);
    expect(built.manifest.tracks.formalFixed.rejectedFromFormal.humanBarFitNotPass).toBe(1);
    expect(isFormalFixedCard({ id: "PN-TRUTH-BORDERLINE", source: "builtin" }, built.manifest)).toBe(false);
  });

  it("③ 有 strict metadata ＋ humanBarFit=PASS 但 reviewed=false 不可能（半填输入直接抛错）", () => {
    expect(() =>
      buildFixedContentTracks(
        [audited("PN-TRUTH-HALF")],
        buildOptions(),
        humanReview({ "PN-TRUTH-HALF": { reviewed: false, humanBarFit: "PASS" } }),
      ),
    ).toThrow(/独立审查输入自相矛盾/);
    expect(() =>
      buildFixedContentTracks(
        [audited("PN-TRUTH-HALF")],
        buildOptions(),
        humanReview({ "PN-TRUTH-HALF": { reviewed: true, humanBarFit: "UNREVIEWED" } }),
      ),
    ).toThrow(/独立审查输入自相矛盾/);
  });

  it("④ provenance / payloadHash 不完整 → 不进 Formal（谓词级反例）", () => {
    const base: FixedCardProvenance = {
      cardId: "PN-TRUTH-1", cardSet: "mainline", reviewed: true, machineVerdict: "PASS",
      humanBarFit: "PASS", metadataStatus: "audited", payloadHash: "a".repeat(64),
    };
    expect(satisfiesFormalAdmission(base)).toBe(true);
    expect(satisfiesFormalAdmission({ ...base, payloadHash: "" })).toBe(false);
    expect(satisfiesFormalAdmission({ ...base, payloadHash: "not-a-hash" })).toBe(false);
    expect(satisfiesFormalAdmission({ ...base, payloadHash: "A".repeat(64) })).toBe(false);
    expect(satisfiesFormalAdmission(undefined)).toBe(false);
    // 另三条同样不能被绕过。
    expect(satisfiesFormalAdmission({ ...base, metadataStatus: "legacy" })).toBe(false);
    expect(satisfiesFormalAdmission({ ...base, reviewed: false })).toBe(false);
    expect(satisfiesFormalAdmission({ ...base, humanBarFit: "BORDERLINE" })).toBe(false);
    expect(satisfiesFormalAdmission({ ...base, humanBarFit: "UNREVIEWED" })).toBe(false);
  });

  it("四条件全中才入 Formal（正例），且 Formal 清单 = 四条件筛选结果", () => {
    const built = buildFixedContentTracks(
      [audited("PN-TRUTH-FORMAL-1"), card({ id: "PN-TRUTH-LEGACY-1" })],
      buildOptions(),
      humanReview({
        "PN-TRUTH-FORMAL-1": { reviewed: true, humanBarFit: "PASS" },
        "PN-TRUTH-LEGACY-1": { reviewed: true, humanBarFit: "PASS" },
      }),
    );
    expect(built.formalCount).toBe(1);
    expect(built.manifest.tracks.formalFixed.allowedCardIds).toEqual(["PN-TRUTH-FORMAL-1"]);
    expect(built.manifest.tracks.formalFixed.counts).toMatchObject({ total: 1, mainline: 1, auditedMetadata: 1 });
    expect(isFormalFixedCard({ id: "PN-TRUTH-FORMAL-1", source: "builtin" }, built.manifest)).toBe(true);
    expect(isFormalFixedCard({ id: "PN-TRUTH-LEGACY-1", source: "builtin" }, built.manifest)).toBe(false);
    expect(verifyFixedContentManifest(built.manifest, [audited("PN-TRUTH-FORMAL-1")].concat([card({ id: "PN-TRUTH-LEGACY-1" })])).ok).toBe(true);
  });
});

describe("Human Step 4｜reviewed 只来自独立审查（机器不得推高）", () => {
  it("metadata 字段齐全 ≠ reviewed：已审 metadata ＋ 空人工输入 → reviewed=false、不进 Formal", () => {
    const built = buildFixedContentTracks([audited("PN-TRUTH-AUDITED-1")], buildOptions(), EMPTY_HUMAN_FIXED_REVIEW);
    expect(built.manifest.tracks.legacyCompatibility.provenance["PN-TRUTH-AUDITED-1"]).toMatchObject({
      metadataStatus: "audited",
      reviewed: false,
      humanBarFit: "UNREVIEWED",
    });
    expect(built.formalCount).toBe(0);
  });

  it("machineVerdict=PASS 也不推高 reviewed：机器预筛 PASS ＋ 无人工输入 → reviewed=false", () => {
    // 题面无任何 BAR-FIT 命中 ⇒ machineVerdict 必为 PASS。
    const built = buildFixedContentTracks([audited("PN-TRUTH-MACHINE-PASS")], buildOptions(), EMPTY_HUMAN_FIXED_REVIEW);
    expect(built.manifest.tracks.legacyCompatibility.provenance["PN-TRUTH-MACHINE-PASS"]!.machineVerdict).toBe("PASS");
    expect(built.manifest.tracks.legacyCompatibility.provenance["PN-TRUTH-MACHINE-PASS"]!.reviewed).toBe(false);
    expect(built.formalCount).toBe(0);
  });

  it("独立审查输入来源写进产物，便于复核 reviewed 的出处", () => {
    const built = buildFixedContentTracks([audited("PN-TRUTH-1")], buildOptions(), humanReview({}));
    expect(built.manifest.buildInfo.humanReviewSource).toBe("tests/unit/fixed-content-manifest.test.ts");
    expect(built.manifest.buildInfo.humanReviewedAt).toBe("2026-09-28");
    expect(buildFixedContentTracks([audited("PN-TRUTH-1")], buildOptions()).manifest.buildInfo.humanReviewSource)
      .toBe(EMPTY_HUMAN_FIXED_REVIEW.source);
  });
});

describe("Change C｜reviewerKind 身份如实标注（准入身份对称；缺失/非法 fail-closed）", () => {
  it("reviewerKind 缺失 ⇒ 构建抛错（fail-closed，不默认 human、不默认放行）", () => {
    const missing = {
      source: "tests/unit/fixed-content-manifest.test.ts",
      reviewedAt: "2026-09-28",
      entries: {},
    } as unknown as HumanFixedReview;
    expect(() => buildFixedContentTracks([audited("PN-TRUTH-1")], buildOptions(), missing)).toThrow(/reviewerKind/);
  });

  it('reviewerKind 非法值（"robot"）⇒ 构建抛错（fail-closed）', () => {
    const invalid = {
      source: "x",
      reviewedAt: "2026-09-28",
      reviewerKind: "robot",
      entries: {},
    } as unknown as HumanFixedReview;
    expect(() => buildFixedContentTracks([audited("PN-TRUTH-1")], buildOptions(), invalid)).toThrow(/reviewerKind/);
  });

  it("reviewerKind 如实写进产物 buildInfo（批次级），且不参与 snapshotHash / 准入判定", () => {
    const entries = { "PN-TRUTH-1": { reviewed: true, humanBarFit: "PASS" as const } };
    const asAi = buildFixedContentTracks([audited("PN-TRUTH-1")], buildOptions(), humanReview(entries, "ai-role"));
    const asHuman = buildFixedContentTracks([audited("PN-TRUTH-1")], buildOptions(), humanReview(entries, "human"));
    expect(asAi.manifest.buildInfo.reviewerKind).toBe("ai-role");
    expect(asHuman.manifest.buildInfo.reviewerKind).toBe("human");
    // 身份对称：两轨准入结果与 snapshotHash 完全一致（身份既不降低也不提高准入）。
    expect(asHuman.manifest.tracks.formalFixed.allowedCardIds).toEqual(asAi.manifest.tracks.formalFixed.allowedCardIds);
    expect(asHuman.manifest.tracks.formalFixed.snapshotHash).toBe(asAi.manifest.tracks.formalFixed.snapshotHash);
    expect(asHuman.manifest.tracks.legacyCompatibility.snapshotHash).toBe(
      asAi.manifest.tracks.legacyCompatibility.snapshotHash,
    );
  });

  it("真实第一包：reviewerKind=ai-role 如实写入；24 张全进 Formal，human 身份行为完全对称", () => {
    const review = loadHumanReviewFile();
    expect(review.reviewerKind).toBe("ai-role");
    const frozen = frozenCards();
    const expectedPass = frozen
      .filter((frozenCard) => {
        const entry = review.entries[frozenCard.id];
        return validateFixedCardMetadataStrict(frozenCard).ok && entry?.reviewed === true && entry.humanBarFit === "PASS";
      })
      .map((frozenCard) => frozenCard.id)
      .sort();
    const asAi = buildFixedContentTracks(frozen, buildOptions(), {
      source: review.source,
      reviewedAt: review.reviewedAt,
      reviewerKind: "ai-role",
      entries: review.entries,
    });
    const asHuman = buildFixedContentTracks(frozen, buildOptions(), {
      source: review.source,
      reviewedAt: review.reviewedAt,
      reviewerKind: "human",
      entries: review.entries,
    });
    expect(asAi.manifest.buildInfo.reviewerKind).toBe("ai-role");
    expect(asHuman.manifest.buildInfo.reviewerKind).toBe("human");
    // 第一包 24 张 humanBarFit=PASS 全量入 Formal；身份不改变准入集合。
    expect(expectedPass).toHaveLength(PACK_IDS.length);
    expect([...asAi.manifest.tracks.formalFixed.allowedCardIds]).toEqual(expectedPass);
    expect([...asHuman.manifest.tracks.formalFixed.allowedCardIds]).toEqual(expectedPass);
    expect(asAi.formalCount).toBe(expectedPass.length);
    expect(asHuman.formalCount).toBe(asAi.formalCount);
  });
});

describe("P1-3｜构建门禁与产物可复现", () => {
  it("重复构建 + 输入乱序 → 两轨同一 snapshotHash；复算一致", () => {
    const frozen = frozenCards();
    const forward = buildFixedContentTracks(frozen, buildOptions()).manifest;
    const reversed = buildFixedContentTracks([...frozen].reverse(), buildOptions()).manifest;
    expect(forward.tracks.legacyCompatibility.snapshotHash).toBe(reversed.tracks.legacyCompatibility.snapshotHash);
    expect(forward.tracks.formalFixed.snapshotHash).toBe(reversed.tracks.formalFixed.snapshotHash);
    expect(forward.tracks.legacyCompatibility.snapshotHash).toBe(FIXED_CONTENT_MANIFEST.tracks.legacyCompatibility.snapshotHash);
    expect(verifyFixedContentManifest(FIXED_CONTENT_MANIFEST, [...frozen].reverse()).ok).toBe(true);
    // 同内容乱序 → 同一 hash；内容改一个字节 → hash 必变（不是「算了个常量」）
    const entries = forward.tracks.legacyCompatibility.allowedCardIds.map((id) => ({
      cardId: id,
      payloadHash: forward.tracks.legacyCompatibility.provenance[id]!.payloadHash,
    }));
    expect(fixedSnapshotHash(entries)).toBe(forward.tracks.legacyCompatibility.snapshotHash);
    expect(fixedSnapshotHash([...entries].reverse())).toBe(forward.tracks.legacyCompatibility.snapshotHash);
    const tampered = frozen.map((item, index) => (index === 0 ? { ...item, content: `${item.content}（改）` } : item));
    expect(verifyFixedContentManifest(FIXED_CONTENT_MANIFEST, tampered).ok).toBe(false);
  });

  it("已审卡带了质量字段却不过 strict → 构建抛错", () => {
    expect(() => buildFixedContentTracks([card({ id: "PN-TRUTH-BAD", barFit: "FAIL", topic: "恋爱观" } as Partial<GameCard> & Pick<GameCard, "id">)], buildOptions()))
      .toThrow(/入库门禁失败/);
  });

  it("入库门禁：非 builtin / 重复 ID 一律拒绝", () => {
    expect(() => buildFixedContentTracks([card({ id: "ai-1", source: "ai" })], buildOptions())).toThrow(/只收 source="builtin"/);
    expect(() => buildFixedContentTracks([card({ id: "PN-TRUTH-001" }), card({ id: "PN-TRUTH-001" })], buildOptions())).toThrow(/cardId 重复/);
  });

  it("Legacy 轨不因缺新 metadata 而拒收（旧卡可读），但 Formal 轨绝不因此放行", () => {
    const built = buildFixedContentTracks([card({ id: "PN-TRUTH-LEGACY-ONLY" })], buildOptions());
    expect(built.legacyCount).toBe(1);
    expect(built.manifest.tracks.legacyCompatibility.counts).toMatchObject({ total: 1, legacyMetadata: 1, auditedMetadata: 0 });
    expect(built.formalCount).toBe(0);
  });
});
