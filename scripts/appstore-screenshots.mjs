/**
 * Apple Books–style App Store screenshots at correct device aspect.
 * Canvas matches iPhone App Store size (1290×2796 ≈ 0.46), not a wide card.
 *
 * Usage: node scripts/appstore-screenshots.mjs
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

/** Brand highlight replacing Apple Books orange */
const HIGHLIGHT = "#3d5248";
const CARD_BG = "#e8e8ed";
const INK = "#1d1d1f";
const APP_BG = "#f0f2e8";

const FONT_BOLD = join(
  ROOT,
  "node_modules/@fontsource/open-sauce-sans/files/open-sauce-sans-latin-700-normal.woff2",
);

const VIEW_W = 390;
const VIEW_H = 844;
const DPR = 3;

/** App Store 6.7" portrait — same aspect as Apple Books refs (1125×2436) */
const CANVAS_W = 1290;
const CANVAS_H = 2796;

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
    headlineHtml: `<span class="hi">Know</span> who has what.`,
  },
  {
    id: "03-locations",
    path: "/locations",
    wait: "text=Living Room",
    headlineHtml: `Find any book <span class="hi">in seconds.</span>`,
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
    headlineHtml: `Add books <span class="hi">in a snap.</span>`,
  },
];

/**
 * Build phone screen: status-bar band (for Dynamic Island) + untouched app UI.
 * Island must NEVER cover the real chrome.
 */
async function buildPhoneScreen(rawPath, displayW) {
  const aspect = VIEW_H / VIEW_W;
  const displayH = Math.round(displayW * aspect);
  // Status band ~6.5% of height (island lives here only)
  const statusH = Math.round(displayH * 0.055);
  const uiH = displayH - statusH;

  const ui = await sharp(rawPath)
    .resize(displayW, uiH, { fit: "fill" })
    .png()
    .toBuffer();

  const status = await sharp({
    create: { width: displayW, height: statusH, channels: 3, background: APP_BG },
  })
    .png()
    .toBuffer();

  return sharp({
    create: { width: displayW, height: displayH, channels: 3, background: APP_BG },
  })
    .composite([
      { input: status, left: 0, top: 0 },
      { input: ui, left: 0, top: statusH },
    ])
    .png()
    .toBuffer()
    .then(async (buf) => ({ buf, displayW, displayH, statusH }));
}

async function composeAppleBooksStyle({ browser, rawPath, outPath, headlineHtml }) {
  const bold = readFileSync(FONT_BOLD).toString("base64");

  // Phone sizing — large, like Apple Books (~72% of canvas width)
  const phoneOuterW = Math.round(CANVAS_W * 0.72);
  const bezel = Math.round(phoneOuterW * 0.022);
  const displayW = phoneOuterW - bezel * 2;
  const { buf: screenBuf, displayH, statusH } = await buildPhoneScreen(rawPath, displayW);
  const phoneOuterH = displayH + bezel * 2;
  const radiusOuter = Math.round(phoneOuterW * 0.14);
  const radiusInner = Math.round(radiusOuter * 0.82);

  const screenB64 = screenBuf.toString("base64");
  const islandW = Math.round(displayW * 0.32);
  const islandH = Math.round(statusH * 0.72);
  const islandTop = bezel + Math.round((statusH - islandH) / 2);

  const context = await browser.newContext({
    viewport: { width: CANVAS_W, height: CANVAS_H },
    deviceScaleFactor: 1,
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
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${CANVAS_W}px;
    height: ${CANVAS_H}px;
    overflow: hidden;
    background: ${CARD_BG};
    font-family: "Open Sauce Sans", -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
  }
  .frame {
    width: ${CANVAS_W}px;
    height: ${CANVAS_H}px;
    background: ${CARD_BG};
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 96px 64px 0;
  }
  .headline {
    text-align: center;
    font-size: 56px;
    font-weight: 700;
    line-height: 1.12;
    letter-spacing: -0.035em;
    color: ${INK};
    max-width: 11.5em;
    margin-bottom: 52px;
    flex-shrink: 0;
  }
  .headline .hi { color: ${HIGHLIGHT}; }
  .phone-wrap {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    filter: drop-shadow(0 32px 60px rgba(0,0,0,0.28));
  }
  .phone {
    width: ${phoneOuterW}px;
    height: ${phoneOuterH}px;
    background: #0a0a0c;
    border-radius: ${radiusOuter}px;
    padding: ${bezel}px;
    position: relative;
  }
  .screen {
    width: ${displayW}px;
    height: ${displayH}px;
    border-radius: ${radiusInner}px;
    overflow: hidden;
    position: relative;
    background: ${APP_BG};
  }
  .screen img {
    width: 100%;
    height: 100%;
    display: block;
  }
  .island {
    position: absolute;
    top: ${islandTop}px;
    left: 50%;
    transform: translateX(-50%);
    width: ${islandW}px;
    height: ${islandH}px;
    background: #0a0a0c;
    border-radius: ${Math.round(islandH / 2)}px;
    z-index: 3;
  }
</style>
</head>
<body>
  <div class="frame">
    <div class="headline">${headlineHtml}</div>
    <div class="phone-wrap">
      <div class="phone">
        <div class="screen">
          <img alt="" src="data:image/png;base64,${screenB64}"/>
        </div>
        <div class="island" aria-hidden="true"></div>
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
  await page.waitForTimeout(150);
  await page.screenshot({
    path: outPath,
    type: "png",
    clip: { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H },
  });
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
    const meta = await sharp(outPath).metadata();
    console.log("  wrote", outPath, `${meta.width}x${meta.height}`);
  }

  await browser.close();

  writeFileSync(
    join(OUT_DIR, "README.md"),
    `# App Store screenshots

Apple Books layout at **device aspect** (1290×2796):

- Full-bleed light gray panel (not a wide card on white)
- Large iPhone with Dynamic Island in a status band (does not cover UI)
- Headline accent in brand forest green \`#3d5248\` (not orange)
- Live Pine screenshots inside

\`\`\`bash
node scripts/appstore-screenshots.mjs
FORCE_RECAPTURE=1 node scripts/appstore-screenshots.mjs
\`\`\`
`,
  );
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
