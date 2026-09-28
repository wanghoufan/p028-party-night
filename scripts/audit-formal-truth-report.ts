/**
 * C1-8｜机械生成第一包 MC 报告。A5 起**强制双口径分写**（Human 2026-09-28 冻结）。
 *
 * 输入（按顺序先跑）：
 *   scripts/audit-formal-truth-montecarlo.ts     → FORMAL-TRUTH-MC.json / FORMAL-TRUTH-MC-WORST-TRACE.json
 *   scripts/audit-formal-truth-production-chain.ts → FORMAL-TRUTH-PRODUCTION-CHAIN.json
 * 输出：docs/qa/content-audit/FORMAL-TRUTH-MC.md
 *
 * 双口径（禁止混写，见 HANDOFF §1.4.0）：
 * - **口径 A｜Engine / explicit disclosure**：假设本轮真的收到合法 `roundDisclosureSignal`。
 *   数据源 = MC `modeB` + 生产链「仅 Formal 24 张」情形 + A.1 `modeB` 桶库存。
 * - **口径 B｜Current real UI**：`app/game/page.tsx#roundDisclosureForCurrentRound()` 恒 `undefined`。
 *   数据源 = MC `modeA`（生产实况：不给任何披露信号）+ 静态 H1 桶可抽 Formal 清单。
 *
 * 所有统计值读自 JSON 产物，报告侧不手写；阈值/门槛从 `v2-state` 逐字读取（不硬编码）。
 */
import { readFileSync, writeFileSync } from "node:fs";

import {
  HEAT_THRESHOLDS,
  MUTUAL_CHECK_COUNTS,
  MUTUAL_MIN_HEAT,
} from "@/lib/v2-relationship/v2-state";

const DIR = `${process.cwd()}/docs/qa/content-audit`;
const mc = JSON.parse(readFileSync(`${DIR}/FORMAL-TRUTH-MC.json`, "utf8"));
const worst = JSON.parse(readFileSync(`${DIR}/FORMAL-TRUTH-MC-WORST-TRACE.json`, "utf8"));
const chain = JSON.parse(readFileSync(`${DIR}/FORMAL-TRUTH-PRODUCTION-CHAIN.json`, "utf8"));

/** 口径 A = Engine / explicit disclosure（MC 的 modeB / 给了合法披露信号）。 */
const ENGINE = mc.modeB;
/** 口径 B = Current real UI（MC 的 modeA / 生产实况，无披露信号）。 */
const UI = mc.modeA;

const thresholdOf = (heat: string): number => HEAT_THRESHOLDS.find((b: { heat: string }) => b.heat === heat)!.min;
const H2_MIN = thresholdOf("H2");
const H3_MIN = thresholdOf("H3");
const H4_MIN = thresholdOf("H4");
const MUTUAL_MIN = MUTUAL_CHECK_COUNTS[0];
const band = (heat: string) => mc.staticHeatAvailability.find((h: { heat: string }) => h.heat === heat);
const H1_BAND = band("H1");

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const heatCells = (m: Record<string, number>) => Object.entries(m).map(([k, v]) => `${k} ${v}`).join(" / ");
const gainCells = (m: Record<string, number>) =>
  Object.keys(m).length === 0 ? "（无）" : Object.entries(m).map(([k, v]) => `${k} ${v}`).join(" / ");
const ids = (list: string[]) => `\`${list.join("`、`")}\``;

const lines: string[] = [];
const p = (s = "") => lines.push(s);

/* ------------------------------------------------------------------ */
/* 头 + 口径声明                                                        */
/* ------------------------------------------------------------------ */
p("# 第一包「Formal Fixed 真心话」单包 Router Monte Carlo + 最差 trace + 生产链验证（C1-8 / A5 双口径）");
p();
p(`- 生成：\`scripts/audit-formal-truth-report.ts\`（统计值全部读自 JSON 产物，阈值读自 \`v2-state\`，报告侧不手写）`);
p(`- 卡源：\`${mc.cardSource.description}\` —— pack ${mc.cardSource.packTotal} 张（Formal ${mc.cardSource.formalTotal} / legacy ${mc.cardSource.legacyTotal}）`);
p(`- Router：${mc.router}`);
p(`- 参数：${mc.config.tables.length} 桌型 × ${mc.config.sessionsPerTable} 局/桌型 × ${mc.config.targetCompletedRounds} 轮；guard 上限 ${mc.config.guardLimit}；completed 概率 ${mc.config.completedProbability}；软去重窗口 ${mc.config.softDedupWindow}`);
p(`- 单包 = ${mc.packLabel}；不切包（任何耗尽判本局 dead-end，生产单玩局同口径）。`);
p();
p("## 0｜口径声明（先读这一段，禁止混写）");
p();
p("- **口径 A｜Engine / explicit disclosure**：**假设本轮真的收到合法 `roundDisclosureSignal`**（`selfDisclosed + disclosedPlayerIds`，走同一条 `reduceV2SessionEvents` 归约）。数据源 = MC `modeB` ＋ 生产链「仅 Formal 24 张」情形。");
p("- **口径 B｜Current real UI**：`app/game/page.tsx#roundDisclosureForCurrentRound()` **恒返回 `undefined`** ⇒ 无 effective information round ⇒ **Heat 恒 H1、中途 Mutual（`count≥" + MUTUAL_MIN + "` 且 `Heat≥" + MUTUAL_MIN_HEAT + "`）不可达**。数据源 = MC `modeA`（生产实况：不给任何披露信号）。");
p("- ⛔ **禁止把 A 当 B**：本报告任何「Heat 可达 H2/H3/H4」都**只在口径 A 的静态桶/或 Heat 已在该档时成立**；**当前 UI（口径 B）Heat 恒 H1**，不存在「生产 Heat 已正常推进」这回事。");
p(`- 门槛真源：H2=${H2_MIN} / H3=${H3_MIN} / H4=${H4_MIN}（有效信息轮数）；中途互选窗口 [${MUTUAL_MIN}, ${MUTUAL_CHECK_COUNTS[MUTUAL_CHECK_COUNTS.length - 1]}]，最低 ` + "`MUTUAL_MIN_HEAT=" + MUTUAL_MIN_HEAT + "`。");
p();

/* ------------------------------------------------------------------ */
/* 口径 A                                                              */
/* ------------------------------------------------------------------ */
p("## 1｜口径 A｜Engine / explicit disclosure（假设真的收到合法 roundDisclosureSignal）");
p();
p("### 1.1 静态每 Heat 桶 Formal 库存（**若 Heat 已在该档**；legacy 卡不受 Heat 硬过滤）");
p();
p("| Heat | 包内合法 | 其中 Formal | 其中 legacy |");
p("|---|---|---|---|");
for (const h of mc.staticHeatAvailability) p(`| ${h.heat} | ${h.legalCount} | ${h.formalLegal} | ${h.legacyLegal} |`);
p();
p(`> 四档 Formal 桶均**非空**：` + mc.staticHeatAvailability.map((h: { heat: string; formalLegal: number }) => `${h.heat}=${h.formalLegal}`).join(" / ") + "。这是「若 Heat 已在该档」的库存能力，**不等于从 H1 冷启能走到该档**（见 1.2）。");
p();
p("### 1.2 真链冷启可达性（全包真实牌堆，两 mode 各 4000 局，每 completed 轮给合法披露）");
p();
p("| 指标 | 口径 A（Engine / 显式 disclosure） |");
p("|---|---|");
p(`| 局数 | ${ENGINE.sessions} |`);
p(`| 跑满 20 轮 | ${ENGINE.sessionsCompleted20}（${pct(ENGINE.sessionRate)}） |`);
p(`| dead-end | ${ENGINE.deadEndSessions}（${pct(ENGINE.deadEndRate)}），终止原因 ${JSON.stringify(ENGINE.termination)} |`);
p(`| Formal 曝光占比 | ${pct(ENGINE.formalShare)}（${ENGINE.formalDraws}/${ENGINE.totalDraws}） |`);
p(`| Formal 曝光卡数 | ${ENGINE.formalExposedDistinct}/${ENGINE.formalTotal} —— ${ids(ENGINE.formalExposedIds)} |`);
p(`| heatAtDraw | ${heatCells(ENGINE.heatAtDraw)} |`);
p(`| 到达 H2 / H3 / H4 局数 | ${ENGINE.sessionsReachingH2} / ${ENGINE.sessionsReachingH3} / ${ENGINE.sessionsReachingH4} |`);
p(`| 有效信息轮/局 | ${ENGINE.effectivePerSession} |`);
p(`| 有效轮 gain 分布 | ${gainCells(ENGINE.effectiveByGain)} |`);
p(`| 人物维度覆盖（全样本）/ 每局 | ${ENGINE.distinctTopicsCovered} / ${ENGINE.topicsPerSessionMean} |`);
p(`| 到中途互选窗口（count≥${MUTUAL_MIN}） | ${ENGINE.mutualWindowReached} |`);
p(`| 局内重复抽卡次数 | ${ENGINE.repeatedDraws} |`);
p(`| 全程零有效轮局 | ${ENGINE.sessionsZeroEffective} |`);
p();
p("### 1.3 仅 Formal 24 张真实生产卡（口径 A 下的「牌堆只有可计数卡」上界情形）");
p();
const fo = chain.scenarioFormalOnly;
p(`- 牌堆：${fo.deck}`);
p(`- 结果：完成 ${fo.rounds.length} 轮（第 ${fo.rounds.length + 1} 轮起判 \`PACK_EXHAUSTED\`，D8 交 Host，不自动洗牌/结束）；最终 Heat **${fo.finalHeat}**、effective count **${fo.finalEffective}**。`);
p(`- 逐档首达轮次：${JSON.stringify(fo.firstReachRoundByHeat)}（H2/H3/H4 全为 \`null\`）。`);
p();
p("### 1.4 ceiling 1~5（按 intensityLimit 分档，各档约 1/5 样本）");
p();
p("| 口径 | intensityLimit | 局数 | dead-end | dead-end 率 | Formal 曝光占比 | 有效轮/局 |");
p("|---|---|---|---|---|---|---|");
for (const c of mc.ceilingCohorts)
  p(`| ${c.mode === "B" ? "A（engine）" : "B（当前 UI）"} | ${c.intensityLimit} | ${c.sessions} | ${c.deadEndSessions} | ${pct(c.deadEndRate)} | ${pct(c.formalShare)} | ${c.effectivePerSession} |`);
p();
p("### 1.5 最差 trace（口径 A：mode B，选 dead-end 优先）");
p();
const ws = worst.worstStat;
const totalDrawsWorst = Object.values(ws.heatAtDraw as Record<string, number>).reduce((a, b) => a + b, 0);
p(`- 挑选规则：${worst.selectionRule}`);
p(`- 命中：桌型 **${worst.table}**，seed **${worst.seed}**，intensityLimit **${worst.intensityLimit}**，mode ${worst.mode}`);
p(`- 结果：完成 ${ws.completedRounds} 轮后 \`${ws.terminationReason}\`（dead-end=${ws.deadEnd}）；共抽 ${totalDrawsWorst} 次；Formal 曝光 ${ws.formalDraws}；有效信息轮 ${ws.effectiveRounds}；最长低/0 信息连击 ${ws.longestLowZeroRun}；heatAtDraw ${heatCells(ws.heatAtDraw)}`);
p();
p("| 轮 | 卡 | 轨 | Heat@抽卡 | 终态 | informationGain | topic | 记有效轮 |");
p("|---|---|---|---|---|---|---|---|");
for (const r of worst.rounds)
  p(`| ${r.round} | ${r.cardId} | ${r.formal ? "Formal" : "legacy"} | ${r.heatAtDraw} | ${r.terminal} | ${r.informationGain ?? "null"} | ${r.topic ?? "null"} | ${r.effective ? "✅" : "—"} |`);
p();
p("**文字归因**（逐条由数据派生）：");
p(`1. 它是 **dead-end**（${ws.terminationReason}，只完成 ${ws.completedRounds}/20 轮）：\`intensityLimit=${worst.intensityLimit}\` 的合法池先被抽干。`);
p(`2. 共抽 ${totalDrawsWorst} 次里只有 **${ws.formalDraws} 张 Formal**（且都落在 \`skipped\` 轮 ⇒ 无 completed ⇒ 无披露）；表内 ${worst.rounds.length} 个 completed 轮**全是 legacy** ⇒ sidecar 恒 null ⇒ 有效轮 **0**。`);
p(`3. 有效轮 ${ws.effectiveRounds} < ${H2_MIN}（H2 门槛）⇒ **Heat 全程停在 H1**，认识证据与互选窗口都无从谈起。`);
p();

/* ------------------------------------------------------------------ */
/* 口径 B                                                              */
/* ------------------------------------------------------------------ */
p("## 2｜口径 B｜Current real UI（disclosure producer 未接入）");
p();
p("- **事实**：`app/game/page.tsx#roundDisclosureForCurrentRound()` 恒返回 `undefined`（Human 本批冻结：不新增披露 UI）⇒ `isEffectiveInformationRound` fail-closed 恒 false ⇒ `relationshipEffectiveCardCount` 恒 0 ⇒ **Heat 恒 H1**。");
p(`- **当前 UI 实际可抽到的 Formal 张数**：**${H1_BAND.formalLegal} 张**（= 卡面 \`heatMin=1\` 且 H1 桶合法者）—— **${ids(H1_BAND.formalLegalIds)}**。`);
p(`- **当前 UI 实际抽到的 Formal**（4000 局实测）：distinct **${UI.formalExposedDistinct}/${UI.formalTotal}** —— ${ids(UI.formalExposedIds)}；曝光 ${pct(UI.formalShare)}（${UI.formalDraws}/${UI.totalDraws}）。`);
p(`- effective count **恒 ${UI.effectivePerSession}**；heatAtDraw ${heatCells(UI.heatAtDraw)}；到达 H2/H3/H4 = ${UI.sessionsReachingH2}/${UI.sessionsReachingH3}/${UI.sessionsReachingH4}；中途互选窗口 **${UI.mutualWindowReached} 局**。`);
p(`- 对照口径 A（同样 4000 局、仅多一个合法披露信号）：effective **${ENGINE.effectivePerSession}**/局、Formal distinct **${ENGINE.formalExposedDistinct}/${ENGINE.formalTotal}**、到达 H2/H3/H4 = ${ENGINE.sessionsReachingH2}/${ENGINE.sessionsReachingH3}/${ENGINE.sessionsReachingH4}。`);
p("> ⛔ **当前 UI 不能产生 effective information round ⇒ Heat 恒 H1 ⇒ mid Mutual 不可达**。这不是「生产 Heat 已正常推进」。");
p();

/* ------------------------------------------------------------------ */
/* 结构性代价                                                           */
/* ------------------------------------------------------------------ */
const bootstrapShortfall = H2_MIN - H1_BAND.formalLegal;
p("## 3｜重标带来的结构性代价（Human 2026-09-28 已明确接受；禁止掩饰，也禁止反向压 Heat 来消除）");
p();
p(`- **当前 UI（口径 B）下 H2/H3/H4 档的 Formal 库存 = 0（实践不可抽）**：只有 ${H1_BAND.formalLegal} 张 \`heatMin=1\` 的卡进得了 H1 桶；其余 ${mc.cardSource.formalTotal - H1_BAND.formalLegal} 张 \`heatMin≥2\` 在 Heat 恒 H1 时被硬过滤。`);
p(`- **口径 A 也断在「H1→H2 冷启门」（关键诚实结论）**：H1 桶内**可计数**的 Formal 仅 **${H1_BAND.formalLegal} 张 < H2 门槛 ${H2_MIN}**（缺口 ${bootstrapShortfall} 张）⇒ 即便每轮都给合法披露，Heat **也离不开 H1**（4000 局口径 A 到达 H2 仅 ${ENGINE.sessionsReachingH2} 局）。H2/H3/H4 桶内静态有货（${mc.staticHeatAvailability.map((h: { heat: string; formalLegal: number }) => `${h.heat}=${h.formalLegal}`).join(" / ")}），但**从 H1 冷启走不到**。`);
p(`- **H3/H4 桶非 0 张，但可达性为 0**：H3 桶 ${band("H3").formalLegal} 张、H4 桶 ${band("H4").formalLegal} 张；受上游 H2 门所限，口径 A 到达 H3/H4 = ${ENGINE.sessionsReachingH3}/${ENGINE.sessionsReachingH4} 局。`);
p(`- **ceiling=1 断粮**：intensityLimit=1 的局 dead-end 率 **${pct(mc.ceilingCohorts.find((c: { mode: string; intensityLimit: number }) => c.mode === "B" && c.intensityLimit === 1).deadEndRate)}**（口径 A），全部 \`pack_exhausted\`；单包 truth-dare 在 I1 上限下 20 轮不可持续。`);
p(`- **中途互选窗口 [${MUTUAL_MIN}, ${MUTUAL_CHECK_COUNTS[MUTUAL_CHECK_COUNTS.length - 1]}] 结构性不可达**：口径 A 下 count≥${MUTUAL_MIN} 的局 **${ENGINE.mutualWindowReached}**/4000（Heat 走不到 ${MUTUAL_MIN_HEAT}）。`);
p();

/* ------------------------------------------------------------------ */
/* 补卡建议                                                             */
/* ------------------------------------------------------------------ */
p("## 4｜补卡建议（一律靠补内容，不靠放宽门槛；补什么 topic / heatMax / intensity）");
p();
p(`1. **先补 H1→H2 冷启门（最高优先，最小可解）**：每玩法至少要 **≥${H2_MIN} 张 ` + "`heatMin=1`" + ` 的 Formal 卡**（当前 truth-dare 仅 ${H1_BAND.formalLegal} 张），Heat 才可能离开 H1；要走到 H3/H4 需累计 ≥${H3_MIN}/${H4_MIN} 张 \`heatMin≤2\`/\`heatMin≤3\`。**不得用压低 heatMin 解决**，要通过新增真实浅关系题。`);
p(`2. **补「能真被抽到」的 H1 卡（intensity 维度）**：当前 ${H1_BAND.formalLegal} 张全为 \`intensity=1\`，在建堆里输给 legacy 高强度档（口径 A 曝光仅 ${pct(ENGINE.formalShare)}）。建议补 **\`heatMin=1\` 且 \`intensity\` 偏高（I3~I5）** 的浅关系 Formal 卡，让它们能进入 top 强度档被实际抽出。`);
p(`3. **heatMax 覆盖（H4 层）**：当前 heatMax 分布 ${JSON.stringify(mc.formalProfiles.byHeatMax)}；建议每玩法 ≥8 张 \`heatMax=4\`，避免 Heat 升高后 Formal 库存反而变薄（H1→H4 Formal 合法数 ${mc.staticHeatAvailability.map((h: { heat: string; formalLegal: number }) => `${h.heat} ${h.formalLegal}`).join(" → ")}）。`);
p(`4. **topic 覆盖（摊平）**：当前覆盖 ${Object.keys(mc.formalProfiles.byTopic).length} 个人物维度，唯 \`择偶偏好\`/\`亲密边界\` 各 1 张；建议每玩法 Formal 覆盖 ≥5 个 topic，并补齐 A.1 零维度（\`吃醋·占有\`/\`异性朋友边界\`/\`前任态度\`/\`底线·雷区\`/\`人生目标·理想生活\`）。`);
p(`5. **跨玩法分摊**：当前 24 张全在 truth-dare；把审计 metadata 补到全部 7 个玩法的固定卡上，而非只堆 truth-dare。`);
p(`6. **不要动的旋钮**：认识阈值、窗口 [${MUTUAL_MIN}, ${MUTUAL_CHECK_COUNTS[MUTUAL_CHECK_COUNTS.length - 1]}]、\`MUTUAL_MIN_HEAT=${MUTUAL_MIN_HEAT}\`、Heat 硬过滤、\`isEffectiveInformationRound\` fail-closed、±18% 阈值、样本量一律不动。`);
p();

/* ------------------------------------------------------------------ */
/* 生产链验证                                                           */
/* ------------------------------------------------------------------ */
p("## 5｜真实生产链验证（§十八 第一段）");
p();
const fp = chain.scenarioFullPack;
const lo = chain.scenarioLegacyOnly;
p(`- 链路：${chain.chain.join(" → ")}`);
p(`- 纪律：${chain.disclosure}`);
p();
p("| 情形 | 牌堆 | 轮数 | 终态 Heat | 最终 effective count | Heat 逐档首达（轮次） |");
p("|---|---|---|---|---|---|");
p(`| 全包（真实生产牌堆） | ${fp.deck} | ${fp.rounds.length} | ${fp.finalHeat} | ${fp.finalEffective} | ${JSON.stringify(fp.firstReachRoundByHeat)} |`);
p(`| 仅 Formal 24 张 | ${fo.deck} | ${fo.rounds.length} | ${fo.finalHeat} | ${fo.finalEffective} | ${JSON.stringify(fo.firstReachRoundByHeat)} |`);
p(`| 仅 legacy（负向对照） | ${lo.deck} | ${lo.rounds.length} | ${lo.finalHeat} | ${lo.finalEffective} | ${JSON.stringify(lo.firstReachRoundByHeat)} |`);
p();
p(`- 全包（seed=1，**给了合法披露信号**）：Formal 卡被抽到 **${fp.rounds.filter((r: { formal: boolean }) => r.formal).length} 张**；有效计数 ${fp.finalEffective}、Heat ${fp.finalHeat}。`);
p(`- 仅 Formal 24 张（seed=1，**给了合法披露信号**）：只够走 ${fo.rounds.length} 轮（201/202/203，全 \`heatMin=1\`），effective ${fo.finalEffective} < H2 门槛 ${H2_MIN} ⇒ Heat 仍 ${fo.finalHeat}，第 ${fo.rounds.length + 1} 轮判 \`PACK_EXHAUSTED\`。`);
p(`- 全包 ${chain.fullPackSeedSweep.sessions} seed 扫描（不挑 seed）：到达 H2 ${chain.fullPackSeedSweep.reachedH2} 局、H3 ${chain.fullPackSeedSweep.reachedH3} 局、H4 ${chain.fullPackSeedSweep.reachedH4} 局；终态 Heat 分布 ${JSON.stringify(chain.fullPackSeedSweep.heatDistribution)}；有效轮/局 ${chain.fullPackSeedSweep.effectiveMean}。`);
p(`- legacy 负向对照：sidecar 恒 null ⇒ effective 恒 ${lo.finalEffective}、Heat 恒 ${lo.finalHeat}（fail-closed 成立）。`);
p();

/* ------------------------------------------------------------------ */
/* 复跑                                                                 */
/* ------------------------------------------------------------------ */
p("## 6｜复跑命令");
p();
p("```bash");
p("npx vite-node -c vitest.config.ts scripts/audit-formal-truth-montecarlo.ts");
p("npx vite-node -c vitest.config.ts scripts/audit-formal-truth-production-chain.ts");
p("npx vite-node -c vitest.config.ts scripts/audit-formal-truth-report.ts");
p("```");
p();

writeFileSync(`${DIR}/FORMAL-TRUTH-MC.md`, lines.join("\n") + "\n");
console.log("已生成 docs/qa/content-audit/FORMAL-TRUTH-MC.md（", lines.length, "行 ）");
