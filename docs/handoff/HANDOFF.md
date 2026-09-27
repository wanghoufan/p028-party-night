# HANDOFF｜交接（暂停/恢复用，先读我）

> 旧版字段（governance-state / Evidence / Human Gate / Promotion / Dispatch ID）已废弃，不填。

- Captured at（YYYY-MM-DD HH:MM）：2026-09-27（**内容质量专项审查 Phase A.2 + Mutual 1TAP 收口均已 CLOSED 并提交（基线 commit Mutual `987da2d`、A.2 `92943e7`、收尾 `2e84b29`）；技术 RC 为 `RC_NEEDS_REFREEZE`（基线 commit：Mutual `987da2d` / A.2 `92943e7` / 收尾 `2e84b29`；**当前 HEAD 与 ahead 数量以 Git 实时状态为准，不在本文件硬编码**），未 bump，工作区干净**）
- PROJECT_PHASE（**WAITING_HUMAN_APPROVAL** —— Human 2026-09-27 新方向 **固定题库优先（Fixed Content First）+ AI 暂停正式主线**；`docs/pm/PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST.md` 已产出并通过 Research Reviewer **三轮**复审（79 → FAIL/blockingP1=1 → 87 → **PASS 94/100**，Gate 全勾、**无需例外**），DEV_BASELINE 待 Human 批准后设为 `PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST`；未启动 Builder、未开始 AI 扩题、未批量改 350 题、未重冻 RC、未执行 RG-02）
- PLAN_VERSION：（PRODUCT_PLAN_V2.0）
- PLAN_READINESS_SCORE：（83＋Human例外有条件批准）
- PLAN_GATE：（APPROVED，V2.0 Human Gate终版）
- DEV_BASELINE：（PRODUCT_PLAN_V2.0）
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
  - 真实 Router Monte Carlo（复用生产 createV2MainlineRouter / drawV2SessionCard / reduceV2SessionEvents / applyV2HostDecision，4 桌型 × 1000 局 = 4000 局，每局 20 completed rounds；P1#2 修复后重跑）：跑满 20 轮的 2340 局（58.5%）中高 2.34/局、中+ 7.49/局、人物主题 2.85/8 类、**最长连续低/0 连击 9.12 轮**；运行时 Heat 主口径 heatAtDraw H1 25.0% / H2 25.0% / H3 24.5% / H4 25.5%（静态可用范围 H1 58 / H2 128 / H3 160 / H4 222，跨 Heat 卡 218 张）。
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
- 当前 Task：**Phase A.2 内容审查可靠性收口 ＋ Mutual 1TAP 已全部完成并提交**（基线 commit Mutual `987da2d` / A.2 `92943e7` / 收尾 `2e84b29`；当前 HEAD 与 ahead 以 Git 实时状态为准）。评审 `docs/review/CODE_REVIEW-CONTENT-A2.md` = **PASS（P0=0，blocking P1=0，非 blocking P1=2，P2×4，P3×4）**、`docs/review/CODE_REVIEW-MUTUAL-1TAP.md` = **PASS**；QA `docs/qa/BUGS-CONTENT-A2.md` = **FAIL→收口清理后由 supervisor 放行**、`docs/qa/BUGS-MUTUAL-1TAP.md` = **PASS**。门禁：tsc 0 error、lint 0 error（11~12 个既有 warning）、unit **103 files / 947 tests**、`audit-a1-verify.ts` 350/350 合规、报告 **1,105 项一致性自检 PASS**。**已 commit，未 push（待 Human 授权；领先数量以 `git rev-list --left-right --count @{u}...HEAD` 实时为准）。**
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
  - 下一步（Next Single Action）：**先跑完 Phase A.2 的 code-reviewer 复审 → QA → supervisor**，然后**不重冻 RC**，直接进入 `PLAN_REOPEN_REQUIRED`，由 `Sol Planner → Research Reviewer → Human Gate` 生成 Phase B 新 Plan / 新 DEV_BASELINE。Human 批准后才开始正式改题与 metadata。**不再开 Phase A.3 / A.4 审查循环**；下一步的转向是「从证明题库不好 → 设计一套真正好玩的新内容基线」。
  - **Phase B Change C 规划链已走完（停在 Human Gate）**：`docs/pm/PRODUCT_PLAN_V2.1-CHANGE-C.md`（Sol Planner，覆盖 8 块：Mutual 隐私揭屏、严格 D8、Heat×Intensity 正交内容矩阵、内容蓝图、7 玩法信息机制、AI 出题合同、20 轮体验指标、Design Delta/Misuse Review 门禁）；`docs/review/RESEARCH_REVIEW-V2.1-CHANGE-C.md`（Research Reviewer 两轮）：第 1 轮 FAIL（P0=0 / blocking P1=0 / 非 blocking P1=4，Readiness **74/100**）→Planner 回修 4 项（恢复默认写死安全取消整轮、加 `intimacyClass` 机器可校验字段、补 asker/拒绝出口/计数归属、定死「不显示」+三行渲染优先级表）→第 2 轮 **4/4 P1 全部 CLOSED**，但 **Readiness 86/100 < 90 数值门**，结果仍 FAIL。独立复算确认：**H4×I1 全库 0 张**（对角绑定实测）。残差项均为 Builder 阶段外部证据（新内容 snapshot、库存 solver、新库 Monte Carlo、真人小样），Plan 阶段结构上无法填满 ——与 V2.0（83 分 + Human 例外批准）同构，**请 Human 定是否例外放行**（若坚持满 90，Planner 能补的仅剩 2 句，第三轮返工无意义）。
  - **Mutual 任务隔离（已收口）**：4 个 Mutual 文件（`components/game/MutualCheckSheet.tsx`、`lib/v2-relationship/v2-mutual-check.ts`、`tests/e2e/v2-mutual-flow.spec.ts`、`tests/unit/mutual-check-sheet.test.tsx`，互选面板「每人 1 次点击」）已走 `code-reviewer（PASS）→ QA（PASS）→ supervisor`，并于 `987da2d` **单独 commit**（未与 A.2 合并）。supervisor 首次终检因「Mutual 三派账本零记录」= FAIL（`TASK-MODEL-LOG` 第 111 行，A.1 同类 incident 复发）；账本补记后随本轮收口放行（**无独立第二次 Mutual supervisor 行，供编排者复核**）。
- 人要拍什么板（**2026-09-27 重载：Phase B Change C 人工决策，共 5 项，编排者不代决**）：
  1. **是否 push 当前全部已审查 commit**（基线：Mutual `987da2d`、Phase A.2 `92943e7`、收尾对齐 `2e84b29`；已通过 reviewer/QA/supervisor）。**本轮不得推送，等 Human 明确授权**；待推数量以 `git rev-list --left-right --count @{u}...HEAD` 实时为准。
  2. **是否批准 Phase B 新方向（Fixed Content First）并进入 Builder**——Plan `PRODUCT_PLAN_V2.2-FIXED-CONTENT-FIRST.md` 已过 Reviewer 三轮，最终 **PASS 94/100、Gate 全勾、无需例外放行**。Human 明确说「第二阶段，开发」才进 DEVELOP。
  3. ~~是否接受 Mutual 从「1.35s 自动揭屏」改为「下一位本人主动揭屏」~~ → **Human 2026-09-27 已决：作废**。真实用法是主持人持机逐人递交，因此不需下一位主动揭屏；保持「每人一次作答点击」即可（现有实现已符合）。
  4. **D8 是否正式允许「切换玩法继续」作为第三个 Host 决策**（B），还是**严格保持 finish/reshuffle 二选一**（A）。缺口见上方 P1-D8-AWAITING-EXIT。
  5. **Phase B 20 轮体验目标最终数值**（仅为待验证假设，未经 Review/Human 不得冻结）：保约 20 轮覆盖 ≥5 个人物维度、中及以上信息轮 ≥8、高信息轮目标 ≥3、连续低/0 信息轮 ≤3、social buffer 约 20%–30%。
  - 已作废、不再占用 Human 决策：① 4 个 Mutual 文件已由 `987da2d` 单独提交；② Router 曝光偏斜已修（P1#2 CLOSED）；③ 「低开放度桌是否自动提开放度」已作废（自动提开放度是明令禁止项）；④ 处置配额 40/82/166/60/2 已被「不按标签自动施工」取代，Phase B 改为先定新内容蓝图、再决定旧题去留；⑤ 两包低增量玩法不删整包，改为「全桌猜/指人 → 被选中本人揭露」结构。
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
