/**
 * BAR-FIT 独立审查输入**扩展器**（R3 首版 / B5 更新）：在既有审查输入上追加新增候选条目，并重算机器档位汇总。
 *
 * ## 本脚本只做三件事
 * 1. **逐字保留既有审查结论**：既有条目（第一包 24 条 + 已完成独立审查的 Bootstrap 7 条）从磁盘原样复制，
 *    **一个字符都不改**；第一包 24 条写盘前用冻结指纹（`FIRST_PACK_REVIEW_ENTRIES_SHA256`）核对——
 *    对不上即拒绝写盘（fail-closed）。
 * 2. **新增候选条目留空**：仍是 `UNREVIEWED` 的新增卡一律 `humanBarFit="UNREVIEWED"` / `reviewed=false`，
 *    `note` 写明「待独立 reviewer 填写」。本脚本**绝不**代写 `PASS / BORDERLINE / FAIL`，
 *    也绝不把 `reviewed` 置 true。B5 之后 Bootstrap 7 张已被独立 reviewer 定档，
 *    本脚本要求它们处于**已定档且 note 非占位**的状态（半填/占位即拒绝写盘），并逐字保留其结论。
 * 3. **汇总由逐卡数据计算**：`packMachineVerdictSummary`（按包分组）与 `libraryMachineVerdictSummary`
 *    的全部数字都来自 `lib/v2-content/bar-fit-review-input.ts#tallyVerdicts`（逐卡机器档位行），
 *    **没有任何一处手填**。
 *
 * ## 数据来源（全只读）
 * - 逐卡机器档位：`docs/qa/content-audit-v2/BAR-FIT-AUDIT.json#sets.frozenFixed414`（canonical 口径，
 *   含 B3 候选；`reconciliation414` 逐卡对账 fail-closed）。集标识是稳定键名，张数以 `cardCount` 为准。
 * - 待审卡清单：`lib/v2-content/formal-truth-pack.ts`（第一包 24）＋
 *   `lib/v2-content/formal-truth-bootstrap-pack.ts`（Bootstrap 7）。
 * - 既有条目：`docs/qa/content-audit-v2/BAR-FIT-HUMAN-REVIEW.json`（只读）。
 *
 * ## 用法
 * - 生成/校验：`npx vite-node -c vitest.config.ts scripts/audit-bar-fit-human-review-extend.ts`
 * - 只读校验（不写盘，仅供门禁/篡改探针）：追加 `--check`（不一致即 `exit 1`）
 * - 未知参数即报错退出。
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { FORMAL_TRUTH_BOOTSTRAP_CARDS } from "@/lib/v2-content/formal-truth-bootstrap-pack";
import { FORMAL_TRUTH_CARDS } from "@/lib/v2-content/formal-truth-pack";
import { isValidReviewerKind } from "@/lib/v2-content/fixed-content-manifest-build";
import {
  FIRST_PACK_REVIEW_ENTRIES_SHA256,
  R3_APPEND_MARK,
  TRUTH_BOOTSTRAP_GROUP,
  TRUTH_FIRST_PACK_GROUP,
  buildGroupSummary,
  buildPackSummary,
  checkReviewInput,
  reviewEntriesFingerprintInput,
  stripAppendedSuffix,
  tallyVerdicts,
  type MachineVerdict,
  type ReviewEntry,
  type ReviewInputPayload,
  type ReviewSelfCheckExpectation,
  type VerdictRow,
} from "@/lib/v2-content/bar-fit-review-input";

const ROOT = process.cwd();
const AUDIT_PATH = `${ROOT}/docs/qa/content-audit-v2/BAR-FIT-AUDIT.json`;
const REVIEW_PATH = `${ROOT}/docs/qa/content-audit-v2/BAR-FIT-HUMAN-REVIEW.json`;
const GENERATED_BY =
  "scripts/audit-bar-fit-human-review-skeleton.ts（骨架）＋ scripts/audit-bar-fit-human-review-extend.ts（R3 扩展：追加 Bootstrap 7 条 + 按包分组汇总，由逐卡数据计算；B5：保留已定档结论并同步追加语）＋ product-reviewer 逐卡填写（第一包结论）＋ product-reviewer 复判回填（Bootstrap 7 张，见 temp/REVIEW-BOOTSTRAP-7.md / temp/REVIEW-BOOTSTRAP-7-RECHECK.md）";

/** 顶层追加语里的「待审」占位措辞：已定档条目出现它即视为半填，拒绝写盘。 */
const PENDING_PLACEHOLDER = "待独立 reviewer 填写";

/**
 * 追加语（幂等锚点 `R3_APPEND_MARK` 之后的那段）。B5 起描述的是**已复判**状态：
 * 「第一轮 PASS 4 / BORDERLINE 3 → 按 reviewer 建议重写 3 张 → 复判 PASS 7」。
 *
 * ⚠️ 只有 review 角色重审并改动 Bootstrap 结论时，才允许连同本段一起更新（与
 * `FIRST_PACK_REVIEW_ENTRIES_SHA256` 同一变更流程）；否则追加语会与 entries 结论矛盾。
 */
const R3_SOURCE_SUFFIX =
  "【R3 追加】Bootstrap 7 张（PN-TRUTH-225~231）经两轮独立审查（第一轮 PASS 4 / BORDERLINE 3 → 按建议重写 3 张 → 复判 PASS 7，" +
  "报告见 temp/REVIEW-BOOTSTRAP-7.md 与 temp/REVIEW-BOOTSTRAP-7-RECHECK.md），结论已如实回填（PN-TRUTH-226/228/230 由 BORDERLINE 升 PASS，" +
  "PN-TRUTH-225/227/229/231 维持第一轮 PASS）；既有 24 条结论来自第一包三轮审查，本轮原文一字未改（指纹锁定见 FIRST_PACK_REVIEW_ENTRIES_SHA256）。";
const R3_NOTE_SUFFIX =
  " 【R3 追加】R2 Truth H1 Bootstrap 候选 7 张（PN-TRUTH-225~231）已完成两轮独立审查：" +
  "第一轮 4 PASS / 3 BORDERLINE / 0 FAIL（temp/REVIEW-BOOTSTRAP-7.md），builder 按 reviewer 建议重写 226/228/230 题面（并调整 228 的 heatMax 4→3、230 的 3→2），" +
  "复判 7 张全部 PASS（temp/REVIEW-BOOTSTRAP-7-RECHECK.md），结论已回填 humanBarFit=PASS / reviewed=true。" +
  "reviewerKind=ai-role 如实标注审查者身份（AI 角色，非真人）；机器档位（machineVerdict）只作分流参考，**不是**本次定档的依据 —— " +
  "7 张的 PASS 来自独立 reviewer 的逐卡复判报告，机器预筛只是恰好同档。" +
  "任何汇总数字都由逐卡机器档位行计算（见 lib/v2-content/bar-fit-review-input.ts#tallyVerdicts），不得手填。" +
  "⚠️ 上文（人写的原文）里的「预期 formal fixed = 24 张」是**第一包单独**口径；连同 Bootstrap 7 张后本文件共 31 条 PASS 结论，" +
  "formal 张数由构建器按本审查输入动态计算（见 manifest 产物 tracks.formalFixed.counts.total），不得按 24 手写。" +
  "⛔ UNREVIEWED 不等于 PASS，也不等于 FAIL —— 缺口由独立 reviewer 补写，不得把机器档位当正式定档。";

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

/* -------------------------------- 命令行参数（fail-closed） -------------------------------- */
const ARGV = process.argv.slice(2);
let checkOnly = false;
for (const arg of ARGV) {
  if (arg === "--check") checkOnly = true;
  else fail(`未知参数：${arg}（只接受 --check）`);
}

/* -------------------------------- 读逐卡机器档位（只读） -------------------------------- */
if (!existsSync(AUDIT_PATH)) fail(`缺少 canonical 审计产物：${AUDIT_PATH}（先跑 scripts/audit-bar-fit.ts）`);
const audit = JSON.parse(readFileSync(AUDIT_PATH, "utf8")) as {
  sets?: { frozenFixed414?: { cardCount: number; forensic: boolean; admissionEligible: boolean; rows: VerdictRow[] } };
};
const canonical = audit.sets?.frozenFixed414;
if (!canonical) fail(`审计产物缺少 canonical 集 sets.frozenFixed414：${AUDIT_PATH}`);
if (canonical.forensic !== false || canonical.admissionEligible !== true) {
  fail("审计产物的 canonical 集口径非法（必须 forensic=false 且 admissionEligible=true）");
}
const verdictRows: readonly VerdictRow[] = canonical.rows;
if (verdictRows.length !== canonical.cardCount) {
  fail(`canonical 集自相矛盾：cardCount=${canonical.cardCount} 但 rows=${verdictRows.length}`);
}
const libraryIds = verdictRows.map((row) => row.cardId);

/* -------------------------------- 读既有审查输入 -------------------------------- */
if (!existsSync(REVIEW_PATH)) fail(`缺少既有审查输入：${REVIEW_PATH}（B3 扩展以既有 24 条为输入，不得凭空造）`);
const rawExisting = readFileSync(REVIEW_PATH, "utf8");
const existing = JSON.parse(rawExisting) as ReviewInputPayload;
if (!isValidReviewerKind(existing.reviewerKind)) {
  fail(`既有审查输入的 reviewerKind 非法：${JSON.stringify(existing.reviewerKind)}（只接受 "human" | "ai-role"）`);
}

const firstPackIds = FORMAL_TRUTH_CARDS.map((card) => card.cardId);
const bootstrapIds = FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => card.cardId);
const expectedCardIds = [...firstPackIds, ...bootstrapIds];

const expectation: ReviewSelfCheckExpectation = {
  expectedCardIds,
  firstPackIds,
  bootstrapIds,
  libraryIds,
  verdictRows,
};

/* --------------------- 红灯一：既有 24 条结论必须一字未改（指纹锁） --------------------- */
for (const id of firstPackIds) {
  if (!existing.entries[id]) fail(`既有审查输入缺第一包条目：${id}（不得凭空重造结论）`);
}
const firstPackFingerprint = createHash("sha256")
  .update(reviewEntriesFingerprintInput(existing.entries, firstPackIds), "utf8")
  .digest("hex");
if (firstPackFingerprint !== FIRST_PACK_REVIEW_ENTRIES_SHA256) {
  fail(
    `既有第一包 24 条结论指纹不符（磁盘=${firstPackFingerprint} ≠ 冻结=${FIRST_PACK_REVIEW_ENTRIES_SHA256}）：` +
      "本脚本不得改动既有结论，拒绝写盘。若确由 reviewer 重审改动，须同步更新冻结指纹常量并记 HANDOFF。",
  );
}

/* ------------------ 红灯二：Bootstrap 条目必须在、且不得「半填」 ------------------ */
/**
 * 只做形态校验，**不冒充审查**：已定档的条目一律逐字保留（结论只能由 reviewer 给），
 * 未定档的写占位。三种半填状态直接拒绝写盘：
 * ① 条目缺失（不得凭空重造）；② `reviewed` 与 `humanBarFit` 不自洽；③ 已定档但 note 仍是占位语。
 */
for (const id of bootstrapIds) {
  const entry = existing.entries[id];
  if (!entry) fail(`既有审查输入缺 Bootstrap 条目：${id}（本脚本不得凭空重造结论）`);
  const hasVerdict = entry.humanBarFit !== "UNREVIEWED";
  if (entry.reviewed !== hasVerdict) {
    fail(`${id}: reviewed=${entry.reviewed} 与 humanBarFit=${entry.humanBarFit} 不自洽（半填输入，拒绝写盘）`);
  }
  if (hasVerdict && entry.note.includes(PENDING_PLACEHOLDER)) {
    fail(`${id}: humanBarFit=${entry.humanBarFit} 但 note 仍是「${PENDING_PLACEHOLDER}」占位语（半填输入，拒绝写盘）`);
  }
}

/* -------------------------------- 组装条目（既有逐字复制；未定档者留空） -------------------------------- */
const verdictById = new Map(verdictRows.map((row) => [row.cardId, row.machineVerdict]));
const entries: Record<string, ReviewEntry> = {};
for (const id of firstPackIds) {
  const source = existing.entries[id]!;
  entries[id] = { reviewed: source.reviewed, humanBarFit: source.humanBarFit, note: source.note };
}
for (const id of bootstrapIds) {
  const verdict = verdictById.get(id);
  if (!verdict) fail(`canonical 审计产物未覆盖待审候选卡：${id}`);
  const source = existing.entries[id]!;
  // 已定档 ⇒ 逐字保留 reviewer 结论（含 note 原话）；未定档 ⇒ 占位，绝不代写结论。
  entries[id] =
    source.humanBarFit === "UNREVIEWED"
      ? {
          reviewed: false,
          humanBarFit: "UNREVIEWED",
          note: `${PENDING_PLACEHOLDER}（本轮不预先定档）；机器档位 ${verdict}（仅机器预筛，非独立定档；SUSPECT 仅表示进入独立复核池）。`,
        }
      : { reviewed: source.reviewed, humanBarFit: source.humanBarFit, note: source.note };
}

/* -------------------------------- 汇总：全部由逐卡数据计算 -------------------------------- */
const groupSource = "docs/qa/content-audit-v2/BAR-FIT-AUDIT.json#sets.frozenFixed414.rows 逐卡 machineVerdict 实读（canonical 口径：正文 + instruction）";
const packMachineVerdictSummary = buildPackSummary(
  `TRUTH 内容包（第一包 ${firstPackIds.length} 张 PN-TRUTH-201~224 + Bootstrap ${bootstrapIds.length} 张 PN-TRUTH-225~231 = ${expectedCardIds.length} 张）`,
  groupSource,
  "父级数字 = 各子组逐项之和（不单独手填）。机器档位仅作分流参考，未作为任何一条 humanBarFit 的依据。",
  {
    [TRUTH_FIRST_PACK_GROUP]: buildGroupSummary(
      `TRUTH 第一包 ${firstPackIds.length} 张（PN-TRUTH-201~224；已由 reviewer 三轮审查定档）`,
      groupSource,
      "本组 24 张机器档位实测全部 PASS，与既有记录一致（与 humanBarFit 独立得出）。",
      verdictRows,
      firstPackIds,
    ),
    [TRUTH_BOOTSTRAP_GROUP]: buildGroupSummary(
      `Truth H1 Bootstrap ${bootstrapIds.length} 张（PN-TRUTH-225~231；已由 reviewer 两轮独立审查定档）`,
      groupSource,
      "本组 7 张机器档位实测全部 PASS，与独立 reviewer 的复判结论恰好同档（两者独立得出，机器档位未作为定档依据）。",
      verdictRows,
      bootstrapIds,
    ),
  },
);
const libraryMachineVerdictSummary = buildGroupSummary(
  `整库（冻结固定库全量 ${libraryIds.length} 张 = SSOT 390 + 第一包 24 + Bootstrap 7）`,
  "docs/qa/content-audit-v2/BAR-FIT-AUDIT.json#sets.frozenFixed414（实读；该集标识为稳定键名，张数以 cardCount 为准）",
  "整库真实分布（实读自 BAR-FIT-AUDIT.json，非估算）。HARD_FAIL_PATTERN 为整库口径（PN-DARE-005/016/027 + PN-EXPAND-036），与 TRUTH 内容包无关。机器档位仅作分流参考，未作为任何一条 humanBarFit 的依据。",
  verdictRows,
  libraryIds,
);

const payload: ReviewInputPayload = {
  source: `${stripAppendedSuffix(existing.source)} ｜ ${R3_SOURCE_SUFFIX}`,
  reviewedAt: `${stripAppendedSuffix(existing.reviewedAt)}（R3 追加：第一包 24 条结论时间不变；Bootstrap 7 张经两轮独立审查（第一轮 PASS 4 / BORDERLINE 3 → 按建议重写 3 张 → 复判 PASS 7），结论已如实回填）`,
  reviewerKind: existing.reviewerKind,
  note: `${stripAppendedSuffix(existing.note)}${R3_NOTE_SUFFIX}`,
  entries,
  packMachineVerdictSummary,
  libraryMachineVerdictSummary,
  generatedBy: GENERATED_BY,
};

const serialized = `${JSON.stringify(payload, null, 2)}\n`;

/* ---------------------------- 追加幂等自检（重跑不得叠字） ---------------------------- */
for (const [field, text] of [
  ["source", payload.source],
  ["reviewedAt", payload.reviewedAt],
  ["note", payload.note],
] as const) {
  const occurrences = text.split(R3_APPEND_MARK).length - 1;
  if (occurrences !== 1) {
    fail(`${field} 里的「${R3_APPEND_MARK}」出现 ${occurrences} 次（必须恰好 1 次；追加语必须幂等，重跑不得叠加）`);
  }
}

/* -------------------------------- 四条自校验（写盘前 / --check 共用） -------------------------------- */
const checks =
  checkOnly && existsSync(REVIEW_PATH)
    ? checkReviewInput(JSON.parse(rawExisting) as ReviewInputPayload, expectation, rawExisting)
    : checkReviewInput(payload, expectation, serialized);

console.log(`审查输入结构自校验（${checkOnly ? "只读 --check" : "写盘前"}）：`);
for (const item of checks.items) console.log(`  ${item.ok ? "✓" : "✗"} [${item.id}] ${item.label} → ${item.detail}`);
console.log(
  `  条目：${Object.keys((checkOnly ? (JSON.parse(rawExisting) as ReviewInputPayload) : payload).entries).length} 条` +
    `（第一包 ${firstPackIds.length} + Bootstrap ${bootstrapIds.length} = ${expectedCardIds.length}）`,
);
console.log(`  既有第一包指纹：${firstPackFingerprint}（冻结=${FIRST_PACK_REVIEW_ENTRIES_SHA256}，相等=${firstPackFingerprint === FIRST_PACK_REVIEW_ENTRIES_SHA256}）`);

if (!checks.ok) fail(`审查输入结构自校验未通过（${checks.violations.length} 项）：\n- ${checks.violations.join("\n- ")}`);

if (checkOnly) {
  console.log("✓ --check 通过（只读，未写盘）");
  process.exit(0);
}

writeFileSync(REVIEW_PATH, serialized, "utf8");

const bootstrapTally = tallyVerdicts(verdictRows, bootstrapIds);
const bootstrapReviewed = bootstrapIds.filter((id) => entries[id]!.reviewed).length;
const bootstrapHumanBarFits = bootstrapIds.reduce<Record<string, number>>((acc, id) => {
  const fit = entries[id]!.humanBarFit;
  acc[fit] = (acc[fit] ?? 0) + 1;
  return acc;
}, {});
console.log(`✓ 审查输入已写入：${REVIEW_PATH}`);
console.log(`  reviewerKind        : ${payload.reviewerKind}（审查者身份；与 humanBarFit 准入判定无关）`);
console.log(`  entries             : ${Object.keys(entries).length}（第一包 ${firstPackIds.length} 逐字保留 + Bootstrap ${bootstrapIds.length} 结论逐字保留/占位）`);
console.log(`  Bootstrap 7 张独立定档: reviewed=true ${bootstrapReviewed}/7；humanBarFit ${JSON.stringify(bootstrapHumanBarFits)}`);
console.log(`  Bootstrap 7 张机器档位: ${JSON.stringify(bootstrapTally)}（仅分流参考，非定档依据）`);
console.log(`  汇总分组             : pack = ${Object.keys(packMachineVerdictSummary.groups).join(" + ")}（父级 total ${packMachineVerdictSummary.total}）；library total ${libraryMachineVerdictSummary.total}`);
const verdictList: MachineVerdict[] = ["PASS", "SUSPECT", "HARD_FAIL_PATTERN"];
for (const id of bootstrapIds) {
  const verdict = verdictById.get(id)!;
  if (!verdictList.includes(verdict)) fail(`${id}: 非法 machineVerdict`);
  console.log(`    - ${id}: machineVerdict ${verdict}｜humanBarFit ${entries[id]!.humanBarFit}｜reviewed ${entries[id]!.reviewed}`);
}
