/**
 * BAR-FIT 独立审查输入（`docs/qa/content-audit-v2/BAR-FIT-HUMAN-REVIEW.json`）的
 * **按包分组机器档位汇总** ＋ **结构自校验**（R3）。
 *
 * ## 为什么要有这个模块
 * 审查输入里有两类数字，过去是**手写**的，出过一次「求和不自洽」的扁平结构
 * （本包 24 张 + 整库 4 个 hard-fail 被写进同一对象，被误读成四项同属一个集合）。
 * 本模块把两件事变成**可由逐卡数据复算**的纯函数：
 * 1. `tallyVerdicts()`：从逐卡 `machineVerdict` 行算出某组的 `total/PASS/SUSPECT/HARD_FAIL_PATTERN`；
 * 2. `checkReviewInput()`：四条自校验（条目数 = 候选总数 / cardId 唯一 / `reviewed` 与
 *    `humanBarFit` 自洽 / 各组求和自洽）。
 *
 * 生成脚本与单测**共用同一份实现**，避免「脚本算一遍、测试另写一遍」的口径漂移。
 *
 * ## 红线（本模块刻意不做的事）
 * - **不产出任何审查结论**：`PASS / BORDERLINE / FAIL` 只能由 review 类角色逐卡填写；
 *   本模块只做「结构对不对、数字自不自洽」，**不碰** `humanBarFit` 的取值。
 * - **汇总不得手填**：所有数字都必须经 `tallyVerdicts()` 从逐卡行计算（缺行即抛错）。
 * - 零依赖（不 import node 内置 / 业务层），可被脚本、测试、CI 安全引用；
 *   需要 sha256 的调用方自行用 `node:crypto` 对 `reviewEntriesFingerprintInput()` 的结果取哈希。
 */

/** 机器预筛档位（唯一枚举真源在 `lib/v2-content/bar-fit.ts`，此处按结构登记以保持零依赖）。 */
export type MachineVerdict = "PASS" | "SUSPECT" | "HARD_FAIL_PATTERN";

/** 独立审查定档（`humanBarFit` 为历史兼容字段名，不代表 reviewer 必然是 Human）。 */
export type FixedHumanBarFit = "UNREVIEWED" | "PASS" | "BORDERLINE" | "FAIL";

export const MACHINE_VERDICTS: readonly MachineVerdict[] = ["PASS", "SUSPECT", "HARD_FAIL_PATTERN"];
export const FIXED_HUMAN_BAR_FITS: readonly FixedHumanBarFit[] = ["UNREVIEWED", "PASS", "BORDERLINE", "FAIL"];

/** 逐卡机器档位行（唯一来源：`BAR-FIT-AUDIT.json` canonical 全量集的 `rows`）。 */
export interface VerdictRow {
  cardId: string;
  machineVerdict: MachineVerdict;
}

/** 逐卡审查条目（结构镜像审查输入的 `entries[cardId]`）。 */
export interface ReviewEntry {
  reviewed: boolean;
  humanBarFit: FixedHumanBarFit;
  note: string;
}

/** 一组机器档位的计数（`total` 必须等于三项之和）。 */
export interface VerdictTally {
  total: number;
  PASS: number;
  SUSPECT: number;
  HARD_FAIL_PATTERN: number;
}

/** 带人读留痕的一组汇总（写进审查输入）。 */
export interface VerdictGroupSummary extends VerdictTally {
  scope: string;
  source: string;
  note: string;
}

/** `packMachineVerdictSummary`：父级自洽 ＋ `groups` 各组自洽。 */
export interface PackVerdictSummary extends VerdictTally {
  scope: string;
  source: string;
  note: string;
  groups: Readonly<Record<string, VerdictGroupSummary>>;
}

/** 审查输入的完整形态（`entries` ＋ 两个机器档位汇总对象）。 */
export interface ReviewInputPayload {
  source: string;
  reviewedAt: string;
  reviewerKind: string;
  note: string;
  entries: Readonly<Record<string, ReviewEntry>>;
  packMachineVerdictSummary: PackVerdictSummary;
  libraryMachineVerdictSummary: VerdictGroupSummary;
  generatedBy: string;
}

/** TRUTH 内容包的两个分组键（`packMachineVerdictSummary.groups` 的固定键）。 */
export const TRUTH_FIRST_PACK_GROUP = "truthFirstPack";
export const TRUTH_BOOTSTRAP_GROUP = "truthBootstrap";

/**
 * 扩展脚本追加语里的人类可读标记（幂等锚点）。
 *
 * 追加类脚本必须**幂等**：反复重跑不得把「R3 追加」这段话叠成两遍
 * （旧版每跑一次 `reviewedAt` 就多一截）。追加前先 `stripAppendedSuffix()` 砍掉旧追加段。
 */
export const R3_APPEND_MARK = "R3 追加";

/**
 * 砍掉上一次追加的 R3 段落，回到「人写的原文」。没有该标记时原样返回。
 * 只按**首次**出现位置切分：即使历史上被叠了多遍，也能一次清干净。
 */
export function stripAppendedSuffix(text: string): string {
  const index = text.indexOf(R3_APPEND_MARK);
  if (index === -1) return text;
  return text.slice(0, index).replace(/[｜\s（(【]+$/u, "").trimEnd();
}

/**
 * 从逐卡机器档位行算出某组计数（**汇总的唯一算法**）。
 *
 * `ids` 里任一 cardId 在 `rows` 里缺行即抛错——这是「汇总必须来自逐卡数据、禁止手填」的
 * fail-closed 落点：没有逐卡证据就不许出现数字。
 */
export function tallyVerdicts(rows: readonly VerdictRow[], ids: readonly string[]): VerdictTally {
  const byId = new Map(rows.map((row) => [row.cardId, row.machineVerdict]));
  const tally: VerdictTally = { total: ids.length, PASS: 0, SUSPECT: 0, HARD_FAIL_PATTERN: 0 };
  for (const id of ids) {
    const verdict = byId.get(id);
    if (!verdict) throw new Error(`机器档位逐卡数据缺 ${id}：汇总必须从逐卡数据计算，禁止手填`);
    if (!MACHINE_VERDICTS.includes(verdict)) throw new Error(`${id}: 非法 machineVerdict ${JSON.stringify(verdict)}`);
    tally[verdict] += 1;
  }
  return tally;
}

/** 一组计数是否自洽：`total === PASS + SUSPECT + HARD_FAIL_PATTERN`。 */
export function isTallySelfConsistent(tally: VerdictTally): boolean {
  return tally.total === tally.PASS + tally.SUSPECT + tally.HARD_FAIL_PATTERN;
}

/** 构造一组汇总（数字一律来自 `tallyVerdicts`）。 */
export function buildGroupSummary(
  scope: string,
  source: string,
  note: string,
  rows: readonly VerdictRow[],
  ids: readonly string[],
): VerdictGroupSummary {
  return { scope, ...tallyVerdicts(rows, ids), source, note };
}

/**
 * 构造 `packMachineVerdictSummary`：父级数字 = 各子组逐项之和（父级**不单独手填**）。
 * 父级 `scope` / `note` 由调用方给，数字由 `groups` 汇总而来。
 */
export function buildPackSummary(
  scope: string,
  source: string,
  note: string,
  groups: Readonly<Record<string, VerdictGroupSummary>>,
): PackVerdictSummary {
  const tally: VerdictTally = { total: 0, PASS: 0, SUSPECT: 0, HARD_FAIL_PATTERN: 0 };
  for (const group of Object.values(groups)) {
    tally.total += group.total;
    tally.PASS += group.PASS;
    tally.SUSPECT += group.SUSPECT;
    tally.HARD_FAIL_PATTERN += group.HARD_FAIL_PATTERN;
  }
  return { scope, ...tally, source, note, groups };
}

/**
 * 逐卡条目指纹的**输入串**（稳定序列化，与对象字面量 key 顺序无关）。
 * 调用方对返回值取 sha256 即得「既有结论未被改动」的指纹。
 */
export function reviewEntriesFingerprintInput(
  entries: Readonly<Record<string, ReviewEntry>>,
  ids: readonly string[],
): string {
  const sorted = [...ids].sort();
  return JSON.stringify(
    sorted.map((id) => {
      const entry = entries[id];
      if (!entry) throw new Error(`指纹输入缺 entry：${id}`);
      return [id, entry.reviewed, entry.humanBarFit, entry.note];
    }),
  );
}

/**
 * 既有第一包 24 条结论的冻结指纹（sha256 of `reviewEntriesFingerprintInput(entries, FIRST_PACK_IDS)`）。
 * 生成脚本与单测都拿它做「既有 24 条一字未改」的锁：对不上即拒绝写盘 / 测试变红。
 *
 * 变更流程：只有 review 角色重审改结论时，才允许连同本常量一起更新（同时须记 HANDOFF）。
 */
export const FIRST_PACK_REVIEW_ENTRIES_SHA256 =
  "84846ed120f3fadd8257dd9d071b406527b714e13b764125fff4772f9d17e202";

/** 自校验期待值：候选卡清单（分组）＋整库卡清单＋逐卡机器档位行。 */
export interface ReviewSelfCheckExpectation {
  /** 审查输入应覆盖的全部候选卡（当前 = 第一包 24 + Bootstrap 7 = 31）。 */
  expectedCardIds: readonly string[];
  /** TRUTH 第一包分组（`TRUTH_FIRST_PACK_GROUP`）。 */
  firstPackIds: readonly string[];
  /** TRUTH Bootstrap 候选分组（`TRUTH_BOOTSTRAP_GROUP`）。 */
  bootstrapIds: readonly string[];
  /** 整库（`libraryMachineVerdictSummary` 的集合，当前 421）。 */
  libraryIds: readonly string[];
  /** 机器档位逐卡行（canonical 口径，整库覆盖）。 */
  verdictRows: readonly VerdictRow[];
}

export interface ReviewSelfCheckItem {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface ReviewSelfCheckResult {
  ok: boolean;
  items: ReviewSelfCheckItem[];
  violations: string[];
}

/** 统计每个 cardId 作为 `entries` 键出现的次数（用于抓 JSON 重复键——`JSON.parse` 会静默吞掉重复键）。 */
export function countEntryKeyOccurrences(rawJson: string, ids: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of ids) {
    const pattern = new RegExp(`"${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`, "g");
    counts[id] = (rawJson.match(pattern) ?? []).length;
  }
  return counts;
}

const sortedIds = (ids: readonly string[]): string[] => [...ids].sort();

/**
 * 审查输入结构自校验（四条；任一条不成立即 `ok=false`，脚本据此非零退出）。
 *
 * 1. `entries-count`：逐卡条目数 = 候选总数（且键集恰为候选集，不多不少）。
 * 2. `card-id-unique`：cardId 唯一（给了 `rawJson` 时按磁盘原文数键出现次数，抓 JSON 重复键）。
 * 3. `reviewed-consistency`：每条 `reviewed === (humanBarFit !== "UNREVIEWED")`，且定档在枚举内。
 * 4. `summary-self-consistent`：各组 `total = PASS + SUSPECT + HARD_FAIL_PATTERN`；
 *    各组数字 == 由逐卡行重算的值；`packMachineVerdictSummary` 父级 == 各子组之和。
 */
export function checkReviewInput(
  payload: ReviewInputPayload,
  expectation: ReviewSelfCheckExpectation,
  rawJson?: string,
): ReviewSelfCheckResult {
  const items: ReviewSelfCheckItem[] = [];
  const entries = payload.entries;
  const entryIds = Object.keys(entries);
  const expected = sortedIds(expectation.expectedCardIds);

  /* ① 逐卡条目数 = 候选总数（键集也必须恰好相等，防「数量对但换了卡」） */
  {
    const actual = sortedIds(entryIds);
    const sameSet = actual.length === expected.length && actual.every((id, index) => id === expected[index]);
    const ok = entryIds.length === expected.length && sameSet;
    items.push({
      id: "entries-count",
      label: "逐卡条目数 = 候选总数",
      ok,
      detail: ok
        ? `entries ${entryIds.length} / 候选 ${expected.length}（键集一致）`
        : `entries ${entryIds.length} / 候选 ${expected.length}；仅 entries 有 ${actual.filter((id) => !expected.includes(id)).join(",") || "—"}；仅候选有 ${expected.filter((id) => !actual.includes(id)).join(",") || "—"}`,
    });
  }

  /* ② cardId 唯一 */
  {
    const duplicates: string[] = [];
    if (rawJson !== undefined) {
      const counts = countEntryKeyOccurrences(rawJson, expected);
      for (const id of expected) if (counts[id] !== 1) duplicates.push(`${id}×${counts[id]}`);
    }
    const uniqueOk = new Set(entryIds).size === entryIds.length;
    const ok = duplicates.length === 0 && uniqueOk;
    items.push({
      id: "card-id-unique",
      label: "cardId 唯一",
      ok,
      detail: ok
        ? rawJson === undefined
          ? `entries 键 ${entryIds.length} 个，无重复`
          : `磁盘原文里 ${expected.length} 个候选 cardId 键各出现 1 次`
        : `重复/异常：${duplicates.join(",") || "无（原文）"}；内存键重复=${!uniqueOk}`,
    });
  }

  /* ③ reviewed 与 humanBarFit 自洽 */
  {
    const bad: string[] = [];
    for (const [cardId, entry] of Object.entries(entries)) {
      if (entry.reviewed !== (entry.humanBarFit !== "UNREVIEWED")) bad.push(`${cardId}(reviewed=${entry.reviewed},humanBarFit=${entry.humanBarFit})`);
      if (!FIXED_HUMAN_BAR_FITS.includes(entry.humanBarFit)) bad.push(`${cardId}(非法定档 ${JSON.stringify(entry.humanBarFit)})`);
    }
    items.push({
      id: "reviewed-consistency",
      label: "每条 reviewed === (humanBarFit !== \"UNREVIEWED\")",
      ok: bad.length === 0,
      detail: bad.length === 0 ? `${Object.keys(entries).length} 条全部自洽` : bad.join("；"),
    });
  }

  /* ④ 各汇总组求和自洽（数字必须等于逐卡行重算值） */
  {
    const bad: string[] = [];
    const { firstPackIds, bootstrapIds, libraryIds } = expectation;
    const expectedGroups: Record<string, readonly string[]> = {
      [TRUTH_FIRST_PACK_GROUP]: firstPackIds,
      [TRUTH_BOOTSTRAP_GROUP]: bootstrapIds,
    };
    const pack = payload.packMachineVerdictSummary;
    const groupKeys = Object.keys(pack.groups ?? {});
    for (const key of Object.keys(expectedGroups)) {
      if (!groupKeys.includes(key)) bad.push(`缺分组 ${key}`);
    }
    for (const key of groupKeys) {
      const group = pack.groups[key]!;
      const ids = expectedGroups[key];
      if (!ids) {
        bad.push(`多余分组 ${key}`);
        continue;
      }
      if (!isTallySelfConsistent(group)) bad.push(`${key} 求和不自洽：${group.total} ≠ ${group.PASS}+${group.SUSPECT}+${group.HARD_FAIL_PATTERN}`);
      const recomputed = tallyVerdicts(expectation.verdictRows, ids);
      if (JSON.stringify(recomputed) !== JSON.stringify({ total: group.total, PASS: group.PASS, SUSPECT: group.SUSPECT, HARD_FAIL_PATTERN: group.HARD_FAIL_PATTERN })) {
        bad.push(`${key} 与逐卡重算不符：产物 ${JSON.stringify(group)} ≠ 重算 ${JSON.stringify(recomputed)}`);
      }
    }
    // 父级 = 各子组之和
    const sum = Object.values(pack.groups ?? {}).reduce(
      (acc, group) => ({
        total: acc.total + group.total,
        PASS: acc.PASS + group.PASS,
        SUSPECT: acc.SUSPECT + group.SUSPECT,
        HARD_FAIL_PATTERN: acc.HARD_FAIL_PATTERN + group.HARD_FAIL_PATTERN,
      }),
      { total: 0, PASS: 0, SUSPECT: 0, HARD_FAIL_PATTERN: 0 },
    );
    if (JSON.stringify(sum) !== JSON.stringify({ total: pack.total, PASS: pack.PASS, SUSPECT: pack.SUSPECT, HARD_FAIL_PATTERN: pack.HARD_FAIL_PATTERN })) {
      bad.push(`packMachineVerdictSummary 父级 ≠ 各子组之和：产物 ${JSON.stringify({ total: pack.total, PASS: pack.PASS, SUSPECT: pack.SUSPECT, HARD_FAIL_PATTERN: pack.HARD_FAIL_PATTERN })} ≠ 求和 ${JSON.stringify(sum)}`);
    }
    if (!isTallySelfConsistent(pack)) bad.push(`packMachineVerdictSummary 求和不自洽：${pack.total} ≠ ${pack.PASS}+${pack.SUSPECT}+${pack.HARD_FAIL_PATTERN}`);
    // library 组
    const library = payload.libraryMachineVerdictSummary;
    if (!isTallySelfConsistent(library)) bad.push(`library 求和不自洽：${library.total} ≠ ${library.PASS}+${library.SUSPECT}+${library.HARD_FAIL_PATTERN}`);
    const recomputedLibrary = tallyVerdicts(expectation.verdictRows, libraryIds);
    if (JSON.stringify(recomputedLibrary) !== JSON.stringify({ total: library.total, PASS: library.PASS, SUSPECT: library.SUSPECT, HARD_FAIL_PATTERN: library.HARD_FAIL_PATTERN })) {
      bad.push(`library 与逐卡重算不符：产物 ${JSON.stringify(library)} ≠ 重算 ${JSON.stringify(recomputedLibrary)}`);
    }
    items.push({
      id: "summary-self-consistent",
      label: "各汇总组求和自洽（且 == 逐卡重算）",
      ok: bad.length === 0,
      detail: bad.length === 0
        ? `pack 父级 ${pack.total} = ${Object.keys(pack.groups ?? {}).join(" + ")} 之和；library ${library.total}；均与逐卡重算一致`
        : bad.join("；"),
    });
  }

  const violations = items.filter((item) => !item.ok).map((item) => `[${item.id}] ${item.label} → ${item.detail}`);
  return { ok: violations.length === 0, items, violations };
}
