/**
 * Capture real Pine Bookkeeping screens and compose App Store mockups.
 * Usage: node scripts/appstore-screenshots.mjs
 */
import { chromium } from "playwright-core";
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
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
const INK = "#3d5248";
const MUTED = "#6b7a70";

const SHOTS = [
  {
    id: "01-catalog",
    path: "/library",
    headline: "Your library, finally organized",
    sub: "Catalog every book you own",
    wait: 'text=The Night Circus',
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
    wait: "text=Team",
  },
  {
    id: "05-add",
    path: "/add?mode=cover",
    headline: "Add books in a snap",
    sub: "Scan a cover or search by title",
    wait: "text=Cover",
    prepare: "add-cover",
  },
];

function escapeXml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapLines(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function composeMockup({ rawPath, outPath, headline, sub }) {
  const W = 1242;
  const H = 2688;
  const phoneW = 980;
  const phoneH = 1960;
  const phoneX = Math.round((W - phoneW) / 2);
  const phoneY = 620;
  const radius = 72;
  const bezel = 14;

  const headLines = wrapLines(headline, 22);
  const subLines = wrapLines(sub, 34);

  let y = 200;
  const headSvg = headLines
    .map((line, i) => {
      return `<text x="${W / 2}" y="${y + i * 86}" text-anchor="middle" font-family="'Open Sauce Sans', system-ui, -apple-system, sans-serif" font-size="72" font-weight="700" fill="${INK}">${escapeXml(line)}</text>`;
    })
    .join("\n");
  y += headLines.length * 86 + 24;
  const subSvg = subLines
    .map((line, i) => {
      return `<text x="${W / 2}" y="${y + i * 46}" text-anchor="middle" font-family="'Open Sauce Sans', system-ui, -apple-system, sans-serif" font-size="34" font-weight="500" fill="${MUTED}">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const frameSvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0f2e8"/>
      <stop offset="100%" stop-color="#e4e9dc"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${headSvg}
  ${subSvg}
  <rect x="${phoneX - bezel}" y="${phoneY - bezel}" width="${phoneW + bezel * 2}" height="${phoneH + bezel * 2}" rx="${radius}" fill="#1a2426"/>
  <rect x="${phoneX}" y="${phoneY}" width="${phoneW}" height="${phoneH}" rx="${radius - 8}" fill="#000"/>
</svg>`;

  const screen = await sharp(rawPath)
    .resize(phoneW, phoneH, { fit: "cover", position: "top" })
    .png()
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${phoneW}" height="${phoneH}"><rect width="${phoneW}" height="${phoneH}" rx="${radius - 10}" fill="#fff"/></svg>`,
  );
  const roundedScreen = await sharp(screen)
    .composite([{ input: await sharp(mask).png().toBuffer(), blend: "dest-in" }])
    .png()
    .toBuffer();

  await sharp(Buffer.from(frameSvg))
    .composite([{ input: roundedScreen, left: phoneX, top: phoneY }])
    .png()
    .toFile(outPath);
}

async function preparePage(page, shot) {
  if (shot.id === "04-team") {
    await page.evaluate(() => {
      const el = [...document.querySelectorAll("h2,h3,div,p,span,label")].find((n) =>
        /team members|invite member/i.test(n.textContent || ""),
      );
      el?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(400);
  }
  if (shot.prepare === "add-cover") {
    // Prefer Cover tab and leave the capture UI visible
    const coverTab = page.getByRole("button", { name: /^cover$/i }).or(page.getByText(/^Cover$/));
    if (await coverTab.count()) {
      await coverTab.first().click();
      await page.waitForTimeout(500);
    }
  }
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  let sessionMeta;
  try {
    sessionMeta = JSON.parse(readFileSync("/tmp/appstore-demo-session.json", "utf8"));
  } catch {
    sessionMeta = null;
  }

  const supabase = createClient(SUPABASE_URL, ANON);
  const email = sessionMeta?.email || process.env.DEMO_EMAIL;
  const password = sessionMeta?.password || process.env.DEMO_PASSWORD;
  if (!email || !password) throw new Error("Missing demo credentials");

  const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const libraryId = sessionMeta?.libraryId;
  const storageKey = `sb-xdsnoqckoolwatgwtyfy-auth-token`;
  const sessionPayload = {
    access_token: auth.session.access_token,
    refresh_token: auth.session.refresh_token,
    expires_at: auth.session.expires_at,
    expires_in: auth.session.expires_in,
    token_type: "bearer",
    user: auth.user,
  };

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
  });

  await context.addInitScript(
    ({ storageKey, sessionPayload, libraryId }) => {
      localStorage.setItem(storageKey, JSON.stringify(sessionPayload));
      if (libraryId) localStorage.setItem("pine-bookkeeping-library-id", libraryId);
    },
    { storageKey, sessionPayload, libraryId },
  );

  const page = await context.newPage();
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = `
      a[href*="netlify"], [id*="netlify"], [class*="nf-"], 
      body > a[target="_blank"] { } 
    `;
    const hide = () => {
      for (const el of document.querySelectorAll("body *")) {
        if (!(el instanceof HTMLElement)) continue;
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (/^Powered by Netlify$/i.test(t)) {
          const box = el.closest("a,div,span,button") || el;
          box.style.setProperty("display", "none", "important");
        }
      }
    };
    document.addEventListener("DOMContentLoaded", hide);
    setInterval(hide, 500);
  });

  await page.goto(`${APP}/home`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const url = page.url();
  if (url.includes("/login") || url.includes("/signup")) {
    throw new Error(`Auth injection failed, landed on ${url}`);
  }
  if (url.includes("/setup")) {
    const name = page.locator("input").first();
    if (await name.count()) {
      await name.fill("Alex Morgan");
      const continueBtn = page.getByRole("button", { name: /continue|join/i });
      if (await continueBtn.count()) await continueBtn.click();
      await page.waitForTimeout(2000);
    }
  }

  // Hide Netlify badge via DOM if present
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("body *")) {
      const t = (el.textContent || "").trim();
      if (t === "Powered by Netlify" || /^Powered by\s*Netlify$/i.test(t)) {
        (el.closest("a,div,span,button") || el).style.display = "none";
      }
    }
  });

  for (const shot of SHOTS) {
    console.log("capturing", shot.id, shot.path);
    await page.goto(`${APP}${shot.path}`, { waitUntil: "networkidle", timeout: 60000 });
    try {
      await page.waitForSelector(shot.wait, { timeout: 15000 });
    } catch {
      console.warn("wait selector missed for", shot.id, "— continuing");
    }
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("body *")) {
        const t = (el.textContent || "").trim();
        if (/Powered by\s*Netlify/i.test(t) && t.length < 40) {
          const target = el.closest("a,div,span,button") || el;
          target.style.setProperty("display", "none", "important");
        }
      }
    });
    await preparePage(page, shot);
    await page.waitForTimeout(800);
    const rawPath = join(RAW_DIR, `${shot.id}.png`);
    await page.screenshot({ path: rawPath, fullPage: false });

    const outPath = join(OUT_DIR, `appstore-${shot.id}.png`);
    await composeMockup({
      rawPath,
      outPath,
      headline: shot.headline,
      sub: shot.sub,
    });
    console.log("wrote", outPath);
  }

  await page.goto(`${APP}/home`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(RAW_DIR, "00-home.png"), fullPage: false });

  await browser.close();
  writeFileSync(
    join(OUT_DIR, "README.md"),
    `# App Store screenshots

Generated from the **live app** (\`${APP}\`) — real UI captures, not AI mock UIs.

- \`appstore-*.png\` — store frames with marketing copy around a phone bezel
- \`raw/\` — unmodified screenshots from the running product

Regenerate after seeding a demo account:

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
