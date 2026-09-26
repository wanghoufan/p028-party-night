# QA 复验｜Change A：返回键退出确认

- 日期：2026-09-27
- 范围：EXIT-GUARD-001 返工复验；静态导出冷启动、退出确认行为、自动化回归与构建门禁
- QA_RESULT：**PASS**（Web/静态导出范围）
- P0：0
- P1：0（EXIT-GUARD-001 已 CLOSED）
- 放行建议：Web 与静态导出复验通过；NEW RC 重冻前仍须编排者完成本报告末尾 Android 真机项。真机项未回填前不应宣称 Android 硬件返回行为已验收。

## A. EXIT-GUARD-001 冷启动复验

按上一轮“独立新 context，冷启动直开深路由；文档解析完成后立即回退”的口径，在 `out/` 静态导出 HTTP 服务（`127.0.0.1:4173`）上重复 8 次/路由。触发点为 `DOMContentLoaded` 后立即执行浏览器 `goBack()`。每次均记录 armed 标记、最终 URL、确认框数；无一次到达 `about:blank`。

| 路由 | 次数 | 每次结果（n=1…8） |
|---|---:|---|
| `/setup` | 8/8 PASS | 1 PASS：armed=1，留在 `/setup/`，确认框=1；2 PASS：armed=1，留在 `/setup/`，确认框=1；3 PASS：armed=1，留在 `/setup/`，确认框=1；4 PASS：armed=1，留在 `/setup/`，确认框=1；5 PASS：armed=1，留在 `/setup/`，确认框=1；6 PASS：armed=1，留在 `/setup/`，确认框=1；7 PASS：armed=1，留在 `/setup/`，确认框=1；8 PASS：armed=1，留在 `/setup/`，确认框=1。 |
| `/packs` | 8/8 PASS | 1 PASS：armed=1，留在 `/packs/`，确认框=1；2 PASS：armed=1，留在 `/packs/`，确认框=1；3 PASS：armed=1，留在 `/packs/`，确认框=1；4 PASS：armed=1，留在 `/packs/`，确认框=1；5 PASS：armed=1，留在 `/packs/`，确认框=1；6 PASS：armed=1，留在 `/packs/`，确认框=1；7 PASS：armed=1，留在 `/packs/`，确认框=1；8 PASS：armed=1，留在 `/packs/`，确认框=1。 |
| `/settings/ai` | 8/8 PASS | 1 PASS：armed=1，留在 `/settings/ai/`，确认框=1；2 PASS：armed=1，留在 `/settings/ai/`，确认框=1；3 PASS：armed=1，留在 `/settings/ai/`，确认框=1；4 PASS：armed=1，留在 `/settings/ai/`，确认框=1；5 PASS：armed=1，留在 `/settings/ai/`，确认框=1；6 PASS：armed=1，留在 `/settings/ai/`，确认框=1；7 PASS：armed=1，留在 `/settings/ai/`，确认框=1；8 PASS：armed=1，留在 `/settings/ai/`，确认框=1。 |

总计 24/24 PASS，about:blank=0，确认框数异常=0；EXIT-GUARD-001 **CLOSED**。此外新增冷启动 E2E 只列 `/setup` 与 `/settings/ai` 两条路由；`/packs` 的八次覆盖来自本轮独立 `/tmp` Playwright 复验。

## B. Builder 自述三项复核

| 项目 | 结果 |
|---|---|
| JS chunk 全断时返回仍留站内 | PASS：全断 `_next/static/**` 脚本后，head 内联初始化仍 armed；返回后仍停在 `/setup/`，不是 about:blank。React 不会运行，因此没有确认框；此项只证明空窗不离站。 |
| armed 后只有一条哨兵、只弹一个框 | PASS：history entry depth=1；回退弹出一个 dialog、URL 不变；再次回退只关框，仍留站内。 |
| 冷启动首页连按两次返回＝关框不退出 | PASS：第一次返回出现一个 dialog；第二次后 dialog=0、URL 仍为首页、没有 about:blank。 |

## C. 回归真实性与 E2E 口径

- `tests/unit/exit-guard-init.test.ts` 执行仓库实际 `EXIT_GUARD_INIT_SCRIPT` 源码，但宿主是手写 history/window/document 桩；它验证一次/重复初始化、`__NA`、储存异常与接管前 popstate 的预期。不是纯浏览器证明，也有脚本与被测实现共享源码的局限；本轮真实 Chromium 静态导出 24 次复验补足该部分证据。
- 新增 `tests/e2e/exit-confirm-cold-start.spec.ts` 使用 `goto(waitUntil: "commit")` 后等 `DOMContentLoaded` 才回退，并断言 armed、站内 URL 与 dialog；不是 commit 到首段 HTML 的最早时刻。该口径实际测的是“文档刚解析完成后”，本轮 24 次独立复验同样在此时触发。
- `git diff -- tests/e2e` 未显示已跟踪 E2E 文件改动。当前 `tests/e2e/exit-confirm.spec.ts`、`tests/e2e/exit-confirm-cold-start.spec.ts`、`tests/unit/exit-guard-init.test.ts` 均为未跟踪新文件；所以不能从 Git 历史确认 `exit-confirm.spec.ts`“仅第 9 行注释”，只能确认既有已跟踪 E2E spec 没有被改口径。
- 全量 E2E 第一次 104 passed、4 skipped、1 failed：`session-recovery.spec.ts` 在并发运行时等待首页“今晚开局”超时 30 秒。该用例单独重跑通过；随后全量重跑 105 passed、4 skipped。记录为一次未复现的并发波动，不是静默抹去首轮失败。
- BrowserOS neo MCP 工具本轮不可用。依照已告知的限制，本轮按用户要求用 Playwright/Chromium 做静态导出和 E2E 复验；这不是 BrowserOS neo 会话证据。

## D. `/packs/` 尾斜杠断言

- `pnpm exec playwright test tests/e2e/exit-confirm.spec.ts --grep '多层页面逐级返回'`（dev）通过；dev 的现有 E2E URL 断言 `/\/packs(\?|$)/` 成立。
- `out/` 静态导出实际回退 URL 为 `http://127.0.0.1:4173/packs/`，用户仍在正确的 packs 页面且没有确认框；旧断言 `/\/packs(\?|$)/` 对这个尾斜杠 URL 为 false。产品行为通过，差异来自静态导出 `trailingSlash: true` 与 dev URL 形式不同。
- 等级：**P3（测试口径兼容性）**，不是实现缺陷。建议修测试断言为兼容可选尾斜杠，例如 `/\/packs\/?(?:\?|$)/`；不要为满足断言改路由实现。当前 E2E 配置跑 dev，故现有全量 dev E2E 不受影响；若未来把同一断言用于 `out/` 会误报失败。

## E. 全门禁

| 命令 | 本轮结果 |
|---|---|
| `pnpm lint` | exit 0；0 errors、7 warnings（`scripts/decision/*`、`tests/phone/dump-state.ts`） |
| `npx tsc --noEmit` | exit 0；无输出 |
| `pnpm vitest run` | exit 0；102 files passed，927 passed，0 failed；17.74s |
| `pnpm test:e2e` | 首轮 104 passed/4 skipped/1 session-recovery 超时；该用例单跑通过；全量复跑 exit 0，105 passed/4 skipped，2.2m |
| `pnpm build` | exit 0；Next 16.3.3 production build 成功，静态/SSG 路由生成完成 |
| `pnpm build:export` | exit 0；`out/` 静态导出完成，包含 `/setup`、`/packs`、`/packs/new`、`/settings/ai` |

## F. 行为复核（`out/` 静态导出，独立 Playwright/Chromium）

| 场景 | 结果 |
|---|---|
| 有上一层的 `/setup` 返回 | PASS：回到首页，无确认框 |
| 有上一层的 `/packs` 返回 | PASS：回到首页，无确认框 |
| `/packs/new` 返回 | PASS：回到 `/packs/`，无确认框 |
| 有上一层的 `/settings/ai` 返回 | PASS：回到首页，无确认框 |
| 弹框开着再返回 | PASS：只关闭框，URL 仍为首页 |
| 继续玩按钮 | PASS：取消，停在首页 |
| ESC | PASS：取消，停在首页 |
| 点击遮罩 | PASS：取消，停在首页 |
| 点击「退出」 | PASS：离开本站至 `about:blank`（Web 可验证口径） |
| 刷新后守门、连续两次返回 | PASS：刷新后 armed=1；第一次开框，第二次关框，仍在首页 |

## G. 依赖、生成物、版本与隐私

- `@capacitor/app` 7.1.2 可解析：`node_modules/@capacitor/app/dist/plugin.cjs.js`；`@capacitor/core` 为 7.6.9。
- Android 生成物差异只有插件引用：`android/capacitor.settings.gradle` 增加 `:capacitor-app` 与相对 `../node_modules/@capacitor/app/android` 路径；`android/app/capacitor.build.gradle` 增加 `implementation project(':capacitor-app')`。没有机器绝对路径或密钥。
- 三处版本一致且未 bump：`package.json=1.5.0`、`public/version.json=1.5.0`、`public/sw.js CACHE_VERSION=1.5.0`。
- 退出守门改动仅在本地读写 history、localStorage 与事件；退出按钮调用 `App.exitApp()` / Web `location.replace()`。新增守门代码未见网络上报或遥测调用。
- `git diff --check` 通过。构建自动生成的 `next-env.d.ts` dev 路径改动已恢复；未改 app/lib/tests/scripts/android 中任何文件。

## H. 真机项待编排者回填

本 QA 未连接设备、未调用 adb。NEW RC 重冻前由编排者在 Android 真机记录：

1. 冷启动首页按一次硬件返回：确认框出现；点「继续玩」后仍留首页。
2. 从首页进入 `/setup`、`/packs`、`/packs/new`、`/settings/ai`，硬件返回均逐级回退且不弹确认框。
3. 确认框打开时再按硬件返回只关框；快速连按无静默退出、无重复确认框。
4. 冷启动直达 `/setup` 后立刻触发硬件返回，验证冷启动空窗已修复；再复测刷新后连续两次返回。
5. 点确认框「退出」后由 `App.exitApp()` 实际退出应用。

回填设备型号、Android 版本、安装包版本/构建标识、每步实测结果及必要截图/日志。以上真机项完成前，QA 的 PASS 仅覆盖 Web 与静态导出，不覆盖 Android 硬件返回及 `exitApp()`。
