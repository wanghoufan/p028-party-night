# 第一包「Formal Fixed 真心话」单包 Router Monte Carlo + 最差 trace + 生产链验证（C1-8）

- 生成：`scripts/audit-formal-truth-report.ts`（统计值全部读自 JSON 产物，报告侧不手写）
- 卡源：`mainlineSsotCardsByPack('truth-dare')（SSOT 主线 + 第一包正式内容）` —— pack 124 张（Formal 24 / legacy 100）
- Router：createV2MainlineRouter（审计 / MC 侧）— C1-8 起与生产 createDeckRouter 共享桥接卡源 mainlineRuntimeCards()
- 参数：4 桌型 × 1000 局/桌型 × 20 轮；guard 上限 1000；completed 概率 0.85；软去重窗口 5
- 单包 = 真心话（truth-dare）；不切包（任何耗尽判本局 dead-end，生产单玩局同口径）。

## 1｜静态每 Heat 桶可用库存（读卡面 heatMin/heatMax；legacy 卡不受 Heat 硬过滤）

| Heat | 包内合法 | 其中 Formal | 其中 legacy |
|---|---|---|---|
| H1 | 124 | 24 | 100 |
| H2 | 122 | 22 | 100 |
| H3 | 119 | 19 | 100 |
| H4 | 113 | 13 | 100 |

## 2｜两种 Heat 起点

- **Mode A｜生产实况**：生产实况：不给披露信号 ⇒ Heat 恒 H1（disclosure 通道未落地）
- **Mode B｜production-chain**：disclosure 生产链口径：每 completed 轮给 selfDisclosed + disclosedPlayerIds ⇒ Formal 卡推进有效计数与 Heat

| 指标 | Mode A（生产实况） | Mode B（disclosure 生产链） |
|---|---|---|
| 局数 | 4000 | 4000 |
| 跑满 20 轮 | 3482（87.1%） | 3482（87.1%） |
| dead-end | 518（13.0%） | 518（13.0%） |
| 终止原因 | {"round_limit":3482,"pack_exhausted":0,"global_exhausted":518,"awaiting_host":0,"guard_limit":0} | {"round_limit":3482,"pack_exhausted":0,"global_exhausted":518,"awaiting_host":0,"guard_limit":0} |
| Formal 曝光占比 | 19.9%（18469/92925） | 19.9%（18465/92925） |
| Formal 曝光卡数 | 24/24 | 24/24 |
| heatAtDraw | H1 92925 / H2 0 / H3 0 / H4 0 | H1 76777 / H2 15959 / H3 189 / H4 0 |
| 到达 H2 / H3 / H4 局数 | 0 / 0 / 0 | 2295 / 106 / 0 |
| 有效信息轮/局 | 0 | 3.93 |
| 有效轮 gain 分布 | （无） | high 9431 / medium 6297 |
| 人物维度覆盖（全样本） | 0 | 13 |
| 人物维度/局 | 0 | 3.64 |
| 中+ ≥5 局数 | 0 | 1244 |
| 高 ≥1 局数 | 0 | 3141 |
| 维度 ≥3 局数 | 0 | 2823 |
| 到中途互选窗口（count≥12） | 0 | 0 |
| 跨局首 5 张不同序列 | 3977/4000（最高占比 0.1%） | 3978/4000（最高占比 0.1%） |
| 局内重复抽卡次数 | 0 | 0 |
| 全程零 Formal 局 | 0 | 0 |
| 全程零有效轮局 | 4000 | 11 |

## 3｜ceiling=1 / ceiling=2 是否断粮

| mode | intensityLimit | 局数 | dead-end | dead-end 率 | Formal 曝光占比 | 有效轮/局 |
|---|---|---|---|---|---|---|
| A | 1 | 771 | 518 | 67.2% | 18.2% | 0 |
| A | 2 | 760 | 0 | 0.0% | 31.0% | 0 |
| B | 1 | 771 | 518 | 67.2% | 18.2% | 3.41 |
| B | 2 | 760 | 0 | 0.0% | 31.2% | 6.18 |

> 口径说明（必须随数据一起读）：ceiling=5 时 truth-dare 的顶档**不再对称** —— 第一包新增的 2 张**非 match-pair 的 intensity-5 truth 卡**（PN-TRUTH-222/224）占据顶档，而 SSOT 的 intensity-5 dare 全是 match-pair（未建 MATCH 不出）。这是**内容构成事实**；`tests/unit/v2-router-fair-exposure.test.ts` 的 TIE_FIXTURE 因此把 intensityLimit 由 5 改为 4（让顶档继续落在对称 I4 tie 组），**±18% 阈值与样本量未改**。

## 4｜最差 trace

- 挑选规则：dead-end 优先 → 有效信息轮最少 → 完成轮最少 → Formal 曝光最少 → 最长低/0 信息连击最大
- 命中：桌型 **2m2f**，seed **22503787**，intensityLimit **1**，mode B
- 结果：完成 13 轮后 `global_exhausted`（dead-end=true）；共抽 22 次；Formal 曝光 4；有效信息轮 1；最长低/0 信息连击 6；heatAtDraw H1 22 / H2 0 / H3 0 / H4 0

| 轮 | 卡 | 轨 | Heat@抽卡 | 终态 | informationGain | topic | 记有效轮 |
|---|---|---|---|---|---|---|---|
| 1 | PN-TRUTH-003 | legacy | H1 | completed | null | null | — |
| 2 | PN-DARE-006 | legacy | H1 | completed | null | null | — |
| 3 | PN-TRUTH-009 | legacy | H1 | completed | null | null | — |
| 4 | PN-DARE-004 | legacy | H1 | completed | null | null | — |
| 5 | PN-TRUTH-002 | legacy | H1 | completed | null | null | — |
| 8 | PN-TRUTH-006 | legacy | H1 | completed | null | null | — |
| 10 | PN-TRUTH-203 | Formal | H1 | completed | medium | 生活方式 | ✅ |
| 12 | PN-TRUTH-005 | legacy | H1 | completed | null | null | — |
| 14 | PN-TRUTH-001 | legacy | H1 | completed | null | null | — |
| 16 | PN-DARE-003 | legacy | H1 | completed | null | null | — |
| 19 | PN-DARE-001 | legacy | H1 | completed | null | null | — |
| 21 | PN-DARE-008 | legacy | H1 | completed | null | null | — |
| 22 | PN-DARE-007 | legacy | H1 | completed | null | null | — |

**文字归因**：该局成为「最差」的机制性原因，逐条由数据派生 ——
1. 它是 **dead-end**（global_exhausted，只完成 13/20 轮）：牌堆在 `intensityLimit=1` 的合法池先被抽干；
2. 共抽 22 次里只有 **4 张 Formal 卡**（第一包共 24 张，占包 19.4%）；legacy 卡 sidecar 为 null ⇒ 不计有效轮 ⇒ **整局只推进 1 个有效信息轮**；
3. 有效轮 1 < 4（H2 门槛）⇒ **Heat 全程停在 H1**，认识证据与互选窗口都无从谈起。

## 5｜真实生产链验证（§十八 第一段）

- 链路：startRound（唯一出题入口 → drawDeckCard → createDeckRouter 生产 Router 三层计数） → resolveRoundAndReduce(session,'complete',roundDisclosureSignal({selfDisclosed, disclosedPlayerIds})) → eventForRoundTerminal（卡侧 metadata 由 metadataForCard 读生产 sidecar；轮侧披露由正式信号提供） → reduceV2SessionEvents → relationshipEffectiveCardCount / heatForEffectiveCount
- 纪律：本文件与 integration 测试均不注入 metadata override；第一包 24 张的 informationGain/topic 来自生产 sidecar 真实投影。

| 情形 | 牌堆 | 轮数 | 终态 Heat | 最终 effective count | Heat 逐档首达（轮次） |
|---|---|---|---|---|---|
| 全包（真实生产牌堆） | mainlineSsotCardsByPack('truth-dare')（124 张，含第一包 24 张） | 20 | H2 | 4 | {"H1":1,"H2":19,"H3":null,"H4":null} |
| 仅 Formal 24 张 | 第一包 Formal 24 张（PN-TRUTH-201~224，真实生产卡） | 15 | H4 | 15 | {"H1":1,"H2":4,"H3":8,"H4":13} |
| 仅 legacy（负向对照） | 仅 legacy 卡（100 张，无第一包） | 20 | H1 | 0 | {"H1":1,"H2":null,"H3":null,"H4":null} |

- 全包真实牌堆（seed=1）：**Formal 卡确实被 Router 抽出 → metadata 进 production event → effective count 推进 → Heat 从 H1 进入 H2**（首次到达第 19 轮）。
- 仅 Formal 24 张：同一条链把 Heat **逐档推到 H4**（H2 第 4 轮 / H3 第 8 轮 / H4 第 13 轮）。牌堆只有 Formal 卡 ⇒ 每张 completed 都是有效信息轮 ⇒ Heat 逐档 H1→H2→H3→H4，逐档首次到达计数 = HEAT_THRESHOLDS 的 min+1（4/8/13）。
- 全包 200 seed 扫描（不挑 seed）：到达 H2 107 局、H3 0 局、H4 0 局；终态 Heat 分布 {"H2":107,"H1":93}；有效轮/局 3.46。

## 6｜缺口清单与补卡建议（不靠放宽过滤门槛）

- **H4 断粮（结构性）**：4000 局中到达 H4 的 **0 局**（mode B）。机制：有效信息轮只有带审计 metadata 的 Formal 卡（当前仅 24/124 张）能推进，平均 3.93 轮/局，远低于 H4 门槛 13。
- **H3 稀疏**：到达 H3 的局仅 106/4000（2.6%），H3 门槛 8 有效轮。
- **中途互选窗口 [12,14] 结构性不可达**：count≥12 的局 **0**（mode B）。窗口触发与认识阈值四条都依赖有效信息轮数，当前均值仅 3.93/局，达不到窗口下界 12。
- **ceiling=1 断粮**：intensityLimit=1 的局 dead-end 率 **67.2%**（518/771），全部 `global_exhausted`。第一包 intensity=1 的 Formal 仅 4 张（其中 heatMax=1 的 2 张）。单包 truth-dare 在 I1 上限下 20 轮不可持续。
- **有效信息轮偏低（metadata 覆盖不足，非题面质量问题）**：3.93 轮/局 < §十八 目标「中及以上 ≥8」。第一包 24 张全部无 `low`/`zero`（gain 分布 high 9431 / medium 6297），问题在**能计数的卡太少**（19.9% 曝光率），不在单卡信息量。
- **人物维度/局偏低**：3.64 维/局 < §十八 目标 ≥5。全样本覆盖 13 个维度（第一包已摊到 13 个人物维度），但每局只走到 3.64 维。
- （无缺口）ceiling=2：dead-end 率 0.0%，有效轮/局 6.18。
- （无缺口）Formal 可出性：24/24 张全部被抽到，Router 无「出不来」的 Formal 卡。
- （无缺口）局内重复：重复抽卡 0 次（生产同口径「出牌即记 used」）。

**补卡建议（按缺口，逐条给 topic / heatMax / intensity；一律靠补内容，不靠放宽门槛）：**

1. **补「能计数的 Formal 卡」密度（主缺口）**：要在 20 轮内到 H4 需 13 有效轮 ⇒ 约 15.3 张 Formal completed/局；按当前 23.2 次抽卡/局，Formal 曝光率需从 19.9% 提到约 **65.8%**；单包 truth-dare（124 张）约需 **≥82 张** Formal。更现实的是**跨 7 个玩法分摊**：把审计 metadata 补到全部玩法的固定卡上，而不是只堆 truth-dare。
2. **补 ceiling=1 的 I1 Formal 卡**：每个玩法都要有足量 `intensity=1` 且 `heatMax=4` 的 Formal 卡（当前 truth-dare I1 Formal 仅 4 张、且 heatMax=1 的占 2 张）。建议每玩法 ≥20 张 I1（其中 heatMax=4 的 ≥8 张），让 ceiling=1 的桌也能跑满 20 轮、Heat 也能升。
3. **补 heatMax 覆盖（H4 层）**：当前第一包 heatMax 分布 {"1":2,"2":3,"3":6,"4":13}；建议每个玩法都有 ≥8 张 `heatMax=4` 的 Formal 卡，避免 Heat 升到 H3/H4 后 Formal 库存反而变薄（H1→H4 Formal 合法数 H1 24 → H2 22 → H3 19 → H4 13）。
4. **补 topic 覆盖（摊平）**：第一包已覆盖 13 个人物维度（{"兴趣爱好":2,"生活方式":2,"性格·习惯·小癖好":2,"恋爱观":2,"择偶偏好":1,"相处规则":2,"吃醋·占有":2,"异性朋友边界":2,"前任态度":2,"底线·雷区":2,"人生目标·理想生活":2,"亲密边界":1,"性观念·亲密态度":2}），但每局只走到 3.64 维。建议按 topic 均摊，使**每个玩法**的 Formal 卡覆盖 ≥5 个不同 topic，至少包含 A.1 的零维度：`吃醋·占有` / `异性朋友边界` / `前任态度` / `底线·雷区` / `人生目标·理想生活`。
5. **informationGain 不缺「高」，缺「可计数」**：第一包 Formal 卡强度分布 {"1":4,"2":9,"3":7,"4":2,"5":2}——不需要人为拔高 gain 档，需要把已审的 `high`/`medium` 卡补到各玩法（当前 24 张全在 truth-dare）。
6. **不要动的旋钮**：认识阈值、窗口 [12,14]、中途 `MUTUAL_MIN_HEAT=H3`、Heat 硬过滤、`isEffectiveInformationRound` fail-closed、±18% 阈值、样本量一律不动；缺口只能靠补内容与补 metadata 解决。

## 7｜复跑命令

```bash
npx vite-node -c vitest.config.ts scripts/audit-formal-truth-montecarlo.ts
npx vite-node -c vitest.config.ts scripts/audit-formal-truth-production-chain.ts
npx vite-node -c vitest.config.ts scripts/audit-formal-truth-report.ts
```

