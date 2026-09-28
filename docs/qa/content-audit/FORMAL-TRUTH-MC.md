# 第一包「Formal Fixed 真心话」单包 Router Monte Carlo + 最差 trace + 生产链验证（C1-8 / A5 双口径）

- 生成：`scripts/audit-formal-truth-report.ts`（统计值全部读自 JSON 产物，阈值读自 `v2-state`，报告侧不手写）
- 卡源：`mainlineSsotCardsByPack('truth-dare')（SSOT 主线 + 第一包正式内容）` —— pack 124 张（Formal 24 / legacy 100）
- Router：createV2MainlineRouter（审计 / MC 侧）— C1-8 起与生产 createDeckRouter 共享桥接卡源 mainlineRuntimeCards()
- 参数：4 桌型 × 1000 局/桌型 × 20 轮；guard 上限 1000；completed 概率 0.85；软去重窗口 5
- 单包 = 真心话（truth-dare）；不切包（任何耗尽判本局 dead-end，生产单玩局同口径）。

## 0｜口径声明（先读这一段，禁止混写）

- **口径 A｜Engine / explicit disclosure**：**假设本轮真的收到合法 `roundDisclosureSignal`**（`selfDisclosed + disclosedPlayerIds`，走同一条 `reduceV2SessionEvents` 归约）。数据源 = MC `modeB` ＋ 生产链「仅 Formal 24 张」情形。
- **口径 B｜Current real UI**：`app/game/page.tsx#roundDisclosureForCurrentRound()` **恒返回 `undefined`** ⇒ 无 effective information round ⇒ **Heat 恒 H1、中途 Mutual（`count≥12` 且 `Heat≥H3`）不可达**。数据源 = MC `modeA`（生产实况：不给任何披露信号）。
- ⛔ **禁止把 A 当 B**：本报告任何「Heat 可达 H2/H3/H4」都**只在口径 A 的静态桶/或 Heat 已在该档时成立**；**当前 UI（口径 B）Heat 恒 H1**，不存在「生产 Heat 已正常推进」这回事。
- 门槛真源：H2=4 / H3=8 / H4=13（有效信息轮数）；中途互选窗口 [12, 14]，最低 `MUTUAL_MIN_HEAT=H3`。

## 1｜口径 A｜Engine / explicit disclosure（假设真的收到合法 roundDisclosureSignal）

### 1.1 静态每 Heat 桶 Formal 库存（**若 Heat 已在该档**；legacy 卡不受 Heat 硬过滤）

| Heat | 包内合法 | 其中 Formal | 其中 legacy |
|---|---|---|---|
| H1 | 103 | 3 | 100 |
| H2 | 112 | 12 | 100 |
| H3 | 121 | 21 | 100 |
| H4 | 119 | 19 | 100 |

> 四档 Formal 桶均**非空**：H1=3 / H2=12 / H3=21 / H4=19。这是「若 Heat 已在该档」的库存能力，**不等于从 H1 冷启能走到该档**（见 1.2）。

### 1.2 真链冷启可达性（全包真实牌堆，两 mode 各 4000 局，每 completed 轮给合法披露）

| 指标 | 口径 A（Engine / 显式 disclosure） |
|---|---|
| 局数 | 4000 |
| 跑满 20 轮 | 3339（83.5%） |
| dead-end | 661（16.5%），终止原因 {"round_limit":3339,"pack_exhausted":661,"global_exhausted":0,"awaiting_host":0,"guard_limit":0} |
| Formal 曝光占比 | 2.9%（2674/92264） |
| Formal 曝光卡数 | 3/24 —— `PN-TRUTH-201`、`PN-TRUTH-202`、`PN-TRUTH-203` |
| heatAtDraw | H1 92264 / H2 0 / H3 0 / H4 0 |
| 到达 H2 / H3 / H4 局数 | 0 / 0 / 0 |
| 有效信息轮/局 | 0.56 |
| 有效轮 gain 分布 | medium 2250 |
| 人物维度覆盖（全样本）/ 每局 | 2 / 0.42 |
| 到中途互选窗口（count≥12） | 0 |
| 局内重复抽卡次数 | 0 |
| 全程零有效轮局 | 2973 |

### 1.3 仅 Formal 24 张真实生产卡（口径 A 下的「牌堆只有可计数卡」上界情形）

- 牌堆：第一包 Formal 24 张（PN-TRUTH-201~224，真实生产卡）
- 结果：完成 3 轮（第 4 轮起判 `PACK_EXHAUSTED`，D8 交 Host，不自动洗牌/结束）；最终 Heat **H1**、effective count **3**。
- 逐档首达轮次：{"H1":1,"H2":null,"H3":null,"H4":null}（H2/H3/H4 全为 `null`）。

### 1.4 ceiling 1~5（按 intensityLimit 分档，各档约 1/5 样本）

| 口径 | intensityLimit | 局数 | dead-end | dead-end 率 | Formal 曝光占比 | 有效轮/局 |
|---|---|---|---|---|---|---|
| B（当前 UI） | 1 | 771 | 661 | 85.7% | 14.3% | 0 |
| B（当前 UI） | 2 | 760 | 0 | 0.0% | 2.0% | 0 |
| B（当前 UI） | 3 | 780 | 0 | 0.0% | 0.0% | 0 |
| B（当前 UI） | 4 | 856 | 0 | 0.0% | 0.0% | 0 |
| B（当前 UI） | 5 | 833 | 0 | 0.0% | 0.0% | 0 |
| A（engine） | 1 | 771 | 661 | 85.7% | 14.3% | 2.54 |
| A（engine） | 2 | 760 | 0 | 0.0% | 2.0% | 0.38 |
| A（engine） | 3 | 780 | 0 | 0.0% | 0.0% | 0 |
| A（engine） | 4 | 856 | 0 | 0.0% | 0.0% | 0 |
| A（engine） | 5 | 833 | 0 | 0.0% | 0.0% | 0 |

### 1.5 最差 trace（口径 A：mode B，选 dead-end 优先）

- 挑选规则：dead-end 优先 → 有效信息轮最少 → 完成轮最少 → Formal 曝光最少 → 最长低/0 信息连击最大
- 命中：桌型 **2m2f**，seed **22503787**，intensityLimit **1**，mode B
- 结果：完成 12 轮后 `pack_exhausted`（dead-end=true）；共抽 21 次；Formal 曝光 3；有效信息轮 0；最长低/0 信息连击 12；heatAtDraw H1 21 / H2 0 / H3 0 / H4 0

| 轮 | 卡 | 轨 | Heat@抽卡 | 终态 | informationGain | topic | 记有效轮 |
|---|---|---|---|---|---|---|---|
| 1 | PN-TRUTH-003 | legacy | H1 | completed | null | null | — |
| 2 | PN-TRUTH-006 | legacy | H1 | completed | null | null | — |
| 3 | PN-TRUTH-009 | legacy | H1 | completed | null | null | — |
| 4 | PN-TRUTH-001 | legacy | H1 | completed | null | null | — |
| 5 | PN-DARE-007 | legacy | H1 | completed | null | null | — |
| 8 | PN-DARE-005 | legacy | H1 | completed | null | null | — |
| 10 | PN-TRUTH-002 | legacy | H1 | completed | null | null | — |
| 12 | PN-DARE-002 | legacy | H1 | completed | null | null | — |
| 14 | PN-TRUTH-005 | legacy | H1 | completed | null | null | — |
| 16 | PN-DARE-008 | legacy | H1 | completed | null | null | — |
| 19 | PN-DARE-004 | legacy | H1 | completed | null | null | — |
| 21 | PN-TRUTH-007 | legacy | H1 | completed | null | null | — |

**文字归因**（逐条由数据派生）：
1. 它是 **dead-end**（pack_exhausted，只完成 12/20 轮）：`intensityLimit=1` 的合法池先被抽干。
2. 共抽 21 次里只有 **3 张 Formal**（且都落在 `skipped` 轮 ⇒ 无 completed ⇒ 无披露）；表内 12 个 completed 轮**全是 legacy** ⇒ sidecar 恒 null ⇒ 有效轮 **0**。
3. 有效轮 0 < 4（H2 门槛）⇒ **Heat 全程停在 H1**，认识证据与互选窗口都无从谈起。

## 2｜口径 B｜Current real UI（disclosure producer 未接入）

- **事实**：`app/game/page.tsx#roundDisclosureForCurrentRound()` 恒返回 `undefined`（Human 本批冻结：不新增披露 UI）⇒ `isEffectiveInformationRound` fail-closed 恒 false ⇒ `relationshipEffectiveCardCount` 恒 0 ⇒ **Heat 恒 H1**。
- **当前 UI 实际可抽到的 Formal 张数**：**3 张**（= 卡面 `heatMin=1` 且 H1 桶合法者）—— **`PN-TRUTH-201`、`PN-TRUTH-202`、`PN-TRUTH-203`**。
- **当前 UI 实际抽到的 Formal**（4000 局实测）：distinct **3/24** —— `PN-TRUTH-201`、`PN-TRUTH-202`、`PN-TRUTH-203`；曝光 2.9%（2673/92264）。
- effective count **恒 0**；heatAtDraw H1 92264 / H2 0 / H3 0 / H4 0；到达 H2/H3/H4 = 0/0/0；中途互选窗口 **0 局**。
- 对照口径 A（同样 4000 局、仅多一个合法披露信号）：effective **0.56**/局、Formal distinct **3/24**、到达 H2/H3/H4 = 0/0/0。
> ⛔ **当前 UI 不能产生 effective information round ⇒ Heat 恒 H1 ⇒ mid Mutual 不可达**。这不是「生产 Heat 已正常推进」。

## 3｜重标带来的结构性代价（Human 2026-09-28 已明确接受；禁止掩饰，也禁止反向压 Heat 来消除）

- **当前 UI（口径 B）下 H2/H3/H4 档的 Formal 库存 = 0（实践不可抽）**：只有 3 张 `heatMin=1` 的卡进得了 H1 桶；其余 21 张 `heatMin≥2` 在 Heat 恒 H1 时被硬过滤。
- **口径 A 也断在「H1→H2 冷启门」（关键诚实结论）**：H1 桶内**可计数**的 Formal 仅 **3 张 < H2 门槛 4**（缺口 1 张）⇒ 即便每轮都给合法披露，Heat **也离不开 H1**（4000 局口径 A 到达 H2 仅 0 局）。H2/H3/H4 桶内静态有货（H1=3 / H2=12 / H3=21 / H4=19），但**从 H1 冷启走不到**。
- **H3/H4 桶非 0 张，但可达性为 0**：H3 桶 21 张、H4 桶 19 张；受上游 H2 门所限，口径 A 到达 H3/H4 = 0/0 局。
- **ceiling=1 断粮**：intensityLimit=1 的局 dead-end 率 **85.7%**（口径 A），全部 `pack_exhausted`；单包 truth-dare 在 I1 上限下 20 轮不可持续。
- **中途互选窗口 [12, 14] 结构性不可达**：口径 A 下 count≥12 的局 **0**/4000（Heat 走不到 H3）。

## 4｜补卡建议（一律靠补内容，不靠放宽门槛；补什么 topic / heatMax / intensity）

1. **先补 H1→H2 冷启门（最高优先，最小可解）**：每玩法至少要 **≥4 张 `heatMin=1` 的 Formal 卡**（当前 truth-dare 仅 3 张），Heat 才可能离开 H1；要走到 H3/H4 需累计 ≥8/13 张 `heatMin≤2`/`heatMin≤3`。**不得用压低 heatMin 解决**，要通过新增真实浅关系题。
2. **补「能真被抽到」的 H1 卡（intensity 维度）**：当前 3 张全为 `intensity=1`，在建堆里输给 legacy 高强度档（口径 A 曝光仅 2.9%）。建议补 **`heatMin=1` 且 `intensity` 偏高（I3~I5）** 的浅关系 Formal 卡，让它们能进入 top 强度档被实际抽出。
3. **heatMax 覆盖（H4 层）**：当前 heatMax 分布 {"2":1,"3":4,"4":19}；建议每玩法 ≥8 张 `heatMax=4`，避免 Heat 升高后 Formal 库存反而变薄（H1→H4 Formal 合法数 H1 3 → H2 12 → H3 21 → H4 19）。
4. **topic 覆盖（摊平）**：当前覆盖 13 个人物维度，唯 `择偶偏好`/`亲密边界` 各 1 张；建议每玩法 Formal 覆盖 ≥5 个 topic，并补齐 A.1 零维度（`吃醋·占有`/`异性朋友边界`/`前任态度`/`底线·雷区`/`人生目标·理想生活`）。
5. **跨玩法分摊**：当前 24 张全在 truth-dare；把审计 metadata 补到全部 7 个玩法的固定卡上，而非只堆 truth-dare。
6. **不要动的旋钮**：认识阈值、窗口 [12, 14]、`MUTUAL_MIN_HEAT=H3`、Heat 硬过滤、`isEffectiveInformationRound` fail-closed、±18% 阈值、样本量一律不动。

## 5｜真实生产链验证（§十八 第一段）

- 链路：startRound（唯一出题入口 → drawDeckCard → createDeckRouter 生产 Router 三层计数） → resolveRoundAndReduce(session,'complete',roundDisclosureSignal({selfDisclosed, disclosedPlayerIds})) → eventForRoundTerminal（卡侧 metadata 由 metadataForCard 读生产 sidecar；轮侧披露由正式信号提供） → reduceV2SessionEvents → relationshipEffectiveCardCount / heatForEffectiveCount
- 纪律：本文件与 integration 测试均不注入 metadata override；第一包 24 张的 informationGain/topic 来自生产 sidecar 真实投影。

| 情形 | 牌堆 | 轮数 | 终态 Heat | 最终 effective count | Heat 逐档首达（轮次） |
|---|---|---|---|---|---|
| 全包（真实生产牌堆） | mainlineSsotCardsByPack('truth-dare')（124 张，含第一包 24 张） | 20 | H1 | 0 | {"H1":1,"H2":null,"H3":null,"H4":null} |
| 仅 Formal 24 张 | 第一包 Formal 24 张（PN-TRUTH-201~224，真实生产卡） | 3 | H1 | 3 | {"H1":1,"H2":null,"H3":null,"H4":null} |
| 仅 legacy（负向对照） | 仅 legacy 卡（100 张，无第一包） | 20 | H1 | 0 | {"H1":1,"H2":null,"H3":null,"H4":null} |

- 全包（seed=1，**给了合法披露信号**）：Formal 卡被抽到 **0 张**；有效计数 0、Heat H1。
- 仅 Formal 24 张（seed=1，**给了合法披露信号**）：只够走 3 轮（201/202/203，全 `heatMin=1`），effective 3 < H2 门槛 4 ⇒ Heat 仍 H1，第 4 轮判 `PACK_EXHAUSTED`。
- 全包 200 seed 扫描（不挑 seed）：到达 H2 0 局、H3 0 局、H4 0 局；终态 Heat 分布 {"H1":200}；有效轮/局 0。
- legacy 负向对照：sidecar 恒 null ⇒ effective 恒 0、Heat 恒 H1（fail-closed 成立）。

## 6｜复跑命令

```bash
npx vite-node -c vitest.config.ts scripts/audit-formal-truth-montecarlo.ts
npx vite-node -c vitest.config.ts scripts/audit-formal-truth-production-chain.ts
npx vite-node -c vitest.config.ts scripts/audit-formal-truth-report.ts
```

