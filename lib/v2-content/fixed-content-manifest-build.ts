/**
 * FixedContentManifest 构建器（构建期 / CI 专用，**node-only**）。
 *
 * 与运行期模块 `fixed-content-manifest.ts` 拆开的原因：这里需要 `node:crypto` 算真实
 * SHA-256，而运行期模块会被浏览器包引用，不能带 node 内置模块。运行期只读
 * `./generated/fixed-content-manifest.json` 这份已冻结产物，实现「产物可复现 + 运行期零依赖」。
 *
 * ## 两轨分离（Human Step 4，本单核心）
 * `buildFixedContentTracks()` 一次构建出**两条互不代读的轨**：
 *
 * 1. **Legacy Compatibility 轨**（`tracks.legacyCompatibility`）：冻结 SSOT 的全部 builtin 卡
 *    （当前 390 张）。准入只需「`source === "builtin"` + ID 唯一」——**可缺 Plan §3 新 metadata**。
 *    它只服务旧局读取 / 恢复 / 迁移，**明确不是正式 Fixed Content**。
 * 2. **Formal Fixed 轨**（`tracks.formalFixed`）：**严格准入，无任何宽松开关**。逐卡四条全中才入：
 *
 *    | # | 条件 | 判据 |
 *    |---|---|---|
 *    | 1 | strict metadata 全字段通过 | `validateFixedCardMetadataStrict()`（缺必填/枚举非法/卡面 barFit≠PASS 即不过） |
 *    | 2 | humanBarFit = PASS | 只来自构建期注入的人工审查输入 |
 *    | 3 | reviewed = true | **只**来自人工审查输入；metadata 齐全 / machineVerdict 好看都不算 |
 *    | 4 | provenance / payloadHash 完整 | ID 在快照内且 hash 为 64 位 sha256 |
 *
 *    当前无人审查输入 ⇒ Formal = **0 张**。**这是 Human 认可的正确状态**，
 *    不许为了数字好看补默认 metadata、放宽准入或直接置 `reviewed=true`。
 *
 * > 旧版有「显式开启旧冻结通道」的折让参数，会让未审旧卡以 `metadataStatus="legacy"` 蒙进
 * > 正式清单。Human Step 4 已冻结删除该语义，本模块**不再接受任何宽松开关**：
 * > 不填新字段的旧卡只能进 Legacy Compatibility 轨，永远进不了 Formal。
 *
 * ## `reviewed` 的唯一合法来源
 * `reviewed` **不由卡面字段推导**，只取 `HumanFixedReview.entries[cardId].reviewed`；
 * 且要求它与 `humanBarFit` 自洽（`reviewed === (humanBarFit !== "UNREVIEWED")`），
 * 否则直接抛错——防止「半填」人工审查输入把未审卡标成已审。
 *
 * 运行：`pnpm build:fixed-manifest`（见 `scripts/build-fixed-content-manifest.ts`）。
 */

import { createHash } from "node:crypto";
import type { GameCard } from "@/lib/domain/schemas";
import { BAR_FIT_INPUT_CALIBER, BAR_FIT_INPUT_IMPLEMENTATION, judgeCanonicalBarFit } from "@/lib/v2-content/bar-fit-input";
import { V2_REQUIRED_QUALITY_FIELDS, validateFixedCardMetadataStrict } from "@/lib/v2-content/v2-card-metadata";
import {
  FIXED_PAYLOAD_HASH_PATTERN,
  FORMAL_FIXED_ADMISSION_REQUIREMENTS,
  satisfiesFormalAdmission,
  type FixedCardMetadataStatus,
  type FixedCardProvenance,
  type FixedCardSet,
  type FixedCardTrackCounts,
  type FixedContentManifest,
  type FixedHumanBarFit,
  type FormalRejectionCounts,
} from "@/lib/v2-content/fixed-content-manifest";

/** 逐卡 payload 的稳定序列化字段（顺序在 `canonicalizeValue` 里按 key 排序，与对象字面量顺序无关）。 */
const CARD_PAYLOAD_KEYS = [
  "id",
  "packId",
  "type",
  "content",
  "instruction",
  "intensity",
  "tags",
  "boundaryTags",
  "minPlayers",
  "maxPlayers",
  "participantMode",
  "source",
] as const;

const QUALITY_PAYLOAD_KEYS = [
  "topic",
  "barFit",
  "informationGain",
  "informationGoal",
  "socialEnergy",
  "relationshipProgression",
  "intimacyClass",
  "informationGoalType",
  "secondaryTopics",
] as const;

const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");

/**
 * 稳定 JSON 序列化：对象 key 升序、数组保持原序（数组语义由调用方先排好）。
 * 目的是「同一份内容 → 同一串字节 → 同一 hash」，跨机器、跨次运行完全一致。
 */
function canonicalizeValue(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalizeValue).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalizeValue(record[key])}`).join(",")}}`;
}

/** 逐卡内容 payload（题面 + 强度 + 边界标签 + 已回填的质量字段）；数组字段先排序，避免顺序漂移。 */
export function fixedCardPayload(card: GameCard): Record<string, unknown> {
  const source = card as unknown as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const key of CARD_PAYLOAD_KEYS) {
    if (source[key] === undefined) continue;
    const value = source[key];
    payload[key] = Array.isArray(value) ? [...value].sort() : value;
  }
  for (const key of QUALITY_PAYLOAD_KEYS) {
    if (source[key] === undefined) continue;
    const value = source[key];
    payload[key] = Array.isArray(value) ? [...value].sort() : value;
  }
  return payload;
}

/** 逐卡稳定 hash（sha256 十六进制）。 */
export function fixedCardPayloadHash(card: GameCard): string {
  return sha256(canonicalizeValue(fixedCardPayload(card)));
}

/** 整份快照 hash：按 cardId 升序取 `[cardId, payloadHash]` 再 sha256，与输入顺序无关。 */
export function fixedSnapshotHash(entries: readonly { cardId: string; payloadHash: string }[]): string {
  const sorted = [...entries].sort((a, b) => (a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0));
  return sha256(canonicalizeValue(sorted.map((entry) => [entry.cardId, entry.payloadHash])));
}

/** 卡是否带 Plan §3 新质量字段（任一出现即为 `audited`）。 */
function hasAuditedMetadata(card: GameCard): boolean {
  const record = card as unknown as Record<string, unknown>;
  return (V2_REQUIRED_QUALITY_FIELDS as readonly string[]).some((field) => record[field] !== undefined);
}

/** 扩圈包（10b）的 packId；其余归主线。
 *  与 `lib/v2-content/v2-card-bridge.ts:EXPANSION_PACK_ID` 同值；此处按字面量登记以保持本模块零业务依赖。 */
const EXPANSION_PACK_ID = "expansion";

/**
 * 逐卡人工审查输入（Human Step 4：`reviewed=true` 与 `humanBarFit` 的唯一合法来源）。
 *
 * 构建期由脚本注入（当前无任何人工审查产物 ⇒ 空输入 ⇒ Formal = 0 张）。
 * **不接受**从卡面 metadata 或机器 `machineVerdict` 推导这两个字段。
 */
export interface HumanFixedReviewEntry {
  /** 是否真实人工审查完成。 */
  reviewed: boolean;
  /** 人工 BAR-FIT 定档（双人模拟噪声计时 / 动作审查）。 */
  humanBarFit: FixedHumanBarFit;
}

/** 人工审查输入：`source` / `reviewedAt` 人读留痕，`entries` 键为 cardId。 */
export interface HumanFixedReview {
  source: string;
  reviewedAt: string;
  entries: Readonly<Record<string, HumanFixedReviewEntry>>;
}

/** 空人工审查输入（当前真实状态：无人审过 ⇒ reviewed 全 false、humanBarFit 全 UNREVIEWED）。 */
export const EMPTY_HUMAN_FIXED_REVIEW: HumanFixedReview = {
  source: "(none：尚无人工审查产物输入)",
  reviewedAt: "(none)",
  entries: {},
};

export interface BuildFixedContentManifestOptions {
  /** 冻结批次 id（「哪批冻结」）。 */
  batchId: string;
  /** 内容版本（建议取自冻结 SSOT 的 schemaVersion，不另造版本号）。 */
  contentVersion: string;
  /** 构建器标识（写入 buildInfo.generatedBy）。 */
  generatedBy: string;
  /** 冻结源（写入 buildInfo.source）。 */
  source: string;
  /** 冻结 SSOT 三件套 provenance（写入 buildInfo）。 */
  ssotMainlineSha256: string;
  ssotExpansionSha256: string;
  ssotSchemaVersion: string;
}

/** 两轨（Legacy / Formal）的 purpose 声明，写进产物供报告直接引用。 */
export const LEGACY_COMPATIBILITY_PURPOSE =
  "旧局读取 / 恢复 / 迁移；可缺 Plan §3 新 metadata；明确不是正式 Fixed Content";
export const FORMAL_FIXED_PURPOSE = "正式主线准入的唯一允许清单（当前 0 张，Human 认可的正确状态）";

export interface BuildFixedContentTracksResult {
  manifest: FixedContentManifest;
  /** Legacy Compatibility 轨卡数（= 冻结 SSOT 的全部 builtin 卡）。 */
  legacyCount: number;
  /** 其中已带 Plan §3 新质量字段的卡数（当前 0）。 */
  auditedCount: number;
  /** Formal Fixed 轨卡数（当前 0）。 */
  formalCount: number;
  /** Formal 被拒卡按原因分布。 */
  rejection: FormalRejectionCounts;
}

/** 人工审查输入自检：`reviewed` 必须与 `humanBarFit` 自洽，半填输入直接拒。 */
function assertHumanReviewConsistent(review: HumanFixedReview): void {
  for (const [cardId, entry] of Object.entries(review.entries)) {
    const hasHumanVerdict = entry.humanBarFit !== "UNREVIEWED";
    if (entry.reviewed !== hasHumanVerdict) {
      throw new Error(
        `人工审查输入自相矛盾（${cardId}）：reviewed=${entry.reviewed} 与 humanBarFit=${entry.humanBarFit} 不一致；` +
          `reviewed 只能表示真实人工审查完成`,
      );
    }
  }
}

function trackCounts(
  ids: readonly string[],
  provenance: Readonly<Record<string, FixedCardProvenance>>,
  legacyMetadata: number,
  auditedMetadata: number,
): FixedCardTrackCounts {
  return {
    total: ids.length,
    mainline: ids.filter((id) => provenance[id]?.cardSet === "mainline").length,
    expansion: ids.filter((id) => provenance[id]?.cardSet === "expansion").length,
    legacyMetadata,
    auditedMetadata,
  };
}

/**
 * 从冻结固定库卡构建 manifest 的**两轨**（Legacy Compatibility + Formal Fixed）。
 *
 * @throws 任一卡不是 `source === "builtin"` / ID 重复 / 已带新字段却 strict 不过 /
 *   人工审查输入自相矛盾。
 */
export function buildFixedContentTracks(
  cards: readonly GameCard[],
  options: BuildFixedContentManifestOptions,
  humanReview: HumanFixedReview = EMPTY_HUMAN_FIXED_REVIEW,
): BuildFixedContentTracksResult {
  assertHumanReviewConsistent(humanReview);

  const seen = new Set<string>();
  const provenance: Record<string, FixedCardProvenance> = {};
  const entries: { cardId: string; payloadHash: string }[] = [];
  const issues: string[] = [];
  let auditedCount = 0;
  let legacyCount = 0;
  const rejection: FormalRejectionCounts = {
    total: 0,
    missingStrictMetadata: 0,
    humanBarFitNotPass: 0,
    notHumanReviewed: 0,
    provenanceIncomplete: 0,
  };

  for (const card of cards) {
    if (card.source !== "builtin") {
      issues.push(`${card.id}：固定库 manifest 只收 source="builtin" 的卡，得到 "${card.source}"`);
      continue;
    }
    if (seen.has(card.id)) {
      issues.push(`${card.id}：cardId 重复（Plan §3:45「全库唯一」）`);
      continue;
    }
    seen.add(card.id);

    const audited = hasAuditedMetadata(card);
    const metadataStatus: FixedCardMetadataStatus = audited ? "audited" : "legacy";
    const strict = validateFixedCardMetadataStrict(card);

    // 填了新字段却不合格 ⇒ 不是「当旧卡处理」，而是直接构建失败（防半成品 metadata 混入）。
    if (audited && !strict.ok) {
      issues.push(
        `${card.id}：已带 Plan §3 质量字段但 strict 不通过（issues=${strict.issues.join("；") || "无"}；missing=${strict.missing.join(",")}）`,
      );
      continue;
    }

    const barFit = judgeCanonicalBarFit(card);
    const payloadHash = fixedCardPayloadHash(card);
    const cardSet: FixedCardSet = card.packId === EXPANSION_PACK_ID ? "expansion" : "mainline";
    // `reviewed` / `humanBarFit` 只来自人工审查输入；机器预筛只写 machineVerdict，绝不代写正式定档。
    const humanEntry = humanReview.entries[card.id];
    const reviewed = humanEntry?.reviewed === true;
    const humanBarFit: FixedHumanBarFit = humanEntry?.humanBarFit ?? "UNREVIEWED";
    provenance[card.id] = {
      cardId: card.id,
      cardSet,
      reviewed,
      machineVerdict: barFit.machineVerdict,
      humanBarFit,
      metadataStatus,
      payloadHash,
    };
    entries.push({ cardId: card.id, payloadHash });
    if (audited) auditedCount += 1;
    else legacyCount += 1;

    // ── Formal 准入（严格；逐条记录被拒原因，供报告如实显示为何是 0 张）────────────
    const strictPass = audited && strict.ok;
    const hashComplete = FIXED_PAYLOAD_HASH_PATTERN.test(payloadHash);
    let rejected = false;
    if (!strictPass) {
      rejection.missingStrictMetadata += 1;
      rejected = true;
    }
    if (humanBarFit !== "PASS") {
      rejection.humanBarFitNotPass += 1;
      rejected = true;
    }
    if (!reviewed) {
      rejection.notHumanReviewed += 1;
      rejected = true;
    }
    if (!hashComplete) {
      rejection.provenanceIncomplete += 1;
      rejected = true;
    }
    if (rejected) rejection.total += 1;
  }

  if (issues.length > 0) {
    throw new Error(`FixedContentManifest 入库门禁失败（${issues.length} 张）：\n- ${issues.join("\n- ")}`);
  }

  const legacyIds = [...seen].sort();
  const formalIds = legacyIds.filter((id) => satisfiesFormalAdmission(provenance[id]));
  const formalEntries = formalIds.map((id) => ({ cardId: id, payloadHash: provenance[id]!.payloadHash }));

  const manifest: FixedContentManifest = {
    snapshotVersion: `fixed-snapshot@${options.contentVersion}`,
    tracks: {
      legacyCompatibility: {
        track: "legacyCompatibility",
        isFormalFixedContent: false,
        purpose: LEGACY_COMPATIBILITY_PURPOSE,
        admission: "legacy-compatibility",
        snapshotHash: fixedSnapshotHash(entries),
        allowedCardIds: legacyIds,
        provenance,
        counts: trackCounts(legacyIds, provenance, legacyCount, auditedCount),
      },
      formalFixed: {
        track: "formalFixed",
        isFormalFixedContent: true,
        purpose: FORMAL_FIXED_PURPOSE,
        admission: "strict",
        requirements: [...FORMAL_FIXED_ADMISSION_REQUIREMENTS],
        snapshotHash: fixedSnapshotHash(formalEntries),
        allowedCardIds: formalIds,
        counts: trackCounts(formalIds, provenance, 0, formalIds.length),
        rejectedFromFormal: rejection,
      },
    },
    buildInfo: {
      generatedBy: options.generatedBy,
      source: options.source,
      batchId: options.batchId,
      contentVersion: options.contentVersion,
      legacyReviewStage: "machine-prescreen",
      barFitSource:
        `lib/v2-content/bar-fit-input.ts ${BAR_FIT_INPUT_IMPLEMENTATION}（${BAR_FIT_INPUT_CALIBER}）→ bar-fit.ts judgeBarFit → provenance.machineVerdict` +
        "（机器预筛，非双人模拟噪声计时）；provenance.humanBarFit 机器阶段恒 UNREVIEWED；" +
        "text-only 扫描为 forensic，不参与 admission",
      humanReviewSource: humanReview.source,
      humanReviewedAt: humanReview.reviewedAt,
      formalAdmission:
        "strict：strict metadata 全字段 ∧ humanBarFit=PASS ∧ reviewed=true（真实人工审查）∧ provenance/hash 完整；无任何宽松开关",
      ssotMainlineSha256: options.ssotMainlineSha256,
      ssotExpansionSha256: options.ssotExpansionSha256,
      ssotSchemaVersion: options.ssotSchemaVersion,
    },
  };

  // 自检：① 允许清单里的每个 ID 都必须有 provenance；② Formal ⊆ Legacy；
  // ③ Formal 清单必须恰好等于「四条件筛选结果」（防止构建出一条与判定不一致的清单）。
  const missingProvenance = legacyIds.filter((id) => !manifest.tracks.legacyCompatibility.provenance[id]);
  if (missingProvenance.length > 0) {
    throw new Error(`FixedContentManifest 自检失败：以下 ID 缺 provenance：${missingProvenance.join(",")}`);
  }
  const legacyIdSet = new Set(legacyIds);
  const formalOutsideLegacy = formalIds.filter((id) => !legacyIdSet.has(id));
  if (formalOutsideLegacy.length > 0) {
    throw new Error(`FixedContentManifest 自检失败：Formal 卡不在 Legacy 快照内：${formalOutsideLegacy.join(",")}`);
  }
  const expectedFormal = legacyIds.filter((id) => satisfiesFormalAdmission(provenance[id]));
  if (expectedFormal.length !== formalIds.length || expectedFormal.some((id, index) => id !== formalIds[index])) {
    throw new Error("FixedContentManifest 自检失败：Formal 清单与四条件判定结果不一致");
  }

  return { manifest, legacyCount: legacyIds.length, auditedCount, formalCount: formalIds.length, rejection };
}

export interface VerifyFixedContentManifestResult {
  ok: boolean;
  issues: string[];
  /** 输入卡里 `source="builtin"` 但不在 Legacy 轨允许清单的 ID（Plan §13「快照外 ID 数」）。 */
  outsideIds: string[];
  /** 由输入重算的 Legacy 轨 hash；与 `tracks.legacyCompatibility.snapshotHash` 不同即「产物不可复现/已漂移」。 */
  recomputedHash: string;
  /** 由输入重算的 Formal 轨 hash；与 `tracks.formalFixed.snapshotHash` 不同即 Formal 清单已漂移。 */
  recomputedFormalHash: string;
}

/**
 * 用同一批卡复算并校验 manifest（CI 的「重跑 hash 一致」+「快照外 ID 数=0」+「Formal 清单与判定一致」）。
 * 纯函数，不写文件。
 */
export function verifyFixedContentManifest(
  manifest: FixedContentManifest,
  cards: readonly GameCard[],
): VerifyFixedContentManifestResult {
  const issues: string[] = [];
  const legacyTrack = manifest.tracks.legacyCompatibility;
  const formalTrack = manifest.tracks.formalFixed;
  const allowed = new Set(legacyTrack.allowedCardIds);
  const outsideIds: string[] = [];
  const entries: { cardId: string; payloadHash: string }[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    if (card.source !== "builtin") continue;
    if (!allowed.has(card.id)) {
      outsideIds.push(card.id);
      continue;
    }
    if (seen.has(card.id)) {
      issues.push(`${card.id}：输入卡重复`);
      continue;
    }
    seen.add(card.id);
    const expected = legacyTrack.provenance[card.id];
    const actual = fixedCardPayloadHash(card);
    if (expected && expected.payloadHash !== actual) {
      issues.push(`${card.id}：内容已漂移（manifest=${expected.payloadHash.slice(0, 12)}… 实际=${actual.slice(0, 12)}…）`);
    }
    entries.push({ cardId: card.id, payloadHash: actual });
  }

  const missing = legacyTrack.allowedCardIds.filter((id) => !seen.has(id));
  if (missing.length > 0) issues.push(`manifest 声明但输入缺失的 ID（${missing.length}）：${missing.slice(0, 5).join(",")}…`);
  if (outsideIds.length > 0) issues.push(`快照外 ID ${outsideIds.length} 个：${outsideIds.slice(0, 5).join(",")}…`);

  const recomputedHash = fixedSnapshotHash(entries);
  if (recomputedHash !== legacyTrack.snapshotHash) {
    issues.push(`Legacy snapshotHash 不可复算：manifest=${legacyTrack.snapshotHash} 重算=${recomputedHash}`);
  }

  // Formal 轨交叉校验：清单必须 ⊆ Legacy，且逐卡满足四条件；hash 必须可复算。
  const legacyIdSet = new Set(legacyTrack.allowedCardIds);
  for (const id of formalTrack.allowedCardIds) {
    if (!legacyIdSet.has(id)) issues.push(`Formal 卡 ${id} 不在 Legacy 快照内`);
    if (!satisfiesFormalAdmission(legacyTrack.provenance[id])) issues.push(`Formal 卡 ${id} 不满足四条准入`);
  }
  const expectedFormalIds = legacyTrack.allowedCardIds.filter((id) => satisfiesFormalAdmission(legacyTrack.provenance[id]));
  if (expectedFormalIds.join(",") !== [...formalTrack.allowedCardIds].join(",")) {
    issues.push(
      `Formal 清单与四条件判定不一致：manifest=${formalTrack.allowedCardIds.length} 张，判定=${expectedFormalIds.length} 张`,
    );
  }
  const recomputedFormalHash = fixedSnapshotHash(
    formalTrack.allowedCardIds.map((id) => ({ cardId: id, payloadHash: legacyTrack.provenance[id]?.payloadHash ?? "" })),
  );
  if (recomputedFormalHash !== formalTrack.snapshotHash) {
    issues.push(`Formal snapshotHash 不可复算：manifest=${formalTrack.snapshotHash} 重算=${recomputedFormalHash}`);
  }

  return { ok: issues.length === 0 && outsideIds.length === 0, issues, outsideIds, recomputedHash, recomputedFormalHash };
}
