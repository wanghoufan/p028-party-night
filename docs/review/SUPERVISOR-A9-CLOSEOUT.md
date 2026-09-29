# SUPERVISOR｜A9 收尾复检结论（致编排者）

- 落位说明：按派工书 §5 首选方案，新建本汇总文件留痕；**未改任何既有文件**（业务/测试/文档均未碰），未 commit/push。被检文件评论区未另写（QA 与 CR 报告均已冻结落盘，追加评论即改既有文件；本汇总为唯一新增）。
  （2026-09-30 收尾注：本句记录的是本单执行当时状态；成果现已于 2026-09-30 落于 `6cac2a2` / `013939b` 并 push main。）
- 复检身份：supervisor（opencode-go/muse-spark-1.3-contributor，opencode 通道）。只对编排者说话。
- 读盘顺序：AGENTS.md → docs/roles/supervisor.md → USER_MODEL_OVERRIDE.md → HANDOFF「大交接 3」§0~§5 → 经验一句话.md → BUGS-A9-CLOSEOUT.md（两轮） → CODE_REVIEW-A9-CLOSEOUT.md → RESEARCH_REVIEW-PACK1-FINAL-54/53 → 派工书 §4。
- 结论档位：**FAIL（治理性 FAIL：产品验收阻断；内容与技术面全绿）**。与 QA 首轮 FAIL 口径一致，不放水。
- 是否可进入 commit：**建议可以 commit，但必须由人类明确下指令（含分支名），且 commit message 如实注明「产品验收未闭环（product_acceptance_ac_added=false），整体不得报完工」**。commit ≠ 完工。

## 4.1 技术面：属实，全绿（亲跑证据）

- `0 failed` 属实：亲跑 `npx vitest run --testTimeout=30000` → **137 files / 1453 passed / 0 failed**（16s）。
- manifest 可复现：亲跑 `pnpm build:fixed-manifest` 两次 → 同 hash `e4b5d4c21e3f9b6b6f609a6bdc4d186c4892bd169647b6a5b4e74dcb661b5185`（与重跑前磁盘值逐字节一致，本人未引入变化；与 Code Reviewer 报告值一致）。门禁输出：相比 443 / 不一致 0 / 快照外 ID 0 / 两次构建一致。内 hash legacy `e4fffc31…` / formal `d911d0b8…` 与 QA 报告一致。
- 三者同一套（亲算，不信报告）：review input 活跃 `reviewed=true & humanBarFit=PASS` 53 张 **逐 id == manifest formalFixed 53 张**（双向差集均为空）；运行时等值由亲跑全绿 vitest 内 `card-source-consistency` + `fixed-content-manifest` 等值断言覆盖。Formal 53 ID 表亲读：无 236/249/263/277，无 A3 26 张。
- 退役卡隔离：A3 26 张 + 本轮 4 张（236/249/263/277）**均不在 formal、不在 legacy（443）、不在运行时卡源**；4 张在卡源仅注释残留、无卡定义；`lib/` 内 `import.*archive` 零命中。A4a 漏洞未复发。
- 绕行项重点查结论：**未掩盖真实漂移，但机制残留风险记 NOTE**。证据：①漂移（203 机器 PASS→SUSPECT）是批准漂移（FINAL-54 处方改写题面含"刷手机"字眼→规则字面命中）；②旧 manifest 备份在 `temp/A9-R7-manifest-stale-backup.json`（亲验存在：OLD 444/prov、formal 54、203=PASS）；③新 provenance 如实记 203=SUSPECT（非 PASS），249 已从 formal **和** provenance 双除；④本人重跑后门禁 `相比443/不一致0` 绿。残留风险：脚本"无既有产物跳过"路径仍在，后续复用须每次备份+裁决指针（本次已做到）。另 `tsc` 亲跑 exit 0；`pnpm lint` 亲跑 0 error / 12 warning（既有基线）；E2E 未亲跑（角色卡：抽查只看矩阵与证据不重跑QA；QA round1 `temp/qa-a9/e2e.log` + CR 3217 端口实跑双证据 106/0/6 一致）。

## 4.2 产品面：抽查成立（非只看测试绿）

- 酒吧基线未回退：题面亲 grep 退出词（五年后/长期关系/上一段关系/前任/分手/各占几成/哪三段/心理咨询/原生家庭）**题面零命中**；可疑卡（261 现状/259 边界/254 即时感觉/250 今晚决策）FINAL-54 已逐条语义裁决，抽查无异议。
- 弱卡未保送：277（四无后勤题）、249（与 250 同轴三弱）、236/263（重复）退役判据成立；专项复核"无复活理由"同意。
- 重复已清：235 留 / 236 退、278 留 / 263 退、250 留 / 249 退，三组判据成立。
- hook 不虚标：`category=follow_up_hook` 全库亲算 **9 处** = 272/273/274/275/276/278/279/280/281（逐卡归属亲验），与 FINAL-54 一致；239/253/257/264/270/271 维持保守（抽验 264 卡面 `social_style` ✓）；hook 已降诊断基线（`pack1-supplements.test.ts` 退出 requirement 断言在亲跑全绿内）。
- consent：242/243/267/268/269 无 exact `physical-contact`（全库仅 1 处注释提及）；267/269 的 `private-individual`+`proximity` override 在 `pack1-admission.ts:87-96` 落地（亲验），卡源字面量保持原样、单真源不两处存放。卡面"偏好 ≠ 授权"注释 + skip-anytime 三层俱全。
- 203 两层分记：provenance 机器 SUSPECT + review input 人工 PASS + 活跃 note 已随新题面重写（亲验），互不掩盖；FINAL-53 误报理由（答案选项内容、口头作答）成立。
- 256 topic 精确 `相处规则`（亲读卡面 :301）、262/264 `social_style`（亲读 :536/:579），注释署名链完整。

## 4.3 治理面：成立为主，3 个 NOTE（不打回）

- TM 未写业务代码：成立。TASK 账本 TM 行全为 HANDOFF/skill/同步/CORRECTION 类（TM 位置文件）；业务卡面注释署名均为 builder 通道工作痕迹（A6/A7/A8/A9-R6/R7/R8），生成产物由脚本重刷（R8 报告 + 两次 hash 存证）。
- 备用记账：两账互验一致。R7 返工/R8/端口治本三单 TASK 与 DISPATCH 均记 `model=备用glm / requested=deepseek-flash / 429至2026-09-30 21:58`，与事实一致。NOTE：DISPATCH `used=备用` 共 5 行（含历史 C1-4/R3 两行先例），按角色卡字面"used 恒填主"算偏离，但按"如实记账+历史惯例"算合规透明；**不打回、不许重写账本**，建议治理明确备用记法（透明优先）。
- 双真源闭环：A2 原件 `temp/BAR-AUDIT-PACK1-31.md` 在盘（50,769 字节，mtime 2026-09-29 13:57，未改写，temp 未入库）；ADJUDICATION 最终 KEEP 5 / REWRITE 5 / REPLACE 21（5+5+21=31 自洽；改判 202/225 明示；原 7/19 vs 执行 5/21 闭环）。
- `check-ledger` 亲跑 `LEDGER-OK（含 WARN）`；WARN 均为历史行（精确 ID/未闭环提醒），A9 新行无新增 WARN；TASK 第二道亲跑 bad=0。
- 14 份备份：`git -c core.quotepath=false status --short | grep 旧版` = 14 行全 `??`，`git ls-files` 零跟踪，未删未改 ✓。`temp/` 被 .gitignore 覆盖（:25），`git ls-files temp` 为空 ✓。
- 返工计数：**本 supervisor session 打回 0 次**（首检）；Code Reviewer 为 PASS_WITH_NOTES（P2×1/P3×3，notes 非打回）；A9 账本行 rework 全 0；HANDOFF 无 supervisor 打回记录。**无同一 Task 累计 2 次情形，无需升级 senior-expert。**
- P2/P3 清完亲验：P2-1 注释已订正（95 段作废/常量 94）、P3-1 归档头已补消费者清单、P3-2 括注已改"其中含 A3 KEEP 保留的 5 张"、P3-3 退役指针在 admission :14/:19/:185/:188。229 瑕疵题面亲验未动（bootstrap :96 仍"说说…那次"），登记不修属实。

## 4.4 未闭环项（如实登记，不淡化；另有本检新增 NOTE 3 条）

1. 产品验收阻断（维持）：`product_acceptance_ac_added` 仍 `false`（亲读）；实绩 Plan 缺 AC 编号+关键 AC 集合+发布类型；QA 判关键 AC 未测。依母版红线**不得报完工**，需人类拍板（是否 Change C），编排者已上呈。
2. 未 commit：工作树 **52 M + 33 ??（14 备份 + 19 新）= 85 项**，全部未提交。NOTE：编排者上呈"67 项"与实测 71 项内容改动（52M+19新）不符，请订正为 71（差 4 疑为 P2/P3 清完后新增，内容无问题，数字需改）。commit 需人类明确指令。
   （2026-09-30 收尾注：Supervisor 当时实测 71 项内容改动，编排者实测提交为 Commit A 71 files + Commit B 5 files，两个口径分属不同时点，不要混成一个数字；且现已 commit + push。）
3. E2E 6 skip 既有（production 离线/PWA×3/V2 Mutual 延期/AI 回退），非新增，不得计 PASS。
4. 229 瑕疵登记不修（亲验题面未动）。
5. 结构缺口登记不补：Golden H2 3→2（236 退）、REPLACE 轴（263 退）、supplement（277/249 退）。
6. （新增 NOTE）账本缺 3 类行：QA-A9 两轮、CODE_REVIEW-A9、P2/P3 cleanup 单——check 不报坏但行缺，请 TM 追加补记（不重写历史）。
7. （新增 NOTE）`GOVERNANCE-STATE.json` 的 `task_ledger_rows=202` 已过期（实测 TASK 215 行，无 _example 行），收尾请同步。
8. （新增 NOTE）种子壳跳过路径机制残留（见 §4.1），后续复用须备份+裁决指针。

## 心跳

- 目标：A9 收尾 supervisor 复检；剩 P0：产品验收（人类拍板）+ commit（人类指令）；下一步：编排者补账本 3 类行、订正 67→71、上呈人类拍板 commit 与 Change C。

（自证见终端 `ls -l` + `shasum -a 256`。）
