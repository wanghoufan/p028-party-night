/**
 * BAR-FIT 旧题审查（只读）— canonical 输入 + 逐卡对账 + forensic 标记（Human Step 6）
 *
 * 真源：
 * - 主线 350 + 扩圈 40：`v2-card-bridge`（运行期唯一出口，instruction 由 SSOT consentMode 渲染）；
 * - 内置种子 350：`lib/game-packs/built-in-seeds/index.ts` → BUILTIN_SEED_CARDS（seed-*）。
 *
 * ## Step 6 冻结口径（本产物的核心）
 * 唯一 canonical input = `lib/v2-content/bar-fit-input.ts#toBarFitRuntimeInput`：
 * **正文 + 玩家实际必须听到的 instruction 都计入**。本脚本与 manifest / CI / Human export 共用它，
 * 不各自拼字符串。
 *
 * 逐卡对账：manifest 产物 `tracks.legacyCompatibility.provenance[cardId].machineVerdict`
 * 与 audit 侧 canonical 重算值必须逐 cardId 一致，不一致即**非零退出**（fail-closed）。
 *
 * text-only（只扫正文、不含 instruction）只作 **forensic** 历史对照，产物带 `forensic: true`
 * 且 `admissionEligible: false`，**不参与 admission**（Step 6 原文）。
 *
 * 本脚本只读、只判定、只出审查产物：不改题面、不删题、不写 SSOT。
 * 判定逻辑全部来自 `lib/v2-content/bar-fit.ts`；脚本本身不含任何判定规则。
 *
 * 输出：
 * - `docs/qa/content-audit-v2/BAR-FIT-AUDIT.json`（机器可读，逐卡两字段 + 对账 + 口径标记）
 * - `docs/qa/content-audit-v2/BAR-FIT-AUDIT.md`（人读摘要，即 Human review export）
 *
 * 运行：`npx vite-node -c vitest.config.ts scripts/audit-bar-fit.ts`
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BUILTIN_SEED_CARDS } from "@/lib/game-packs/built-in-seeds";
import { expansionSsotCards, mainlineSsotCards } from "@/lib/v2-content/v2-card-bridge";
import {
  BAR_FIT_INPUT_CALIBER,
  BAR_FIT_INPUT_IMPLEMENTATION,
  toBarFitRuntimeInput,
  toBarFitTextOnlyForensicInput,
  type BarFitInputSource,
} from "@/lib/v2-content/bar-fit-input";
import {
  BAR_FIT_RULES,
  BAR_FIT_THRESHOLDS,
  judgeBarFit,
  type HumanBarFit,
  type MachineVerdict,
} from "@/lib/v2-content/bar-fit";
import {
  CANONICAL_SCAN_CALIBER,
  assertMachineVerdictsReconciled,
  mayEnterAdmission,
  reconcileCardsAgainstManifest,
  textOnlyForensicCaliber,
  type BarFitScanCaliber,
} from "@/lib/v2-content/bar-fit-reconcile";

const ROOT = process.cwd();
const OUT_DIR = `${ROOT}/docs/qa/content-audit-v2`;
const MANIFEST_PATH = `${ROOT}/lib/v2-content/generated/fixed-content-manifest.json`;
const BASELINE = "DEV_BASELINE=PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST";
const ENUM_SOURCE = "docs/pm/PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST.md §3";

const MACHINE_VERDICTS: MachineVerdict[] = ["PASS", "SUSPECT", "HARD_FAIL_PATTERN"];
const HUMAN_BAR_FITS: HumanBarFit[] = ["UNREVIEWED", "PASS", "BORDERLINE", "FAIL"];

const FORENSIC_REASON = "text-only 历史对照（不含 instruction）；Step 6：不参与 admission";

interface AuditRow {
  cardId: string;
  gameType: string;
  excerpt: string;
  /** 机器预筛结论（只分流，不是正式判据）。 */
  machineVerdict: MachineVerdict;
  /** 人工 BAR-FIT 定档（本批无人工审查，恒 UNREVIEWED）。 */
  humanBarFit: HumanBarFit;
  /** 命中 HF-*（hard-fail 候选）的规则 ID。 */
  hardFailPatternHits: string[];
  /** 命中 BR-* / CF-*（人工复核池）的规则 ID。 */
  suspectHits: string[];
  ruleHits: string[];
  reasons: string[];
  metrics: { charCount: number; readSeconds: number; startActions: number; instructionCharCount: number };
  /** 本行是否由 canonical input（含 instruction）判定。 */
  includesInstruction: boolean;
}

interface AuditSet {
  label: string;
  source: string;
  /** 本次扫描口径（含 instruction / forensic / 可否 admission）。 */
  caliber: BarFitScanCaliber;
  /** 冗余快照：是否 forensic（= caliber.forensic）。 */
  forensic: boolean;
  /** 冗余快照：是否可进入正式 admission（= caliber.admissionEligible）。 */
  admissionEligible: boolean;
  cardCount: number;
  machineVerdictDistribution: Record<MachineVerdict, number>;
  humanBarFitDistribution: Record<HumanBarFit, number>;
  /** hard-fail 候选数 = machineVerdict === "HARD_FAIL_PATTERN"。 */
  hardFailCandidateCount: number;
  /** 人工复核池数 = machineVerdict === "SUSPECT"（**不等于**「题目有问题」数）。 */
  reviewPoolCount: number;
  byGameType: Record<string, Record<MachineVerdict, number>>;
  rows: AuditRow[];
}

const excerpt = (text: string, limit = 48): string => (text.length > limit ? `${text.slice(0, limit)}…` : text);

const emptyMachineDistribution = (): Record<MachineVerdict, number> => ({
  PASS: 0,
  SUSPECT: 0,
  HARD_FAIL_PATTERN: 0,
});

const emptyHumanDistribution = (): Record<HumanBarFit, number> => ({
  UNREVIEWED: 0,
  PASS: 0,
  BORDERLINE: 0,
  FAIL: 0,
});

function summarize(label: string, source: string, caliber: BarFitScanCaliber, rows: AuditRow[]): AuditSet {
  const machineVerdictDistribution = emptyMachineDistribution();
  const humanBarFitDistribution = emptyHumanDistribution();
  const byGameType: Record<string, Record<MachineVerdict, number>> = {};
  for (const row of rows) {
    machineVerdictDistribution[row.machineVerdict] += 1;
    humanBarFitDistribution[row.humanBarFit] += 1;
    byGameType[row.gameType] ??= emptyMachineDistribution();
    byGameType[row.gameType][row.machineVerdict] += 1;
  }
  return {
    label,
    source,
    caliber,
    forensic: caliber.forensic,
    admissionEligible: caliber.admissionEligible,
    cardCount: rows.length,
    machineVerdictDistribution,
    humanBarFitDistribution,
    hardFailCandidateCount: machineVerdictDistribution.HARD_FAIL_PATTERN,
    reviewPoolCount: machineVerdictDistribution.SUSPECT,
    byGameType,
    rows,
  };
}

/**
 * 逐卡判定。`mode` 决定输入走 canonical（正文+instruction）还是 forensic（text-only）——
 * 两条路都从 `bar-fit-input.ts` 取输入，脚本不自行拼字符串、不自行决定 instruction。
 */
const toRow = (card: BarFitInputSource, gameType: string, mode: "canonical" | "forensic-text-only"): AuditRow => {
  const input = mode === "canonical" ? toBarFitRuntimeInput(card) : toBarFitTextOnlyForensicInput(card);
  const result = judgeBarFit({ cardId: input.cardId, text: input.text, instruction: input.instruction });
  return {
    cardId: input.cardId,
    gameType,
    excerpt: excerpt(input.text),
    machineVerdict: result.machineVerdict,
    humanBarFit: result.humanBarFit,
    hardFailPatternHits: result.hardFailPatternHits,
    suspectHits: result.suspectHits,
    ruleHits: result.ruleHits,
    reasons: result.reasons,
    metrics: {
      charCount: result.metrics.charCount,
      readSeconds: result.metrics.readSeconds,
      startActions: result.metrics.startActions,
      instructionCharCount: result.metrics.instructionCharCount,
    },
    includesInstruction: mode === "canonical",
  };
};

/* ------------------------- 冻结固定库 390（canonical） ------------------------- */
const frozen = [...mainlineSsotCards(), ...expansionSsotCards()];
const frozenRows: AuditRow[] = frozen.map((card) => toRow(card, card.type, "canonical"));
/* 同 390 张的 text-only forensic 对照（旧口径，仅历史证据）。 */
const forensicRows: AuditRow[] = frozen.map((card) => toRow(card, card.type, "forensic-text-only"));
/* ---------------------- 内置种子 350（built-in-seeds） ---------------------- */
const seedRows: AuditRow[] = BUILTIN_SEED_CARDS.map((card) => toRow(card, card.type, "canonical"));

const frozenSet = summarize(
  "冻结固定库 390（SSOT 主线 350 + 扩圈 40）",
  "lib/v2-content/v2-card-bridge.ts → mainlineSsotCards() + expansionSsotCards()",
  CANONICAL_SCAN_CALIBER,
  frozenRows,
);
const seedsSet = summarize(
  "内置种子 350（built-in-seeds，非固定库快照内）",
  "lib/game-packs/built-in-seeds/index.ts → BUILTIN_SEED_CARDS",
  {
    ...CANONICAL_SCAN_CALIBER,
    admissionEligible: false,
    reason: "旧 seed-* 库不在冻结固定库快照内（alien/legacy），仅参考，不参与正式 admission",
  },
  seedRows,
);
const forensicCaliber = textOnlyForensicCaliber(FORENSIC_REASON);
const forensicSet = summarize(
  "冻结固定库 390（text-only forensic 历史对照）",
  "同上 390 张，仅剔除 instruction",
  forensicCaliber,
  forensicRows,
);

/* ------------------------------ forensic 护栏自检 ------------------------------ */
if (mayEnterAdmission(forensicCaliber)) {
  throw new Error("forensic 护栏失效：text-only 口径被判为可进入 admission");
}
if (!mayEnterAdmission(CANONICAL_SCAN_CALIBER)) {
  throw new Error("canonical 口径未通过 admission 护栏自检");
}

/* ----------------------- 逐 cardId 对账：audit ↔ manifest ----------------------- */
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
  tracks: { legacyCompatibility: { provenance: Record<string, { machineVerdict: MachineVerdict }> } };
};
const provenance = manifest.tracks.legacyCompatibility.provenance;
const reconciliation = reconcileCardsAgainstManifest(provenance, frozen);
// fail-closed：任何不一致即非零退出，并打印可复算差异清单。
assertMachineVerdictsReconciled(reconciliation, "BAR-FIT audit↔manifest");

const payload = {
  baseline: BASELINE,
  enumSourceOfTruth: ENUM_SOURCE,
  barFitSource: "docs/pm/PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST.md §2",
  judgeModule: "lib/v2-content/bar-fit.ts",
  note: "只判定不删除：本批不删任何题、不改任何题面。机器预筛结果需经双人模拟噪声计时复核（Plan §2）。",
  canonicalInput: {
    implementation: BAR_FIT_INPUT_IMPLEMENTATION,
    caliber: BAR_FIT_INPUT_CALIBER,
    sharedBy: {
      audit: "scripts/audit-bar-fit.ts",
      manifest: "lib/v2-content/fixed-content-manifest-build.ts（provenance.machineVerdict）",
      ci: "scripts/build-fixed-content-manifest.ts + tests/unit/bar-fit-canonical-input.test.ts",
      humanExport: "本产物 docs/qa/content-audit-v2/BAR-FIT-AUDIT.{json,md}；人工复核输入 BAR-FIT-HUMAN-REVIEW.json 按 cardId 对齐",
    },
  },
  reconciliation: {
    manifestSource: "lib/v2-content/generated/fixed-content-manifest.json → tracks.legacyCompatibility.provenance",
    auditSource: "本脚本 canonical input 重算（390 张）",
    compared: reconciliation.compared,
    consistent: reconciliation.consistent,
    inconsistent: reconciliation.mismatches.length,
    mismatches: reconciliation.mismatches,
    onlyInManifest: reconciliation.onlyInManifest,
    onlyInAudit: reconciliation.onlyInAudit,
    failClosed: true,
    ok: reconciliation.ok,
  },
  forensicGuard: {
    rule: "text-only 扫描结果一律 forensic=true / admissionEligible=false，不参与 admission",
    canonicalAdmissionEligible: mayEnterAdmission(CANONICAL_SCAN_CALIBER),
    textOnlyAdmissionEligible: mayEnterAdmission(forensicCaliber),
    sets: { canonical: "frozenFixed390", textOnly: "textOnlyForensic" },
  },
  verdictSemantics: {
    machineVerdict: {
      field: "machineVerdict",
      values: MACHINE_VERDICTS,
      writer: "机器（lib/v2-content/bar-fit.ts judgeBarFit，输入来自 bar-fit-input.ts canonical input）",
      meaning:
        "PASS=无机器信号；SUSPECT=有疑似信号（含纯估算 CF-*），只进人工复核池；HARD_FAIL_PATTERN=命中 HF-* 硬失败类型，是 hard-fail 候选。均不是正式判据。",
    },
    humanBarFit: {
      field: "humanBarFit",
      values: HUMAN_BAR_FITS,
      writer: "人工双人模拟噪声计时 / 动作审查",
      meaning: "PASS / BORDERLINE / FAIL 为正式定档；机器预筛阶段恒为 UNREVIEWED。",
    },
    clarification:
      "SUSPECT 只表示「该题进入人工复核池」，**不表示题目有问题**。任何 machineVerdict 都不得直接当正式 FAIL/删除判据。",
  },
  thresholds: BAR_FIT_THRESHOLDS,
  rules: BAR_FIT_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    severity: rule.severity,
    description: rule.description,
  })),
  sets: {
    frozenFixed390: frozenSet,
    builtinSeeds350: seedsSet,
    textOnlyForensic: forensicSet,
  },
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/BAR-FIT-AUDIT.json`, `${JSON.stringify(payload, null, 2)}\n`);

/* --------------------------------- MD 摘要 -------------------------------- */
const pct = (value: number, total: number): string => `${((value / total) * 100).toFixed(1)}%`;

const machineDistributionTable = (set: AuditSet): string => {
  const lines = [
    "| 机器结论 | 题数 | 占比 | 说明 |",
    "|---|---:|---:|---|",
    `| PASS | ${set.machineVerdictDistribution.PASS} | ${pct(set.machineVerdictDistribution.PASS, set.cardCount)} | 无任何机器信号 |`,
    `| SUSPECT | ${set.machineVerdictDistribution.SUSPECT} | ${pct(set.machineVerdictDistribution.SUSPECT, set.cardCount)} | **进入人工复核池**（不等于「题目有问题」） |`,
    `| HARD_FAIL_PATTERN | ${set.machineVerdictDistribution.HARD_FAIL_PATTERN} | ${pct(set.machineVerdictDistribution.HARD_FAIL_PATTERN, set.cardCount)} | 命中硬失败类型 → **hard-fail 候选**（待人工定档） |`,
    `| **合计** | **${set.cardCount}** | 100.0% | — |`,
  ];
  return lines.join("\n");
};

const humanDistributionTable = (set: AuditSet): string => {
  const lines = [
    "| 人工定档 | 题数 | 占比 |",
    "|---|---:|---:|",
    ...HUMAN_BAR_FITS.map(
      (level) => `| ${level} | ${set.humanBarFitDistribution[level]} | ${pct(set.humanBarFitDistribution[level], set.cardCount)} |`,
    ),
    `| **合计** | **${set.cardCount}** | 100.0% |`,
  ];
  return lines.join("\n");
};

const gameTypeTable = (set: AuditSet): string => {
  const lines = [
    "| 玩法 | 题数 | PASS | SUSPECT（复核池） | HARD_FAIL_PATTERN（硬失败候选） |",
    "|---|---:|---:|---:|---:|",
  ];
  for (const type of Object.keys(set.byGameType).sort()) {
    const d = set.byGameType[type];
    const total = d.PASS + d.SUSPECT + d.HARD_FAIL_PATTERN;
    lines.push(`| ${type} | ${total} | ${d.PASS} | ${d.SUSPECT} | ${d.HARD_FAIL_PATTERN} |`);
  }
  return lines.join("\n");
};

const rowList = (rows: AuditRow[], hitsOf: (row: AuditRow) => string[], limit: number, emptyText: string): string => {
  const picked = rows.slice(0, limit);
  if (picked.length === 0) return emptyText;
  const lines = ["| # | cardId | 玩法 | 题面摘要 | 命中规则 |", "|---:|---|---|---|---|"];
  picked.forEach((row, index) => {
    lines.push(
      `| ${index + 1} | ${row.cardId} | ${row.gameType} | ${row.excerpt.replace(/\|/g, "／")} | ${hitsOf(row).join(", ")} |`,
    );
  });
  return lines.join("\n");
};

const hardFailCandidates = (set: AuditSet, limit: number): string =>
  rowList(
    set.rows.filter((row) => row.machineVerdict === "HARD_FAIL_PATTERN"),
    (row) => row.hardFailPatternHits,
    limit,
    "（无 hard-fail 候选）",
  );

const reviewPoolSamples = (set: AuditSet, limit: number): string =>
  rowList(
    set.rows.filter((row) => row.machineVerdict === "SUSPECT"),
    (row) => row.suspectHits,
    limit,
    "（无人工复核池条目）",
  );

const ruleTable = (): string => {
  const lines = ["| 规则 ID | 机器分流 | 规则名 | 判据 |", "|---|---|---|---|"];
  for (const rule of BAR_FIT_RULES) lines.push(`| ${rule.id} | ${rule.severity} | ${rule.label} | ${rule.description} |`);
  lines.push("| CF-READ-TIME | SUSPECT | 朗读超时（估算） | 朗读时长估算 > 15s → 只进人工复核池 |");
  lines.push("| CF-READ-TIME-SOFT | SUSPECT | 朗读压线（估算） | 朗读时长估算落在 10–15s → 只进人工复核池 |");
  lines.push("| CF-START-ACTIONS | SUSPECT | 动作数超限（估算） | 开场动作数估算 > 3 → 只进人工复核池 |");
  lines.push("| CF-START-ACTIONS-SOFT | SUSPECT | 动作数压线（估算） | 开场动作数估算 = 3 → 只进人工复核池 |");
  lines.push(`| CF-LONG-INSTRUCTION | SUSPECT | 必需说明超长 | 必需说明 > ${BAR_FIT_THRESHOLDS.LONG_INSTRUCTION_CHARS} 字 → 只进人工复核池 |`);
  return lines.join("\n");
};

const md = `# BAR-FIT 旧题审查（canonical 口径 + 逐卡对账 + forensic 标记）

- 基准：\`${BASELINE}\`
- BAR-FIT 判据真源：\`docs/pm/PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST.md\` §2
- 枚举真源（本文件用到的字段值）：同 Plan §3
- **唯一 canonical input**：\`${BAR_FIT_INPUT_IMPLEMENTATION}\`（${BAR_FIT_INPUT_CALIBER}）
- 判定模块：\`lib/v2-content/bar-fit.ts\`（机器预筛；Plan §2 明说机器不能替代双人模拟噪声计时）
- 运行：\`npx vite-node -c vitest.config.ts scripts/audit-bar-fit.ts\`
- **本批不删任何题、不改任何题面**；机器结论仅为分流，最终定档以人工噪声计时为准。

## 零、口径与对账（Step 6，先读这一节）

- canonical input 唯一实现：\`${BAR_FIT_INPUT_IMPLEMENTATION}\`，四类消费方共用：
  audit 本脚本 / manifest \`fixed-content-manifest-build.ts\` / CI \`build-fixed-content-manifest.ts\` + 单测 / Human export 本产物。
- **逐 cardId 对账（fail-closed）**：manifest provenance 与本脚本 canonical 重算
  相比 **${reconciliation.compared}** 张，一致 **${reconciliation.consistent}**，不一致 **${reconciliation.mismatches.length}**。
- **text-only 只作 forensic**：\`textOnlyForensic\` 集 \`forensic: true\` / \`admissionEligible: false\`，
  **不参与 admission**。

## 一、总览（canonical 口径，分列 hard-fail 候选 / 人工复核池）

| 数据源 | 口径 | forensic | 题数 | PASS | SUSPECT＝复核池 | HARD_FAIL_PATTERN＝候选 |
|---|---|---|--:|---:|---:|---:|
| 冻结固定库 390（\`PN-*\`） | canonical（正文+instruction） | 否 | ${frozenSet.cardCount} | ${frozenSet.machineVerdictDistribution.PASS} | ${frozenSet.reviewPoolCount} | ${frozenSet.hardFailCandidateCount} |
| 内置种子 350（\`seed-*\`） | canonical，非快照内 | 否 | ${seedsSet.cardCount} | ${seedsSet.machineVerdictDistribution.PASS} | ${seedsSet.reviewPoolCount} | ${seedsSet.hardFailCandidateCount} |
| 冻结固定库 390（text-only） | **forensic，不参与 admission** | **是** | ${forensicSet.cardCount} | ${forensicSet.machineVerdictDistribution.PASS} | ${forensicSet.reviewPoolCount} | ${forensicSet.hardFailCandidateCount} |

> 冻结固定库 390 的 canonical 数字是**唯一正式口径**（与 manifest 逐卡对账一致）；
> text-only 行仅历史对照，**作废、不得用于 admission**。

## 二、逐卡对账（audit ↔ manifest）

- manifest 来源：\`lib/v2-content/generated/fixed-content-manifest.json → tracks.legacyCompatibility.provenance\`
- 相比 ${reconciliation.compared} / 一致 ${reconciliation.consistent} / 不一致 ${reconciliation.mismatches.length}
- 仅 manifest 有 ${reconciliation.onlyInManifest.length} / 仅 audit 有 ${reconciliation.onlyInAudit.length}
${reconciliation.mismatches.length > 0 ? reconciliation.mismatches.map((m) => `  - \`${m.cardId}\` audit=${m.audit} ≠ manifest=${m.manifest}`).join("\n") : "- 无差异"}

## 三、冻结固定库 390（canonical）

来源：\`${frozenSet.source}\`

### 3.1 机器结论分布

${machineDistributionTable(frozenSet)}

### 3.2 人工定档分布（本批无人工审查）

${humanDistributionTable(frozenSet)}

### 3.3 按玩法分布

${gameTypeTable(frozenSet)}

### 3.4 hard-fail 候选（\`HARD_FAIL_PATTERN\`）全量

${hardFailCandidates(frozenSet, 50)}

### 3.5 人工复核池前 20 条示例（\`SUSPECT\`）

${reviewPoolSamples(frozenSet, 20)}

## 四、内置种子 350（\`seed-*\`，非固定库快照内，仅参考）

来源：\`${seedsSet.source}\`

### 4.1 机器结论分布

${machineDistributionTable(seedsSet)}

### 4.2 按玩法分布

${gameTypeTable(seedsSet)}

### 4.3 hard-fail 候选（\`HARD_FAIL_PATTERN\`）全量

${hardFailCandidates(seedsSet, 50)}

### 4.4 人工复核池前 20 条示例（\`SUSPECT\`）

${reviewPoolSamples(seedsSet, 20)}

## 五、forensic 历史对照（text-only，**不参与 admission**）

来源：\`${forensicSet.source}\`；口径：\`forensic: true\` / \`admissionEligible: false\`

| 机器结论 | 题数 | 占比 |
|---|---:|---:|
| PASS | ${forensicSet.machineVerdictDistribution.PASS} | ${pct(forensicSet.machineVerdictDistribution.PASS, forensicSet.cardCount)} |
| SUSPECT | ${forensicSet.machineVerdictDistribution.SUSPECT} | ${pct(forensicSet.machineVerdictDistribution.SUSPECT, forensicSet.cardCount)} |
| HARD_FAIL_PATTERN | ${forensicSet.machineVerdictDistribution.HARD_FAIL_PATTERN} | ${pct(forensicSet.machineVerdictDistribution.HARD_FAIL_PATTERN, forensicSet.cardCount)} |

## 六、规则表（按机器分流分列）

${ruleTable()}

## 七、复核提示

- 机器预筛只覆盖词面与长度/动作估算；语义歧义、同义重复、Consent 与尺度审查仍需人工。
- \`SUSPECT\`（含全部 \`CF-*\` 与 \`BR-*\`）只是**人工复核池**，人工复核后可下调或直接判 PASS。
- \`HARD_FAIL_PATTERN\`（\`HF-*\`）是 Plan §2 硬失败类型的 **hard-fail 候选**，按 Plan §2「不做润色改写」——
  **本批只记录候选，不执行删除**，最终由人工定档并写 \`humanBarFit\`。
- 本产物为纯函数 + 固定顺序序列化，**逐字节可复现**（同输入重跑结果完全一致，无时间戳/随机数）。
`;

writeFileSync(`${OUT_DIR}/BAR-FIT-AUDIT.md`, md);

console.log(`canonical input: ${BAR_FIT_INPUT_IMPLEMENTATION}`);
console.log(`frozenFixed390 machineVerdict: ${JSON.stringify(frozenSet.machineVerdictDistribution)}`);
console.log(`  hard-fail 候选 ${frozenSet.hardFailCandidateCount} / 人工复核池 ${frozenSet.reviewPoolCount}`);
console.log(`builtinSeeds350 machineVerdict: ${JSON.stringify(seedsSet.machineVerdictDistribution)}`);
console.log(`  hard-fail 候选 ${seedsSet.hardFailCandidateCount} / 人工复核池 ${seedsSet.reviewPoolCount}`);
console.log(`textOnlyForensic machineVerdict: ${JSON.stringify(forensicSet.machineVerdictDistribution)}（forensic=true，不参与 admission）`);
console.log(
  `对账 audit↔manifest: 相比 ${reconciliation.compared} / 一致 ${reconciliation.consistent} / 不一致 ${reconciliation.mismatches.length}`,
);
console.log(`written: ${OUT_DIR}/BAR-FIT-AUDIT.json, ${OUT_DIR}/BAR-FIT-AUDIT.md`);
