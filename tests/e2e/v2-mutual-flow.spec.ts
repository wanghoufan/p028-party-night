import { expect, test, type Page } from "@playwright/test";
import { readSession, seedSession } from "./helpers";
import { BUILTIN_SEED_CARDS } from "@/lib/game-packs/built-in-seeds";
import type { GameSession, Intensity } from "@/lib/domain/schemas";

const SESSION_ID = "e2e-v2-mutual-flow";

/** 2男2女：p1男/p2女/p3男/p4女，保证合法pair存在。 */
function mutualSession(): GameSession {
  const now = new Date().toISOString();
  const names = ["Alex", "Emma", "Kai", "Mia"];
  const players = names.map((displayName, index) => ({ id: `p${index + 1}`, displayName, active: true, createdAt: now, lastUsedAt: now }));
  const deck = BUILTIN_SEED_CARDS.filter((card) => card.packId === "truth-dare").slice(0, 12);
  if (deck.length < 12) throw new Error(`truth-dare seed only ${deck.length}`);
  return {
    schemaVersion: 2, id: SESSION_ID, status: "active", mode: "single",
    config: {
      // intensity 5：旧种子前12张高强度居多，3档局4轮就没牌；5档全可用，走满9轮
      players, relationship: "friends", vibes: ["funny"], intensity: 5 as Intensity,
      boundaries: { noPhysicalContact: false, noAlcoholPenalty: true, noExPartners: false, noSexualHistory: false, noMoneyIncome: false, noPhonePrivacy: true, noPublicPosting: true, noStrangerContact: true, noPhotoVideo: false, noSocialAccounts: false, customText: "" },
      enabledPackIds: ["truth-dare"], mode: "single",
    },
    deckSnapshot: deck, usedCardIds: [], rounds: [],
    currentPackId: "truth-dare", currentSegmentId: "e2e-mutual", currentPackState: {},
    recentRejectedFingerprints: [],
    participants: [
      { playerId: "p1", active: true, pairGender: "male" },
      { playerId: "p2", active: true, pairGender: "female" },
      { playerId: "p3", active: true, pairGender: "male" },
      { playerId: "p4", active: true, pairGender: "female" },
    ],
    startedAt: now, updatedAt: now,
  } as GameSession;
}

const completeBtn = (page: Page) => page.locator(".round-action--complete");

/**
 * RG-01 新流程：每人只点一次。SELECT 屏凭小字交接提示认人（请把手机交给 X，其他人别看屏幕），
 * 点对方昵称（多候选）/「愿意」（单候选）即提交，或「暂时没有」「跳过」跳过；
 * 点完立刻返回，交接遮罩（已收起）零按钮、定时自动进入下一位。
 */
async function playOnePerson(page: Page, name: string, chooseName: string | null) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10000 });
  for (let step = 0; step < 40; step += 1) {
    if (await dialog.getByRole("button", { name: "继续游戏" }).isVisible().catch(() => false)) return;
    // 只认 SELECT 屏的小字交接提示，避免误匹配交接遮罩的「请把手机交给 X」
    const hint = await dialog.getByText(/请把手机交给 .+，其他人别看屏幕/).textContent().catch(() => null);
    if (!hint || !hint.includes(name)) {
      await page.waitForTimeout(400);
      continue;
    }
    if (chooseName) {
      const opt = dialog.getByRole("button", { name: chooseName, exact: true });
      if (await opt.isVisible().catch(() => false)) { await opt.click(); return; }
      const yes = dialog.getByRole("button", { name: "愿意", exact: true });
      if (await yes.isVisible().catch(() => false)) { await yes.click(); return; }
    } else {
      const no = dialog.getByRole("button", { name: "暂时没有", exact: true });
      if (await no.isVisible().catch(() => false)) { await no.click(); return; }
      const skip = dialog.getByRole("button", { name: "跳过", exact: true });
      if (await skip.isVisible().catch(() => false)) { await skip.click(); return; }
    }
    await page.waitForTimeout(500);
  }
}

test("V2私密互选全流程：9轮→检查点→互选成MATCH→继续游戏", async ({ page }) => {
  await seedSession(page, mutualSession());
  await page.goto(`/game?session=${SESSION_ID}`);

  for (let round = 1; round <= 9; round += 1) {
    await expect(completeBtn(page)).toBeVisible({ timeout: 15000 });
    // 卡面切换动画中按钮会短暂重挂载：detached就重试本轮
    await expect(async () => {
      await completeBtn(page).click({ timeout: 5000 });
    }).toPass({ timeout: 20000 });
    // 等本轮落盘再进下一轮（避免点到旧卡按钮）
    await expect(async () => {
      const s = await readSession(page, SESSION_ID);
      if (s.rounds.filter((r) => r.status === "completed").length < round) throw new Error("wait round");
    }).toPass({ timeout: 15000 });
  }

  // 第9个有效轮后应弹出私密互选
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15000 });

  // p1(Alex)选p2(Emma)，p2选p1 → MATCH；p3/p4跳过
  await playOnePerson(page, "Alex", "Emma");
  await playOnePerson(page, "Emma", "Alex");
  await playOnePerson(page, "Kai", null);
  await playOnePerson(page, "Mia", null);

  // 结果页：应公布MATCH，不逼人
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15000 });
  const finishBtn = page.getByRole("button", { name: /继续游戏|结束本轮私密互动/ });
  await expect(finishBtn).toBeVisible({ timeout: 10000 });
  await finishBtn.click();

  // 回到主局且MATCH落盘
  await expect(completeBtn(page)).toBeVisible({ timeout: 15000 });
  const stored = await readSession(page, SESSION_ID);
  expect(stored.rounds.filter((r) => r.status === "completed").length).toBeGreaterThanOrEqual(9);
  // 互选成的只有 p1×p2（p3/p4 跳过、单向一律不落盘）
  const matches = Object.values(stored.relationshipState?.matches ?? {});
  expect(matches).toHaveLength(1);
  expect([...matches[0]!.playerIds].sort()).toEqual(["p1", "p2"]);
});
