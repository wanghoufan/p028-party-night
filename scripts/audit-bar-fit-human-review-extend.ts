/**
 * BAR-FIT 独立审查输入**状态推进器**（R3 首版 / B5 扩展 / A3 退出 Formal）。
 *
 * ## 本脚本做四件事
 * 1. **历史留痕只增不改**：首次运行从既有 `entries` 建立 `history` 归档（逐字复制当时的
 *    `reviewed` / `humanBarFit` / `note`，一个字符都不改）；此后每次运行都以
 *    `FROZEN_REVIEW_HISTORY_SHA256` 校验归档指纹——对不上即拒绝写盘（fail-closed）。
 * 2. **推进活跃状态**：按 Human 冻结的 A3 分类把 26 张（7 REWRITE + 19 REPLACE）旧版本置
 *    `UNREVIEWED` / `reviewed=false`（note 记事实与流程状态），KEEP 5 保持 `PASS` / `reviewed=true`
 *    （note 取历史原话）。脚本**绝不**代写新的质量结论（`PASS / BORDERLINE / FAIL` 只能由
 *    review 类角色给）；它只执行 Human 已冻结的「哪些退出 / 哪些保留」。
 * 3. **汇总由逐卡数据计算**：`packMachineVerdictSummary`（按包分组）与 `libraryMachineVerdictSummary`
 *    的全部数字都来自 `lib/v2-content/bar-fit-review-input.ts#tallyVerdicts`（逐卡机器档位行），
 *    **没有任何一处手填**。
 * 4. **写盘前自校验**：`checkReviewInput()` 五条结构自校验 + 历史指纹比对 + 追加语幂等，任一不过即拒绝写盘。
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
import {
  PACK1_ADMISSION_BATCHES,
  PACK1_ADMISSION_BATCH_LABELS,
  PACK1_ADMISSION_CARDS,
} from "@/lib/v2-content/pack1-admission";
import { isValidReviewerKind } from "@/lib/v2-content/fixed-content-manifest-build";
import {
  FROZEN_REVIEW_HISTORY_SHA256,
  RETIRED_FROM_FORMAL_NOTE,
  R3_APPEND_MARK,
  TRUTH_BOOTSTRAP_GROUP,
  TRUTH_FIRST_PACK_GROUP,
  TRUTH_PACK1_ADMISSION_GROUP,
  buildGroupSummary,
  buildPackSummary,
  checkReviewInput,
  reviewHistoryFingerprintInput,
  stripAppendedSuffix,
  tallyVerdicts,
  type MachineVerdict,
  type ReviewEntry,
  type ReviewHistoryEntry,
  type ReviewInputPayload,
  type ReviewRetirement,
  type ReviewSelfCheckExpectation,
  type VerdictRow,
} from "@/lib/v2-content/bar-fit-review-input";

const ROOT = process.cwd();
const AUDIT_PATH = `${ROOT}/docs/qa/content-audit-v2/BAR-FIT-AUDIT.json`;
const REVIEW_PATH = `${ROOT}/docs/qa/content-audit-v2/BAR-FIT-HUMAN-REVIEW.json`;
const GENERATED_BY =
  "scripts/audit-bar-fit-human-review-skeleton.ts（骨架）＋ scripts/audit-bar-fit-human-review-extend.ts（R3 追加 Bootstrap 7 条 / B5 保留已定档结论 / A3 按 Human 冻结分类推进活跃状态并归档历史 / A9 第一包重构批 52 张逐卡判 PASS 并按既有准入路径回填；汇总由逐卡数据计算）＋ product-reviewer 逐卡填写（第一包结论）＋ product-reviewer 复判回填（Bootstrap 7 张，见 temp/REVIEW-BOOTSTRAP-7.md / temp/REVIEW-BOOTSTRAP-7-RECHECK.md）＋ Human 冻结酒吧新内容基线逐卡审计（KEEP 5 / REWRITE 7 / REPLACE 19）＋ 内容主审 Round-1/2/3 与 A4b~A8 返工（temp/PACK1-ROUND3-REVIEW.md / temp/BAR-AUDIT-PACK1-31.md）";

/** A3 退出时刻（Human 冻结本轮分类的日期；只作流程留痕）。 */
const A3_RETIRED_AT = "2026-09-29";
/**
 * A3｜Human 冻结的 KEEP 5（方向 + 题面都合格 ⇒ 保持 Formal）。
 * 其余候选（7 REWRITE + 19 REPLACE）旧版本一律退出 Formal，待在后续批次重构/新 ID 后重新审查。
 * 来源：Human 逐卡审计（本单唯一数据来源），**不得**回退到旧「18 保留 / 13 改写」口径。
 */
const A3_KEEP_IDS: readonly string[] = ["PN-TRUTH-203", "PN-TRUTH-205", "PN-TRUTH-209", "PN-TRUTH-227", "PN-TRUTH-229"];

/**
 * 追加语（幂等锚点 `R3_APPEND_MARK` 之后的那段）。B5 起描述的是**已复判**状态：
 * 「第一轮 PASS 4 / BORDERLINE 3 → 按 reviewer 建议重写 3 张 → 复判 PASS 7」；
 * A3 追加本轮「退出 Formal」的流程状态。
 *
 * ⚠️ 只有 review 角色重审并改动历史结论时，才允许连同本段一起更新（与
 * `FROZEN_REVIEW_HISTORY_SHA256` 同一变更流程）；否则追加语会与 entries / history 矛盾。
 */
const R3_SOURCE_SUFFIX =
  "【R3 追加】Bootstrap 7 张（PN-TRUTH-225~231）经两轮独立审查（第一轮 PASS 4 / BORDERLINE 3 → 按建议重写 3 张 → 复判 PASS 7，" +
  "报告见 temp/REVIEW-BOOTSTRAP-7.md 与 temp/REVIEW-BOOTSTRAP-7-RECHECK.md），结论已如实回填（PN-TRUTH-226/228/230 由 BORDERLINE 升 PASS，" +
  "PN-TRUTH-225/227/229/231 维持第一轮 PASS）；既有 24 条结论来自第一包三轮审查，原文一字未改（历史归档指纹锁定见 FROZEN_REVIEW_HISTORY_SHA256）。" +
  "【A3 状态推进】Human 冻结的酒吧新内容基线逐卡审计判 26 张（7 REWRITE + 19 REPLACE）旧版本不合格 ⇒ 活跃 entry 置 UNREVIEWED / reviewed=false 退出 Formal，" +
  "KEEP 5（203/205/209/227/229）保持 PASS；原独立审查结论逐字归档在 history，未删除。";
const R3_NOTE_SUFFIX =
  " 【R3 追加】R2 Truth H1 Bootstrap 候选 7 张（PN-TRUTH-225~231）已完成两轮独立审查：" +
  "第一轮 4 PASS / 3 BORDERLINE / 0 FAIL（temp/REVIEW-BOOTSTRAP-7.md），builder 按 reviewer 建议重写 226/228/230 题面（并调整 228 的 heatMax 4→3、230 的 3→2），" +
  "复判 7 张全部 PASS（temp/REVIEW-BOOTSTRAP-7-RECHECK.md），结论已回填 humanBarFit=PASS / reviewed=true。" +
  "reviewerKind=ai-role 如实标注审查者身份（AI 角色，非真人）；机器档位（machineVerdict）只作分流参考，**不是**本次定档的依据 —— " +
  "7 张的 PASS 来自独立 reviewer 的逐卡复判报告，机器预筛只是恰好同档。" +
  "任何汇总数字都由逐卡机器档位行计算（见 lib/v2-content/bar-fit-review-input.ts#tallyVerdicts），不得手填。" +
  "⚠️ 上文（人写的原文）里的「预期 formal fixed = 24 张」是**第一包单独**口径；连同 Bootstrap 7 张后本文件曾有 31 条 PASS 结论，" +
  "formal 张数由构建器按本审查输入动态计算（见 manifest 产物 tracks.formalFixed.counts.total），不得按 24 或 31 手写。" +
  "⛔ UNREVIEWED 不等于 PASS，也不等于 FAIL —— 缺口由独立 reviewer 补写，不得把机器档位当正式定档。" +
  " 【A3 状态推进】Human 冻结的酒吧新内容基线逐卡审计（KEEP 5 / REWRITE 7 / REPLACE 19）判 26 张旧版本不合格 ⇒ " +
  "其活跃 entry 置 humanBarFit=UNREVIEWED / reviewed=false 退出 Formal（原独立审查结论逐字归档在 history，未删除）；" +
  "KEEP 5（PN-TRUTH-203/205/209/227/229）保持 humanBarFit=PASS / reviewed=true。退出只改活跃状态，不改历史结论，也不改准入四条件与任何阈值。";

/* -------------------------------- A9：第一包重构批 52 张（admission） -------------------------------- */
/** A9 待准入批的候选卡（`PN-TRUTH-232~283`，52 张）。 */
const PACK1_IDS: readonly string[] = PACK1_ADMISSION_CARDS.map((card) => card.cardId);

/** 逐批 ID 清单（**从卡源派生**，不手抄；用于 note 的分批构成）。 */
const PACK1_BATCH_LINES: readonly string[] = Object.entries(PACK1_ADMISSION_BATCHES).map(
  ([key, ids]) => `${PACK1_ADMISSION_BATCH_LABELS[key] ?? key} ${ids.length} 张（${ids.join(" ")}）`,
);

/**
 * A9 逐卡准入结论的 note（52 张共用同一份事实陈述）。
 * 要求（编排者派工 A9）：写明**内容主审轮次**（Round-1/2/3 ＋ A4b~A8 返工）、**审计来源**
 * `temp/BAR-AUDIT-PACK1-31.md`、以及**分批构成与 ID 清单**。
 * 数字一律由卡源派生（`PACK1_ADMISSION_CARDS`），不手填。
 */
const A9_PACK1_ADMISSION_NOTE =
  `A9 admission（内容主审结论，逐卡 PASS）：` +
  `主审轮次 —— Round-1（temp/PACK1-NEW26-REVIEW-1.md：244 FAIL / 249·250 BORDERLINE）→ Round-2（temp/PACK1-ROUND2-REVIEW.md：CONDITIONAL PASS 13/52）` +
  `→ Round-3（temp/PACK1-ROUND3-REVIEW.md：PASS 15 / BORDERLINE 8 / FAIL 0，23 张可进 Formal 候选）；` +
  `A4b~A8 四轮 builder 返工（A4b/A4c 承接与修复、A5 方向回退、A6 归类改判与重复消解、A7 逐卡整改、A8 8 张 BORDERLINE 收尾 ＋ 语义级同轴判据）后全部收敛。` +
  `审计来源 temp/BAR-AUDIT-PACK1-31.md（Human 冻结酒吧新内容基线逐卡审计：KEEP 5 / REWRITE 7 / REPLACE 19；` +
  `A6 归类改判后批次口径 REWRITE 5 ＋ REPLACE 21，含旧 202/225 由 REWRITE 改判 REPLACE）。` +
  `分批构成（合计 ${PACK1_IDS.length} 张，ID 连续区间 ${PACK1_IDS[0]} ~ ${PACK1_IDS[PACK1_IDS.length - 1]}）：` +
  PACK1_BATCH_LINES.join("；") +
  `。reviewerKind=ai-role 如实标注审查者身份（AI 角色，非真人）；机器档位（machineVerdict）只作分流参考，不是本次定档依据。`;

/** A9 追加到 `source` / `reviewedAt` / `note` 的段落（必须幂等：仍锚在 `R3_APPEND_MARK` 之后）。 */
const A9_SOURCE_SUFFIX =
  `【A9 admission】第一包重构批 ${PACK1_IDS.length} 张（${PACK1_IDS[0]}~${PACK1_IDS[PACK1_IDS.length - 1]}）经内容主审 Round-1/2/3 三轮 ＋ A4b~A8 四轮返工后` +
  `逐卡判 PASS，已由本脚本按既有准入路径写入活跃 entry（reviewed=true / humanBarFit=PASS）；` +
  `审计来源 temp/BAR-AUDIT-PACK1-31.md，分批构成见逐卡 note。KEEP 5 与 26 张退役历史结论一字未改。`;

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

/**
 * A3 历史候选集（`PN-TRUTH-201~231`，31 张）：从**既有审查输入的 `history`** 派生（不手写），
 * 含保留 5 ＋ 归档 26。**顺序即磁盘 entries 顺序**（201 → 231 升序）。
 */
function legacyCandidateIds(): readonly string[] {
  return ((existing.history ?? []) as readonly ReviewHistoryEntry[]).map((entry) => entry.cardId);
}
const legacyIds = legacyCandidateIds();
/**
 * 两个既有分组的候选集 = **当前运行时保留卡**（第一包 3 / Bootstrap 2）。A4a 摘掉 26 张退役卡后，
 * 它们已不在冻结固定库（`frozenFixed414` 不再含退役 ID）⇒ 分组口径必须跟着收窄到存活卡，
 * 否则 `tallyVerdicts` 会因退役卡缺逐卡行而抛错（fail-closed）。
 * 退役 26 张的**历史结论**仍在 `history` 里留痕（只作追溯，不再进任何机器档位分组）。
 */
const firstPackIds = FORMAL_TRUTH_CARDS.map((card) => card.cardId);
const bootstrapIds = FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => card.cardId);
/** 活跃候选集（账目口径）= 历史候选 31＋A9 重构批 52 = 83（`PN-TRUTH-201~283`）。 */
const expectedCardIds = [...legacyIds, ...PACK1_IDS];

const expectation: ReviewSelfCheckExpectation = {
  expectedCardIds,
  firstPackIds,
  bootstrapIds,
  extraGroups: { [TRUTH_PACK1_ADMISSION_GROUP]: PACK1_IDS },
  libraryIds,
  verdictRows,
};

/* ------------------ 归档历史留痕：首次从既有 entries 建立，此后只增不改（指纹锁） ------------------ */
/**
 * 归档来源二选一：① 磁盘上已有 `history`（后续运行）⇒ 逐字使用；② 首次运行（无 `history`）⇒
 * 从既有 `entries` 逐字复制当时的 `reviewed` / `humanBarFit` / `note` 建立归档。
 * 两种路径都要通过冻结指纹 `FROZEN_REVIEW_HISTORY_SHA256`——对不上即拒绝写盘（fail-closed），
 * 保证「退出 Formal 只改活跃 entries、历史结论一字不改」。
 */
for (const id of legacyIds) {
  if (!existing.entries[id]) fail(`既有审查输入缺候选条目：${id}（不得凭空重造结论）`);
}
const fromHistory = Array.isArray(existing.history) && existing.history.length > 0;
/** 历史留痕：31 张旧候选逐字来自磁盘 `history`（只增不改）；A9 52 张新卡的归档 = 其准入结论。 */
const legacyHistory: ReviewHistoryEntry[] = fromHistory
  ? legacyIds.map((id) => {
      const entry = (existing.history as readonly ReviewHistoryEntry[]).find((item) => item.cardId === id);
      if (!entry) fail(`既有 history 归档缺候选卡：${id}（历史留痕不得残缺，拒绝写盘）`);
      return { cardId: id, reviewed: entry.reviewed, humanBarFit: entry.humanBarFit, note: entry.note };
    })
  : legacyIds.map((id) => {
      const source = existing.entries[id]!;
      return { cardId: id, reviewed: source.reviewed, humanBarFit: source.humanBarFit, note: source.note };
    });
const pack1History: ReviewHistoryEntry[] = PACK1_IDS.map((id) => ({
  cardId: id,
  reviewed: true,
  humanBarFit: "PASS",
  note: A9_PACK1_ADMISSION_NOTE,
}));
const history: ReviewHistoryEntry[] = [...legacyHistory, ...pack1History];

// 冻结指纹**只覆盖 31 张旧候选**：A9 只**追加**新卡归档，不改历史结论 ⇒ 指纹必须逐字不变。
const historyFingerprint = createHash("sha256")
  .update(reviewHistoryFingerprintInput(legacyHistory, legacyIds), "utf8")
  .digest("hex");
if (historyFingerprint !== FROZEN_REVIEW_HISTORY_SHA256) {
  fail(
    `历史留痕指纹不符（磁盘/推导=${historyFingerprint} ≠ 冻结=${FROZEN_REVIEW_HISTORY_SHA256}）：` +
      "本脚本不得改动历史结论，拒绝写盘。若确由 reviewer 重审改动历史，须同步更新冻结指纹常量并记 HANDOFF。" +
      (fromHistory ? "" : "（本次为首次建立归档：确认上列指纹无误后，把该值写入 FROZEN_REVIEW_HISTORY_SHA256 再重跑。）"),
  );
}

/* ---------------- 组装活跃条目：KEEP 保持 PASS；A9 52 张 PASS；26 张旧版退出 Formal ---------------- */
const verdictById = new Map(verdictRows.map((row) => [row.cardId, row.machineVerdict]));
const keepSet = new Set(A3_KEEP_IDS);
for (const id of A3_KEEP_IDS) {
  if (!expectedCardIds.includes(id)) fail(`A3 KEEP 清单含非候选卡：${id}（分类与候选集不一致）`);
}
const pack1Set = new Set(PACK1_IDS);
/** 需要逐卡机器档位的候选 = 当前运行时保留 5 ＋ A9 重构批 52（退役 26 不进任何分组）。 */
const talliedCandidateIds = new Set<string>([...firstPackIds, ...bootstrapIds, ...PACK1_IDS]);
const entries: Record<string, ReviewEntry> = {};
for (const item of history) {
  if (talliedCandidateIds.has(item.cardId) && !verdictById.has(item.cardId)) {
    fail(`canonical 审计产物未覆盖候选卡：${item.cardId}`);
  }
  if (pack1Set.has(item.cardId)) {
    // A9：内容主审已逐卡判 PASS ⇒ 活跃终态 reviewed=true / humanBarFit=PASS。
    entries[item.cardId] = { reviewed: true, humanBarFit: "PASS", note: item.note };
  } else {
    entries[item.cardId] = keepSet.has(item.cardId)
      ? { reviewed: item.reviewed, humanBarFit: item.humanBarFit, note: item.note }
      : { reviewed: false, humanBarFit: "UNREVIEWED", note: RETIRED_FROM_FORMAL_NOTE };
  }
}
const retiredIds = legacyIds.filter((id) => !keepSet.has(id)).sort();
const retirement: ReviewRetirement = {
  retiredAt: A3_RETIRED_AT,
  cardIds: retiredIds,
  reason:
    "Human 冻结的酒吧新内容基线逐卡审计（KEEP 5 / REWRITE 7 / REPLACE 19）判定这 26 张旧版本不合格（方向不适合酒吧主线或题面需重写），" +
    "旧版本立即退出 Formal，待在后续批次重构或新开 ID 后重新审查；KEEP 5 保持 Formal。",
};

/* -------------------------------- 汇总：全部由逐卡数据计算 -------------------------------- */
const groupSource = "docs/qa/content-audit-v2/BAR-FIT-AUDIT.json#sets.frozenFixed414.rows 逐卡 machineVerdict 实读（canonical 口径：正文 + instruction）";
const packMachineVerdictSummary = buildPackSummary(
  `TRUTH 内容包（第一包 ${firstPackIds.length} 张 PN-TRUTH-201~224 + Bootstrap ${bootstrapIds.length} 张 PN-TRUTH-225~231 + A9 重构批 ${PACK1_IDS.length} 张 PN-TRUTH-232~283 = ${expectedCardIds.length} 张）`,
  groupSource,
  "父级数字 = 各子组逐项之和（不单独手填）。机器档位仅作分流参考，未作为任何一条 humanBarFit 的依据。",
  {
    [TRUTH_FIRST_PACK_GROUP]: buildGroupSummary(
      `TRUTH 第一包 ${firstPackIds.length} 张（PN-TRUTH-201~224；已由 reviewer 三轮审查定档）`,
      groupSource,
      "本组机器档位全部 PASS，与既有记录一致（与 humanBarFit 独立得出）。",
      verdictRows,
      firstPackIds,
    ),
    [TRUTH_BOOTSTRAP_GROUP]: buildGroupSummary(
      `Truth H1 Bootstrap ${bootstrapIds.length} 张（PN-TRUTH-225~231；已由 reviewer 两轮独立审查定档）`,
      groupSource,
      "本组机器档位全部 PASS，与独立 reviewer 的复判结论恰好同档（两者独立得出，机器档位未作为定档依据）。",
      verdictRows,
      bootstrapIds,
    ),
    [TRUTH_PACK1_ADMISSION_GROUP]: buildGroupSummary(
      `第一包重构批 ${PACK1_IDS.length} 张（PN-TRUTH-232~283；Golden 12 + REWRITE 7 + REPLACE 19 + 补卡 14，已由内容主审 Round-1/2/3 逐卡判 PASS）`,
      groupSource,
      "本组机器档位仅作分流参考，**不是**本批定档依据（定档来自内容主审三轮逐卡结论与 A4b~A8 返工）。",
      verdictRows,
      PACK1_IDS,
    ),
  },
);
const libraryMachineVerdictSummary = buildGroupSummary(
  `整库（冻结固定库全量 ${libraryIds.length} 张 = SSOT 390 + 第一包 24 + Bootstrap 7 + A9 重构批 ${PACK1_IDS.length}，退役 26 已退出运行时卡源）`,
  "docs/qa/content-audit-v2/BAR-FIT-AUDIT.json#sets.frozenFixed414（实读；该集标识为稳定键名，张数以 cardCount 为准）",
  "整库真实分布（实读自 BAR-FIT-AUDIT.json，非估算）。HARD_FAIL_PATTERN 为整库口径（PN-DARE-005/016/027 + PN-EXPAND-036），与 TRUTH 内容包无关。机器档位仅作分流参考，未作为任何一条 humanBarFit 的依据。",
  verdictRows,
  libraryIds,
);

const payload: ReviewInputPayload = {
  source: `${stripAppendedSuffix(existing.source)} ｜ ${R3_SOURCE_SUFFIX} ｜ ${A9_SOURCE_SUFFIX}`,
  reviewedAt: `${stripAppendedSuffix(existing.reviewedAt)}（R3 追加：第一包 24 条结论时间不变；Bootstrap 7 张经两轮独立审查（第一轮 PASS 4 / BORDERLINE 3 → 按建议重写 3 张 → 复判 PASS 7），结论已如实回填）（A9 追加：第一包重构批 ${PACK1_IDS.length} 张 ${PACK1_IDS[0]}~${PACK1_IDS[PACK1_IDS.length - 1]} 经内容主审 Round-1/2/3 ＋ A4b~A8 返工后逐卡 PASS，结论已回填；KEEP 5 与 26 张退役结论时间不变）`,
  reviewerKind: existing.reviewerKind,
  note: `${stripAppendedSuffix(existing.note)}${R3_NOTE_SUFFIX} 【A9 admission】第一包重构批 ${PACK1_IDS.length} 张（${PACK1_IDS[0]}~${PACK1_IDS[PACK1_IDS.length - 1]}）经内容主审 Round-1/2/3 三轮 ＋ A4b~A8 四轮返工后逐卡判 PASS，已按既有准入路径回填活跃 entry（reviewed=true / humanBarFit=PASS）；审计来源 temp/BAR-AUDIT-PACK1-31.md，分批构成与 ID 清单载于逐卡 note。`,
  entries,
  history,
  retirement,
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

/* -------------------------------- 五条自校验（写盘前 / --check 共用） -------------------------------- */
const checks =
  checkOnly && existsSync(REVIEW_PATH)
    ? checkReviewInput(JSON.parse(rawExisting) as ReviewInputPayload, expectation, rawExisting)
    : checkReviewInput(payload, expectation, serialized);

console.log(`审查输入结构自校验（${checkOnly ? "只读 --check" : "写盘前"}）：`);
for (const item of checks.items) console.log(`  ${item.ok ? "✓" : "✗"} [${item.id}] ${item.label} → ${item.detail}`);
console.log(
  `  条目：${Object.keys((checkOnly ? (JSON.parse(rawExisting) as ReviewInputPayload) : payload).entries).length} 条` +
    `（第一包 ${firstPackIds.length} + Bootstrap ${bootstrapIds.length} + A9 重构批 ${PACK1_IDS.length} = ${expectedCardIds.length}）`,
);
console.log(`  历史留痕指纹：${historyFingerprint}（冻结=${FROZEN_REVIEW_HISTORY_SHA256}，相等=${historyFingerprint === FROZEN_REVIEW_HISTORY_SHA256}）`);

if (!checks.ok) fail(`审查输入结构自校验未通过（${checks.violations.length} 项）：\n- ${checks.violations.join("\n- ")}`);

if (checkOnly) {
  console.log("✓ --check 通过（只读，未写盘）");
  process.exit(0);
}

writeFileSync(REVIEW_PATH, serialized, "utf8");

const bootstrapTally = tallyVerdicts(verdictRows, bootstrapIds);
const activeReviewed = expectedCardIds.filter((id) => entries[id]!.reviewed);
const activeUnreviewed = expectedCardIds.filter((id) => !entries[id]!.reviewed);
console.log(`✓ 审查输入已写入：${REVIEW_PATH}`);
console.log(`  reviewerKind        : ${payload.reviewerKind}（审查者身份；与 humanBarFit 准入判定无关）`);
console.log(`  entries             : ${Object.keys(entries).length}（history 归档 ${history.length} 条逐字保留）`);
console.log(`  活跃 PASS           : ${activeReviewed.length} 张（KEEP 5 + A9 重构批 ${PACK1_IDS.length}）`);
console.log(`  退出 Formal(UNREVIEWED): ${activeUnreviewed.length} 张 ${JSON.stringify(activeUnreviewed)}`);
console.log(`  历史留痕指纹        : ${historyFingerprint}（与冻结常量相等=${historyFingerprint === FROZEN_REVIEW_HISTORY_SHA256}）`);
console.log(`  Bootstrap 7 张机器档位: ${JSON.stringify(bootstrapTally)}（仅分流参考，非定档依据）`);
console.log(`  汇总分组             : pack = ${Object.keys(packMachineVerdictSummary.groups).join(" + ")}（父级 total ${packMachineVerdictSummary.total}）；library total ${libraryMachineVerdictSummary.total}`);
const verdictList: MachineVerdict[] = ["PASS", "SUSPECT", "HARD_FAIL_PATTERN"];
for (const id of expectedCardIds) {
  const verdict = verdictById.get(id);
  if (!verdict) {
    // 退役 26 张已不在冻结固定库 ⇒ 无逐卡行是**正确结果**（只留历史结论，不冒充机器档位）。
    if (talliedCandidateIds.has(id)) fail(`${id}: 缺失 machineVerdict`);
    console.log(`    - ${id}: （已退役，不在冻结固定库；历史结论见 history）｜humanBarFit ${entries[id]!.humanBarFit}｜reviewed ${entries[id]!.reviewed}`);
    continue;
  }
  if (!verdictList.includes(verdict)) fail(`${id}: 非法 machineVerdict`);
  console.log(`    - ${id}: machineVerdict ${verdict}｜humanBarFit ${entries[id]!.humanBarFit}｜reviewed ${entries[id]!.reviewed}`);
}
