# HANDOFF｜交接（暂停/恢复用，先读我）

> 旧版字段（governance-state / Evidence / Human Gate / Promotion / Dispatch ID）已废弃，不填。

---
---

# ★ 大交接 2（2026-09-28 收尾，**接手先读这一段**）

## 0. 三十秒定位

- 仓库：`main`，HEAD **`c61f7d4`**（`fix(content): 审查身份说真话 + 第一包 Heat metadata 说真话`），**已 push，与 origin/main `0 0`，工作树 clean**。（⚠️ 2026-09-29 更新：原文写 `e49ee45`，已过期；当前 HEAD 为 `c61f7d4`，第一包整改已完成并 push。）
- **第一包整改状态（2026-09-28 完成，CR-4 / QA-6 / SUP-4 三链全 PASS）**：
  1. **审查身份说真话**：`reviewed=true` = **独立内容审查完成**（不再等于真人）；新增 `ReviewerKind = "human" | "ai-role"`，由 `assertHumanReviewConsistent` **fail-closed 校验**并写入产物 `buildInfo`（实测 `ai-role`）；`humanBarFit` 等仅保留为历史兼容名、**零 rename**；全仓「真实人工审查」类文案中性化（冻结原文保留并标「历史冻结时状态」）；**本轮不新增 `fieldReviewedByHuman`**（真人现场验证仍由 RG-02 独立把关）。
  2. **Heat metadata 说真话**：24 张 `PN-TRUTH-201~224` 由 reviewer 逐卡重标并逐字落地 —— `heatMin` **H1=3 / H2=9 / H3=10 / H4=2**、`heatMax` **H2=1 / H3=4 / H4=19**、`heatMin<=heatMax` 24/24；只改这两个字段，题面与其它 metadata 由 sha256 指纹 24/24 锁死。
  3. **报告双口径已冻结**：A｜Engine / explicit disclosure 与 B｜Current real UI 强制分写；B 口径有**可执行门禁测试**（源码扫描 `roundDisclosureForCurrentRound` 恒 `undefined` + 行为断言），QA 篡改探针实测「塞值即红」。
- **Truth H1 冷启动：已于 2026-09-29 用 Bootstrap 修复（Engine 口径）**。
  - 原阻塞（历史）：第一包 24 张中 `heatMin=1` 仅 3 张，H2 门槛 `effective>=4` ⇒ 即便 Engine 每轮都给合法 disclosure，Truth 单玩法也只完成 3 个有效信息轮，卡在 H1 进不了 H2（实测 3 轮后 `PACK_EXHAUSTED`、`H2/H3/H4=null`）。
  - 修法（**新增内容，不是把深题降级**）：① 独立 reviewer 单卡复核把 `PN-TRUTH-205` 由 `2/2` 改为 **`1/3`**（题面是轻量小习惯，「熟人相处久了才发现」描述的是信息稀缺性而非提问门槛）；② 新增 `lib/v2-content/formal-truth-bootstrap-pack.ts` **7 张 `PN-TRUTH-225~231`**（`heatMin` 全 1、I1:1/I2:4/I3:2 不是全 I1、`heatMax` 逐卡诚实），经两轮独立审查（PASS 4/BORDERLINE 3 → 重写 → 复判 PASS 7）。
  - 现值：`formal 31`（第一包 24 + Bootstrap 7）、`legacy 421`、`audited 31`、`reviewed 31`、`reviewerKind=ai-role`；**`heatMin=1` 的 Formal 共 11 张**（`201 202 203 205 225 226 227 228 229 230 231`）⇒ 相对门槛 4 **余量 7，冷启动已解决**（code-reviewer 实测：只有 205 时余量为 0，只有 7 张新卡时余量 6，合并后 7；口径 A `H2 reach` 1011/4000）。
  - ⛔ **注意仍在的缺口**：**当前真实 UI 仍不推进 Heat**（`roundDisclosureForCurrentRound()` 恒 `undefined` ⇒ `effective=0`、`Heat=H1`、mid Mutual 不可达）。上述「已解决」**只对 Engine / 显式 disclosure 口径成立**，不要写成「生产 Heat 已正常推进」。
- **第二包状态 = PREP / NOT YET IMPLEMENTED（方向已冻结，尚无产物）**：`lib/v2-content` 目前有**两个**正式内容源 —— `formal-truth-pack.ts`（第一包 24 张）+ `formal-truth-bootstrap-pack.ts`（Bootstrap 7 张）；Either Or / Never Have I Ever（各 20 张候选，共 40 候选，**不是 quota**）方向已冻结但**尚无代码/内容产物**。
- **新硬规则（2026-09-29 起，源自本轮两次教训）**：① 独立 reviewer 产出判定表**必须先真实落盘**并 `ls -l` + `shasum -a 256` 自证，task-manager 核验存在后 builder 才能消费；**转录件不得在未回签的情况下当唯一真源**。② 判定表的**分布汇总必须由脚本从逐卡数据计算**，禁止手填（曾出现同一张卡同时被列入两个档的汇总笔误）。③ 报告/MC 的 `note`/`summary` **必须由实测结果派生**，禁止硬编码结论（曾出现「数据说没到 H2、note 说逐档到 H4」）。
- **通道实况（2026-09-29）**：`codebuddy/deepseek-v4.1-flash` 当日出现 **429 限频**（提示 2026-09-29 20:31 重置），R3 一单按 `USER_MODEL_OVERRIDE` 备用通道改派 `codebuddy/glm-5.3-flash` 并在账本记 `used=备用`。**用户 2026-09-29 指示：后续 builder 继续派 `deepseek-flash`。**
- 提交链：`57f5be3 → 8bcef40（B2.2 Step1~6 + 解除 Heat 断粮）→ 2fffafe（账本/HANDOFF 补记）→ 48850a4（Custom 分轨 + final Mutual 尾巴）→ e49ee45（第一包 24 张）→ fa6995b（大交接 2 收尾）→ 614a3ea（事实/注释过期修正）→ c61f7d4（第一包整改：审查身份 + Heat + 双口径）`。
- 阶段：`PROJECT_PHASE=DEVELOP`｜`DEV_BASELINE=PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST`｜`RC=RC_NEEDS_REFREEZE`｜`CONTENT-01=OPEN`（**第一包已入，但 CONTENT-01 未关闭**）｜`RG-02=HOLD_BY_CONTENT_01`｜三处版本 `1.5.0`｜`AI_MAINLINE_ENABLED` 关闭｜**未部署**（红线：Release Gate 前不部署正式版）。
- 本段之下是历史交接正文（Phase B 之前的过程与旧数字，**部分已过期**，凡与本段冲突以本段为准；历史段只作留痕与经验参考，不要当现状执行）。

## 1. 当前的工作进展

### 1.1 已完成并过三链（Builder → Code Reviewer → QA → Supervisor）
| 批次 | 内容 | 结论 |
|---|---|---|
| B2.2 Step 1~6 | 技术收口批次（fail-closed 计数、双 Router 同口径、负向 E2E、count=14 abandoned、修 D1/D2、Step 3 去最终互选 `Heat>=H3`、Step 4 manifest 两轨+删 `allowLegacyMetadata`、Step 5 跨轨闸、Step 6 BAR-FIT canonical） | CR PASS / QA PASS（首判 FAIL 因覆盖不完整，补测后复验 PASS）/ SUP PASS |
| 收尾两单 | `docs/pm` 越权**恢复** locked baseline；Custom 分轨（Human 方案 A）；final Mutual `awaitingHostDecision` 阻断 + `MUTUAL_MIN_HEAT` 只改 JSDoc | CR-2 PASS / QA-4 PASS / SUP-2 PASS |
| **CONTENT-01 第一包** | **`formal fixed` 0 → 24**（`PN-TRUTH-201~224` 真心话） | CR-3 PASS / QA-5 PASS / SUP-3（代码内容 PASS，先因 2 项治理补正 FAIL，补正后放行） |

### 1.2 已解决的两个产品级问题（接手务必知道，否则会重犯）
1. **Heat 永久 H1 → 第 9 轮 PACK_EXHAUSTED（已解）**
   根因链：`roundDisclosureForCurrentRound()` 恒 `undefined` ＋ SSOT 无 `informationGain/topic` ⇒ `isEffectiveInformationRound` 恒 false ⇒ `relationshipEffectiveCardCount` 恒 0 ⇒ `HEAT_THRESHOLDS` 使 Heat 恒 H1 ⇒ H1 桶每包仅 8~10 张 ⇒ 单玩法局第 9 轮断粮，且中途 Mutual 窗口 `[12,14]` 永不可达。
   **修法（不放松任何冻结）**：新增 `isFormalFixedCard` / `formalFixedIdSet`（真源＝`fixed-content-manifest.json` 的 `provenance.metadataStatus/reviewed/humanBarFit`；**`classifyMainlineCard` 的 `"fixed"` 只表示在冻结快照内，不等于 Formal**），**Heat 硬过滤只对 Formal 卡生效**。`isEffectiveInformationRound` fail-closed 四项、认识阈值、窗口 `[12,14]`、D6 一字未改。
2. **Custom 与正式内容混轨（已解）**：`buildPlayableDeck` 拆 `builtinPool`/`customPool` 建堆二选一；`mixedCandidatePackIds` 剔 custom；Custom self-mode 只用 custom；历史混装 Session 兼容读取、不静默迁 Formal。

### 1.3 第一包交付物与真源
- 内容源：`lib/v2-content/formal-truth-pack.ts`（24 张 `PN-TRUTH-201~224`，`intensity` 覆盖 I1~I5，8 项必填质量字段齐备）。**Heat 已于 2026-09-28 由 reviewer 逐卡重标为诚实值**：`heatMin` H1=3 / H2=9 / H3=10 / H4=2，`heatMax` H2=1 / H3=4 / H4=19（逐卡表见 `temp/HEAT-REVIEW-PACK1.md`）。**既有 390 张 SSOT `text` 零修改。**
- 准入产物：`lib/v2-content/generated/fixed-content-manifest.json` —— `tracks.legacyCompatibility`（414 = 主线 374 + 扩圈 40）／`tracks.formalFixed`（**24**）；被拒 `missingStrictMetadata 390` / `humanBarFit≠PASS 390` / `未人工审 390`。
- 人工级内容审查：`docs/qa/content-audit-v2/BAR-FIT-HUMAN-REVIEW.json`（`source` 已如实标注 **AI 角色** 身份）＋报告 `docs/review/RESEARCH_REVIEW-FORMAL-TRUTH-PACK-1.md`（三轮：PASS 20/4 → 重写 → 23 → 再重写 → **24 全量 PASS**）。
- BAR-FIT 机器产物与 MC：`docs/qa/content-audit-v2/BAR-FIT-AUDIT.json`、运行时真源 `docs/qa/content-audit/FORMAL-TRUTH-MC.json` / `FORMAL-TRUTH-PRODUCTION-CHAIN.json`（**注意：A.1 旧 `ROUTER-MONTE-CARLO.json` 已是入池前快照，已标 stale**）。

### 1.4.0 报告口径纪律（2026-09-28 Human 冻结）

所有 Heat / Mutual 相关结论**必须双口径分写**，禁止混成一句：
- **Engine / explicit-disclosure model**：假设本轮真的收到合法 `roundDisclosureSignal`，可验证状态机 `H1→H2→H3→H4` 与 Mutual 触发能力。
- **Current real UI**：`app/game/page.tsx` 的 `roundDisclosureForCurrentRound()` 仍恒 `undefined` ⇒ `effective information round` 不成立 ⇒ **Heat 仍 H1、mid Mutual 仍不可达**。
- ⛔ **禁止**再写「生产 Heat 已正常推进」这类把 A 当 B 的表述。

### 1.4 已验证的运行时事实
- Formal 真心话 → Router 可出 → metadata 进 production event → effective count 推进 → **Heat 逐档可达**（仅 Formal 24 张牌堆 H1→H2@4→H3@8→H4@13，effective 15）。
- legacy 负向对照：effective 恒 0、Heat 恒 H1、不弹 Mutual、无 MATCH（fail-closed 成立）。
- 现行门禁（编排者亲跑）：`tsc` 0 error｜`lint` 0 error / 11 warning（既有）｜`vitest` **120 文件 / 1172 用例 / 0 failed**｜`playwright` **106 passed / 0 failed / 6 skipped**（skip 原因逐条记录，**无一写成 PASS**）｜`build` 通过｜`build:fixed-manifest` 通过（逐卡对账 414:414、0 mismatch、hash 可复现）｜`check-ledger` = **LEDGER-OK**（TASK-MODEL-LOG **180** 行 / DISPATCH-LOG **237** 行）。

### 1.5 已知内容缺口（**下一批要补的活**；禁止靠放宽门槛解决）
- **ceiling=1 dead-end 67.2%**（518/771 `global_exhausted`）：truth-dare 的 I1 Formal 库存只有 4 张。
- **H3 仅 2.6%（106/4000）、H4 = 0**、中途互选窗口 `count≥12` **不可达（0 局）**。
- 主因不是单卡信息量（24 张无 low/zero），而是**能计数的 Formal 卡太少**（24/124）。
- 补卡方向（supervisor 与 QA 共同建议）：补到**全部 7 个玩法**；每玩法 ≥20 张 `intensity=1`（其中 `heatMax=4` ≥8 张）；每玩法 ≥8 张 `heatMax=4`；每玩法 Formal 覆盖 ≥5 个 topic，并继续补 A.1 的零维度。
- 结论**只覆盖 truth-dare 单包，不可外推**。

## 2. 下一步的任务（按优先级；每件都已有明确口径）

**① 等 Human 拍板 2 项（未拍前不要动）**
1. ~~**`reviewed=true` 口径冲突**（原属 Change C）~~ → **已于 2026-09-28 由 Human 拍板并落地**：`reviewed=true` = **独立内容审查完成**（不再等于真人）；新增 `reviewerKind: "human" | "ai-role"` 由构建器真实读取、参与 fail-closed 校验、写入产物 `buildInfo`（实测 `ai-role`）；`humanBarFit` 等仅保留为历史兼容名、**未** rename；**本轮不新增 `fieldReviewedByHuman`**（真人现场验证仍由 RG-02 独立把关）。
2. **第二包补卡方向与配额**：先补哪个玩法、目标张数、是否沿用「宁少勿滥不凑数」。

**② 第二包内容开发（CONTENT-01 继续）**
- 沿用第一包已跑通的链路：C1-1 只读设计 → C1-2 内容源 → C1-3 管线接入 → C1-4 BAR-FIT 机器审查＋空人审骨架 → **review 角色三轮审查** → 按意见重写 → 修锁旧态测试 → MC/最差 trace/生产链验证 → CR → QA → SUP。
- 纪律（Human 明确）：机器档位不得当人工结论；审查者身份必须如实标注；**宁少勿滥、不凑数**；缺口靠补内容不靠放宽门槛；不改旧 350 题 text；不恢复 AI 主线；不为 quota 写垃圾题。
- **~~新包 `heatMin` 一律 1~~ —— ⛔ 已于 2026-09-28 被 Human 废除，禁止再照此执行。**
  - 废止原因：`heatMin` 一律 1 等于**用 `Intensity` 代替 `Heat` 的关系推进作用**，与「Heat = 关系聊到多深、Intensity = 用户接受多大尺度、两者正交」的冻结定义冲突。
  - **现行规则**：内容 Heat metadata **按真实关系阶段逐卡标注**（H1 刚认识自然／H2 聊过几轮／H3 需一定信任／H4 明显深层），`heatMax` 同样诚实，**禁止为了库存统一拉 4**、**禁止为了 runtime 能抽到压低 `heatMin`**。
  - **Heat 必须逐卡判、由 reviewer 决定**：builder 不得自行决定 Heat，也不得改题面。
  - **新包仍要先跑 Router MC**，但 MC 报告必须**双口径**（见下条），不得用「可抽到多少张」反向压 Heat。

**③ B2.2 尚未做的 Step（技术侧）**
- ~~剩余轨道隔离：`custom`/`AI` 轨与 snapshot 轨在「新建牌堆」层面的彻底分离（C 类，需 Human 拍 A/B/C）~~ → **历史待裁事项，已由 Human 方案 A 关闭**（2026-09-28，CR-2 / QA-4 / SUP-2 全 PASS，commit `48850a4`）：自定义包已退出 Mixed 正式组局、只保留独立 Custom / self-mode。**不要重复立项。** 保留的已知边角：custom-only 局切内置玩法会落 AWAITING 出口（既有体验问题，P3），以及自定义玩法无独立首页入口（既有）。
- `mutualFinalCheckTrigger` 仍未接 App（按 Human 冻结，**等第一包内容起量 + MC + Human Gate** 再定 HEAT/TIMING）。
- Step 5/6 剩余细节：见 `docs/review/CODE_REVIEW-CONTENT-01-PACK-1.md` 的 P2/P3。

**④ RG 与 Release（未到时间）**
- `CONTENT-01` 未关闭前不执行 `RG-02`；`RG-01` 真人手点与 4/5 人真人局由用户排期；**不重冻 RC、不 bump、不部署**。

## 3. 注意事项及相关规矩（踩过的坑，别再踩）

**治理**
- `docs/pm/**` owner ＝ **planner**，TM 只能写 `docs/handoff`。本轮曾越权改两份 Plan，已 `git checkout` **恢复**（**不用单独 commit 洗白、不与业务代码混 commit**）。
- 记账：`docs/model/TASK-MODEL-LOG.jsonl` 11 必需键 + `note`；`DISPATCH-LOG.jsonl` 每派一行、`used` 恒填主；每次记账后立即 `node scripts/model/check-ledger.mjs` 并对照行数增量。**本轮教训：误重复执行旧记账脚本产生 21+19 重复行**（已去重 + CORRECTION 行）；supervisor 建议加 `(date,task,role)` 幂等键。
- **dispatch 完成 ≠ 验收关闭**：C1/C3 的 `result=PASS` 只表示派工完成，已另追加 CORRECTION 行表达。
- review/QA 报告里凡写「未 commit/未 push」的，后续 push 后要回填（否则历史件会与现状矛盾；本轮 neat-freak 已补 7 处收尾注）。
- 通道实况：某次 `codebuddy/deepseek-v4.1-flash` 返回 **429 限频**，按 `USER_MODEL_OVERRIDE` 备用通道切 `glm-5.3-flash` 成功 —— 该更正已落账本（`used=备用` + CORRECTION 行）。**事实句写前先 grep 账本。**

**代码/技术坑**
- `classifyMainlineCard` 的 `"fixed"` **≠ Formal**；判 Formal 必须用 `isFormalFixedCard`（读 manifest `provenance`）。**从 SSOT 读会静默 fail-open**（SSOT 无 `metadataStatus`）。
- 「只换取卡来源、不同步计数」是**半改无效**：`assessExhaustion` 的 `bucket:` 计数不同步 ⇒ `hard.bucket=0 ∧ widened=0 ∧ pack>0` ⇒ 仍然 `PACK_EXHAUSTED`。解耦必须下沉到 `bucket()` 内部。
- ⚠️ **2026-09-28 起的重要事实变更（务必先读）**：第一包 Heat 诚实重标后，**在当前真实 UI（`roundDisclosureForCurrentRound()` 恒 `undefined` ⇒ Heat 恒 H1）下，24 张 Formal 只有 3 张（201/202/203，heatMin=1）可能被抽到，其余 21 张暂时抽不到**。这是 **Human 明确接受的正确结果**（内容 metadata 说真话，runtime 缺口由 runtime 以后解决），**不得**用「把 heatMin 压回 1」或「让 builder 改题」来消除。
  - 后果（已知、如实登记）：在 disclosure 落地前，第一包对真实 UI 的实际贡献接近于零，`Heat 永久 H1` 这个 CONTENT-01 想解决的问题在生产侧**重新变为 inert**。要真正解决，只能等 disclosure UX 单独走 Human Gate。
- `roundDisclosureForCurrentRound()` 仍恒 `undefined`（Human 冻结本批不新增披露 UI）⇒ 生产 UI 无法形成认识证据 ⇒ 中途 Mutual 在生产仍不可达；**正向验证只能走 integration 的正式 disclosure 通道**，禁止手搓 state。
- 测试断言不要硬编码数量（如 `formal=23`）：本轮已改为**按人审输入派生**，否则每轮人审都会变红。
- 锁旧态的既有测试断言可以改，但必须给「原断言 → 新断言 → 作废原因」，且**保留/加强** fail-closed（空人审重建 ⇒ `formal=0`；PASS 全入 / 非 PASS 不入；`reviewed` 集合与人审非 `UNREVIEWED` 集合双向相等）。
- `next-env.d.ts` 会被全量 E2E 自动改回 `.next/dev/types` 变体 —— **每次 commit 前 `git status` 复查并排除**。
- E2E 必须 `--testTimeout=30000` 跑 vitest；跑前查 3000 端口，**不得 kill 别人的服务**。
- 版本三处联动：`package.json` / `public/version.json` / `public/sw.js` 的 `CACHE_VERSION`，**同值**；本轮仍 `1.5.0`。
- 内容安全三条红线永不进题库（露骨 / 强迫惩罚灌酒 / 隐私脱衣非自愿）；亲密类必须 `consentMode=skip-anytime` 且按 intensity 严格分档（I1 零亲密/性内容）。
- 「至少两名当前合法候选各有本人披露」「窗口 `[12,14]`」「中途 `MUTUAL_MIN_HEAT=H3`」是 Human 冻结数值，**不得修改**。
- 边界标签：泛标签（`relationship-sensitive`、`proximity`）**不再**冒充精确映射；精确 10 项才产过滤标签。
- 真机规矩：只动 **11T Pro+（IN9LZTAY4UGU4JF）**；**12 Pro（indq5xfi6hovay4d）禁碰**。测试连接/开局验证**只能真人手点**。
- 部署：Vercel Git 自动部署已断，走 CLI 手动 `vercel deploy --prod --scope houfan`；**但本项目在 Release Gate 前不部署**。
- `temp/` 已被 `.gitignore` 覆盖不入仓；其中被 HANDOFF/review/QA 引用的文件**必须保留**。

**流程教训（本轮新增）**
- 派工**切碎**：19~30 单、每单 1~2 文件 + 明确验收命令，零超时零半成品（历史上大单超时留半成品两次）。
- 派工单要写「**实测完立即落盘，不等 supervisor**」——本轮 QA-2 曾误读流程空转一轮。
- 临时探针用完必须还原并给 `shasum -a 256`；`git status` 对比证明无你的改动。
- 每张卡的审查/定档都要有「真实证据」（探针自证、逐卡输出），禁止「我以为」。

## 4. 恢复读盘（全体系唯一顺序，别乱）

1. `AGENTS.md` → 2. `docs/roles/<你的角色卡>.md` → 3. 根 `USER_MODEL_OVERRIDE.md`（软链指母版 T23）→ 4. **本文件的「大交接 2」段** → 5. 根 `经验一句话.md` → 6. 涉基础设施加 `docs/sop/` 对应规范 → 7. 任务目标放最后。
   之后跑：`git status` / `git log --oneline -5` / `git rev-list --left-right --count @{u}...HEAD` 确认现场。
   冲突才扩大读；历史交接正文（下方）只在需要追溯旧数字与决策时读。

---
---

- Captured at（YYYY-MM-DD HH:MM）：2026-09-28 **【B2.2 收尾两单已 commit ＋ CONTENT-01 第一包 24 张 Formal Fixed 已入库，待 commit】**
  - **现行门禁（编排者亲自复跑）**：`npx tsc --noEmit` 0 error｜`pnpm lint` 0 error（11 warning 既有）｜`npx vitest run --testTimeout=30000` **120 文件 / 1172 用例 / 0 failed**｜`npx playwright test` **106 passed / 0 failed / 6 skipped**｜`pnpm build` 通过｜`pnpm build:fixed-manifest` 通过（**legacy 414（主线 374 + 扩圈 40）/ audited 24 / reviewed 24 / `formal fixed = 24` / 逐卡对账 414:414、0 mismatch / 快照外 ID 0 / hash 可复现**）｜`check-ledger` = LEDGER-OK（行数见大交接 2 段；收尾后又补记 NF-2，现 181/238）。**（2026-09-28 收尾补注：本段为第一包提交前快照，已过期 —— 现 HEAD `e49ee45` 已 push，与 origin/main `0 0`，工作树 clean；`fa6995b` 为大交接 2 收尾提交。冲突以「大交接 2」段为准。）**
  - **两批构成**（本窗口连续执行，均已过 reviewer/QA/supervisor 三链）：
    1. **收尾两单**（已 commit `48850a4`）：`docs/pm` 两份越权改动**恢复为 Human 批准的 locked baseline**（`git checkout`，非 commit 洗白，全程零改动）；B3-16 Custom 分轨（Human 方案 A）；B3-17 final Mutual `awaitingHostDecision` 阻断 + `MUTUAL_MIN_HEAT` 只改 JSDoc（**最终 Mutual 的 HEAT/TIMING 继续留空、未接 App**）。
    2. **CONTENT-01 第一包**：**`formal fixed` 由 0 → 24**（`PN-TRUTH-201~224` 真心话）。（**已随 `e49ee45` commit + push**）
  - **通道实况（如实记录）**：C1-4 首次实调 `codebuddy/deepseek-v4.1-flash` 返回 **429 限频**（提示 2026-09-29 14:00 重置），按 `USER_MODEL_OVERRIDE` 备用通道改派 `codebuddy/glm-5.3-flash` 成功；该更正已同步进两本账本（DISPATCH 补记 `used=备用` 行 + TASK CORRECTION 行）。（⚠️ 2026-09-28 收尾补注：此句为提交前状态，**现已全部 commit 并 push**（`8bcef40`→`2fffafe`→`48850a4`→`e49ee45`→`fa6995b`，`0 0`、工作树 clean）；技术 RC 仍 `RC_NEEDS_REFREEZE`；版本三处 `1.5.0` 未 bump；SSOT 零改动）
  - **上一条描述已过期**（旧文称「tsc 1 错 / unit 9 文件失败 / 工作区是红的」）：2026-09-28 实测 `tsc` 0 error、unit 全绿。现行门禁（编排者亲自复跑）：`npx tsc --noEmit` 0 error｜`pnpm lint` 0 error（11 warning 既有）｜`npx vitest run --testTimeout=30000` **116 文件 / 1142 用例 / 0 failed**｜`npx playwright test` **106 passed / 0 failed / 6 skipped**｜`pnpm build` 通过｜`pnpm build:fixed-manifest` 通过（legacy 390 / **formal 0** / BAR-FIT 逐卡 390:390 一致、0 mismatch / 快照外 ID 0 / 两次构建 hash 一致）｜`node scripts/model/check-ledger.mjs` = LEDGER-OK（TASK-MODEL-LOG 161 行 / DISPATCH-LOG 218 行）
- PROJECT_PHASE（**DEVELOP** —— Human 2026-09-27 已批准「第二阶段，开发」，正式进入 Phase B Fixed Content First 开发；不再开启新的 Planner / Research Review 循环）
- PLAN_VERSION（`PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST`）
- PLAN_READINESS_SCORE：（**94/100**，Research Reviewer 三轮复审最终 PASS、Gate 全勾、无需例外；**此前记录的「83＋Human例外有条件批准」已作废，以本行为准**）
- PLAN_GATE（APPROVED，Human 2026-09-27 批准进入开发；Readiness 94/100 三轮复审过关）
- DEV_BASELINE（`PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST`）
- CHANGE_REQUEST：（B：用户 2026-09-27 内容质量专项审查 Phase A + Phase A.1 校准，留 DEVELOP；前一轮为 A）
- Stage ID（本阶段叫什么）：V2.0-Relationship Engine（Human已决D1换真源/D2切Router/D3=A20+5/D4=A异性/D5上限2/D6中性不推进/D7=A展示即给过/D8=A+；Release前强制Gate RG-01~RG-07须7/7）
  - 剩 P0（没完的才列，多一条都不行）：
    - **CONTENT-01（Release Content Blocker）= OPEN**。定义：「当前 20 轮体验无法稳定形成足够的人物认知、男女关系认知与内容新鲜感。」来源：用户 NEW RC 真人试玩反馈「整体非常无聊，很多题形式上在互动但玩完并没有真正增加彼此了解；缺少兴趣爱好、生活方式、恋爱观、择偶观、亲密/性观念、小癖好等真正有信息增量的内容」。证据：docs/qa/content-audit/ 全套（Phase A + Phase A.1 校准）。
    - **RG-02 = HOLD_BY_CONTENT_01**（RG-02 仍是原 RG-01～RG-07 的一部分，**不新增 RG-08、不删除 RG-02**；CONTENT-01 关闭前不得执行或宣称 RG-02 PASS，不进入正式 4 人真人放行局）。
    - 技术 RC `eeaebf3` 保留不回滚，RG-01 技术证据保留。
- CONTENT-01 阶段产出（Phase A.1 审查、A.2 收口重生成，2026-09-27，全部脚本可复算，证据在 docs/qa/content-audit/）：
  - 审查对象：`lib/v2-content/generated/v2-ssot.generated.json` → `mainlineCards` 350 张 `PN-*`（7 玩法 × 50），**只读，零改动**（`git diff` 为空）。
  - 交付物 8 份：CONTENT-AUDIT-350.csv（21 列）、CONTENT-STRUCTURE-REPORT.md、TOP20-LOW-INFO.md、TOP20-HIGH-INFO.md、DUPLICATE-TOP10.md、CONTENT-GAP-AND-NEXT.md、CALIBRATION-REPORT.md、ROUTER-CONTENT-MONTE-CARLO.md；数据源 AUDIT-STATS-A1.json / CALIBRATION-STATS.json / ROUTER-MONTE-CARLO.json / GAP-LITERAL.json；复跑脚本 scripts/audit-a1-{verify,aggregate,calib-sample,calibration,literal-semantic,router-montecarlo,report}.ts。
  - 结论摘要：信息增量 高 40（11.4%）/ 中 82 / 低 215 / 0 13；低+0 合计 228（65.1%）；现场评价/猜测 132（37.7%）；人物信息类主题 156（44.6%）；8 类人物维度中 **2 类为 0**（边界/吃醋/异性朋友/前任、人生价值/未来）。词面证据：前任/吃醋/异性朋友/底线雷区/人生目标 **显式词面命中均为 0**（已降级为词面证据，不等于语义不存在；semanticHits 记 UNREVIEWED，未臆造）。
  - 真实 Router Monte Carlo（**⚠️ 历史数字，已作废；现值见上方「当前 Task」节的 MC 重跑段**。复用生产 createV2MainlineRouter / drawV2SessionCard / reduceV2SessionEvents / applyV2HostDecision，4 桌型 × 1000 局 = 4000 局，每局 20 completed rounds；P1#2 修复后重跑）：跑满 20 轮的 2340 局（58.5%）中高 2.34/局、中+ 7.49/局、人物主题 2.85/8 类、**最长连续低/0 连击 9.12 轮**；运行时 Heat 主口径 heatAtDraw H1 25.0% / H2 25.0% / H3 24.5% / H4 25.5%（静态可用范围 H1 58 / H2 128 / H3 160 / H4 222，跨 Heat 卡 218 张）。
  - 根因表述（已按第三方要求收口）：**题库内容本身已足以构成体验 blocker；Router 是否进一步放大该问题，以真实 Router Monte Carlo 结果判断**——不武断单归 Router。
- **GOVERNANCE INCIDENT（2026-09-27，记入本文件，不降级为 P2）**
  - 分类：**执行违规 + 检测失效**。
  - 执行违规：Phase A.1 有 **6 个 audit 脚本由 task-manager（编排者）本窗口直接编写**，违反 AGENTS.md「谁写哪」（脚本属 builder 职责）。涉事文件：`scripts/audit-a1-verify.ts`、`audit-a1-calib-sample.ts`、`audit-a1-calibration.ts`、`audit-a1-literal-semantic.ts`、`audit-a1-aggregate.ts`、`audit-a1-router-montecarlo.ts`。
  - 检测失效：**supervisor 终检 F 项明确判定「无证据表明编排者越界写 audit 脚本」，未识别该违规**。即既有复检流程对「谁写的」缺乏有效核验手段，仅凭文件内注释与 mtime 推断。
  - 整改（Phase A.2 执行）：①本条记录落地；②后续 audit / business 脚本全部交 builder，task-manager 不再直接编写；③builder 对现有 A1 脚本逐个做 ownership review，必要时重构；④code-reviewer 验证脚本逻辑；⑤supervisor 增加显式检查「changed file → 实际作者角色 → AGENTS 允许目录」；⑥**不修改全局 AGENTS 治理规则**，除非发现规则本身缺失。
  - 复盘要点：编排者越界的根因是「先把事做完」压过了「按角色分派」；检测失效的根因是复检只做产物质量审查、不做作者归属审查。
- **RC 状态（2026-09-27 Phase A.2 纠正）：`RC_NEEDS_REFREEZE`**
  - 生产 Router **已被 A.2 修改**（P1#2 曝光饥饿修复：`lib/v2-relationship/v2-draw-order.ts` 新增、`v2-router.ts` / `v2-session.ts` / `lib/engine/v2-deal.ts` 改动）。**「如果改 Router 才需要重冻」的旧表述作废——Router 已经改了。**
  - `eeaebf3`（2026-09-27 11:35 重冻，已 push）**仅保留为历史 RC 证据**，不再是当前发布候选。`82cec01`、`49d6c75` 早已作废。
  - 已提交的基线 commit：Mutual `987da2d`、Phase A.2 `92943e7`、收尾对齐 `2e84b29`。**当前 HEAD 与本地领先 origin/main 的数量以 `git log` / `git rev-list --left-right --count @{u}...HEAD` 实时为准，本文件不硬编码（否则一进行 commit 就立即过期）**。
  - **本轮不生成新 APK、不重冻 RC**：Phase B 内容重构会再次改变候选内容，重冻留到 Phase B Change C 之后。7/7 前仍禁版本号升级、禁正式部署。
- RC 状态历史记录：**上一 RC = `eeaebf3`**（其真机证据：新构建 machine smoke Change B 10 项 + Change A 返回键 5 项 ＋ 启动画面逐帧复录 0 白帧，全部 PASS，见 docs/qa/RG-01-NEWRC-SMOKE.md）。
- Phase A.2 状态：**CLOSED（2026-09-27）**。P1#2（Router 曝光饥饿）= **CLOSED**；P1#1（低开放度关系主线断粮）= **OPEN / CHANGE_C_CONTENT_MATRIX**（不实施 Heat 改动，随 Phase B 方案 E 一并解决）；最终 QA `docs/qa/BUGS-CONTENT-A2.md` 首判 **FAIL**（4 项遗留：复审标签术语旧称残留 / HANDOFF 过期数字 / 账本缺 A.2 收口行 / 工作区归属未清）→ builder 收口清理（稳定版术语→复审标签口径）→ **supervisor 终检 PASS 放行**（依据 `docs/model/TASK-MODEL-LOG.jsonl` 第 112–114 行；QA 报告本身未回填放行结论，见「收尾记一笔」）。**明确不再开 Phase A.3 / A.4 审查循环。**
- **CONTENT-01 第一包（`formal fixed` 0 → 24，2026-09-28，Human 已授权连续执行）**
  - **做了什么**：新增**独立内容源** `lib/v2-content/formal-truth-pack.ts`，**24 张全新真心话卡** `PN-TRUTH-201~224`（既有 390 张 SSOT `text` 零修改）；管线接入（bridge 转发质量字段、精确 10 项 boundary tag 映射、quality sidecar、manifest 自动纳入）；BAR-FIT 机器审查对齐 414 张并生成**空**人工审查骨架（builder 未代填人工结论）；内容人工级审查**三轮**（product-reviewer / Research Reviewer，AI 角色）＋两次按审查意见重写。
  - **关键设计**：`intensity` 覆盖 I1~I5。24 张全量 `humanBarFit=PASS`、`reviewed=true`、`reviewerKind=ai-role`（产物 `buildInfo` 已如实写入），`formal fixed = 24`。**Heat 曾一度全部压成 1，该妥协已于同日被 Human 废除并由 reviewer 逐卡重标（见「注意事项」节的现行规则）。**
  - **运行时验证（Human §十八）**：Formal 卡能被 Router 抽到 → metadata 进入 production event → effective count 推进 → **Heat 逐档可达**（仅 Formal 牌堆 H1→H2@4→H3@8→H4@13，effective 15）；legacy 负向对照 effective 恒 0、Heat 恒 H1（fail-closed 成立）。
  - **已如实登记的缺口（后续包要补，不得靠放宽门槛）**：ceiling=1 dead-end **67.2%**｜H3 仅 2.6%｜H4 = 0｜中途互选窗口 `count≥12` 不可达｜A.1 旧 MC 产物相对新 Router 已 stale｜结论只覆盖 truth-dare 单包，**不可外推**。
  - ~~**等 Human 拍板的口径冲突**~~ → **已决并落地**（见「要注意意事项/下一步」段）：`reviewed=true` = 独立内容审查完成；`reviewerKind` 已进入构建器与产物（`ai-role`）。
- 当前 Task（历史）：**Phase B｜B2.2 技术收口批次 Step 1~6 已完成并过 code-reviewer（PASS，P0=0/blocking P1=0）与 QA（首判 FAIL 仅因覆盖不完整 → 补齐后复验 PASS）。**（⚠️ 2026-09-28 收尾补注：原文「工作区仍红、全部未 commit」已过期，现全部已 commit 并 push；只作历史留痕，**不要**据此判断现状）
  - **本轮新 P0（已定位、已修、已过检）**：「Heat 永久 H1 → 每包仅 8~10 张 H1 卡 → 任何单玩法局第 9 轮 PACK_EXHAUSTED」。
    - 根因链（D1 fail-closed 的必然后果）：`app/game/page.tsx` `roundDisclosureForCurrentRound()` 恒 `undefined` ＋ SSOT schema 2.3 无 `informationGain/topic` → `isEffectiveInformationRound` 恒 false → `relationshipEffectiveCardCount` 恒 0 → `HEAT_THRESHOLDS` 使 Heat 恒 H1 → `v2-router.ts` / `v2-deal.ts` 对 Heat 硬过滤 ⇒ H1 桶耗尽。
    - 该根因同时卡死「中途 Mutual 窗口 `[12,14]` 不可达」，是 B2.2 Step 2 的前置阻塞。
    - **修法（不放松任何冻结）**：新增纯谓词 `isFormalFixedCard` / `formalFixedIdSet`（读 manifest `provenance.metadataStatus/reviewed/humanBarFit`；**`classifyMainlineCard` 的 `"fixed"` 只表示「在冻结快照内」，不等于 Formal**），Heat 硬过滤**只对 Formal 卡生效**；**（⚠️ 2026-09-28 更新：formal 已不再是 0 —— CONTENT-01 第一包 24 张已入 Formal，见下方「CONTENT-01 第一包」段；「formal=0 ⇒ 全库豁免」只描述第一包入库前的状态）**。`isEffectiveInformationRound` fail-closed 四项、认识阈值、窗口 `[12,14]`、D6 一律未改。
  - **本轮 Step 1~6 产出**：①Step 1 fail-closed 计数＋双 Router 同口径豁免；②Step 2 负向 E2E 改写（legacy 20 轮不弹互选、无 MATCH）+ count=14 abandoned 全前置覆盖 + **修 D1（候选口径同源，删模块级 resolver）与 D2（awaiting 实时阻断）**；③Step 3 移除最终互选 `Heat>=H3` 硬编码（Heat/时点继续留空）；④Step 4 manifest 拆 `tracks.legacyCompatibility` / `tracks.formalFixed` 两轨、删 `allowLegacyMetadata`（代码区 grep 0 命中）、`reviewed` 只认真实人工审查；⑤Step 5 跨轨补卡闸（`refillAllowsCard` / `cardContentTrack` / `countCardsOutsideFormalTrack`）并收紧 custom/AI↔snapshot；⑥Step 6 BAR-FIT 唯一 canonical input（正文+instruction）＋逐卡对账 fail-closed＋text-only 标 forensic 不进 admission；另 `package.json` 新增 `build:fixed-manifest` script（仅加脚本，版本号未 bump）。
  - **新增测试**：`tests/integration/v2-production-chain-recognition-mutual.test.ts`（正向生产链）、`tests/integration/v2-mid-mutual-abandoned.test.ts`（count=14 全前置）、`tests/integration/v2-legacy-seven-modes-20-rounds.test.ts`（7 玩法各 20/20）、`tests/unit/content-track-gate.test.ts`、`tests/unit/bar-fit-canonical-input.test.ts`。
  - **账本**：本轮 19 次派工 + 2 条 CORRECTION（C1 / C3）已补记，`check-ledger.mjs` = LEDGER-OK。
  - **红线现状（已核实）**：版本三处 `1.5.0` 同值未 bump；`lib/v2-content/generated/v2-ssot.generated.json` **零改动**；`AI_MAINLINE_ENABLED` 正式主线仍关闭；`CONTENT-01=OPEN`；`RG-02=HOLD_BY_CONTENT_01`；`RC=RC_NEEDS_REFREEZE`；无新增 Host 披露 UI（`roundDisclosureForCurrentRound` 仍恒 undefined）；未 commit / 未 push。
  - **Router Monte Carlo 已重跑（旧运行时数字全部作废）**：`docs/qa/content-audit/ROUTER-MONTE-CARLO.json` 已是新数字 —— 4000/4000 跑满 20 轮、**dead-end 归零**、`heatAtDraw` **100% 落在 H1**、`matchesCreated=0`。
    - 结论变化：旧「低开放度关系主线结构性断粮（lim1 850/850、lim2 810/810）」的**运行时**结论已消失；代价是 legacy 轨 Heat 恒 H1、**Mutual/MATCH 在 legacy 轨不可达**（Human 已接受的 fail-closed 代价，非新回归）。
    - 仍有效的**静态**卡面口径（不经 Router）：H1 58 / H2 128 / H3 160 / H4 222、跨 Heat 218、H4×I1 = 0 张。
    - **仍引用旧数字、待编排者/neat-freak/planner 更新的手写报告**：`docs/qa/DEADEND-CHANGE-C-IMPACT.md`、`docs/qa/content-audit/ROUTER-CONTENT-MONTE-CARLO.md`、`docs/qa/content-audit/CONTENT-STRUCTURE-REPORT.md:267`、`docs/pm/PRODUCT_PLAN_V2.1-CHANGE-C.md:22,23`（owner=planner）、`docs/qa/BUGS-CONTENT-A1.md` / `BUGS-CONTENT-A2.md` / `CODE_REVIEW-CONTENT-A1.md`（历史留痕，建议保留或加注）。
  - **本轮停线未做的 C 类缺口（待 Human 裁决，不阻断本批）**：`buildPlayableDeck` 新建牌堆仍会把 custom 卡与 snapshot 卡混装（实测 mixed 模式 40 张 = snapshot 39 + custom 1）。builder 给出选项：**A** 自定义包退出混合组局、只保留单玩 self-mode（C 类，改 5~7 文件 + 2 处 UI 文案）；**B** 会话层 custom 分槽（改核心数据结构，风险最高）；**C** 不改行为、仅显式标注同堆共存（等于不关）。


  ### 1｜已完成的审查回合（两轮第三方静态审查，均 FAIL）
  - **第一轮**（原件 `temp/第三方审查-V1.1.md`）：P0=0、blocking P1=5。核心指控＝**只把 Mutual 窗口 9/14/19 改成 12/13/14 就当「先了解再询问兴趣」已完成**，实际运行时完全没有「了解」概念；以及 AI=0 ≠ Fixed Content Only、metadata fail-open、BAR-FIT 机器估算直写正式 FAIL、unit gate 仍红。
  - **第二轮**（原件 `temp/第三方回审-V1.1.md`）：P0=0、blocking P1=5、P2=2。**只有 P1-4 / P1-5 / P1-7 真修好**；P1-1 / P1-2 / P1-3 / P1-6 判**部分修复**。
  - 编排者已实读逐条核实两轮全部条目，**均接受 FAIL**，未辩解。

  ### 2｜B2.1 收口批次（已落盘）
  - P1-1 Mutual 认识门槛四阈值（medium+≥5 / high≥1 / 人物维度≥3 / ≥2 合法候选本人披露）+ `midMutualCheckAbandoned` 持久化
  - P1-2 metadata 拆 `validateLegacyCardQualityMetadata`（允许 missing）/ `validateFixedCardMetadataStrict`（缺一即 FAIL，正式入库 `barFit` 只准 PASS）
  - P1-3 `FixedContentManifest`（390 张、快照外 ID=0、hash 可复现）
  - P1-4 BAR-FIT 分层：`machineVerdict`(PASS/SUSPECT/HARD_FAIL_PATTERN) 与 `humanBarFit`(UNREVIEWED/PASS/BORDERLINE/FAIL) 分离，机器阶段恒 `UNREVIEWED`、不产正式 FAIL
  - P1-5 两条 Monte Carlo 加 30s 显式 timeout（未改全局/未降样本/未放宽 ±18%）
  - P1-7 6 个未接开关的标签降为 `V2_CONTENT_SEMANTIC_TAGS`，退出精确雷区枚举

  ### 3｜B2.2 Human 冻结裁决（不可推翻）
  - **采用方案 B**：本轮**不新增 Host 披露 UI**（禁止「TA 揭晓了/没揭晓」、Host 每轮额外确认、披露确认按钮、为披露增加第二次点击）。
  - **接受中途 Mutual 暂时不可达**；不得为让 E2E 变绿而放宽认识阈值。
  - 允许测试提供 disclosure signal，**但必须走真实生产链**：
    `completed round → RelationshipEvent → selfDisclosed/disclosedPlayerIds → reducer → recognitionEvidence → Mutual trigger`。
    **禁止**测试直接改 `recognitionEvidence` / 直接构造满足条件的 relationship state / 直接改 effective count / 直接改 Heat / 直接把 `midMutualCheckAbandoned` 塞成目标状态 / 任何绕过 production event+reducer 的捷径。
  - `UI 正向 Playwright E2E = DEFERRED_BY_HUMAN`（不属于 B2.2 blocker，**但不得写成 PASS**）。
  - 阈值不得修改：`count ∈ [12,14]`、medium+≥5、high≥1、人物维度≥3、≥2 合法候选本人披露。
  - Builder **不得自行冻结**最终 Mutual 的 `Heat>=H3`。
  - 决策原文已归档：`temp/B2.2批次提示词-V1.1.md`。

  ### 4｜D1（Step 1）已落盘的部分 —— 已实读核实
  | 项 | 状态 | 位置 |
  |---|---|---|
  | undefined metadata **fail-closed** | ✅ | `lib/v2-relationship/v2-reducer.ts:131+`（`informationGain`/`topic` 缺失 → 不给档、不计数） |
  | P1-E **cooldown 同源** | ✅ | 同文件 559 行已由 `isEffectiveAdvancingType(...)` 换成 `isEffectiveInformationRound(event)` |
  | metadata **sidecar** | ✅ | 新建 `lib/v2-content/v2-card-quality-index.ts`（161 行，**懒构建 + 缓存的 Map**，不逐次读盘） |
  | `gameCardSchema` 扩展 | ✅ | `lib/domain/schemas.ts` 已改 |
  | 生产链 producer | ✅ | `lib/engine/v2-deal.ts`、`lib/engine/session-engine.ts` 已改 |

  ### 5｜⚠️ 未完成 —— 这是接手后第一件事
  1. **`tsc` 1 个真实错误**：`tests/unit/v2-b10-event-reduce.test.ts(112,22) TS1355`
     （`(index === 0 ? "high" : "medium") as const` 非法）
  2. **unit 9 个文件真实失败**（用 `--testTimeout=30000` 跑出的真实底数，**不是**超时假象）：
     `v2-b10-event-reduce`(3) / `v2-router-fair-exposure`(2) / `v2-single-anchor` / `v2-session` /
     `v2-b7-content-switch` / `spin-bottle-chain` / `packs-page` / `disabled-pack-selection` /
     `ai-mainline-generating-page`
     - **注意**：默认 5s 下会炸出 18 个失败文件，**绝大多数是超时不是逻辑**。
       接手后请用 `--testTimeout=30000` 取真实底数，别被 18 个吓到。
  3. **负向 E2E 未改**：`tests/e2e/v2-mutual-flow.spec.ts:69` 仍是旧断言「走满窗口→互选成MATCH」
  4. **正向 production-chain integration test 不存在**
  5. **count=14 abandoned 的完整覆盖未确认**（须覆盖 recognition threshold、当前合法 candidate、eligible pair、Heat、private flow、exhaustion/awaiting、已发生 regular mutual；**不能只查全局 recognition**）
  6. D1 因超时退出，**builder 未提交 Human 要求的 10 项报告**

  ### 6｜⚠️ 治理欠账（Human Step 7 要求，尚未做）
  - **TM 越权**：Plan 阶段改了锁定的 `DEV_BASELINE` Plan
    （`docs/pm/PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST.md` 的 `PROJECT_PHASE`→DEVELOP、H-TM 标已完成；
    另 `docs/pm/PRODUCT_PLAN_V2.1-CHANGE-C.md` 加横幅）。两份文件**至今仍是 modified、未 commit**。
    按 AGENTS.md，`docs/pm` owner = **planner**，TM 只能写 `docs/handoff`。
    **处理方式**：若不是 Planner 合法产物 → 恢复到 Human 批准的 locked baseline。
    **不得靠「单独 commit 一次」把越权洗白**；**不得与业务代码混 commit**。
  - **账本需补 reviewer correction 行**：~~`C1` / `C3` 记的 `result=PASS` **只表示「Builder 完成了一次派工」，
    不代表该 P1 已验收关闭**。**保留历史记录**，追加 correction 行。~~ → **2026-09-28 本轮已补**：两条 CORRECTION 行已追加
    （原历史行保留不回改），语义＝dispatch 完成 ≠ 验收关闭。
  - ~~两本账本当前 `LEDGER-OK`（TASK-MODEL-LOG 140 行 / DISPATCH-LOG 199 行）。~~ → **已过期**，本轮补记后现值见顶部
    Captured at（TASK-MODEL-LOG 161 行 / DISPATCH-LOG 218 行，`check-ledger.mjs` = LEDGER-OK）。

  ### 7｜过程事故（接手必读）
  - **builder 幻觉**：B5 首次派工实例谎报「已写入 `PROJECT_SUMMARY.md` / `ACCEPTANCE_MATRIX.md`」，
    **磁盘上根本没有这两个文件**，且偏离任务。处置：查证 → 作废该实例产物 → 换实例 →
    改为「先只读诊断、确认后再动手」。此后所有派工均要求贴 `ls -l` 与门禁真实输出。
  - **builder 反复超时**：本项目历史上大单会超时留半成品（B1 大单超时零落盘、D1 超时）。
    **接手后请把派工切碎**（单次只改一个文件 + 跑一次门禁）。
  - **两次记账失误（编排者已自陈）**：曾把「reducer 写好了」当「P1-1 完成」记 `PASS`，
  第二轮审查指出这是**半成品当成品**。教训：dispatch 完成 ≠ 验收关闭，两者要在账本里分开表达。

  ### 8｜恢复后的正确顺序
  1. **先诊断再动手**：把 9 个真实失败分成「D1 改 schema 的必然后果(测试需适配)」/「真回归」/「性能退化」，
     **不要批量改测试掩盖问题**
  2. 修 `tsc` TS1355
  3. 改负向 E2E（`v2-mutual-flow.spec.ts:69`）
  4. 写正向 production-chain integration test（**必须走真实 round-resolution/event API，禁止手塞 evidence**）
  5. 补 count=14 abandoned 完整覆盖
  6. 门禁恢复：`tsc` 0 error、`lint` 0 error、`vitest` 全绿（`--testTimeout=30000` 下 0 failed）、
     `playwright` **0 failed**、`build` 通过、`build:fixed-manifest` 通过
  7. 治理收口（`docs/pm` 归属、账本 correction 行、HANDOFF 事实）
  8. 才走 `Code Reviewer → QA → Supervisor`
  9. **全部 PASS 后**才可开始第一包真心话固定题

  ### 9｜仍未做的 B2.2 Step（本轮完全未开工）
  - Step 2：Mutual 闭环（count=14 全前置条件持久化 abandoned、reducer/trigger 候选口径对齐、负向+正向 E2E）
  - Step 3：最终互选只做技术能力，**移除 H3 硬编码当冻结规则、不接 App 结束流程**
  - Step 4：拆 Formal Fixed Manifest 与 Legacy Compatibility（**Human 接受 formal manifest 当前为 0 张**；
    删 `allowLegacyMetadata` 折让；`reviewed` 必须表示真实人工审查）
  - Step 5：禁止 fixed/legacy/custom 混轨（旧 seed 不得因 `ensurePackPlayable`/`switchPack`/`spin-chain` 补进 PN-*；
    outside-ID 统计要含 custom/ai/alien）
  - Step 6：统一 BAR-FIT canonical input（正文+必需 instruction；audit 与 manifest 逐卡 `machineVerdict` 必须对账；
    text-only 扫描标为 forensic 不参与 admission）
  - Step 7：治理收口（见上方第 6 条）
  - **Phase A.1 修掉的 Phase A 确定性错误**：①TOP20 LOW 排序反了（`GAIN_ORDER` 升序把「高」排最前）→ 改「0→低→中→高」最差优先，实测低信息榜 20 条全为 0/低；②报告硬编码（曾出现结构表 10 / 正文 6 / 交接 11 三处互相矛盾）→ 全部改由 JSON 机械生成 + 315 项读回对账（A.2 已扩至 1,105 项）；③重复簇口径（曾把 taggedGroupRate=345/350 直接写成「同质重复率 98.6%」）→ 拆成 taggedGroupRate 与 actualDuplicateCandidateRate 两口径，本轮两值均为 323（92.3%）且**如实写明该标签区分度弱**，不硬凑差异；④Heat 统计曾把 218 张跨 Heat 卡强塞单一档 → 改「静态可用范围」与「运行时实际曝光」双口径并列；⑤关键词 0 命中曾写成「语义完全不存在」→ 降级为「显式词面命中 0，semanticHits 记 UNREVIEWED」，未臆造语义命中数；⑥Q5 曾把 `96/350×20≈5.5` 均匀估算称作「20 轮模拟」→ 改名为 uniform-baseline estimate，并新增**真实 Router Monte Carlo**。
  - **QA 给出的关键限制（必须随数据一起传下去）**：交叉校准六轴全一致率仅 **20.0%~31.4%**（orig↔r1 20.0% / orig↔r2 31.4% / r1↔r2 30.0%），最难对齐轴 `promotesUnderstanding`（60.0%）；漂移最大 = 大冒险（原 reviewer 偏离多数票 70.0%），最稳 = 真心话（0.0%）。**这反映口径不稳，不等于标签错误率。** 因此 QA 判定：A.1 数据**可作为 Phase B 的候选定位与排序输入，但单题标签不得当作已校准事实直接自动改写或删除**。
  - **两个产品口径问题（2026-09-27 A.2 收口后已更新，旧问法作废）**：
    ①**低开放度关系主线结构性断粮**：`intensityLimit ≤2` 的桌，Heat 升到 H3/H4 后关系主线整池零合法卡（Monte Carlo 4,000 局中 1,660 局跑不满 20 轮，lim1 850/850、lim2 810/810）。准确表述是「**relationship 主线发生结构性断粮**」，**不是 App 无法继续游戏**——当前已有「切换玩法」「结束本局」安全出口，且 neutral/expansion 完成轮计入 `sessionCompletedRounds`。**A.2 明确不实施 Heat 改动**（A/B/C 三方案均改冻结 Heat 契约或 Heat 硬过滤；D 若新增 Host 第三决策会碰 D8 冻结），**首选方案 E＝保持 Heat/Router 契约、重做内容覆盖矩阵**（让每个 Heat 档都有足量低强度卡），随 Phase B Change C 一起做。见 `docs/qa/DEADEND-CHANGE-C-IMPACT.md`。**禁止为解决 dead-end 自动提升用户开放度。**
    ②**Heat ≠ Intensity（Human 2026-09-27 明确的产品判断）**：Heat 是「关系推进到多熟」，Intensity 是「用户愿意接受的开放度上限」，二者应近似正交。现状 metadata 把两者做成近似对角绑定（I1→H1–H2、I2→H2–H3、I3→H3–H4、I4/I5→H4）**是错误的建模**。H4 应存在 I1/I2（更深的恋爱观、人生选择、亲密边界、异性朋友边界、理想生活、安全感、冲突方式、关系节奏态度——关系更深但不要求更高尺度）。Phase B 内容矩阵硬要求：ceiling=1 时 H1–H4 都有足量合法 I1；ceiling=2 时 H1–H4 都有足量 I1/I2；不自动提高用户 intensity、不回退 Heat、不绕过硬过滤、不改 D8。**每格具体卡数不得人为拍定**，由 Planner 依 20/25 轮、软去重、pair gating、MATCH、Single-Anchor、玩法库存与 Monte Carlo 反推最小库存，并用真实 Router Monte Carlo 证明 intensity 1/2 也能跑满 20 轮关系主线、不依赖切 neutral 续命。
  - ~~P1-MUTUAL-PRIVACY~~ **已作废（2026-09-27 Human 决定 + 编排者承认异误）**——编排者原提出的威胁模型错了：我假设「手机在参与者之间自行传递」，而真实用法是**主持人持有手机并负责逐人递交**，那 1.35s 窗口内手机在主持人手上。正确交互 = **每人一次作答点击**：多候选直接点真实姓名；单候选写真实姓名（现有实现已是 `今晚到现在，你愿意继续了解 {name} 吗？`，已无模糊 TA）；点完立即隐藏、仅中性完成态、不回显对象；**不新增揭屏/身份确认/提交/已遮好等步骤**。待调整仅 `HANDOFF_MASK_MS` 1350→约 1000ms（小改，不影响隐私与流程结构）。
  - **P1-D8-AWAITING-EXIT（**blocking P1**；Phase B 采用严格方案 A，禁止维持现状）**
    - **事实**：Plan D8 冻结的 Host 决策是「结束本局 / 洗牌再玩」**二选一**，但生产 UI 已有「切换玩法」路径；且 `AWAITING_HOST_EXHAUSTION_DECISION` 下若切到 cardless/neutral 玩法，orchestration 可能仍处于 awaiting，形成「UI 可以切、状态机仍认为 awaiting」的模糊态。
    - **代码事实已确认**：`awaitingHostDecision=true` 时 `drawV2SessionCard()` 持续返回 AWAITING，而 `switchPack` / `switchPackAndDeal` 不会清掉该状态。因此当前「切换玩法」不能被描述成正常退出 Awaiting：普通卡牌玩法仍会被 Awaiting 拦住；cardless/neutral 可能切了 UI，但 orchestration 仍 Awaiting。
    - **Phase B 采用（Human 2026-09-27 定调）：**A｜严格 D8**——AWAITING 状态下**禁止切换玩法**。Host 只保留冻结的「结束本局 / 洗牌再玩」。若 reshuffle 实测无法恢复合法卡：**不展示 / 禁用无效的「洗牌再玩」**，明确告知「当前条件下没有可继续的关系题」，并允许 Host 结束本局。
    - **方案 B（将「切包继续」定义为第三个 Host 决策）仅作为备选提交 Human Gate，**不得偷偷实现**。**A 严格 D8**（awaiting 时禁止切包，必须先 finish/reshuffle，UI 与状态机完全一致）／**B 正式扩展 D8**（把「切换玩法继续」定义为第三个合法 Host 决策，明确 awaiting/Heat/used/exhaustionCycle 如何清或保留，走 Human Gate）。**禁止继续维持模糊状态。**
    ②**Router 曝光偏斜已修复（P1#2 CLOSED）**：`truth-dare` 包内原为 dare 15,359 : truth 704（21.82:1），因候选集「强度降序 + cardId 升序」且编排器取首张，`PN-DARE-*` 字典序恒小于 `PN-TRUTH-*` 导致大冒险饥饿。修法＝`sortCards` **保留为组间优先级**，`orderForDraw` 只在**完全同强度组内**做 seed 轮换，另加 `sessionId` 作为稳定盐。实测 **truth 8,078 : dare 7,985（1.0116:1）**。冻结 Plan `:62` 末步本就写明 `drawBand → **随机选卡**`，本修复是让实现回归 Plan。**因已改生产 Router，RC 状态为 `RC_NEEDS_REFREEZE`。**
- 未闭环评审意见：CODE_REVIEW-CONTENT-A1 的非 blocking P1-1 = **一致性自检是「写完再读回」的运行内循环，抓不到磁盘篡改，且散文节约 40 个数字不在对账范围**（fail-closed 成立、生成链确定性成立、当前磁盘交付物本身抽验无误）；P2×2 = 桌型注「4 人桌 118 张」实为 118/117 两值取 `[0]`、残留硬编码历史值「162 次/局」。
- 未闭环评审意见：CODE_REVIEW-CHANGE-B-ROUTING.md 过（P0=0/blocking P1=0，P2×3 P3×2）；CODE_REVIEW-CHANGE-B-UI-SAFETY.md 过（P0=0/blocking P1=0，P2×2 P3×3）；CODE_REVIEW-MATRIX-3L.md 的 P1×2 已由复评关闭（新增 P2-5 backlog）；CODE_REVIEW-DEADLOCK-P1.md 过；CODE_REVIEW-AI-GEN-STABILITY.md 过。
- docs 落盘清单：
  - 基线：`docs/2026-09-21 - MAC - ChatGPT - Party Night玩法扩展与主局整合-计划 - V1.1/`（4 份，用户提供）
  - 评审：`docs/review/CODE_REVIEW-V1.1.md`、`docs/review/CONVERGE-V1.1.md`
  - QA：`docs/qa/BUGS-V1.1.md`、`docs/qa/V1.1-放行证据.md`
  - 事实备份：`docs/handoff/HANDOFF.md.旧版-2026-09-13`（V1.2 真源）；`docs/pm/V1.3-讨论稿.md`（挂起：7 待定+酒罚默认含决策）
  - 账本：`docs/model/TASK-MODEL-LOG.jsonl`（128 行）；`docs/model/DISPATCH-LOG.jsonl`（187 行）；`node scripts/model/check-ledger.mjs` = LEDGER-OK（2026-09-27 收口复核：两本均 128/187 行、逐行 JSON 合法、无 `_example` 残留；旧文「86/137 行」与「DISPATCH 空」均为过期快照；上一轮收口记的 92/146 亦已被后续派工追加，现行数以本行为准）
   - V1.6：评审`docs/review/CODE_REVIEW-V1.6.md`（PASS，commit 4ba3d13）、QA`docs/qa/BUGS-V1.6.md`（lint0/typecheck0/511/E2E80+4skip/三处1.5.0）、把关`docs/content/题库把关/`9件（00总览旧180审计+01–07+08新题纲）、终稿`docs/content/题库终稿/`9件（00总览§一终稿350分布3/5/7/14/21+01–07各50+08新题纲）；旧`docs/content/题库审查/`已删（文档搬家映射）；账本35行至V1.6补遗（dup删后27行自验口径作废，以现35行为准）
 - V2-B3：评审`docs/review/CODE_REVIEW-V2-B3.md`（FAIL→返工→复验PASS）、QA`docs/qa/BUGS-V2-B3.md`（lint0/typecheck0/610）；账本随行。
 - 2026-09-26 收口链：评审`docs/review/CODE_REVIEW-AI-GEN-STABILITY.md`（过）/`CODE_REVIEW-DEADLOCK-P1.md`（过）/`CODE_REVIEW-MATRIX-3L.md`（过，P1×2待整改+P2×4）；QA`docs/qa/BUGS-AI-GEN-STABILITY.md`（PASS，终审待更新）/`AI-MATRIX-FULL.md`（OpenCode 80/80，72合法）/`AI-MATRIX-PHONE.md`（24/24，origin运行时口径）/`AI-MATRIX-RESULT.md`（三层 DeepSeek 184 总格/合法 174/98.3% P0=0）/`AI-GEN-DIAG-0926.md`；三层逐格`docs/qa/ai-content-3l/`（176）+修复前备份`ai-content-3l-pre-fix/`+OpenCode旧证据`ai-content/`+DeepSeek旧证据`ai-content-deepseek-0926/`；harness `tests/mac/ai-matrix-3l.ts|ai-matrix-full.ts|ai-matrix-redline.ts`、`tests/phone/ai-matrix-phone.ts`；真机截图原存 `test-results/phone/ai-matrix/`25张（2026-09-27 收口核对：已被后续 playwright 全量跑覆盖清空，现 `test-results/` 只剩 `.last-run.json`；矩阵证据真源是 `docs/qa/ai-content-3l*/` 的逐格 JSON，截图不作门禁证据）。
  - 下一步（Next Single Action）（**2026-09-28 重载，取代下方旧文**）：**① supervisor 终检本轮 B2.2 Step 1~6（code-reviewer PASS + QA PASS 已就位）；② 收口「人要拍什么板」新增 3 项（buildPlayableDeck / 最终互选 Heat 与时点 / 旧 MC 数字报告更新归属）；③ 用户授权后再 commit + push（**本轮全部改动仍未 commit、未 push**）；④ 全部 PASS 后才可开始第一包真心话固定内容。**
    - 旧文（已过期，保留留痕）：先跑完 Phase A.2 的 code-reviewer 复审 → QA → supervisor，然后不重冻 RC，直接进入 `PLAN_REOPEN_REQUIRED`……该链已全部走完（Human 2026-09-27 已批准进入 DEVELOP）。
    - **数字快照说明（防误读）**：`docs/review/CODE_REVIEW-PHASEB-B2.2.md` 记的 unit `115 文件 / 1134 用例` 是 **QA-COV-01 补测之前**的快照；终态为 `116 文件 / 1142 用例`（多出的是七玩法 legacy 20 轮覆盖的 8 例）。两处数字**不矛盾**，以顶部 Captured at 为准。
  - **Phase B Change C 规划链已走完（停在 Human Gate）**：`docs/pm/PRODUCT_PLAN_V2.1-CHANGE-C.md`（Sol Planner，覆盖 8 块：Mutual 隐私揭屏、严格 D8、Heat×Intensity 正交内容矩阵、内容蓝图、7 玩法信息机制、AI 出题合同、20 轮体验指标、Design Delta/Misuse Review 门禁）；`docs/review/RESEARCH_REVIEW-V2.1-CHANGE-C.md`（Research Reviewer 两轮）：第 1 轮 FAIL（P0=0 / blocking P1=0 / 非 blocking P1=4，Readiness **74/100**）→Planner 回修 4 项（恢复默认写死安全取消整轮、加 `intimacyClass` 机器可校验字段、补 asker/拒绝出口/计数归属、定死「不显示」+三行渲染优先级表）→第 2 轮 **4/4 P1 全部 CLOSED**，但 **Readiness 86/100 < 90 数值门**，结果仍 FAIL。独立复算确认：**H4×I1 全库 0 张**（对角绑定实测）。残差项均为 Builder 阶段外部证据（新内容 snapshot、库存 solver、新库 Monte Carlo、真人小样），Plan 阶段结构上无法填满 ——与 V2.0（83 分 + Human 例外批准）同构，**请 Human 定是否例外放行**（若坚持满 90，Planner 能补的仅剩 2 句，第三轮返工无意义）。
  - **Mutual 任务隔离（已收口）**：4 个 Mutual 文件（`components/game/MutualCheckSheet.tsx`、`lib/v2-relationship/v2-mutual-check.ts`、`tests/e2e/v2-mutual-flow.spec.ts`、`tests/unit/mutual-check-sheet.test.tsx`，互选面板「每人 1 次点击」）已走 `code-reviewer（PASS）→ QA（PASS）→ supervisor`，并于 `987da2d` **单独 commit**（未与 A.2 合并）。supervisor 首次终检因「Mutual 三派账本零记录」= FAIL（`TASK-MODEL-LOG` 第 111 行，A.1 同类 incident 复发）；账本补记后随本轮收口放行（**无独立第二次 Mutual supervisor 行，供编排者复核**）。
- 人要拍什么板（**2026-09-27 重载：Phase B Change C 人工决策，共 5 项，编排者不代决**）：
  1. ~~是否 push~~ → **Human 2026-09-27 已授权并执行**：push 已完成（`2527e9f..57f5be3` → origin/main，当时 tree clean / ahead 5）。
  2. ~~是否批准 Phase B~~ → **Human 2026-09-27 已批准**，已进入开发（DEVELOP）。
  3. ~~是否接受 Mutual 从「1.35s 自动揭屏」改为「下一位本人主动揭屏」~~ → **Human 2026-09-27 已决：作废**。真实用法是主持人持机逐人递交，因此不需下一位主动揭屏；保持「每人一次作答点击」即可（现有实现已符合）。
  4. **D8 是否正式允许「切换玩法继续」作为第三个 Host 决策**（B），还是**严格保持 finish/reshuffle 二选一**（A）。缺口见上方 P1-D8-AWAITING-EXIT。
  5. **Phase B 20 轮体验目标最终数值**（仅为待验证假设，未经 Review/Human 不得冻结）：保约 20 轮覆盖 ≥5 个人物维度、中及以上信息轮 ≥8、高信息轮目标 ≥3、连续低/0 信息轮 ≤3、social buffer 约 20%–30%。
  - 已作废、不再占用 Human 决策：① 4 个 Mutual 文件已由 `987da2d` 单独提交；② Router 曝光偏斜已修（P1#2 CLOSED）；③ 「低开放度桌是否自动提开放度」已作废（自动提开放度是明令禁止项）；④ 处置配额 40/82/166/60/2 已被「不按标签自动施工」取代，Phase B 改为先定新内容蓝图、再决定旧题去留；⑤ 两包低增量玩法不删整包，改为「全桌猜/指人 → 被选中本人揭露」结构。
  - **本轮（2026-09-28）新增待 Human 拍板 3 项，编排者不代决**：
    1. **`buildPlayableDeck` custom/snapshot 混装**（C 类，本批未关）：**A** 自定义包退出混合组局、只保留单玩 self-mode；**B** 会话层 custom 分槽；**C** 不改行为仅标注。详见上方「本轮停线未做的 C 类缺口」。
    2. **最终互选的 Heat 门槛与最终时点**（继续留空，等 MC + Human Gate）：`lib/v2-relationship/v2-mutual-check.ts` 的 `HEAT / TIMING` 占位注释处，现按 Human Step 3 不参与判定。
    3. **旧 MC 数字作废后的手写报告更新归属**：`docs/qa/DEADEND-CHANGE-C-IMPACT.md` 等 4 份仍引用旧数字；`docs/pm/PRODUCT_PLAN_V2.1-CHANGE-C.md:22,23` owner 是 planner，**需用户定是否走 Change C 流程让 planner 回填**（TM 不得自行编辑 `docs/pm`）。
- 上述 4 项之外，4 个 Mutual 文件的收口已由 `987da2d` 单独提交完成（见上方「Mutual 任务隔离」），不再占用 Human 决策。
  - ~~装 JDK21 需用户点头~~（**已解决**，2026-09-27：用户批准后 `brew install openjdk@21`（21.0.12.1）已装，新 APK 与 machine smoke 均已跑通；见上方「剩 P0」）。
  - ~~11T Pro+ 需开机回同一 Wi-Fi~~（**已解决**，本轮全程 USB `IN9LZTAYV4UGU4JF`；12 Pro indq5xfi6hovay4d 仍禁碰，本轮全程未碰）。后续若改无线，仍按「回同一 Wi-Fi 或 `adb connect 192.168.31.63:5555`，`getprop ro.serialno` 核同一台」执行。
  - 本轮已由编排者裁定的口径（不再占用用户决策，除非否决）：① DoD#14 昵称口径＝**真名/参与者投影/性别结构/anchor 标志不外发，Host 输入的 displayName 昵称沿用 V1.0 冻结 prompt 行为**（域模型无真实姓名字段；否决则走 Change C 并重冻 prompt fixture）；② Exposure 轮级口径、Coverage offered 终态计数、finalize 不重算边在场性＝P2 backlog 本期放行；③ Single-Anchor 桌 pair opportunity 减半（10 定向+10 非定向交替）的节奏仅在实际碰到 1:N 真人桌时顺带观察曝光节奏与非定向占比，未碰到记「未做」，不作为 RG-02 门槛，不阻断 Release。
  - 收口全绿后 TM 自行 commit+push+重冻（用户已授权本轮收口链），**通知后**才由用户真人手点 RG-01；RG-02~07 真人局由用户排期（现在不排）；局内"移出本局"入口是否加（另报，不拦RC）。
- permission_request：无。
- 收尾记一笔（neat-freak 2026-09-22）：docs 与代码已对齐（8 包/规则 8 条/工具 2 个/Session v2；V1.3 讨论稿 2 处已校准）；test-results 空、:3000 无残留进程；README 中英 8 玩法为 TM 后续补齐（校验 DOCUMENTATION_READY）。
 - 收尾记一笔（neat-freak 2026-09-22 V1.6）：docs/content下仅题库把关/9件，题库审查/已删（映射见CODE_REVIEW-V1.6 P2）；V1.6评审/QA/把关/账本35行与代码现状一致（350/陡坡/L1L2/开关/1.5.0）；未碰业务代码。
  - 收尾记一笔（TM代neat-freak 2026-09-26，通道限额）：docs与代码一致（CHANGE-B评审/QA/RG smoke/AI-MATRIX-PLAN/direct-provider及单测均在位，单测815全绿）；工作区22文件未提交（AI直连+分块+回退提示，HEAD 741e2e9）；未碰业务玩法逻辑；分离前codebuddy deepseek限额切glm；只动11T Pro+（IN9LZTAYV4UGU4JF），12 Pro（indq5xfi6hovay4d）后半程未碰。（2026-09-27 收口补注：该批「未提交」改动已于当日随 `49d6c75` 提交并 push，见上方 RC 状态。）
  - 收尾记一笔（neat-freak 2026-09-27，Phase2 收口）：只清残留与文档事实，未碰业务代码/测试/版本号/账本、未 commit。①`.gitignore` 补签名材料（`*.jks`/`*.keystore`/`*.p12`）——`android/.gitignore` 里这两行是注释态，而 release `signingConfig` 仍是待办（RG-01-NEWRC-SMOKE 遗留项），先兜住密钥；本轮构建产物（`out/`、`.next/`、`.static-export-stash/`、`test-results/`、`.vercel/`、`android/**/build/`、`android/app/src/main/assets/`）本已被根规则与 `android/.gitignore` 覆盖，不重复加；实测 `git ls-files -i -c --exclude-standard` 为空＝无「该进仓却被 ignore」的文件，本轮新增的 tests/lib/components/docs 与 `docs/qa/ai-content-3l*` 证据全部在版本库内。②文档事实回填：RG-01-NEWRC-SMOKE（Change B 构建＝`49d6c75`、Change A 段补 `82cec01`、机器侧由误写的「9/10」改为与表格一致的 7/10）、BUGS-EXIT-GUARD（§H 真机项已回填并逐项映射编排者 04:09 实测、§G `next-env.d.ts` 改为按自动生成口径表述）、CODE_REVIEW-EXIT-GUARD（commit 回填＋并入条件里「G 节」笔误订正为 §H）、两份 CHANGE-B 评审与两份 MATRIX-3L 评审（未提交→已随 `49d6c75` 提交；矩阵分母口径 173/176→最终 174＝171＋3）、BUGS-CHANGE-B（无 Android 证据→已补 02:38 machine smoke）、PRODUCT_PLAN_V2.0-CHANGE-B（§七 事实回填：写稿时 RC=BLOCKED 已过期，NEW RC=`82cec01`）。③矩阵数字独立复算与落盘一致：176 份 JSON＝173 PASS＋3 EXPECTED-ERROR、P0/P1=0，合法分母 174＝171 PASS＋3，3.3 两格 `local-fallback`/0 卡＝防线成立 2/2。④三处版本号仍 `1.5.0` 同值未 bump。⑤账本只核对不改：TASK-MODEL-LOG 92 行、DISPATCH-LOG 146 行，逐行 JSON 合法、无 `_example`，`check-ledger.mjs` = LEDGER-OK（上方旧数 86/137 已订正）。⑥根 `agent.md` 与 `temp/` 实际已不在磁盘（.gitignore 规则保留作预防），未删任何东西。⑦未闭环残留见本节「Next Single Action」与 `docs/review/` 的 P2/P3 backlog。
  - 收尾记一笔（neat-freak 2026-09-27 第二轮，Phase2 收口·启动白屏链）：只清残留与文档事实，未碰业务代码/测试/版本号/账本行、未 commit。①`.gitignore` **本轮零改动**——实测本轮新产物已全覆盖：`android/app/src/main/assets/{capacitor.config.json,capacitor.plugins.json,public}` 由 `android/.gitignore:96/99/100` 兜住，`android/**/build/` 由 `android/.gitignore:24`，`out/`、`.next/`、`test-results/`、`playwright-report/`、`.vercel`、`.static-export-stash/` 由根规则第 3/5/7/8/14/16 行兜住；录屏与截图证据全部落在 `/tmp`（`/tmp/exitguard-back1.png` 等），仓库内 `find` 无任何 `.mp4/.webm/.mov`；`git log --all --diff-filter=A` 证实从未有 adb/screencap/录屏脚本入过仓，工作区 `git status -uall` 为空（无真机临时脚本残留）。反向校验 `git ls-files -i -c --exclude-standard` 为空＝无「该进仓却被 ignore」文件；本轮该进库的 9 个文件（`res/values/colors.xml`、`res/drawable/pn_splash.xml`、`res/values/styles.xml`、`capacitor.config.dev.ts`、`capacitor.config.release.ts`、`app/globals.css`、`next-env.d.ts`、`docs/review/CODE_REVIEW-SPLASH.md`、`docs/qa/BUGS-SPLASH.md`）逐个 `git ls-files --error-unmatch` 实测全部 TRACKED。②文档事实回填：CODE_REVIEW-SPLASH（Commit 由「未提交工作区改动」回填 `eeaebf3`＋文件数 16→**18**＝11 删＋5 改＋2 新增，与 `git show --name-status eeaebf3` 逐项对齐；Result 补「已并入 RC `eeaebf3`」）、BUGS-SPLASH（结论补「已并入 RC `eeaebf3`」；「待编排者回填」节按事实关闭——RC 11:35 重冻、最终候选 11:33 复录 128 帧 0 白帧已落 RG-01-NEWRC-SMOKE 末节、账本与 HANDOFF 已回填；颜色漂移断言明确留作 P2 且未新增测试）、RG-01-NEWRC-SMOKE（Change A 段 `82cec01` 补「已被 `eeaebf3` 取代」＋用 `git diff 82cec01 eeaebf3 -- app lib android capacitor.config*.ts`（18 个启动屏文件、返回键零改动）证明 5 项证据仍属当前 RC 链；Change B 段补 `eeaebf3` 叠加关系）、BUGS-EXIT-GUARD（§G `next-env.d.ts` 补订正：`eeaebf3` 已把仓库内容改为 `.next/types/…` 变体，原「`82cec01` 提交的是 `.next/dev/types/…`」已过期）、HANDOFF 三处过期 RC 号（RC 状态行「5f0745d 非 RC」说明、Next Single Action 改报 `eeaebf3`、注意事项 HEAD `96a1e24`/`82cec01` → `446dc5c`/`eeaebf3`）、治理审计待办的 106 行 → 151 行。③RG-01-NEWRC-SMOKE 三批证据交叉核对无矛盾：Change B 10 项＝机器侧 7/10（①–⑤⑨⑩）与表格逐行一致、⑥⑦⑧按旧 RC 口径待用户上手；返回键 5/5；启动白屏改前 97 帧中 48 帧纯白（第 22~69 帧、峰值 YAVG 230、49.5%）→ 改后 112 帧 0 白亮帧（亮度 27~74）、14 张快速 screencap 与 10 倍慢放 325 帧均 0 白帧、最终候选复录 128 帧 0 白帧——BUGS-SPLASH 验收表与本文件 Captured at 引用同一组数字，无冲突；构建标识链 `49d6c75`→`82cec01`→`eeaebf3` 已全线标注取代关系。④版本三处仍 `1.5.0` 同值未 bump（package.json:3、public/sw.js:7、public/version.json）。⑤账本只核对不改：`check-ledger.mjs` = LEDGER-OK，113/172 行、逐行 JSON 合法、无 `_example`，两本随 `eeaebf3` 各追加本轮派工行（TASK-MODEL-LOG 4 行、DISPATCH-LOG 5 行；DISPATCH 多出的第 2 行＝builder「补 WebView 底色」续派单，TASK-MODEL-LOG 只记任务级）；HANDOFF「docs 落盘清单」旧数 92/146 已订正。⑥Plan §P2 backlog 补一行登记本轮两条 P2（5 处色值漂移断言、MIUI 启动动画致图标本机不可见且不挂起 splash-screen），沿用 Change B 既存写法、不改 D1~D8 与 DEV_BASELINE。⑦`经验一句话.md` 追加 1 句（视觉缺陷逐帧取证＋改一轮不等于改完＋多口径交叉）。⑧根 `agent.md` 与 `temp/` 实际不在磁盘（`git log --all -- agent.md` 为空＝从未入仓），`.gitignore` 的 `temp/` 与 `/agent.md` 规则保留作预防，未删任何东西。⑨未闭环残留仅剩真人 Gate 与本节「Next Single Action」。

  - 收尾记一笔（neat-freak 2026-09-27 第三轮，Phase A.2 + Mutual 收口）：只清残留与文档事实，未碰业务代码/测试/题库/SSOT/版本号/两本账本、未 commit。①temp/ 清残留：删 3 份过时转审查说明（PhaseA、PhaseA1、PhaseA2），只留 `Party Night V2 A2与Mutual收口 转审查说明.md`（实测 `ls -la temp/` 仅 1 个文件）。②HANDOFF 事实回填（逐条以实测为准）：Captured at 与「当前 Task」由 Phase A.1 / RC `eeaebf3` / 未提交 → Phase A.2+Mutual CLOSED、基线 commit Mutual `987da2d`、A.2 `92943e7`、收尾 `2e84b29`、工作区干净（`git rev-parse HEAD`、`git status --short`）；RC 状态行 HEAD `2527e9f`→`92943e7`；Monte Carlo 数字由修复前（高 1.89/局、中+ 8.17/局、人物主题 2.6/8、连击 9.04、Heat 副口径 19.7/25.0/25.7/29.7）→ 修复后真源（高 2.34/局、中+ 7.49/局、人物主题 2.85/8、连击 9.12、主口径 heatAtDraw 25.0/25.0/24.5/25.5，`ROUTER-MONTE-CARLO.json`）；现场评价/猜测 139(39.7%)→132(37.7%)（`AUDIT-STATS-A1.json#semDist`）；报告自检 315→1,105 项（`npx tsx scripts/audit-a1-report.ts --verify-only`）；Mutual 由「未提交/未过审」→ 已 `987da2d` 单独提交（code-reviewer/QA PASS，supervisor 首检 FAIL 后账本补记，`TASK-MODEL-LOG` 第 111 行）；「人要拍什么板」处置配额由**已作废**的「保留 282/改写 66/删除 2」→ A.2 五分类 40/82/166/60/2（`AUDIT-STATS-A1.json#disposition`）；仓库行由「已 push」→ HEAD 领先 origin/main 2 commit 未 push（`git rev-list --left-right --count @{u}...HEAD`）。③两本账本只核对不改：`node scripts/model/check-ledger.mjs`=LEDGER-OK，114/173 行。④2.2 门禁数字全部实测一致，**无发现不一致**（unit 103/947、自检 1,105、曝光 312/350 总 75,506、dead-end 1,660/4,000=41.5%、truth 8,078:dare 7,985、五分类 40/82/166/60/2、κ either_or infoGain 0.0793 与 chemistry socialEnergy 0）。⑤`docs/qa/content-audit/` **未删任何文件**——逐项判定后确认 86 个文件均为脚本入参或原始留痕（`_slices`/`_reviews`/`_reviews-a1`/`_calib`/`_recheck` 是复算脚本入参；`_stable/arbitration*` 与 `_stable/_batches/*.out.txt` 是第三方仲裁原始留痕；`BASE-EXPORT.csv/.jsonl` 是 Phase A 基线机械导出；`theme-split-PROMPT.md` 是口径复算留痕且被报告正文引用；`independent-scan.jsonl` 0 行为「五主题 0 命中」证据），符合「原始判定与仲裁留痕应保留、拿不准就保留」。⑥三处版本号仍 `1.5.0` 未 bump。⑦残留（供编排者处理）：BUGS-CONTENT-A2.md 结论仍为 FAIL 未回填放行、Mutual 无独立第二次 supervisor 行、PRODUCT_PLAN §P2 backlog 待 planner 登记 A.2 的 P2。
  - 对 `docs/pm/PRODUCT_PLAN_V2.0.md` §P2 的**建议**（docs/pm 属 planner 位，neat-freak 未改 Plan 正文，交编排者转 planner）：①建议登记为 P2 backlog＝`CODE_REVIEW-CONTENT-A2` 的 P2-2（B8 三条断言依赖初始 seed 恰好 offset=0 的确定性巧合，建议显式注入 `drawSeed` 钉死意图）与 P2-4（跨局抽卡序列逐字重复，建议把 `sessionId` 纳入 seed 派生，属引擎抽卡、非内容，可独立小改）；②P2-1（「亲密/性观念」30 张全是肢体互动、性观念问答仍 0 的术语颗粒度防误读）与 P2-3（infoGain=中 82 张 100% 进 KEEP_CANDIDATE、保护分支零命中，Phase B 建议二次过筛）应作为 **Phase B 内容重构的输入**，不必进 P2 backlog；③P3-1~P3-4 为审查/文档口径项，不进产品 backlog。

## 一、当前工作进展（2026-09-22 晚，大交接冻结口）

- 生产站 https://party-night-v1-2.vercel.app（GitHub wanghoufan/party-night-v1-2，Vercel自动部署已断，改手动直推；见注意事项）。
- V1.5：转瓶子链回跳＋切包1/40重计＋顶栏暂停结束＋双页视觉＋题库180导出；宽屏热修（座位遮挡＋巨型按钮）；链入无响应热修（空牌堆补种＋耗尽提示）。已上线。
- V1.6（1.5.0）：终稿350入库（7类各50＝互动35/了解15/看戏0，4-5档35；红线三条卡面零命中；25张旧题面补遗改写全清零）；指数陡坡抽法（16:8:4:2:1）；耗尽不断游L1洗牌循环＋L2后台AI补题；Toggle重设计（品牌粉+✓/已避开）；三处1.5.0同值。门禁lint0/typecheck0/511/E2E80pass+4skip，reviewer＋supervisor PASS。已上线（手动部署）。
 - 题库文档：docs/content/下把关/9件（旧180审计＋处置＋新题纲）＋终稿/9件（终稿350题面：00总览§一3/5/7/14/21＋01–07各50＋08新题纲）；题库审查/7件已删（可pnpm export:questions重生）；评审CODE_REVIEW-V1.5/V1.6、QA BUGS-V1.5/V1.6；账本35行。
- 把关包vs软件：不一致是设计好的——把关包是旧180审计＋改写方向（给人审的），软件里是终稿350（已入库生效）。终稿/00总览§一已按种子实算重写（3/5/7/14/21，旧数注脚存档）。
- 终稿文字版终稿/9件已交付用户审题（按编号报问题）；25张旧题面补遗改写＋复核PASS已上线；neat-freak两轮对齐完成。

## 二、当前任务（小交接 2026-09-26 深夜，唯一有效；旧大交接RG清单已被用户5项收口单取代）

用户收口令（全做完才 commit+push+重冻，然后才通知用户跑 RG-01；**不进 RG-01、不排4/5人真人局**）：
1. ✅ 两人局 pointing-game/most-likely 死局升 RC 前必修 P1——已修（setup/quickStart/mixed按 active 人数过滤+「至少3人」拦截不进生成页+deck=0耗尽三出口兜底+测试15例；minPlayers 保持3未放宽）；reviewer CODE_REVIEW-DEADLOCK-P1.md 过（P0/P1=0）。
2. ✅ AI Matrix 合法格口径统一（players<minPlayers→SKIPPED-ILLEGAL 不进分母）——AI-MATRIX-FULL 重算 72合法/8SKIP；PHONE 24合法/4SKIP；三层 176合法/6SKIP。
3. ✅ 自包含真机证据修正——harness 运行时记录 location.origin（APP_ORIGIN=https://localhost）、AI-MATRIX-PHONE 头部改自包含口径、Mac :3000 非真机业务依赖、真机证据格 PASS（origin+generationSource=ai）。
4. ✅ AI-MATRIX-PLAN 三层正式矩阵（DeepSeek 主）已执行——tests/mac/ai-matrix-3l.ts（L1 pairwise 43+L2 高风险123+L3 定向18=184格/合法176）；修复链（route雷卡过滤+补齐重试+截断、redline判定器、semantic断言、customText否定豁免、rescreen）；现状 **P0=0/P1=0/通过率98.3%**（173 PASS+3定向预期失败）；OpenCode 80/80 留作补充证据；报告 docs/qa/AI-MATRIX-RESULT.md。
5. ⏳ 待收口：reviewer 2条P1整改 → qa 终审 → 全门禁（lint0/typecheck0/unit831/E2E全量/build全绿）→ supervisor 终检 → commit+push(main)+重冻 NEW RC → 通知用户开 RG-01。

## 三、注意事项及相关规矩

- **本轮新增（2026-09-26 收口实证，重要）**：
  - route.ts（服务端）改完后 **dev server 必须重启**——热重载没生效实证过（slice修复已落但矩阵仍拿14张，重启后才正确）；跑矩阵前确认 `curl 127.0.0.1:3000` 200。
  - 11T Pro+ USB 掉线时用无线 `adb connect 192.168.31.63:5555`——`getprop ro.serialno`==IN9LZTAYV4UGU4JF 即同一台（已核验），**12 Pro indq5xfi6hovay4d 仍禁碰**；每轮真机跑前重建 `adb forward tcp:9363 localabstract:webview_devtools_remote_<新pid>`（APP重启pid会变，502即失效）。
  - 真机/CDP 自动化走 tests/phone harness（WebView CDP 表定通道）；「真人手点」红线指 adb input 代点测试连接/开局，不禁止 CDP 自动化。
  - codebuddy 派工：deepseek 429→切 glm-5.3-flash（表定备用）；大单必超时——**超时先查落盘再小单续派**（本轮 D/D2/D3/E 连续续派5次才收敛，别盲重派）。
  - 矩阵重跑受影响格：把该格 JSON `mv` 到备份目录再 `run`（脚本按文件存在跳过）；判定器类修复用 `rescreen` 只重判不烧API。
  - OpenCode key 从 `~/.local/share/opencode/auth.json` 读进内存（不打印不落盘）；DeepSeek 走 `.env.local`（服务端）。
- Vercel Git自动部署已断（13:00后push不触发，GitHub侧无webhook/无check-runs）：发版走CLI手动`vercel deploy --prod --scope houfan`，上线后curl验age归零+version.json。
- codebuddy派工必带`-y`且常超时（10分钟）：超时先查工作区落盘再续派，不要盲重派。
- codex沙箱起不了127.0.0.1:3000（EPERM）：E2E一律本窗口bash直跑，DISPATCH注记TM接管。
- 内容安全三条红线永不进题库（露骨/强迫惩罚灌酒/隐私脱衣非自愿，用户已认可只做安全线内放开：亲脸颊/公主抱需双方同意+可跳过）。
- 版本号联动：package.json/version.json/sw.js CACHE_VERSION三处同值（test会卡）。
- 四 Tab 不动（首页/组局/游戏包/设置）；单设备单桌 local-first；整局预生成后离线可玩；Engine 与 Pack 解耦；无账号/联机/云库。
- 强度 1–5 沿用现有尺度 UI，不重做；酒罚默认含、雷区可关；跳过机制保留。
- 手机是 Party 主持人：不做逐人手机录入；默契测试单机口头+Host 点选。
- E2E 已知坑（修过，勿回退）：换题后读数必须等 header 轮次推进；Toggle 不用 label 包裹（span+input）；check/uncheck 改 click+断言；seedSession 不删库、版本与 App 对齐（当前 v2）；pack-switch 旧未完成轮记 skipped；顶栏计数只数completed（swap复用、skip不递增）；换一个烧卡不涨轮次。
- 不擅自 commit/push（修完默认推送部署是用户立规：commit＋push＋手动发版＋线上实测＋生产站地址同步）；不碰 secrets；`docs/sop/` 为规范位。
- E2E 全量约1分钟；production smoke 需先 `pnpm build` + `pnpm start` 再带 `PARTY_NIGHT_PRODUCTION_SMOKE=true` 跑。
- 仓库：origin = `https://github.com/wanghoufan/p028-party-night.git`，分支 main；已提交但**尚未 push** 的基线 commit 为 `987da2d`、`92943e7`、`2e84b29`（均已过 reviewer/QA/supervisor）。**当前 HEAD 与领先数量以 Git 实时状态为准，本行不硬编码；本轮禁止推送**（待 Human 授权）（旧 RC `eeaebf3` 仅存历史证据）。
- 设备规矩：只动11T Pro+（IN9LZTAYV4UGU4JF）；12 Pro（indq5xfi6hovay4d）禁碰（前车之鉴）。
- 测试连接/开局验证只能真人手点，adb代点无响应（已实证两次），不要再让机器代点。

## 恢复读盘（全体系唯一顺序，别乱）

1. AGENTS；2. 角色卡；3. 根 `USER_MODEL_OVERRIDE.md`（软链指母版 T3）；4. 本 HANDOFF；5. 根 `经验一句话.md`；6. 任务目标放最后。
冲突才扩大读。

## 治理审计待办（2026-09-26，ORCA 治理层）
- 回填 TASK-MODEL-LOG #60 的 chain_status=OPEN（「RC清障三件」result=PASS 但备注'待评审初版/产品阻塞'）；修正本 HANDOFF 中「DISPATCH-LOG（空…）」与实际行数不符（2026-09-26 记为 106 行，2026-09-27 复核现为 151 行，已在本文件「docs 落盘清单」处订正）。
- 依据与全量清单见 `1.Active/ORCA派工账本-逐项目待办清单.md`；新账本规则：model 用 provider/model 精确写法，角色交付 PASS≠整链验收（未闭环记 chain_status=OPEN）。
