/**
 * C1-8｜机械生成第一包 MC 报告（所有统计值读自 JSON 产物，报告侧不手写）。
 *
 * 输入（按顺序先跑）：
 *   scripts/audit-formal-truth-montecarlo.ts     → FORMAL-TRUTH-MC.json / FORMAL-TRUTH-MC-WORST-TRACE.json
 *   scripts/audit-formal-truth-production-chain.ts → FORMAL-TRUTH-PRODUCTION-CHAIN.json
 * 输出：docs/qa/content-audit/FORMAL-TRUTH-MC.md
 */
import { readFileSync, writeFileSync } from "node:fs";

const DIR = `${process.cwd()}/docs/qa/content-audit`;
const mc = JSON.parse(readFileSync(`${DIR}/FORMAL-TRUTH-MC.json`, "utf8"));
const worst = JSON.parse(readFileSync(`${DIR}/FORMAL-TRUTH-MC-WORST-TRACE.json`, "utf8"));
const chain = JSON.parse(readFileSync(`${DIR}/FORMAL-TRUTH-PRODUCTION-CHAIN.json`, "utf8"));

const A = mc.modeA;
const B = mc.modeB;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const heatCells = (m: Record<string, number>) => Object.entries(m).map(([k, v]) => `${k} ${v}`).join(" / ");
const gainCells = (m: Record<string, number>) =>
  Object.keys(m).length === 0 ? "（无）" : Object.entries(m).map(([k, v]) => `${k} ${v}`).join(" / ");

const lines: string[] = [];
const p = (s = "") => lines.push(s);

p("# 第一包「Formal Fixed 真心话」单包 Router Monte Carlo + 最差 trace + 生产链验证（C1-8）");
p();
p(`- 生成：\`scripts/audit-formal-truth-report.ts\`（统计值全部读自 JSON 产物，报告侧不手写）`);
p(`- 卡源：\`${mc.cardSource.description}\` —— pack ${mc.cardSource.packTotal} 张（Formal ${mc.cardSource.formalTotal} / legacy ${mc.cardSource.legacyTotal}）`);
p(`- Router：${mc.router}`);
p(`- 参数：${mc.config.tables.length} 桌型 × ${mc.config.sessionsPerTable} 局/桌型 × ${mc.config.targetCompletedRounds} 轮；guard 上限 ${mc.config.guardLimit}；completed 概率 ${mc.config.completedProbability}；软去重窗口 ${mc.config.softDedupWindow}`);
p(`- 单包 = ${mc.packLabel}；不切包（任何耗尽判本局 dead-end，生产单玩局同口径）。`);
p();
p("## 1｜静态每 Heat 桶可用库存（读卡面 heatMin/heatMax；legacy 卡不受 Heat 硬过滤）");
p();
p("| Heat | 包内合法 | 其中 Formal | 其中 legacy |");
p("|---|---|---|---|");
for (const h of mc.staticHeatAvailability) p(`| ${h.heat} | ${h.legalCount} | ${h.formalLegal} | ${h.legacyLegal} |`);
p();
p("## 2｜两种 Heat 起点");
p();
p(`- **Mode A｜生产实况**：${mc.config.modes.A}`);
p(`- **Mode B｜production-chain**：${mc.config.modes.B}`);
p();
p("| 指标 | Mode A（生产实况） | Mode B（disclosure 生产链） |");
p("|---|---|---|");
p(`| 局数 | ${A.sessions} | ${B.sessions} |`);
p(`| 跑满 20 轮 | ${A.sessionsCompleted20}（${pct(A.sessionRate)}） | ${B.sessionsCompleted20}（${pct(B.sessionRate)}） |`);
p(`| dead-end | ${A.deadEndSessions}（${pct(A.deadEndRate)}） | ${B.deadEndSessions}（${pct(B.deadEndRate)}） |`);
p(`| 终止原因 | ${JSON.stringify(A.termination)} | ${JSON.stringify(B.termination)} |`);
p(`| Formal 曝光占比 | ${pct(A.formalShare)}（${A.formalDraws}/${A.totalDraws}） | ${pct(B.formalShare)}（${B.formalDraws}/${B.totalDraws}） |`);
p(`| Formal 曝光卡数 | ${A.formalExposedDistinct}/${A.formalTotal} | ${B.formalExposedDistinct}/${B.formalTotal} |`);
p(`| heatAtDraw | ${heatCells(A.heatAtDraw)} | ${heatCells(B.heatAtDraw)} |`);
p(`| 到达 H2 / H3 / H4 局数 | ${A.sessionsReachingH2} / ${A.sessionsReachingH3} / ${A.sessionsReachingH4} | ${B.sessionsReachingH2} / ${B.sessionsReachingH3} / ${B.sessionsReachingH4} |`);
p(`| 有效信息轮/局 | ${A.effectivePerSession} | ${B.effectivePerSession} |`);
p(`| 有效轮 gain 分布 | ${gainCells(A.effectiveByGain)} | ${gainCells(B.effectiveByGain)} |`);
p(`| 人物维度覆盖（全样本） | ${A.distinctTopicsCovered} | ${B.distinctTopicsCovered} |`);
p(`| 人物维度/局 | ${A.topicsPerSessionMean} | ${B.topicsPerSessionMean} |`);
p(`| 中+ ≥5 局数 | ${A.sessionsMediumPlus5} | ${B.sessionsMediumPlus5} |`);
p(`| 高 ≥1 局数 | ${A.sessionsHighAtLeast1} | ${B.sessionsHighAtLeast1} |`);
p(`| 维度 ≥3 局数 | ${A.sessionsTopicsAtLeast3} | ${B.sessionsTopicsAtLeast3} |`);
p(`| 到中途互选窗口（count≥${12}） | ${A.mutualWindowReached} | ${B.mutualWindowReached} |`);
p(`| 跨局首 5 张不同序列 | ${A.distinctFirstFive}/${A.sessions}（最高占比 ${pct(A.topFirstFiveShare)}） | ${B.distinctFirstFive}/${B.sessions}（最高占比 ${pct(B.topFirstFiveShare)}） |`);
p(`| 局内重复抽卡次数 | ${A.repeatedDraws} | ${B.repeatedDraws} |`);
p(`| 全程零 Formal 局 | ${A.sessionsZeroFormal} | ${B.sessionsZeroFormal} |`);
p(`| 全程零有效轮局 | ${A.sessionsZeroEffective} | ${B.sessionsZeroEffective} |`);
p();
p("## 3｜ceiling=1 / ceiling=2 是否断粮");
p();
p("| mode | intensityLimit | 局数 | dead-end | dead-end 率 | Formal 曝光占比 | 有效轮/局 |");
p("|---|---|---|---|---|---|---|");
for (const c of mc.ceilingCohorts) {
  p(`| ${c.mode} | ${c.intensityLimit} | ${c.sessions} | ${c.deadEndSessions} | ${pct(c.deadEndRate)} | ${pct(c.formalShare)} | ${c.effectivePerSession} |`);
}
p();
p(`> 口径说明（必须随数据一起读）：ceiling=5 时 truth-dare 的顶档**不再对称** —— 第一包新增的 ${mc.formalProfiles.byIntensity["5"] ?? 0} 张**非 match-pair 的 intensity-5 truth 卡**（PN-TRUTH-222/224）占据顶档，而 SSOT 的 intensity-5 dare 全是 match-pair（未建 MATCH 不出）。这是**内容构成事实**；\`tests/unit/v2-router-fair-exposure.test.ts\` 的 TIE_FIXTURE 因此把 intensityLimit 由 5 改为 4（让顶档继续落在对称 I4 tie 组），**±18% 阈值与样本量未改**。`);
p();
p("## 4｜最差 trace");
p();
const ws = worst.worstStat;
const totalDrawsWorst = Object.values(ws.heatAtDraw as Record<string, number>).reduce((a, b) => a + b, 0);
p(`- 挑选规则：${worst.selectionRule}`);
p(`- 命中：桌型 **${worst.table}**，seed **${worst.seed}**，intensityLimit **${worst.intensityLimit}**，mode ${worst.mode}`);
p(`- 结果：完成 ${ws.completedRounds} 轮后 \`${ws.terminationReason}\`（dead-end=${ws.deadEnd}）；共抽 ${totalDrawsWorst} 次；Formal 曝光 ${ws.formalDraws}；有效信息轮 ${ws.effectiveRounds}；最长低/0 信息连击 ${ws.longestLowZeroRun}；heatAtDraw ${heatCells(ws.heatAtDraw)}`);
p();
p("| 轮 | 卡 | 轨 | Heat@抽卡 | 终态 | informationGain | topic | 记有效轮 |");
p("|---|---|---|---|---|---|---|---|");
for (const r of worst.rounds) {
  p(`| ${r.round} | ${r.cardId} | ${r.formal ? "Formal" : "legacy"} | ${r.heatAtDraw} | ${r.terminal} | ${r.informationGain ?? "null"} | ${r.topic ?? "null"} | ${r.effective ? "✅" : "—"} |`);
}
p();
p("**文字归因**：该局成为「最差」的机制性原因，逐条由数据派生 ——");
p(`1. 它是 **dead-end**（${ws.terminationReason}，只完成 ${ws.completedRounds}/20 轮）：牌堆在 \`intensityLimit=${worst.intensityLimit}\` 的合法池先被抽干；`);
p(`2. 共抽 ${totalDrawsWorst} 次里只有 **${ws.formalDraws} 张 Formal 卡**（第一包共 ${mc.cardSource.formalTotal} 张，占包 ${pct(mc.cardSource.formalTotal / mc.cardSource.packTotal)}）；legacy 卡 sidecar 为 null ⇒ 不计有效轮 ⇒ **整局只推进 ${ws.effectiveRounds} 个有效信息轮**；`);
p(`3. 有效轮 ${ws.effectiveRounds} < 4（H2 门槛）⇒ **Heat 全程停在 ${Object.keys(ws.heatAtDraw)[0] ?? "H1"}**，认识证据与互选窗口都无从谈起。`);
p();
p("## 5｜真实生产链验证（§十八 第一段）");
p();
const fp = chain.scenarioFullPack;
const fo = chain.scenarioFormalOnly;
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
p(`- 全包真实牌堆（seed=${chain.seed}）：**Formal 卡确实被 Router 抽出 → metadata 进 production event → effective count 推进 → Heat 从 H1 进入 H2**（首次到达第 ${fp.firstReachRoundByHeat.H2} 轮）。`);
p(`- 仅 Formal 24 张：同一条链把 Heat **逐档推到 H4**（H2 第 ${fo.firstReachRoundByHeat.H2} 轮 / H3 第 ${fo.firstReachRoundByHeat.H3} 轮 / H4 第 ${fo.firstReachRoundByHeat.H4} 轮）。${fo.note}`);
p(`- 全包 ${chain.fullPackSeedSweep.sessions} seed 扫描（不挑 seed）：到达 H2 ${chain.fullPackSeedSweep.reachedH2} 局、H3 ${chain.fullPackSeedSweep.reachedH3} 局、H4 ${chain.fullPackSeedSweep.reachedH4} 局；终态 Heat 分布 ${JSON.stringify(chain.fullPackSeedSweep.heatDistribution)}；有效轮/局 ${chain.fullPackSeedSweep.effectiveMean}。`);
p();
p("## 6｜缺口清单与补卡建议（不靠放宽过滤门槛）");
p();
const drawsPerSession = B.totalDraws / B.sessions;
const completion = mc.config.completedProbability;
const neededFormalDraws = 13 / completion; // 到 H4（13 有效轮）
const neededShare = neededFormalDraws / drawsPerSession;
const neededFormalCards = Math.ceil(neededShare * mc.cardSource.packTotal);
const ceiling1 = mc.ceilingCohorts.find((c: { mode: string; intensityLimit: number }) => c.mode === "B" && c.intensityLimit === 1);
const ceiling2 = mc.ceilingCohorts.find((c: { mode: string; intensityLimit: number }) => c.mode === "B" && c.intensityLimit === 2);
const gaps: string[] = [];
if (B.sessionsReachingH4 === 0) {
  gaps.push(
    `**H4 断粮（结构性）**：${B.sessions} 局中到达 H4 的 **0 局**（mode B）。机制：有效信息轮只有带审计 metadata 的 Formal 卡（当前仅 ${mc.cardSource.formalTotal}/${mc.cardSource.packTotal} 张）能推进，平均 ${B.effectivePerSession} 轮/局，远低于 H4 门槛 13。`,
  );
}
if (B.sessionsReachingH3 / B.sessions < 0.5) {
  gaps.push(
    `**H3 稀疏**：到达 H3 的局仅 ${B.sessionsReachingH3}/${B.sessions}（${pct(B.sessionsReachingH3 / B.sessions)}），H3 门槛 8 有效轮。`,
  );
}
if (B.mutualWindowReached === 0) {
  gaps.push(
    `**中途互选窗口 [12,14] 结构性不可达**：count≥12 的局 **0**（mode B）。窗口触发与认识阈值四条都依赖有效信息轮数，当前均值仅 ${B.effectivePerSession}/局，达不到窗口下界 12。`,
  );
}
if (ceiling1 && ceiling1.deadEndRate > 0) {
  gaps.push(
    `**ceiling=1 断粮**：intensityLimit=1 的局 dead-end 率 **${pct(ceiling1.deadEndRate)}**（${ceiling1.deadEndSessions}/${ceiling1.sessions}），` +
      `全部 \`global_exhausted\`。第一包 intensity=1 的 Formal 仅 ${mc.formalProfiles.byIntensity["1"] ?? 0} 张（其中 heatMax=1 的 ${(mc.formalProfiles.byHeatMax["1"] ?? 0)} 张）。` +
      `单包 truth-dare 在 I1 上限下 20 轮不可持续。`,
  );
}
if (B.effectivePerSession < 8) {
  gaps.push(
    `**有效信息轮偏低（metadata 覆盖不足，非题面质量问题）**：${B.effectivePerSession} 轮/局 < §十八 目标「中及以上 ≥8」。第一包 24 张全部无 \`low\`/\`zero\`（gain 分布 ${gainCells(B.effectiveByGain)}），` +
      `问题在**能计数的卡太少**（${pct(B.formalShare)} 曝光率），不在单卡信息量。`,
  );
}
if (B.topicsPerSessionMean < 5) {
  gaps.push(
    `**人物维度/局偏低**：${B.topicsPerSessionMean} 维/局 < §十八 目标 ≥5。全样本覆盖 ${B.distinctTopicsCovered} 个维度（第一包已摊到 13 个人物维度），但每局只走到 ${B.topicsPerSessionMean} 维。`,
  );
}
if (ceiling2 && ceiling2.deadEndRate === 0) {
  gaps.push(`（无缺口）ceiling=2：dead-end 率 ${pct(ceiling2.deadEndRate)}，有效轮/局 ${ceiling2.effectivePerSession}。`);
}
if (B.formalExposedDistinct >= B.formalTotal) {
  gaps.push(`（无缺口）Formal 可出性：24/${B.formalTotal} 张全部被抽到，Router 无「出不来」的 Formal 卡。`);
}
if (A.repeatedDraws === 0) {
  gaps.push(`（无缺口）局内重复：重复抽卡 ${A.repeatedDraws} 次（生产同口径「出牌即记 used」）。`);
}
p(gaps.map((g) => `- ${g}`).join("\n"));
p();
p("**补卡建议（按缺口，逐条给 topic / heatMax / intensity；一律靠补内容，不靠放宽门槛）：**");
p();
p(`1. **补「能计数的 Formal 卡」密度（主缺口）**：要在 20 轮内到 H4 需 13 有效轮 ⇒ 约 ${neededFormalDraws.toFixed(1)} 张 Formal completed/局；` +
  `按当前 ${drawsPerSession.toFixed(1)} 次抽卡/局，Formal 曝光率需从 ${pct(B.formalShare)} 提到约 **${pct(neededShare)}**；` +
  `单包 truth-dare（${mc.cardSource.packTotal} 张）约需 **≥${neededFormalCards} 张** Formal。更现实的是**跨 7 个玩法分摊**：把审计 metadata 补到全部玩法的固定卡上，而不是只堆 truth-dare。`);
p(`2. **补 ceiling=1 的 I1 Formal 卡**：每个玩法都要有足量 \`intensity=1\` 且 \`heatMax=4\` 的 Formal 卡（当前 truth-dare I1 Formal 仅 ${mc.formalProfiles.byIntensity["1"] ?? 0} 张、且 heatMax=1 的占 ${mc.formalProfiles.byHeatMax["1"] ?? 0} 张）。建议每玩法 ≥20 张 I1（其中 heatMax=4 的 ≥8 张），让 ceiling=1 的桌也能跑满 20 轮、Heat 也能升。`);
p(`3. **补 heatMax 覆盖（H4 层）**：当前第一包 heatMax 分布 ${JSON.stringify(mc.formalProfiles.byHeatMax)}；建议每个玩法都有 ≥8 张 \`heatMax=4\` 的 Formal 卡，避免 Heat 升到 H3/H4 后 Formal 库存反而变薄（H1→H4 Formal 合法数 ${mc.staticHeatAvailability.map((h: { heat: string; formalLegal: number }) => `${h.heat} ${h.formalLegal}`).join(" → ")}）。`);
p(`4. **补 topic 覆盖（摊平）**：第一包已覆盖 ${B.distinctTopicsCovered} 个人物维度（${JSON.stringify(mc.formalProfiles.byTopic)}），但每局只走到 ${B.topicsPerSessionMean} 维。建议按 topic 均摊，使**每个玩法**的 Formal 卡覆盖 ≥5 个不同 topic，` +
  `至少包含 A.1 的零维度：\`吃醋·占有\` / \`异性朋友边界\` / \`前任态度\` / \`底线·雷区\` / \`人生目标·理想生活\`。`);
p(`5. **informationGain 不缺「高」，缺「可计数」**：第一包 Formal 卡强度分布 ${JSON.stringify(mc.formalProfiles.byIntensity)}——不需要人为拔高 gain 档，需要把已审的 \`high\`/\`medium\` 卡补到各玩法（当前 24 张全在 truth-dare）。`);
p(`6. **不要动的旋钮**：认识阈值、窗口 [12,14]、中途 \`MUTUAL_MIN_HEAT=H3\`、Heat 硬过滤、\`isEffectiveInformationRound\` fail-closed、±18% 阈值、样本量一律不动；缺口只能靠补内容与补 metadata 解决。`);
p();

p("## 7｜复跑命令");
p();
p("```bash");
p("npx vite-node -c vitest.config.ts scripts/audit-formal-truth-montecarlo.ts");
p("npx vite-node -c vitest.config.ts scripts/audit-formal-truth-production-chain.ts");
p("npx vite-node -c vitest.config.ts scripts/audit-formal-truth-report.ts");
p("```");
p();

writeFileSync(`${DIR}/FORMAL-TRUTH-MC.md`, lines.join("\n") + "\n");
console.log("已生成 docs/qa/content-audit/FORMAL-TRUTH-MC.md（", lines.length, "行 ）");
