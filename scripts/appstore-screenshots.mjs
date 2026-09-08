/**
 * Compose Apple Books–style App Store mockups from live app screenshots.
 * Light gray rounded card + iPhone frame + headline with brand-colored highlight.
 *
 * Usage: node scripts/appstore-screenshots.mjs
 *        (reuses marketing/app-store/raw/*.png when present)
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "marketing/app-store");
const RAW_DIR = join(OUT_DIR, "raw");

const APP = process.env.APP_URL || "https://shelfielibrary.netlify.app";
const SUPABASE_URL = "https://xdsnoqckoolwatgwtyfy.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkc25vcWNrb29sd2F0Z3d0eWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMzMzODksImV4cCI6MjEwMzcwOTM4OX0.3Nx7Aq40Tj10-Woc_5gcPUNU23qJWWI8X7kdwKvHXgg";

/** Brand highlight — replaces Apple Books orange (pine canopy sage, readable on gray) */
const HIGHLIGHT = "#6b9078";
const CARD_BG = "#e8e8ed";
const PAGE_BG = "#ffffff";
const INK = "#1d1d1f";

const FONT_BOLD = join(
  ROOT,
  "node_modules/@fontsource/open-sauce-sans/files/open-sauce-sans-latin-700-normal.woff2",
);
const FONT_MED = join(
  ROOT,
  "node_modules/@fontsource/open-sauce-sans/files/open-sauce-sans-latin-500-normal.woff2",
);

const VIEW_W = 390;
const VIEW_H = 844;
const DPR = 3;

/** headlineHtml may include <span class="hi">…</span> for brand highlight */
const SHOTS = [
  {
    id: "01-catalog",
    path: "/library",
    wait: "text=Circe",
    prepare: "grid",
    headlineHtml: `<span class="hi">Catalog</span> every book you own.`,
  },
  {
    id: "02-loans",
    path: "/loaned",
    wait: "text=Jordan Lee",
    headlineHtml: `<span class="hi">Know</span> who has what — track loans and due dates.`,
  },
  {
    id: "03-locations",
    path: "/locations",
    wait: "text=Living Room",
    headlineHtml: `<span class="hi">Find</span> any book in seconds by room and shelf.`,
  },
  {
    id: "04-team",
    path: "/settings",
    wait: "text=Team Members",
    prepare: "team",
    headlineHtml: `<span class="hi">Share</span> one catalog with your household.`,
  },
  {
    id: "05-add",
    path: "/add?mode=cover",
    wait: "text=Photograph",
    headlineHtml: `<span class="hi">Add</span> books in a snap — photograph a cover to start.`,
  },
];

async function composeAppleBooksStyle({ browser, rawPath, outPath, headlineHtml }) {
  const W = 1290;
  // Card proportions similar to Apple Books store screenshots
  const CARD_W = 1100;
  const CARD_PAD_X = 72;
  const CARD_PAD_TOP = 72;
  const CARD_RADIUS = 56;

  // Phone size inside card
  const PHONE_W = 780;
  const PHONE_H = Math.round(PHONE_W * (VIEW_H / VIEW_W));
  const BEZEL = 18;
  const RADIUS_OUTER = 68;
  const RADIUS_INNER = 54;

  const bold = readFileSync(FONT_BOLD).toString("base64");
  const med = readFileSync(FONT_MED).toString("base64");

  // Fit screen into inner phone display
  const innerW = PHONE_W - BEZEL * 2;
  const innerH = PHONE_H - BEZEL * 2;
  const screenBuf = await sharp(rawPath)
    .resize(innerW, innerH, { fit: "fill" })
    .png()
    .toBuffer();
  const screenB64 = screenBuf.toString("base64");

  const context = await browser.newContext({
    viewport: { width: W, height: 200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.setContent(
    `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @font-face {
    font-family: "Open Sauce Sans";
    font-weight: 700;
    src: url("data:font/woff2;base64,${bold}") format("woff2");
  }
  @font-face {
    font-family: "Open Sauce Sans";
    font-weight: 500;
    src: url("data:font/woff2;base64,${med}") format("woff2");
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px;
    background: ${PAGE_BG};
    font-family: "Open Sauce Sans", -apple-system, system-ui, sans-serif;
    display: flex;
    justify-content: center;
    padding: 40px 0 48px;
  }
  .card {
    width: ${CARD_W}px;
    background: ${CARD_BG};
    border-radius: ${CARD_RADIUS}px;
    padding: ${CARD_PAD_TOP}px ${CARD_PAD_X}px 64px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .headline {
    text-align: center;
    font-size: 54px;
    font-weight: 700;
    line-height: 1.16;
    letter-spacing: -0.03em;
    color: ${INK};
    max-width: 15.5em;
    margin-bottom: 56px;
  }
  .headline .hi {
    color: ${HIGHLIGHT};
  }
  .phone-wrap {
    filter: drop-shadow(0 28px 48px rgba(0,0,0,0.22));
  }
  .phone {
    width: ${PHONE_W}px;
    height: ${PHONE_H}px;
    background: #0b0b0d;
    border-radius: ${RADIUS_OUTER}px;
    padding: ${BEZEL}px;
    position: relative;
  }
  .screen {
    width: ${innerW}px;
    height: ${innerH}px;
    border-radius: ${RADIUS_INNER}px;
    overflow: hidden;
    background: #f0f2e8;
    position: relative;
  }
  .screen img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: fill;
  }
  /* Dynamic Island */
  .island {
    position: absolute;
    top: ${BEZEL + 14}px;
    left: 50%;
    transform: translateX(-50%);
    width: 126px;
    height: 36px;
    background: #0b0b0d;
    border-radius: 20px;
    z-index: 5;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="headline">${headlineHtml}</div>
    <div class="phone-wrap">
      <div class="phone">
        <div class="screen">
          <img alt="" src="data:image/png;base64,${screenB64}"/>
          <div class="island"></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
    { waitUntil: "load" },
  );

  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(200);

  const h = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewportSize({ width: W, height: h });
  await page.screenshot({ path: outPath, fullPage: true, type: "png" });
  await context.close();
}

async function hideChromeNoise(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("body *")) {
      if (!(el instanceof HTMLElement)) continue;
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (/^Powered by Netlify$/i.test(t) && t.length < 40) {
        (el.closest("a,div,span,button") || el).style.setProperty("display", "none", "important");
      }
    }
  });
}

async function preparePage(page, shot) {
  if (shot.prepare === "grid") {
    const gridBtn = page.getByRole("button", { name: /cover grid/i });
    if (await gridBtn.count()) {
      await gridBtn.first().click();
      await page.waitForTimeout(600);
    }
  }
  if (shot.prepare === "team") {
    await page.evaluate(() => {
      const el = [...document.querySelectorAll("h2,h3,div,p,span,label")].find((n) =>
        /team members/i.test(n.textContent || ""),
      );
      el?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(400);
  }
}

async function captureIfNeeded(browser) {
  const missing = SHOTS.some((s) => !existsSync(join(RAW_DIR, `${s.id}.png`)));
  if (!missing && !process.env.FORCE_RECAPTURE) {
    console.log("Using existing raw screenshots");
    return;
  }

  mkdirSync(RAW_DIR, { recursive: true });
  const sessionMeta = JSON.parse(readFileSync("/tmp/appstore-demo-session.json", "utf8"));
  const supabase = createClient(SUPABASE_URL, ANON);
  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email: sessionMeta.email,
    password: sessionMeta.password,
  });
  if (error) throw error;

  const storageKey = "sb-xdsnoqckoolwatgwtyfy-auth-token";
  const sessionPayload = {
    access_token: auth.session.access_token,
    refresh_token: auth.session.refresh_token,
    expires_at: auth.session.expires_at,
    expires_in: auth.session.expires_in,
    token_type: "bearer",
    user: auth.user,
  };

  const context = await browser.newContext({
    viewport: { width: VIEW_W, height: VIEW_H },
    deviceScaleFactor: DPR,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
  });

  await context.addInitScript(
    ({ storageKey, sessionPayload, libraryId }) => {
      localStorage.setItem(storageKey, JSON.stringify(sessionPayload));
      localStorage.setItem("pine-bookkeeping-library-id", libraryId);
    },
    { storageKey, sessionPayload, libraryId: sessionMeta.libraryId },
  );

  await context.addInitScript(() => {
    setInterval(() => {
      for (const el of document.querySelectorAll("body *")) {
        if (!(el instanceof HTMLElement)) continue;
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (/^Powered by Netlify$/i.test(t) && t.length < 40) {
          (el.closest("a,div,span,button") || el).style.setProperty("display", "none", "important");
        }
      }
    }, 400);
  });

  const page = await context.newPage();
  await page.goto(`${APP}/home`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);

  for (const shot of SHOTS) {
    console.log("capturing", shot.id);
    await page.goto(`${APP}${shot.path}`, { waitUntil: "networkidle", timeout: 60000 });
    try {
      await page.waitForSelector(shot.wait, { timeout: 20000 });
    } catch {
      /* continue */
    }
    await hideChromeNoise(page);
    await preparePage(page, shot);
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      await Promise.all(
        [...document.images].map(
          (img) =>
            img.complete ||
            new Promise((res) => {
              img.onload = res;
              img.onerror = res;
            }),
        ),
      );
    });
    await page.screenshot({ path: join(RAW_DIR, `${shot.id}.png`), fullPage: false, type: "png" });
  }

  await page.goto(`${APP}/home`, { waitUntil: "networkidle" });
  await hideChromeNoise(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(RAW_DIR, "00-home.png"), fullPage: false });
  await context.close();
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(RAW_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });

  await captureIfNeeded(browser);

  for (const shot of SHOTS) {
    const rawPath = join(RAW_DIR, `${shot.id}.png`);
    const outPath = join(OUT_DIR, `appstore-${shot.id}.png`);
    console.log("composing", shot.id);
    await composeAppleBooksStyle({
      browser,
      rawPath,
      outPath,
      headlineHtml: shot.headlineHtml,
    });
    console.log("  wrote", outPath);
  }

  await browser.close();

  writeFileSync(
    join(OUT_DIR, "README.md"),
    `# App Store screenshots

Apple Books–style frames (light gray card + iPhone) with **live Pine UI** inside.
Headline highlights use brand green \`#3d5248\` (not orange).

\`\`\`bash
node scripts/appstore-screenshots.mjs
FORCE_RECAPTURE=1 node scripts/appstore-screenshots.mjs   # refresh raws from production
\`\`\`
`,
  );
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
