# 第一包「Formal Fixed 真心话」单包 Router Monte Carlo + 最差 trace + 生产链验证（C1-8 / A5 双口径）

- 生成：`scripts/audit-formal-truth-report.ts`（统计值全部读自 JSON 产物，阈值读自 `v2-state`，报告侧不手写）
- 卡源：`mainlineSsotCardsByPack('truth-dare')（SSOT 主线 + 第一包正式内容）` —— pack 131 张（Formal 5 / legacy 126）
- Router：createV2MainlineRouter（审计 / MC 侧）— C1-8 起与生产 createDeckRouter 共享桥接卡源 mainlineRuntimeCards()
- 参数：4 桌型 × 1000 局/桌型 × 20 轮；guard 上限 1000；completed 概率 0.85；软去重窗口 5
- 单包 = 真心话（truth-dare）；不切包（任何耗尽判本局 dead-end，生产单玩局同口径）。

## 0｜口径声明（先读这一段，禁止混写）

- **口径 A｜Engine / explicit disclosure**：**假设本轮真的收到合法 `roundDisclosureSignal`**（`selfDisclosed + disclosedPlayerIds`，走同一条 `reduceV2SessionEvents` 归约）。数据源 = MC `modeB` ＋ 生产链「仅 Formal 5 张」情形。
- **口径 B｜Current real UI**：`app/game/page.tsx#roundDisclosureForCurrentRound()` **恒返回 `undefined`** ⇒ 无 effective information round ⇒ **Heat 恒 H1、中途 Mutual（`count≥12` 且 `Heat≥H3`）不可达**。数据源 = MC `modeA`（生产实况：不给任何披露信号）。
- ⛔ **禁止把 A 当 B**：本报告任何「Heat 可达 H2/H3/H4」都**只在口径 A 的静态桶/或 Heat 已在该档时成立**；**当前 UI（口径 B）Heat 恒 H1**，不存在「生产 Heat 已正常推进」这回事。
- 门槛真源：H2=4 / H3=8 / H4=13（有效信息轮数）；中途互选窗口 [12, 14]，最低 `MUTUAL_MIN_HEAT=H3`。
- 门槛推不动的三个档名、缺口数、可抽集合、最差 trace 全部由本脚本按产物现算；报告中出现的任何结论（含「缺 / 不缺」「能 / 不能离开某档」）都可由同份 JSON 复算，**不接受手写**。

## 1｜口径 A｜Engine / explicit disclosure（假设真的收到合法 roundDisclosureSignal）

### 1.1 静态每 Heat 桶 Formal 库存（**若 Heat 已在该档**；legacy 卡不受 Heat 硬过滤）

| Heat | 包内合法 | 其中 Formal | 其中 legacy |
|---|---|---|---|
| H1 | 130 | 4 | 126 |
| H2 | 131 | 5 | 126 |
| H3 | 131 | 5 | 126 |
| H4 | 127 | 1 | 126 |

> 四档 Formal 桶均**非空**：H1=4 / H2=5 / H3=5 / H4=1。这是「若 Heat 已在该档」的库存能力，**不等于从 H1 冷启能走到该档**（见 1.2）。

### 1.2 全包真链冷启可达性（全包真实牌堆，两 mode 各 4000 局，每 completed 轮给合法披露）

| 指标 | 口径 A（Engine / 显式 disclosure） |
|---|---|
| 局数 | 4000 |
| 跑满 20 轮 | 3632（90.8%） |
| dead-end | 368（9.2%），终止原因 {"round_limit":3632,"pack_exhausted":0,"global_exhausted":368,"awaiting_host":0,"guard_limit":0} |
| Formal 曝光占比 | 3.2%（2984/93443） |
| Formal 曝光卡数 | 5/5 —— `PN-TRUTH-203`、`PN-TRUTH-205`、`PN-TRUTH-209`、`PN-TRUTH-227`、`PN-TRUTH-229` |
| heatAtDraw | H1 72131 / H2 19880 / H3 1432 / H4 0 |
| 到达 H2 / H3 / H4 局数 | 2634 / 505 / 0 |
| H2 到达率（到达 H2 的 seed 局比例） | 2634/4000（65.8%） ⇒ **H2 reach > 0** |
| 有效信息轮/局 | 4.59 |
| 有效轮 gain 分布 | high 8831 / medium 9524 |
| 人物维度覆盖（全样本）/ 每局 | 13 / 3.87 |
| 最长低/0 信息连击（跑满局均值） | 8.48 |
| 到中途互选窗口（count≥12） | 2 |
| 局内重复抽卡次数 | 0 |
| 全程零有效轮局 | 9 |

### 1.3 仅 Formal 5 张真实生产卡（口径 A 下的「牌堆只有可计数卡」上界情形）

- 牌堆：仅 Formal（manifest 轨）5 张（PN-TRUTH-203~229，真实生产卡）
- 结果：完成 5 轮后，第 6 轮不再给出题卡（`AWAITING_HOST_EXHAUSTION_DECISION`）；最终 Heat **H2**、effective count **5**。
- 逐档首达轮次：{"H1":1,"H2":4,"H3":null,"H4":null}；已到达 H1/H2，未到达 H3/H4。
- 派生说明（由本轮运行结果现算，非手写）：仅 Formal（manifest 轨）5 张（PN-TRUTH-203~229，真实生产卡）：实际到达的档：H1（首达第 1 轮）、H2（首达第 4 轮）；未到达的档：H3、H4。最终 Heat=H2、有效信息轮=5。未到达原因：H3 —— 冷启门库存不足：H2 及以下档可计数卡 5 张 < H3 门槛 8（缺口 3 张）⇒ 即便把这些卡全部抽满，最多也只累积有效轮 5，结构上到不了 H3（更高档的卡因 Heat 未升档被硬过滤，牌堆因此提前耗尽）；本次实测累计有效轮 5／共 5 轮；H4 —— 受上游 H3 门所限（H3 未解锁 ⇒ 恒不可达）。

### 1.4 ceiling 1~5（按 intensityLimit 分档，各档约 1/5 样本）

| 口径 | intensityLimit | 局数 | dead-end | dead-end 率 | Formal 曝光占比 | 有效轮/局 |
|---|---|---|---|---|---|---|
| B（当前 UI） | 1 | 771 | 368 | 47.7% | 8.7% | 0 |
| B（当前 UI） | 2 | 760 | 0 | 0.0% | 6.1% | 0 |
| B（当前 UI） | 3 | 780 | 0 | 0.0% | 0.0% | 0 |
| B（当前 UI） | 4 | 856 | 0 | 0.0% | 0.0% | 0 |
| B（当前 UI） | 5 | 833 | 0 | 0.0% | 0.0% | 0 |
| A（engine） | 1 | 771 | 368 | 47.7% | 8.7% | 4.15 |
| A（engine） | 2 | 760 | 0 | 0.0% | 8.2% | 7.78 |
| A（engine） | 3 | 780 | 0 | 0.0% | 0.0% | 5.8 |
| A（engine） | 4 | 856 | 0 | 0.0% | 0.0% | 2.1 |
| A（engine） | 5 | 833 | 0 | 0.0% | 0.0% | 3.51 |

### 1.5 最差 trace（口径 A：mode B，选 dead-end 优先）

- 挑选规则：dead-end 优先 → 有效信息轮最少 → 完成轮最少 → Formal 曝光最少 → 最长低/0 信息连击最大
- 命中：桌型 **2m3f**，seed **28359492**，intensityLimit **1**，mode B
- 结果：完成 14 轮后 `global_exhausted`（dead-end=true）；共抽 23 次；Formal 曝光 2；有效信息轮 0；最长低/0 信息连击 14；heatAtDraw H1 23 / H2 0 / H3 0 / H4 0

| 轮 | 卡 | 轨 | Heat@抽卡 | 终态 | informationGain | topic | 记有效轮 |
|---|---|---|---|---|---|---|---|
| 1 | PN-DARE-008 | legacy | H1 | completed | null | null | — |
| 6 | PN-DARE-001 | legacy | H1 | completed | null | null | — |
| 8 | PN-TRUTH-010 | legacy | H1 | completed | null | null | — |
| 9 | PN-TRUTH-003 | legacy | H1 | completed | null | null | — |
| 10 | PN-DARE-006 | legacy | H1 | completed | null | null | — |
| 12 | PN-TRUTH-007 | legacy | H1 | completed | null | null | — |
| 13 | PN-DARE-004 | legacy | H1 | completed | null | null | — |
| 15 | PN-TRUTH-004 | legacy | H1 | completed | null | null | — |
| 16 | PN-TRUTH-009 | legacy | H1 | completed | null | null | — |
| 17 | PN-TRUTH-001 | legacy | H1 | completed | null | null | — |
| 18 | PN-DARE-003 | legacy | H1 | completed | null | null | — |
| 20 | PN-TRUTH-002 | legacy | H1 | completed | null | null | — |
| 21 | PN-DARE-007 | legacy | H1 | completed | null | null | — |
| 23 | PN-DARE-005 | legacy | H1 | completed | null | null | — |

**文字归因**（逐条由数据派生）：
1. 它是 **dead-end**（global_exhausted，只完成 14/20 轮）：按 `global_exhausted` 终止。
2. 共抽 23 次里 Formal **2 张**，其中 completed 轮 **0 张**、skipped 轮 **2 张**（skipped 无 completed ⇒ 无披露）；completed 轮里 legacy 14 张 ⇒ sidecar 恒 null ⇒ 有效轮 **0**。
3. 有效轮 0 < 4（H2 门槛）⇒ **Heat 始终停在 H1**，认识证据与互选窗口都无从谈起。

## 2｜口径 B｜Current real UI（disclosure producer 未接入）

- **事实**：`app/game/page.tsx#roundDisclosureForCurrentRound()` 恒返回 `undefined`（Human 本批冻结：不新增披露 UI）⇒ `isEffectiveInformationRound` fail-closed 恒 false ⇒ `relationshipEffectiveCardCount` 恒 0 ⇒ **Heat 恒 H1**。
- **当前 UI 实际可抽到的 Formal 张数**：**4 张**（= 卡面 `heatMin=1` 且 H1 桶合法者）—— **`PN-TRUTH-203`、`PN-TRUTH-205`、`PN-TRUTH-227`、`PN-TRUTH-229`**。
- **当前 UI 实际抽到的 Formal**（4000 局实测）：distinct **4/5** —— `PN-TRUTH-203`、`PN-TRUTH-205`、`PN-TRUTH-227`、`PN-TRUTH-229`；曝光 2.8%（2605/93443）。
- effective count **恒 0**；跑满 20 轮 3632（90.8%）、dead-end 368（9.2%）；heatAtDraw H1 93443 / H2 0 / H3 0 / H4 0；到达 H2/H3/H4 = 0/0/0；中途互选窗口 **0 局**。
- 对照口径 A（同样 4000 局、仅多一个合法披露信号）：effective **4.59**/局、Formal distinct **5/5**、到达 H2/H3/H4 = 2634/505/0。
> ⛔ **当前 UI 不能产生 effective information round ⇒ Heat 恒 H1 ⇒ mid Mutual 不可达**。这不是「生产 Heat 已正常推进」。

## 3｜结构性缺口与代价（**逐条由产物现算**；缺就如实写缺口，不缺就如实写已解除，禁止反向压 Heat 来消除）

- **当前 UI（口径 B）下「更深档 Formal 不可抽」**：H1 桶只收 4 张 `heatMin=1` 的 Formal；其余 1 张 `heatMin≥2` 在 Heat 恒 H1 时被硬过滤（静态桶 H2=5 / H3=5 / H4=1 张，实践抽不到）。
- **H1→H2 冷启门：库存侧已解除**：H1 桶内可计数 Formal **4 张 ≥ H2 门槛 4（余量 0 张）⇒ 只要每轮给合法披露，Heat 可离开 H1**；4000 局口径 A 实测到达 H2 2634 局（65.8%）。
- **H2→H3 冷启门仍缺库存**：`heatMin≤2` 的 Formal 累计 **5 张 < H3 门槛 8（缺口 3 张）**；实测口径 A 到达 H3 505 局。
- **H3→H4 冷启门仍缺库存**：`heatMin≤3` 的 Formal 累计 **5 张 < H4 门槛 13（缺口 8 张）**；实测口径 A 到达 H4 0 局 —— **该档 0 张属实且如实登记，不靠压低门槛消除**。
- **ceiling=1 断粮**：intensityLimit=1 的局 dead-end 率 **47.7%**（口径 A），终止原因分布 {"round_limit":403,"pack_exhausted":0,"global_exhausted":368,"awaiting_host":0,"guard_limit":0}；单包 truth-dare 在 I1 上限下 20 轮**不可持续**（由该率现判）。
- **中途互选窗口 [12, 14]**：口径 A 下 count≥12 的局 2/4000（已达窗口）。

## 4｜补卡建议（一律靠补内容，不靠放宽门槛；**建议随产物里的实际缺口现判**，不缺的档不再提）

1. **H1→H2 冷启门在库存侧已解除，不再提「补 H1」**：当前 truth-dare `heatMin=1` 的 Formal 已有 4 张 ≥ H2 门槛 4（口径 A 实测到达 H2 2634 局）⇒ 库存侧下一道门在 H3→H4：`heatMin≤2` 累计 5（H3 门槛 8，缺口 3）、`heatMin≤3` 累计 5（H4 门槛 13，缺口 8）。
2. **H1 卡强度构成已非全 I1，不再提「全为 I1」**：当前 4 张 H1 Formal 的 intensity 分布 {"1":2,"2":2}（口径 A 曝光 3.2%）；如继续提曝光，可优先补 `heatMin=1` 的 I3~I5 浅关系卡（仍禁止为曝光做不自然高尺度）。
3. **heatMax 覆盖（H4 层）**：当前 heatMax 分布 {"3":4,"4":1}；建议每玩法 ≥8 张 `heatMax=4`，避免 Heat 升高后 Formal 库存反而变薄（H1→H4 Formal 合法数 H1 4 → H2 5 → H3 5 → H4 1）。
4. **topic 覆盖（摊平）**：当前覆盖 4 个人物维度，其中仅 1 张的维度 `生活方式`/`性格·习惯·小癖好`/`择偶偏好`；建议每玩法 Formal 覆盖 ≥5 个 topic，并补齐 A.1 零维度（`吃醋·占有`/`异性朋友边界`/`前任态度`/`底线·雷区`/`人生目标·理想生活`）。
5. **跨玩法分摊**：当前 5 张全在 truth-dare；把审计 metadata 补到全部其他玩法的固定卡上，而非只堆 truth-dare。
6. **不要动的旋钮**：认识阈值、窗口 [12, 14]、`MUTUAL_MIN_HEAT=H3`、Heat 硬过滤、`isEffectiveInformationRound` fail-closed、±18% 阈值、样本量一律不动。

## 5｜真实生产链验证（§十八 第一段）

- 链路：startRound（唯一出题入口 → drawDeckCard → createDeckRouter 生产 Router 三层计数） → resolveRoundAndReduce(session,'complete',roundDisclosureSignal({selfDisclosed, disclosedPlayerIds})) → eventForRoundTerminal（卡侧 metadata 由 metadataForCard 读生产 sidecar；轮侧披露由正式信号提供） → reduceV2SessionEvents → relationshipEffectiveCardCount / heatForEffectiveCount
- 纪律：本文件与 integration 测试均不注入 metadata override；Formal 5 张（A3 KEEP 5）与已退出 Formal 的 26 张旧卡的 informationGain/topic 都来自生产 sidecar 真实投影；无 §7.2 metadata 的 SSOT 旧卡 sidecar 恒 null（fail-closed 不计有效轮）。

| 情形 | 牌堆 | 轮数 | 终态 Heat | 最终 effective count | Heat 逐档首达（轮次） |
|---|---|---|---|---|---|
| 全包（真实生产牌堆） | mainlineSsotCardsByPack('truth-dare')（131 张，含 Formal 5 + legacy 100） | 20 | H2 | 4 | {"H1":1,"H2":19,"H3":null,"H4":null} |
| 仅 Formal 5 张 | 仅 Formal（manifest 轨）5 张（PN-TRUTH-203~229，真实生产卡） | 5 | H2 | 5 | {"H1":1,"H2":4,"H3":null,"H4":null} |
| 仅 Bootstrap 7 张（其中仅 227/229 属 Formal） | 仅 Bootstrap 7 张（PN-TRUTH-225~231；其中仅 227/229 属 Formal，其余 5 张已退出 Formal） | 7 | H2 | 7 | {"H1":1,"H2":4,"H3":null,"H4":null} |
| 仅 legacy（负向对照） | 仅 legacy 卡（100 张，无 Formal） | 20 | H1 | 0 | {"H1":1,"H2":null,"H3":null,"H4":null} |

- 全包（seed=1，**给了合法披露信号**）：Formal 卡被抽到 **0 张**；有效计数 4、Heat H2；未触发耗尽，共 20 轮。
- 仅 Formal 5 张（seed=1，**给了合法披露信号**）：共 5 轮，抽到 `PN-TRUTH-203`、`PN-TRUTH-205`、`PN-TRUTH-209`、`PN-TRUTH-227`、`PN-TRUTH-229`（含 H1 桶合法集合以外的卡），effective 5 / H2 门槛 4（已跨过 H2 门槛）⇒ 实测终态 Heat **H2**（逐档首达见上表）；完成 5 轮后，第 6 轮不再给出题卡（`AWAITING_HOST_EXHAUSTION_DECISION`）。
- 仅 Bootstrap 7 张（seed=1，**给了合法披露信号**；其中仅 227/229 属 Formal）：共 7 轮，该子集 7 张都带 §7.2 metadata ⇒ 每轮计有效轮（Formal 归属只影响曝光统计、不影响计数口径），effective 7 ⇒ 首达 {"H1":1,"H2":4,"H3":null,"H4":null}；完成 7 轮后，第 8 轮不再给出题卡（`AWAITING_HOST_EXHAUSTION_DECISION`）（该子集 < 下一档门槛，属真实缺口）。
- 全包 200 seed 扫描（不挑 seed，**同一固定桌型/固定配置的窄口径**，与 §1.2 的 4000 局多桌型聚合口径并列阅读、不互相替代）：到达 H2 107 局、H3 0 局、H4 0 局；终态 Heat 分布 {"H2":107,"H1":93}；有效轮/局 3.46。
- legacy 负向对照：sidecar 恒 null ⇒ effective 恒 0、Heat 恒 H1（fail-closed 成立）。

- 四情形 **派生 note**（由各自运行结果现算，不允许手写结论）：
  - 全包：mainlineSsotCardsByPack('truth-dare')（131 张，含 Formal 5 + legacy 100）：实际到达的档：H1（首达第 1 轮）、H2（首达第 19 轮）；未到达的档：H3、H4。最终 Heat=H2、有效信息轮=4。未到达原因：H3 —— 非「库存不足」：H2 及以下档可计数卡 19 张 ≥ H3 门槛 8，但本次仅累计有效轮 4（共 20 轮）⇒ 未达门槛来自牌堆耗尽／intensity 过滤／软去重／抽卡排序，而非冷启库存；H4 —— 受上游 H3 门所限（H3 未解锁 ⇒ 恒不可达）。
  - 仅 Formal：仅 Formal（manifest 轨）5 张（PN-TRUTH-203~229，真实生产卡）：实际到达的档：H1（首达第 1 轮）、H2（首达第 4 轮）；未到达的档：H3、H4。最终 Heat=H2、有效信息轮=5。未到达原因：H3 —— 冷启门库存不足：H2 及以下档可计数卡 5 张 < H3 门槛 8（缺口 3 张）⇒ 即便把这些卡全部抽满，最多也只累积有效轮 5，结构上到不了 H3（更高档的卡因 Heat 未升档被硬过滤，牌堆因此提前耗尽）；本次实测累计有效轮 5／共 5 轮；H4 —— 受上游 H3 门所限（H3 未解锁 ⇒ 恒不可达）。
  - 仅 Formal 子集 Bootstrap：仅 Bootstrap 7 张（PN-TRUTH-225~231；其中仅 227/229 属 Formal，其余 5 张已退出 Formal）：实际到达的档：H1（首达第 1 轮）、H2（首达第 4 轮）；未到达的档：H3、H4。最终 Heat=H2、有效信息轮=7。未到达原因：H3 —— 冷启门库存不足：H2 及以下档可计数卡 7 张 < H3 门槛 8（缺口 1 张）⇒ 即便把这些卡全部抽满，最多也只累积有效轮 7，结构上到不了 H3（更高档的卡因 Heat 未升档被硬过滤，牌堆因此提前耗尽）；本次实测累计有效轮 7／共 7 轮；H4 —— 受上游 H3 门所限（H3 未解锁 ⇒ 恒不可达）。
  - 仅 legacy：仅 legacy 卡（100 张，无 Formal）：实际到达的档：H1（首达第 1 轮）；未到达的档：H2、H3、H4。最终 Heat=H1、有效信息轮=0。未到达原因：H2 —— 牌堆内可计数卡 0 张（无 §7.2 metadata ⇒ isEffectiveInformationRound fail-closed 恒不计有效轮）；H3 —— 受上游 H2 门所限（H2 未解锁 ⇒ 恒不可达）；H4 —— 受上游 H2 门所限（H2 未解锁 ⇒ 恒不可达）。

## 6｜复跑命令

```bash
npx vite-node -c vitest.config.ts scripts/audit-formal-truth-montecarlo.ts
npx vite-node -c vitest.config.ts scripts/audit-formal-truth-production-chain.ts
npx vite-node -c vitest.config.ts scripts/audit-formal-truth-report.ts
```

