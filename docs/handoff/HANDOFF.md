# HANDOFF｜交接（暂停/恢复用，先读我）

> 旧版字段（governance-state / Evidence / Human Gate / Promotion / Dispatch ID）已废弃，不填。

- Captured at（YYYY-MM-DD HH:MM）：2026-09-27 11:35（**NEW RC 再次重冻：commit `eeaebf3`（main，已 push）**；上一 RC `82cec01` 作废。本轮新增：启动画面白屏修复——根因两个（Capacitor 模板纯白 splash.png + WebView 默认白底），均已定位并修掉，配色/图标全取项目现有 theme（#080B1A + @mipmap/ic_launcher），未另造；真机逐帧验证改前 48/97 帧纯白 → 改后 0/128 白亮帧，最终候选 RC 复录同样 0 白帧；门禁 lint0/tsc0/unit927/E2E105+4skip/build/build:export 全绿；reviewer+qa+supervisor P0=0 blocking P1=0；版本未 bump 仍 1.5.0；RG-01~RG-07 仍 NOT_STARTED）
- PROJECT_PHASE：（DEVELOP：RELEASE_GATE_VALIDATION；RELEASE_GATE NOT_STARTED）
- PLAN_VERSION：（PRODUCT_PLAN_V2.0）
- PLAN_READINESS_SCORE：（83＋Human例外有条件批准）
- PLAN_GATE：（APPROVED，V2.0 Human Gate终版）
- DEV_BASELINE：（PRODUCT_PLAN_V2.0）
- CHANGE_REQUEST：（A：用户 2026-09-27 返回键退出确认小改，留 DEVELOP；前一轮为 B）
- Stage ID（本阶段叫什么）：V2.0-Relationship Engine（Human已决D1换真源/D2切Router/D3=A20+5/D4=A异性/D5上限2/D6中性不推进/D7=A展示即给过/D8=A+；Release前强制Gate RG-01~RG-07须7/7）
 - 剩 P0（没完的才列，多一条都不行）：
  - **收口清单已清零**：Change B 16 节全部落地；两处物理依赖（JDK21、11T Pro+ 无线）已解决——`brew install openjdk@21`（用户批准）→ 新自包含 web 资产 + debug 签名包装机；11T Pro+ USB 装机 → 新构建 machine smoke PASS（详见 docs/qa/RG-01-NEWRC-SMOKE.md）。
  - **仅剩真人 Gate（不是代码任务）**：
- RC状态：**NEW RC = `eeaebf3`（2026-09-27 11:35 重冻，main 已 push；HEAD `446dc5c` 为其后的 docs 回填提交）**；`82cec01`、`49d6c75` 均已作废，其间的 `5f0745d` 是上一轮 neat-freak 收口 docs 提交、非 RC。真机证据：新构建 machine smoke（Change B 10 项 + Change A 返回键 5 项）＋ 启动画面逐帧复录 0 白帧（含最终候选 RC 复录 128 帧 0 白帧），全部 PASS（见 docs/qa/RG-01-NEWRC-SMOKE.md）。7/7 前禁版本号升级、禁正式部署。
- 当前 Task：本轮 Change A「启动白屏」已闭环并重冻（证据：docs/review/CODE_REVIEW-SPLASH.md 过、docs/qa/BUGS-SPLASH.md PASS、docs/qa/RG-01-NEWRC-SMOKE.md 末两节录屏逐帧数据）。剩余待办仍只有真人 Gate：RG-01（用户手点：开局抽卡～mutual/MATCH/隐私）与 RG-02~07（真人局，用户排期）。已知 P2 两条：①启动图标已配置且在 APK 内，但 MIUI 启动动画覆盖系统启动屏，本机看不到（不为此挂起启动屏，reviewer/qa 一致）；②启动色值散在 5 处，建议补静态同值断言防漂移。
- 未闭环评审意见：CODE_REVIEW-CHANGE-B-ROUTING.md 过（P0=0/blocking P1=0，P2×3 P3×2）；CODE_REVIEW-CHANGE-B-UI-SAFETY.md 过（P0=0/blocking P1=0，P2×2 P3×3）；CODE_REVIEW-MATRIX-3L.md 的 P1×2 已由复评关闭（新增 P2-5 backlog）；CODE_REVIEW-DEADLOCK-P1.md 过；CODE_REVIEW-AI-GEN-STABILITY.md 过。
- docs 落盘清单：
  - 基线：`docs/2026-09-21 - MAC - ChatGPT - Party Night玩法扩展与主局整合-计划 - V1.1/`（4 份，用户提供）
  - 评审：`docs/review/CODE_REVIEW-V1.1.md`、`docs/review/CONVERGE-V1.1.md`
  - QA：`docs/qa/BUGS-V1.1.md`、`docs/qa/V1.1-放行证据.md`
  - 事实备份：`docs/handoff/HANDOFF.md.旧版-2026-09-13`（V1.2 真源）；`docs/pm/V1.3-讨论稿.md`（挂起：7 待定+酒罚默认含决策）
  - 账本：`docs/model/TASK-MODEL-LOG.jsonl`（96 行）；`docs/model/DISPATCH-LOG.jsonl`（151 行）；`node scripts/model/check-ledger.mjs` = LEDGER-OK（2026-09-27 收口复核：两本均 96/151 行、逐行 JSON 合法、无 `_example` 残留；旧文「86/137 行」与「DISPATCH 空」均为过期快照；上一轮收口记的 92/146 亦已被后续派工追加，现行数以本行为准）
   - V1.6：评审`docs/review/CODE_REVIEW-V1.6.md`（PASS，commit 4ba3d13）、QA`docs/qa/BUGS-V1.6.md`（lint0/typecheck0/511/E2E80+4skip/三处1.5.0）、把关`docs/content/题库把关/`9件（00总览旧180审计+01–07+08新题纲）、终稿`docs/content/题库终稿/`9件（00总览§一终稿350分布3/5/7/14/21+01–07各50+08新题纲）；旧`docs/content/题库审查/`已删（文档搬家映射）；账本35行至V1.6补遗（dup删后27行自验口径作废，以现35行为准）
 - V2-B3：评审`docs/review/CODE_REVIEW-V2-B3.md`（FAIL→返工→复验PASS）、QA`docs/qa/BUGS-V2-B3.md`（lint0/typecheck0/610）；账本随行。
 - 2026-09-26 收口链：评审`docs/review/CODE_REVIEW-AI-GEN-STABILITY.md`（过）/`CODE_REVIEW-DEADLOCK-P1.md`（过）/`CODE_REVIEW-MATRIX-3L.md`（过，P1×2待整改+P2×4）；QA`docs/qa/BUGS-AI-GEN-STABILITY.md`（PASS，终审待更新）/`AI-MATRIX-FULL.md`（OpenCode 80/80，72合法）/`AI-MATRIX-PHONE.md`（24/24，origin运行时口径）/`AI-MATRIX-RESULT.md`（三层 DeepSeek 184 总格/合法 174/98.3% P0=0）/`AI-GEN-DIAG-0926.md`；三层逐格`docs/qa/ai-content-3l/`（176）+修复前备份`ai-content-3l-pre-fix/`+OpenCode旧证据`ai-content/`+DeepSeek旧证据`ai-content-deepseek-0926/`；harness `tests/mac/ai-matrix-3l.ts|ai-matrix-full.ts|ai-matrix-redline.ts`、`tests/phone/ai-matrix-phone.ts`；真机截图原存 `test-results/phone/ai-matrix/`25张（2026-09-27 收口核对：已被后续 playwright 全量跑覆盖清空，现 `test-results/` 只剩 `.last-run.json`；矩阵证据真源是 `docs/qa/ai-content-3l*/` 的逐格 JSON，截图不作门禁证据）。
 - 下一步（Next Single Action）：通知用户「NEW RC `eeaebf3` 已就绪，可开 RG-01」（上一轮通知的 `82cec01` 已被本次启动白屏 RC 取代，勿再报旧号）→ 用户在 11T Pro+ 真人手点跑 RG-01（开局抽卡～mutual/MATCH/隐私等机器不代点项）→ RG-02 需 4 人成年真人弱光完整局，性别比例不限（`2男2女`、`1男3女`、`1女3男` 等均可），未完成原契约则保持 PENDING；RG-01~RG-07 仍须 7/7 PASS 才 Release。
- 人要拍什么板：
  - ~~装 JDK21 需用户点头~~（**已解决**，2026-09-27：用户批准后 `brew install openjdk@21`（21.0.12.1）已装，新 APK 与 machine smoke 均已跑通；见上方「剩 P0」）。
  - ~~11T Pro+ 需开机回同一 Wi-Fi~~（**已解决**，本轮全程 USB `IN9LZTAYV4UGU4JF`；12 Pro indq5xfi6hovay4d 仍禁碰，本轮全程未碰）。后续若改无线，仍按「回同一 Wi-Fi 或 `adb connect 192.168.31.63:5555`，`getprop ro.serialno` 核同一台」执行。
  - 本轮已由编排者裁定的口径（不再占用用户决策，除非否决）：① DoD#14 昵称口径＝**真名/参与者投影/性别结构/anchor 标志不外发，Host 输入的 displayName 昵称沿用 V1.0 冻结 prompt 行为**（域模型无真实姓名字段；否决则走 Change C 并重冻 prompt fixture）；② Exposure 轮级口径、Coverage offered 终态计数、finalize 不重算边在场性＝P2 backlog 本期放行；③ Single-Anchor 桌 pair opportunity 减半（10 定向+10 非定向交替）的节奏仅在实际碰到 1:N 真人桌时顺带观察曝光节奏与非定向占比，未碰到记「未做」，不作为 RG-02 门槛，不阻断 Release。
  - 收口全绿后 TM 自行 commit+push+重冻（用户已授权本轮收口链），**通知后**才由用户真人手点 RG-01；RG-02~07 真人局由用户排期（现在不排）；局内"移出本局"入口是否加（另报，不拦RC）。
- permission_request：无。
- 收尾记一笔（neat-freak 2026-09-22）：docs 与代码已对齐（8 包/规则 8 条/工具 2 个/Session v2；V1.3 讨论稿 2 处已校准）；test-results 空、:3000 无残留进程；README 中英 8 玩法为 TM 后续补齐（校验 DOCUMENTATION_READY）。
 - 收尾记一笔（neat-freak 2026-09-22 V1.6）：docs/content下仅题库把关/9件，题库审查/已删（映射见CODE_REVIEW-V1.6 P2）；V1.6评审/QA/把关/账本35行与代码现状一致（350/陡坡/L1L2/开关/1.5.0）；未碰业务代码。
  - 收尾记一笔（TM代neat-freak 2026-09-26，通道限额）：docs与代码一致（CHANGE-B评审/QA/RG smoke/AI-MATRIX-PLAN/direct-provider及单测均在位，单测815全绿）；工作区22文件未提交（AI直连+分块+回退提示，HEAD 741e2e9）；未碰业务玩法逻辑；分离前codebuddy deepseek限额切glm；只动11T Pro+（IN9LZTAYV4UGU4JF），12 Pro（indq5xfi6hovay4d）后半程未碰。（2026-09-27 收口补注：该批「未提交」改动已于当日随 `49d6c75` 提交并 push，见上方 RC 状态。）
  - 收尾记一笔（neat-freak 2026-09-27，Phase2 收口）：只清残留与文档事实，未碰业务代码/测试/版本号/账本、未 commit。①`.gitignore` 补签名材料（`*.jks`/`*.keystore`/`*.p12`）——`android/.gitignore` 里这两行是注释态，而 release `signingConfig` 仍是待办（RG-01-NEWRC-SMOKE 遗留项），先兜住密钥；本轮构建产物（`out/`、`.next/`、`.static-export-stash/`、`test-results/`、`.vercel/`、`android/**/build/`、`android/app/src/main/assets/`）本已被根规则与 `android/.gitignore` 覆盖，不重复加；实测 `git ls-files -i -c --exclude-standard` 为空＝无「该进仓却被 ignore」的文件，本轮新增的 tests/lib/components/docs 与 `docs/qa/ai-content-3l*` 证据全部在版本库内。②文档事实回填：RG-01-NEWRC-SMOKE（Change B 构建＝`49d6c75`、Change A 段补 `82cec01`、机器侧由误写的「9/10」改为与表格一致的 7/10）、BUGS-EXIT-GUARD（§H 真机项已回填并逐项映射编排者 04:09 实测、§G `next-env.d.ts` 改为按自动生成口径表述）、CODE_REVIEW-EXIT-GUARD（commit 回填＋并入条件里「G 节」笔误订正为 §H）、两份 CHANGE-B 评审与两份 MATRIX-3L 评审（未提交→已随 `49d6c75` 提交；矩阵分母口径 173/176→最终 174＝171＋3）、BUGS-CHANGE-B（无 Android 证据→已补 02:38 machine smoke）、PRODUCT_PLAN_V2.0-CHANGE-B（§七 事实回填：写稿时 RC=BLOCKED 已过期，NEW RC=`82cec01`）。③矩阵数字独立复算与落盘一致：176 份 JSON＝173 PASS＋3 EXPECTED-ERROR、P0/P1=0，合法分母 174＝171 PASS＋3，3.3 两格 `local-fallback`/0 卡＝防线成立 2/2。④三处版本号仍 `1.5.0` 同值未 bump。⑤账本只核对不改：TASK-MODEL-LOG 92 行、DISPATCH-LOG 146 行，逐行 JSON 合法、无 `_example`，`check-ledger.mjs` = LEDGER-OK（上方旧数 86/137 已订正）。⑥根 `agent.md` 与 `temp/` 实际已不在磁盘（.gitignore 规则保留作预防），未删任何东西。⑦未闭环残留见本节「Next Single Action」与 `docs/review/` 的 P2/P3 backlog。
  - 收尾记一笔（neat-freak 2026-09-27 第二轮，Phase2 收口·启动白屏链）：只清残留与文档事实，未碰业务代码/测试/版本号/账本行、未 commit。①`.gitignore` **本轮零改动**——实测本轮新产物已全覆盖：`android/app/src/main/assets/{capacitor.config.json,capacitor.plugins.json,public}` 由 `android/.gitignore:96/99/100` 兜住，`android/**/build/` 由 `android/.gitignore:24`，`out/`、`.next/`、`test-results/`、`playwright-report/`、`.vercel`、`.static-export-stash/` 由根规则第 3/5/7/8/14/16 行兜住；录屏与截图证据全部落在 `/tmp`（`/tmp/exitguard-back1.png` 等），仓库内 `find` 无任何 `.mp4/.webm/.mov`；`git log --all --diff-filter=A` 证实从未有 adb/screencap/录屏脚本入过仓，工作区 `git status -uall` 为空（无真机临时脚本残留）。反向校验 `git ls-files -i -c --exclude-standard` 为空＝无「该进仓却被 ignore」文件；本轮该进库的 9 个文件（`res/values/colors.xml`、`res/drawable/pn_splash.xml`、`res/values/styles.xml`、`capacitor.config.dev.ts`、`capacitor.config.release.ts`、`app/globals.css`、`next-env.d.ts`、`docs/review/CODE_REVIEW-SPLASH.md`、`docs/qa/BUGS-SPLASH.md`）逐个 `git ls-files --error-unmatch` 实测全部 TRACKED。②文档事实回填：CODE_REVIEW-SPLASH（Commit 由「未提交工作区改动」回填 `eeaebf3`＋文件数 16→**18**＝11 删＋5 改＋2 新增，与 `git show --name-status eeaebf3` 逐项对齐；Result 补「已并入 RC `eeaebf3`」）、BUGS-SPLASH（结论补「已并入 RC `eeaebf3`」；「待编排者回填」节按事实关闭——RC 11:35 重冻、最终候选 11:33 复录 128 帧 0 白帧已落 RG-01-NEWRC-SMOKE 末节、账本与 HANDOFF 已回填；颜色漂移断言明确留作 P2 且未新增测试）、RG-01-NEWRC-SMOKE（Change A 段 `82cec01` 补「已被 `eeaebf3` 取代」＋用 `git diff 82cec01 eeaebf3 -- app lib android capacitor.config*.ts`（18 个启动屏文件、返回键零改动）证明 5 项证据仍属当前 RC 链；Change B 段补 `eeaebf3` 叠加关系）、BUGS-EXIT-GUARD（§G `next-env.d.ts` 补订正：`eeaebf3` 已把仓库内容改为 `.next/types/…` 变体，原「`82cec01` 提交的是 `.next/dev/types/…`」已过期）、HANDOFF 三处过期 RC 号（RC 状态行「5f0745d 非 RC」说明、Next Single Action 改报 `eeaebf3`、注意事项 HEAD `96a1e24`/`82cec01` → `446dc5c`/`eeaebf3`）、治理审计待办的 106 行 → 151 行。③RG-01-NEWRC-SMOKE 三批证据交叉核对无矛盾：Change B 10 项＝机器侧 7/10（①–⑤⑨⑩）与表格逐行一致、⑥⑦⑧按旧 RC 口径待用户上手；返回键 5/5；启动白屏改前 97 帧中 48 帧纯白（第 22~69 帧、峰值 YAVG 230、49.5%）→ 改后 112 帧 0 白亮帧（亮度 27~74）、14 张快速 screencap 与 10 倍慢放 325 帧均 0 白帧、最终候选复录 128 帧 0 白帧——BUGS-SPLASH 验收表与本文件 Captured at 引用同一组数字，无冲突；构建标识链 `49d6c75`→`82cec01`→`eeaebf3` 已全线标注取代关系。④版本三处仍 `1.5.0` 同值未 bump（package.json:3、public/sw.js:7、public/version.json）。⑤账本只核对不改：`check-ledger.mjs` = LEDGER-OK，96/151 行、逐行 JSON 合法、无 `_example`，两本随 `eeaebf3` 各追加本轮派工行（TASK-MODEL-LOG 4 行、DISPATCH-LOG 5 行；DISPATCH 多出的第 2 行＝builder「补 WebView 底色」续派单，TASK-MODEL-LOG 只记任务级）；HANDOFF「docs 落盘清单」旧数 92/146 已订正。⑥Plan §P2 backlog 补一行登记本轮两条 P2（5 处色值漂移断言、MIUI 启动动画致图标本机不可见且不挂起 splash-screen），沿用 Change B 既存写法、不改 D1~D8 与 DEV_BASELINE。⑦`经验一句话.md` 追加 1 句（视觉缺陷逐帧取证＋改一轮不等于改完＋多口径交叉）。⑧根 `agent.md` 与 `temp/` 实际不在磁盘（`git log --all -- agent.md` 为空＝从未入仓），`.gitignore` 的 `temp/` 与 `/agent.md` 规则保留作预防，未删任何东西。⑨未闭环残留仅剩真人 Gate 与本节「Next Single Action」。

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
- 仓库：origin main 已同步（本轮已 push，HEAD `446dc5c`、NEW RC `eeaebf3`；此前 push 曾切 p028-party-night，核对 remote）。
- 设备规矩：只动11T Pro+（IN9LZTAYV4UGU4JF）；12 Pro（indq5xfi6hovay4d）禁碰（前车之鉴）。
- 测试连接/开局验证只能真人手点，adb代点无响应（已实证两次），不要再让机器代点。

## 恢复读盘（全体系唯一顺序，别乱）

1. AGENTS；2. 角色卡；3. 根 `USER_MODEL_OVERRIDE.md`（软链指母版 T3）；4. 本 HANDOFF；5. 根 `经验一句话.md`；6. 任务目标放最后。
冲突才扩大读。

## 治理审计待办（2026-09-26，ORCA 治理层）
- 回填 TASK-MODEL-LOG #60 的 chain_status=OPEN（「RC清障三件」result=PASS 但备注'待评审初版/产品阻塞'）；修正本 HANDOFF 中「DISPATCH-LOG（空…）」与实际行数不符（2026-09-26 记为 106 行，2026-09-27 复核现为 151 行，已在本文件「docs 落盘清单」处订正）。
- 依据与全量清单见 `1.Active/ORCA派工账本-逐项目待办清单.md`；新账本规则：model 用 provider/model 精确写法，角色交付 PASS≠整链验收（未闭环记 chain_status=OPEN）。
