import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FORMAL_TRUTH_BOOTSTRAP_CARDS } from "@/lib/v2-content/formal-truth-bootstrap-pack";
import { FORMAL_TRUTH_CARDS } from "@/lib/v2-content/formal-truth-pack";
import {
  FIRST_PACK_REVIEW_ENTRIES_SHA256,
  R3_APPEND_MARK,
  TRUTH_BOOTSTRAP_GROUP,
  TRUTH_FIRST_PACK_GROUP,
  checkReviewInput,
  reviewEntriesFingerprintInput,
  stripAppendedSuffix,
  tallyVerdicts,
  type ReviewEntry,
  type ReviewInputPayload,
  type ReviewSelfCheckExpectation,
  type VerdictRow,
} from "@/lib/v2-content/bar-fit-review-input";

/**
 * R3｜独立审查输入（`docs/qa/content-audit-v2/BAR-FIT-HUMAN-REVIEW.json`）结构自校验。
 *
 * 本文件锁死四件事（Human 本轮新硬规则）：
 * ① 逐卡条目数 = 候选总数；② cardId 唯一；③ 每条 `reviewed === (humanBarFit !== "UNREVIEWED")`；
 * ④ 各汇总组求和自洽（且**必须等于由逐卡数据重算的值**，防手填）。
 * 外加两条护栏：既有第一包 24 条结论指纹冻结（一字未改）；Bootstrap 7 张的独立复判结论已回填
 * （一律 PASS / reviewed=true，且 note 不得退回占位语）。
 *
 * 反例是**构造性**的：篡改一份汇总 / 条目使其不自洽，自校验必须报错（不报错即本测试变红）。
 */

const REVIEW_PATH = "docs/qa/content-audit-v2/BAR-FIT-HUMAN-REVIEW.json";
const AUDIT_PATH = "docs/qa/content-audit-v2/BAR-FIT-AUDIT.json";

const rawReview = readFileSync(join(process.cwd(), REVIEW_PATH), "utf8");
const review = JSON.parse(rawReview) as ReviewInputPayload;

const audit = JSON.parse(readFileSync(join(process.cwd(), AUDIT_PATH), "utf8")) as {
  sets: { frozenFixed414: { cardCount: number; forensic: boolean; admissionEligible: boolean; rows: VerdictRow[] } };
};
const verdictRows: readonly VerdictRow[] = audit.sets.frozenFixed414.rows;

const FIRST_PACK_IDS = FORMAL_TRUTH_CARDS.map((card) => card.cardId);
const BOOTSTRAP_IDS = FORMAL_TRUTH_BOOTSTRAP_CARDS.map((card) => card.cardId);
const CANDIDATE_IDS = [...FIRST_PACK_IDS, ...BOOTSTRAP_IDS];

const expectation: ReviewSelfCheckExpectation = {
  expectedCardIds: CANDIDATE_IDS,
  firstPackIds: FIRST_PACK_IDS,
  bootstrapIds: BOOTSTRAP_IDS,
  libraryIds: verdictRows.map((row) => row.cardId),
  verdictRows,
};

const clone = (): ReviewInputPayload => JSON.parse(JSON.stringify(review)) as ReviewInputPayload;
const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");

describe("R3｜审查输入结构自校验四条（真产物）", () => {
  it("四条自校验全过（条目数 / cardId 唯一 / reviewed 自洽 / 汇总自洽）", () => {
    const result = checkReviewInput(review, expectation, rawReview);
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.items.map((item) => item.id)).toEqual([
      "entries-count",
      "card-id-unique",
      "reviewed-consistency",
      "summary-self-consistent",
    ]);
    for (const item of result.items) expect(item.ok, `${item.id}: ${item.detail}`).toBe(true);
  });

  it("① 逐卡条目数 = 候选总数；键集恰为「第一包 24 + Bootstrap 7」", () => {
    expect(Object.keys(review.entries)).toHaveLength(CANDIDATE_IDS.length);
    expect(Object.keys(review.entries).sort()).toEqual([...CANDIDATE_IDS].sort());
    // 数量从内容源派生，不写死。
    expect(CANDIDATE_IDS.length).toBe(FORMAL_TRUTH_CARDS.length + FORMAL_TRUTH_BOOTSTRAP_CARDS.length);
  });

  it("② cardId 唯一：磁盘原文里每个候选 cardId 键出现且仅出现一次", () => {
    for (const id of CANDIDATE_IDS) {
      const pattern = new RegExp(`"${id}"\\s*:`, "g");
      expect(rawReview.match(pattern) ?? [], `${id} 键出现次数`).toHaveLength(1);
    }
    // 顺序：既有 24 条保持原序，Bootstrap 7 张按 cardId 升序追加在末尾。
    expect(Object.keys(review.entries)).toEqual(CANDIDATE_IDS);
  });

  it("③ 每条 reviewed === (humanBarFit !== \"UNREVIEWED\")", () => {
    for (const [cardId, entry] of Object.entries(review.entries)) {
      expect(entry.reviewed, cardId).toBe(entry.humanBarFit !== "UNREVIEWED");
    }
  });

  it("④ 各汇总组求和自洽，且数字 == 由逐卡机器档位重算（不是手填）", () => {
    const pack = review.packMachineVerdictSummary;
    for (const [key, group] of Object.entries(pack.groups)) {
      expect(group.total, key).toBe(group.PASS + group.SUSPECT + group.HARD_FAIL_PATTERN);
    }
    // 父级 = 各子组之和
    const sum = Object.values(pack.groups).reduce(
      (acc, group) => ({
        total: acc.total + group.total,
        PASS: acc.PASS + group.PASS,
        SUSPECT: acc.SUSPECT + group.SUSPECT,
        HARD_FAIL_PATTERN: acc.HARD_FAIL_PATTERN + group.HARD_FAIL_PATTERN,
      }),
      { total: 0, PASS: 0, SUSPECT: 0, HARD_FAIL_PATTERN: 0 },
    );
    expect({ total: pack.total, PASS: pack.PASS, SUSPECT: pack.SUSPECT, HARD_FAIL_PATTERN: pack.HARD_FAIL_PATTERN }).toEqual(sum);
    // 每组数字必须等于逐卡重算值（手填一个数字就会被这条抓住）
    expect(tallyVerdicts(verdictRows, FIRST_PACK_IDS)).toEqual({
      total: pack.groups[TRUTH_FIRST_PACK_GROUP]!.total,
      PASS: pack.groups[TRUTH_FIRST_PACK_GROUP]!.PASS,
      SUSPECT: pack.groups[TRUTH_FIRST_PACK_GROUP]!.SUSPECT,
      HARD_FAIL_PATTERN: pack.groups[TRUTH_FIRST_PACK_GROUP]!.HARD_FAIL_PATTERN,
    });
    expect(tallyVerdicts(verdictRows, BOOTSTRAP_IDS)).toEqual({
      total: pack.groups[TRUTH_BOOTSTRAP_GROUP]!.total,
      PASS: pack.groups[TRUTH_BOOTSTRAP_GROUP]!.PASS,
      SUSPECT: pack.groups[TRUTH_BOOTSTRAP_GROUP]!.SUSPECT,
      HARD_FAIL_PATTERN: pack.groups[TRUTH_BOOTSTRAP_GROUP]!.HARD_FAIL_PATTERN,
    });
    // library 组 = 整库 canonical 全量（当前 421），数字同样来自逐卡重算
    expect(review.libraryMachineVerdictSummary.total).toBe(verdictRows.length);
    expect(review.libraryMachineVerdictSummary.total).toBe(audit.sets.frozenFixed414.cardCount);
    expect(tallyVerdicts(verdictRows, expectation.libraryIds)).toEqual({
      total: review.libraryMachineVerdictSummary.total,
      PASS: review.libraryMachineVerdictSummary.PASS,
      SUSPECT: review.libraryMachineVerdictSummary.SUSPECT,
      HARD_FAIL_PATTERN: review.libraryMachineVerdictSummary.HARD_FAIL_PATTERN,
    });
    // 两个自洽对象（pack / library）各留一个独立 total，禁止拍平成一个求和对象
    expect(review.packMachineVerdictSummary.total).not.toBe(review.libraryMachineVerdictSummary.total);
  });
});

describe("R3｜Bootstrap 7 张：结论已由独立 reviewer 回填、身份如实", () => {
  it("Bootstrap 7 张一律 humanBarFit=PASS / reviewed=true（B5 复判后）", () => {
    for (const id of BOOTSTRAP_IDS) {
      const entry = review.entries[id];
      expect(entry, `${id} 缺 entry`).toBeDefined();
      expect(entry!.humanBarFit, id).toBe("PASS");
      expect(entry!.reviewed, id).toBe(true);
      expect(entry!.note, `${id} 结论不得是占位语`).not.toContain("待独立 reviewer 填写");
      expect(entry!.note.length, `${id} 结论必须写明真实理由`).toBeGreaterThan(40);
    }
    // 结论逐条只出现一次，且分布恰为 PASS 7 / BORDERLINE 0 / FAIL 0
    const fits = BOOTSTRAP_IDS.map((id) => review.entries[id]!.humanBarFit);
    expect(fits).toEqual(["PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS"]);
  });

  it("首轮判 BORDERLINE 的 3 张（226/228/230）note 必须写明「由 BORDERLINE 升 PASS」的复判依据", () => {
    for (const id of ["PN-TRUTH-226", "PN-TRUTH-228", "PN-TRUTH-230"]) {
      expect(review.entries[id]!.note, id).toContain("BORDERLINE");
      expect(review.entries[id]!.note, id).toContain("REVIEW-BOOTSTRAP-7-RECHECK.md");
    }
    // 首轮即 PASS 的 4 张引用第一轮报告
    for (const id of ["PN-TRUTH-225", "PN-TRUTH-227", "PN-TRUTH-229", "PN-TRUTH-231"]) {
      expect(review.entries[id]!.note, id).toContain("第一轮即 PASS");
    }
  });

  it("7 张机器档位由逐卡数据得出（全部 PASS），但机器档位不是定档依据", () => {
    const tally = tallyVerdicts(verdictRows, BOOTSTRAP_IDS);
    expect(tally).toEqual({ total: 7, PASS: 7, SUSPECT: 0, HARD_FAIL_PATTERN: 0 });
    // 定档来源必须在文本里可辨：复判报告 + 「机器档位不是本次定档的依据」
    expect(review.note).toContain("不是**本次定档的依据");
  });

  it("reviewerKind 保持合法值 ai-role（身份如实，不冒充 human）", () => {
    expect(review.reviewerKind).toBe("ai-role");
    expect(review.source).toContain("Bootstrap 7 张（PN-TRUTH-225~231）经两轮独立审查");
    expect(review.source).toContain("第一轮 PASS 4 / BORDERLINE 3");
    expect(review.source).toContain("复判 PASS 7");
    expect(review.reviewedAt).toContain("Bootstrap 7 张经两轮独立审查");
    expect(review.reviewedAt).toContain("第一轮 PASS 4 / BORDERLINE 3");
    expect(review.reviewedAt).toContain("复判 PASS 7");
  });

  it("R3 追加语幂等：source / reviewedAt / note 里的标记各出现且仅出现一次（重跑不叠字）", () => {
    for (const [field, text] of [
      ["source", review.source],
      ["reviewedAt", review.reviewedAt],
      ["note", review.note],
    ] as const) {
      expect(text.split(R3_APPEND_MARK).length - 1, field).toBe(1);
      expect(stripAppendedSuffix(text), field).not.toContain(R3_APPEND_MARK);
    }
    // 砍掉追加段是幂等的：即使历史上被叠了两遍，一次也能清干净（旧版 bug 的回归锁）
    const doubled = `${stripAppendedSuffix(review.source)} ｜ 【${R3_APPEND_MARK}】旧追加段 ｜ 【${R3_APPEND_MARK}】新追加段`;
    expect(stripAppendedSuffix(doubled)).toBe(stripAppendedSuffix(review.source));
    expect(stripAppendedSuffix(stripAppendedSuffix(doubled))).toBe(stripAppendedSuffix(review.source));
  });
});

describe("R3｜既有第一包 24 条结论：指纹锁定（一字未改）", () => {
  it("24 条 entries 指纹 === 冻结常量", () => {
    const fingerprint = sha256(reviewEntriesFingerprintInput(review.entries, FIRST_PACK_IDS));
    expect(fingerprint).toBe(FIRST_PACK_REVIEW_ENTRIES_SHA256);
  });

  it("24 条仍全部 reviewed=true / humanBarFit=PASS（Formal 准入不因此漂移）", () => {
    const pass = FIRST_PACK_IDS.filter((id) => review.entries[id]!.reviewed && review.entries[id]!.humanBarFit === "PASS");
    expect(pass).toEqual(FIRST_PACK_IDS);
  });
});

describe("R3｜构造性反例：篡改使其不自洽 ⇒ 自校验必须变红", () => {
  it("篡改 library 汇总（total+1）⇒ summary-self-consistent 失败", () => {
    const tampered = clone();
    tampered.libraryMachineVerdictSummary = {
      ...tampered.libraryMachineVerdictSummary,
      total: tampered.libraryMachineVerdictSummary.total + 1,
    };
    const result = checkReviewInput(tampered, expectation, JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    expect(result.violations.join("\n")).toContain("summary-self-consistent");
  });

  it("篡改某分组数字（truthBootstrap.SUSPECT+1，total 不变）⇒ 与逐卡重算不符", () => {
    const tampered = clone();
    const group = tampered.packMachineVerdictSummary.groups[TRUTH_BOOTSTRAP_GROUP]!;
    tampered.packMachineVerdictSummary.groups = {
      ...tampered.packMachineVerdictSummary.groups,
      [TRUTH_BOOTSTRAP_GROUP]: { ...group, PASS: group.PASS - 1, SUSPECT: group.SUSPECT + 1 },
    };
    const result = checkReviewInput(tampered, expectation, JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    expect(result.violations.join("\n")).toContain("truthBootstrap");
  });

  it("篡改父级使其 ≠ 子组之和 ⇒ 父级求和失败", () => {
    const tampered = clone();
    tampered.packMachineVerdictSummary = { ...tampered.packMachineVerdictSummary, PASS: 999 };
    const result = checkReviewInput(tampered, expectation, JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    expect(result.violations.join("\n")).toContain("summary-self-consistent");
  });

  it("篡改某条 reviewed（UNREVIEWED 却 reviewed=true）⇒ reviewed-consistency 失败", () => {
    const tampered = clone();
    tampered.entries = { ...tampered.entries, [BOOTSTRAP_IDS[0]!]: { reviewed: true, humanBarFit: "UNREVIEWED", note: "篡改" } };
    const result = checkReviewInput(tampered, expectation, JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    expect(result.violations.join("\n")).toContain("reviewed-consistency");
  });

  it("删掉一条 entries ⇒ entries-count 失败", () => {
    const tampered = clone();
    const dropped = BOOTSTRAP_IDS[BOOTSTRAP_IDS.length - 1]!;
    const rest: Record<string, ReviewEntry> = {};
    for (const [id, entry] of Object.entries(tampered.entries)) if (id !== dropped) rest[id] = entry;
    tampered.entries = rest;
    const result = checkReviewInput(tampered, expectation, JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    expect(result.violations.join("\n")).toContain("entries-count");
  });

  it("原文出现重复 cardId 键 ⇒ card-id-unique 失败（JSON.parse 会静默吞键）", () => {
    const dup = review.entries[BOOTSTRAP_IDS[0]!]!;
    const injected = rawReview.replace(
      `"${BOOTSTRAP_IDS[1]}": {`,
      `"${BOOTSTRAP_IDS[0]}": ${JSON.stringify(dup)},\n    "${BOOTSTRAP_IDS[1]}": {`,
    );
    expect(injected).not.toBe(rawReview);
    const result = checkReviewInput(JSON.parse(injected) as ReviewInputPayload, expectation, injected);
    expect(result.ok).toBe(false);
    expect(result.violations.join("\n")).toContain("card-id-unique");
  });

  it("对照：未篡改的真产物经同一条校验路径 ⇒ ok=true（证明上面抓的是篡改而非误报）", () => {
    expect(checkReviewInput(clone(), expectation, rawReview).ok).toBe(true);
  });
});
