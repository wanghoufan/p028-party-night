import { describe, expect, it } from "vitest";
import { getV2ContentAdapter } from "@/lib/v2-content/v2-content-adapter";
import { expansionSsotCards, mainlineSsotCards } from "@/lib/v2-content/v2-card-bridge";
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
} from "@/lib/v2-content/fixed-content-manifest-build";
import { BUILTIN_SEED_CARDS } from "@/lib/game-packs/built-in-seeds";
import type { GameCard } from "@/lib/domain/schemas";

/**
 * P1-3 + Human Step 4｜FixedContentManifest 两轨（Legacy Compatibility / Formal Fixed）。
 *
 * 锁死四件事：
 * ① 两轨结构分明：legacy 390 张（快照内、可缺新 metadata），formal **0 张**（正确状态）；
 * ② Formal 准入是**严格四条件**、**无任何宽松开关**——缺 strict metadata / humanBarFit≠PASS /
 *    reviewed≠true / hash 不全，逐条都进不了 Formal；
 * ③ `reviewed` 只来自真实人工审查输入，**不**由 metadata 齐全或 machineVerdict 推高；
 * ④ 构建产物可复现（重复构建 + 乱序输入 → 两轨同一 hash），strict 门禁 fail-closed。
 */

const frozenCards = (): GameCard[] => [...mainlineSsotCards(), ...expansionSsotCards()];

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

/** 逐卡人工审查输入（只有它能把 reviewed / humanBarFit 置真）。 */
const humanReview = (
  entries: Record<string, { reviewed: boolean; humanBarFit: FixedHumanBarFit }>,
): HumanFixedReview => ({ source: "tests/unit/fixed-content-manifest.test.ts", reviewedAt: "2026-09-28", entries });

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
  it("Legacy Compatibility 轨 = 冻结快照 390 张，逐卡有 provenance，且明确不是正式 Fixed Content", () => {
    const legacy = FIXED_CONTENT_MANIFEST.tracks.legacyCompatibility;
    expect(FIXED_CONTENT_MANIFEST.snapshotVersion).toBe(`fixed-snapshot@content-v${adapter.provenance.mainline.schemaVersion}`);
    expect(legacy.track).toBe("legacyCompatibility");
    expect(legacy.isFormalFixedContent).toBe(false);
    expect(legacy.snapshotHash).toMatch(FIXED_PAYLOAD_HASH_PATTERN);
    expect(legacy.allowedCardIds).toHaveLength(390);
    expect(legacy.counts).toMatchObject({ total: 390, mainline: 350, expansion: 40 });
    for (const id of legacy.allowedCardIds) {
      expect(legacy.provenance[id], `${id} 缺 provenance`).toBeTruthy();
      expect(legacy.provenance[id]!.payloadHash).toMatch(FIXED_PAYLOAD_HASH_PATTERN);
      // P1-4：机器预筛与人工定档分层，两条都留痕，互不替代。
      expect(["PASS", "SUSPECT", "HARD_FAIL_PATTERN"]).toContain(legacy.provenance[id]!.machineVerdict);
      expect(legacy.provenance[id]!.humanBarFit).toBe("UNREVIEWED");
      // Human Step 4：无人工审查输入 ⇒ reviewed 必须为 false（不得由 metadata 齐全推高）。
      expect(legacy.provenance[id]!.reviewed).toBe(false);
    }
  });

  it("Formal Fixed 轨当前为 0 张，且被拒原因如实计数（Human 认可的正确状态）", () => {
    const formal = FIXED_CONTENT_MANIFEST.tracks.formalFixed;
    expect(formal.track).toBe("formalFixed");
    expect(formal.isFormalFixedContent).toBe(true);
    expect(formal.admission).toBe("strict");
    expect(formal.requirements).toEqual([...FORMAL_FIXED_ADMISSION_REQUIREMENTS]);
    expect(formal.allowedCardIds).toEqual([]);
    expect(formal.counts).toMatchObject({ total: 0, mainline: 0, expansion: 0, auditedMetadata: 0 });
    // 空 Formal 集合的 hash 必须可复算（不是随手写的常量）。
    expect(formal.snapshotHash).toBe(fixedSnapshotHash([]));
    expect(formal.rejectedFromFormal).toMatchObject({
      total: 390,
      missingStrictMetadata: 390,
      humanBarFitNotPass: 390,
      notHumanReviewed: 390,
      provenanceIncomplete: 0,
    });
    expect(formalFixedIdSet().size).toBe(0);
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
   * `humanBarFit=PASS` + `reviewed=true` 只能由人工审查输入给出。
   */
  it("① 缺 strict metadata（旧卡）＋人工 PASS → 仍不进 Formal，但 reviewed/humanBarFit 如实记录人工结论", () => {
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
    ).toThrow(/人工审查输入自相矛盾/);
    expect(() =>
      buildFixedContentTracks(
        [audited("PN-TRUTH-HALF")],
        buildOptions(),
        humanReview({ "PN-TRUTH-HALF": { reviewed: true, humanBarFit: "UNREVIEWED" } }),
      ),
    ).toThrow(/人工审查输入自相矛盾/);
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

describe("Human Step 4｜reviewed 只来自真实人工审查（机器不得推高）", () => {
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

  it("人工审查输入来源写进产物，便于复核 reviewed 的出处", () => {
    const built = buildFixedContentTracks([audited("PN-TRUTH-1")], buildOptions(), humanReview({}));
    expect(built.manifest.buildInfo.humanReviewSource).toBe("tests/unit/fixed-content-manifest.test.ts");
    expect(built.manifest.buildInfo.humanReviewedAt).toBe("2026-09-28");
    expect(buildFixedContentTracks([audited("PN-TRUTH-1")], buildOptions()).manifest.buildInfo.humanReviewSource)
      .toBe(EMPTY_HUMAN_FIXED_REVIEW.source);
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
