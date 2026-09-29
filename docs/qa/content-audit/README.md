# docs/qa/content-audit/｜现役状态指针

> **本目录的 MC / 结构产物不是现役答案。**
> 唯一现役状态见 `docs/handoff/HANDOFF.md` 的「大交接 3（2026-09-29 收尾）」段。

## 当前口径（2026-09-29 收尾时）
- `FORMAL-TRUTH-MC.json` / `FORMAL-TRUTH-MC.md` / `FORMAL-TRUTH-MC-WORST-TRACE.json` / `FORMAL-TRUTH-PRODUCTION-CHAIN.json` 仍是 **`formalTotal 5`** 的旧值（酒吧重构 A9 之前口径）。
- 代码侧 `formalFixed` 实际已是 **57**（H1 15 / H2 20 / H3 16 / H4 6），因此**这四个产物与代码不一致，属 `pending`，必须重刷**。
- 重刷前**不得**引用这些文件里的 `note` / `summary` 做任何结论；也**不得**为了对账去改代码里的准入或阈值。

## 历史产物（留痕，不改）
`CONTENT-AUDIT-350.*`、`CONTENT-STRUCTURE-REPORT.md`、`ROUTER-MONTE-CARLO.*`、`MC-TRACE.json`、`STABLE-LABELS.json`、`GAP-*`、`TOP20-*`、`_calib/ _ranks.json _recheck/ _reviews/ _slices/ _stable/ _semantic/` 均为**旧 350 题与旧 Formal 口径**下的历史证据，只作留痕。

## 纪律
- 报告/MC 的 `note` / `summary` **必须由实测派生**；篡改产物会被可复算护栏判红（本项目已因此踩坑）。
- 报告口径必须**双章分开**：`A｜Engine/显式披露` 与 `B｜当前真实 UI`（后者 `roundDisclosureForCurrentRound()` 恒 `undefined` ⇒ `effective=0 / Heat=H1 / mid Mutual 不可达`）；⛔ 禁止写「生产 Heat 已正常推进」。
- `Heat` 纪律：`heatMin` 逐卡来自 reviewer；⛔ 不得为让 MC 好看压低 `heatMin` 或改门槛；诚实的深题暂时抽不到是**正确结果**。
