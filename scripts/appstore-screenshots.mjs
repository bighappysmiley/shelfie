/**
 * Capture real Pine Bookkeeping screens (pixel-accurate) and compose
 * App Store frames WITHOUT cropping/distorting the UI.
 *
 * Usage: node scripts/appstore-screenshots.mjs
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync, unlinkSync, existsSync } from "fs";
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

const BG = "#f0f2e8";
const INK = "#1a2426";
const ACCENT = "#3d5248";
const MUTED = "#5c6864";

/** Logical CSS viewport — matches real iPhone width the app was designed for. */
const VIEW_W = 390;
const VIEW_H = 844;
const DPR = 3;

const FONT_BOLD = join(
  ROOT,
  "node_modules/@fontsource/open-sauce-sans/files/open-sauce-sans-latin-700-normal.woff2",
);
const FONT_MED = join(
  ROOT,
  "node_modules/@fontsource/open-sauce-sans/files/open-sauce-sans-latin-500-normal.woff2",
);

const SHOTS = [
  {
    id: "01-catalog",
    path: "/library",
    headline: "Your library, finally organized",
    sub: "Catalog every book you own",
    wait: "text=Circe",
    prepare: "grid",
  },
  {
    id: "02-loans",
    path: "/loaned",
    headline: "Know who has what",
    sub: "Track loans and due dates",
    wait: "text=Jordan Lee",
  },
  {
    id: "03-locations",
    path: "/locations",
    headline: "Find any book in seconds",
    sub: "Organize by room and shelf",
    wait: "text=Living Room",
  },
  {
    id: "04-team",
    path: "/settings",
    headline: "Share one catalog with your household",
    sub: "Invite family to a team library",
    wait: "text=Team Members",
    prepare: "team",
  },
  {
    id: "05-add",
    path: "/add?mode=cover",
    headline: "Add books in a snap",
    sub: "Photograph a cover to start",
    wait: "text=Photograph",
  },
];

function escapeXml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * App Store frame: brand copy ABOVE an untouched full screenshot.
 * Rendered in Chromium with Open Sauce Sans (same as the app) — no SVG text glitches.
 */
async function composeMockup({ browser, rawPath, outPath, headline, sub }) {
  const W = 1290;
  const screenH = Math.round(W * (VIEW_H / VIEW_W));
  const bold = readFileSync(FONT_BOLD).toString("base64");
  const med = readFileSync(FONT_MED).toString("base64");
  const img = readFileSync(rawPath).toString("base64");

  const context = await browser.newContext({
    viewport: { width: W, height: 100 },
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
  @font-face {
    font-family: "Open Sauce Sans";
    font-weight: 500;
    src: url("data:font/woff2;base64,${med}") format("woff2");
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px;
    background: ${BG};
    color: ${INK};
    font-family: "Open Sauce Sans", system-ui, sans-serif;
  }
  .band {
    padding: 64px 56px 48px;
    text-align: center;
    background: ${BG};
  }
  .mark {
    width: 36px;
    height: 36px;
    margin: 0 auto 28px;
    display: block;
  }
  h1 {
    font-size: 60px;
    font-weight: 700;
    line-height: 1.12;
    letter-spacing: -0.02em;
    color: ${ACCENT};
    max-width: 20ch;
    margin: 0 auto;
  }
  p {
    margin-top: 16px;
    font-size: 30px;
    font-weight: 500;
    line-height: 1.35;
    color: ${MUTED};
  }
  img.screen {
    display: block;
    width: ${W}px;
    height: ${screenH}px;
  }
</style>
</head>
<body>
  <div class="band">
    <svg class="mark" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#8fa898" d="M24 8 40 34a2 2 0 0 1-1.8 2H9.8A2 2 0 0 1 8 34L24 8Z"/>
      <path fill="#7a5c44" d="M21.25 36.5h5.5v6.25a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5V36.5Z"/>
    </svg>
    <h1>${escapeXml(headline)}</h1>
    <p>${escapeXml(sub)}</p>
  </div>
  <img class="screen" alt="" src="data:image/png;base64,${img}"/>
</body>
</html>`,
    { waitUntil: "load" },
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  // Size viewport to full document
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

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  // Remove obsolete AI/scan asset if still present
  for (const stale of ["appstore-05-scan.png"]) {
    const p = join(OUT_DIR, stale);
    if (existsSync(p)) unlinkSync(p);
  }

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

  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });

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
    const hide = () => {
      for (const el of document.querySelectorAll("body *")) {
        if (!(el instanceof HTMLElement)) continue;
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (/^Powered by Netlify$/i.test(t) && t.length < 40) {
          (el.closest("a,div,span,button") || el).style.setProperty("display", "none", "important");
        }
      }
    };
    setInterval(hide, 400);
  });

  const page = await context.newPage();
  await page.goto(`${APP}/home`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  if (/\/login|\/signup/.test(page.url())) {
    throw new Error(`Auth failed, at ${page.url()}`);
  }

  for (const shot of SHOTS) {
    console.log("capturing", shot.id, shot.path);
    await page.goto(`${APP}${shot.path}`, { waitUntil: "networkidle", timeout: 60000 });
    try {
      await page.waitForSelector(shot.wait, { timeout: 20000 });
    } catch {
      console.warn("selector miss", shot.id);
    }
    await hideChromeNoise(page);
    await preparePage(page, shot);
    // Wait for cover images
    await page.waitForTimeout(1500);
    await page.evaluate(async () => {
      const imgs = [...document.images];
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete ||
            new Promise((res) => {
              img.onload = res;
              img.onerror = res;
            }),
        ),
      );
    });

    const rawPath = join(RAW_DIR, `${shot.id}.png`);
    await page.screenshot({ path: rawPath, fullPage: false, type: "png" });

    // Sanity: raw must match viewport*dpr
    const meta = await sharp(rawPath).metadata();
    console.log("  raw", meta.width, "x", meta.height, "expected", VIEW_W * DPR, "x", VIEW_H * DPR);

    const outPath = join(OUT_DIR, `appstore-${shot.id}.png`);
    await composeMockup({
      browser,
      rawPath,
      outPath,
      headline: shot.headline,
      sub: shot.sub,
    });
    console.log("  wrote", outPath);
  }

  await page.goto(`${APP}/home`, { waitUntil: "networkidle" });
  await hideChromeNoise(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(RAW_DIR, "00-home.png"), fullPage: false });

  await browser.close();

  writeFileSync(
    join(OUT_DIR, "README.md"),
    `# App Store screenshots

Pixel-accurate captures from the live Pine Bookkeeping UI (\`${APP}\`),
composed with marketing copy. Screenshots are **not cropped** — phone slot
matches the capture aspect ratio exactly.

- \`appstore-*.png\` — store frames (Open Sauce Sans + brand palette)
- \`raw/\` — unmodified device screenshots (1170×2532)

\`\`\`bash
node scripts/appstore-screenshots.mjs
\`\`\`
`,
  );
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
