#!/usr/bin/env node
/**
 * Chrome ウェブストア用多言語スクリーンショット一括生成スクリプト
 *
 * package/_locales/ 配下の対応言語を自動判定し、ローカルの Google Chrome（ヘッドレス CDP）と
 * 既存の sharp を用いて透過なし 24-bit RGB PNG（または JPEG）を images/ 直下へ出力します。
 *
 * 使用例:
 *   node scripts/generate-store-images.mjs
 *   node scripts/generate-store-images.mjs --size=640x400
 *   node scripts/generate-store-images.mjs --lang=ja,en
 *   node scripts/generate-store-images.mjs --slides=01,02 --format=png
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { SLIDE_NUMBERS, SLIDES_DATA } from "./store-images/slides-data.mjs";
import { renderSlideHtml } from "./store-images/template.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "images");

/** 許可する出力サイズ定義 */
const VALID_SIZES = {
  "1280x800": { width: 1280, height: 800, scale: 1 },
  "640x400": { width: 640, height: 400, scale: 0.5 },
};

/**
 * コマンドライン引数を解析する関数
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{ sizeKey: string, langs: string[] | null, format: "png" | "jpg", slides: string[] }} 解析結果
 */
const parseArgs = (argv) => {
  let sizeKey = "1280x800";
  let langs = null;
  let format = "png";
  let slides = [...SLIDE_NUMBERS];

  for (const arg of argv) {
    if (arg.startsWith("--size=")) {
      sizeKey = arg.slice("--size=".length).trim();
    } else if (arg.startsWith("--lang=")) {
      langs = arg
        .slice("--lang=".length)
        .split(",")
        .map((v) => v.trim().replace(/_/g, "-"))
        .filter(Boolean);
    } else if (arg.startsWith("--format=")) {
      const f = arg.slice("--format=".length).trim().toLowerCase();
      format = f === "jpeg" ? "jpg" : f;
    } else if (arg.startsWith("--slides=")) {
      slides = arg
        .slice("--slides=".length)
        .split(",")
        .map((v) => v.trim().padStart(2, "0"))
        .filter(Boolean);
    }
  }

  if (!VALID_SIZES[sizeKey]) {
    throw new Error(
      `未対応のサイズ指定です: "${sizeKey}"（指定可能: ${Object.keys(VALID_SIZES).join(", ")}）`
    );
  }
  if (format !== "png" && format !== "jpg") {
    throw new Error(`未対応の出力形式です: "${format}"（指定可能: png, jpg）`);
  }

  return { sizeKey, langs, format, slides };
};

/**
 * プロジェクト内の _locales ディレクトリを探索し、有効な対応言語一覧を自動判定する関数
 * @returns {{ localesDir: string | null, languages: string[] }} 探索元パスと正規化済み言語コード一覧
 */
const detectTargetLanguages = () => {
  const candidates = [
    path.join(PROJECT_ROOT, "package", "_locales"),
    path.join(PROJECT_ROOT, "_locales"),
    path.join(PROJECT_ROOT, "public", "_locales"),
    path.join(PROJECT_ROOT, "src", "_locales"),
  ];

  for (const dir of candidates) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      continue;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const detected = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .filter((entry) =>
        fs.existsSync(path.join(dir, entry.name, "messages.json"))
      )
      .map((entry) => entry.name.replace(/_/g, "-"))
      .sort();

    if (detected.length > 0) {
      return { localesDir: dir, languages: detected };
    }
  }

  return { localesDir: null, languages: ["en", "ja"] };
};

/**
 * ローカル環境にインストールされている Chrome / Chromium 実行ファイルを検出する関数
 * @returns {string} ブラウザ実行ファイルの絶対パス
 */
const findChromeExecutable = () => {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "ローカルの Chrome / Chromium が見つかりませんでした。環境変数 CHROME_PATH に実行ファイルパスを指定してください。"
  );
};

/**
 * EnvIcon のマスター SVG アイコンを Base64 Data URI として読み込む関数
 * @returns {string} SVG の Data URI
 */
const loadBrandIconDataUri = () => {
  const svgPath = path.join(PROJECT_ROOT, "src", "icon.svg");
  const svgContent = fs.readFileSync(svgPath);
  return `data:image/svg+xml;base64,${svgContent.toString("base64")}`;
};

/**
 * Chrome DevTools Protocol (CDP) クライアント
 * Node.js 標準の WebSocket を使用してヘッドレス Chrome を直接制御する
 */
class CdpClient {
  /**
   * @param {string} wsUrl - ブラウザまたはターゲットの WebSocket エンドポイント URL
   */
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = [];
  }

  /**
   * WebSocket 接続を確立する非同期メソッド
   * @returns {Promise<void>}
   */
  async connect() {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;
      ws.addEventListener("open", () => resolve());
      ws.addEventListener("error", (err) => reject(err));
      ws.addEventListener("message", (event) => {
        const msg = JSON.parse(String(event.data));
        if (typeof msg.id === "number" && this.pending.has(msg.id)) {
          const { resolve: res, reject: rej } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) {
            rej(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            res(msg.result);
          }
          return;
        }
        if (msg.method) {
          this.eventWaiters = this.eventWaiters.filter((waiter) => {
            if (waiter.method === msg.method && waiter.match(msg)) {
              waiter.resolve(msg.params);
              return false;
            }
            return true;
          });
        }
      });
    });
  }

  /**
   * CDP コマンドを送信してレスポンスを待機する非同期メソッド
   * @param {string} method - CDP メソッド名
   * @param {object} [params] - パラメータオブジェクト
   * @param {string} [sessionId] - ターゲットセッション ID
   * @returns {Promise<any>} コマンド実行結果
   */
  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const payload = sessionId
      ? { id, method, params, sessionId }
      : { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  /**
   * 特定の CDP イベント発火を待機する非同期メソッド
   * @param {string} method - イベント名
   * @param {string} [sessionId] - 対象セッション ID
   * @param {number} [timeoutMs] - タイムアウト時間（ミリ秒）
   * @returns {Promise<any>} イベントパラメータ
   */
  waitForEvent(method, sessionId = undefined, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`CDP イベント待機タイムアウト: ${method}`));
      }, timeoutMs);
      this.eventWaiters.push({
        method,
        match: (msg) => !sessionId || msg.sessionId === sessionId,
        resolve: (params) => {
          clearTimeout(timer);
          resolve(params);
        },
      });
    });
  }

  /**
   * WebSocket 接続を閉じるメソッド
   * @returns {void}
   */
  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

/**
 * ヘッドレス Chrome を起動し、ブラウザ CDP の WebSocket URL を取得する非同期関数
 * @param {string} chromePath - Chrome 実行ファイルのパス
 * @param {string} userDataDir - 一時プロファイルディレクトリ
 * @returns {Promise<{ proc: import("node:child_process").ChildProcess, wsUrl: string }>}
 */
const launchHeadlessChrome = (chromePath, userDataDir) =>
  new Promise((resolve, reject) => {
    const proc = spawn(
      chromePath,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--hide-scrollbars",
        "--remote-debugging-port=0",
        `--user-data-dir=${userDataDir}`,
        "about:blank",
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    let stderrBuf = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`Chrome の起動がタイムアウトしました:\n${stderrBuf}`));
    }, 15000);

    proc.stderr.on("data", (chunk) => {
      stderrBuf += chunk.toString();
      const match = stderrBuf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve({ proc, wsUrl: match[1] });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

/**
 * メイン処理：全対象言語・スライドのスクリーンショットを生成し検証する非同期関数
 * @returns {Promise<void>}
 */
const main = async () => {
  const { sizeKey, langs, format, slides } = parseArgs(process.argv.slice(2));
  const { width, height, scale } = VALID_SIZES[sizeKey];
  const { localesDir, languages: detectedLanguages } = detectTargetLanguages();
  const targetLanguages = langs && langs.length > 0 ? langs : detectedLanguages;

  const chromePath = findChromeExecutable();
  const iconDataUri = loadBrandIconDataUri();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(
    `[EnvIcon Store Images] 対象言語: ${targetLanguages.join(", ")} (検出元: ${
      localesDir ? path.relative(PROJECT_ROOT, localesDir) : "フォールバック en,ja"
    })`
  );
  console.log(
    `[EnvIcon Store Images] サイズ: ${width}x${height} / 形式: ${format.toUpperCase()} / スライド: ${slides.join(", ")}`
  );

  const tmpUserDataDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "envicon-store-img-")
  );
  const { proc, wsUrl } = await launchHeadlessChrome(chromePath, tmpUserDataDir);
  const cdp = new CdpClient(wsUrl);

  try {
    await cdp.connect();
    const { targetId } = await cdp.send("Target.createTarget", {
      url: "about:blank",
    });
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      },
      sessionId
    );

    const results = [];

    for (const lang of targetLanguages) {
      const langData = SLIDES_DATA[lang];
      if (!langData) {
        console.warn(
          `[警告] 言語 "${lang}" のスライド定義が slides-data.mjs に見つからないためスキップします。`
        );
        continue;
      }

      for (const slideNumber of slides) {
        const html = renderSlideHtml({
          lang,
          slideNumber,
          data: langData,
          iconDataUri,
          scale,
        });

        const loadPromise = cdp.waitForEvent("Page.loadEventFired", sessionId);
        await cdp.send(
          "Page.setDocumentContent",
          {
            frameId: targetId,
            html,
          },
          sessionId
        );
        await loadPromise;

        // フォント読み込みと描画フレーム確定を待機する
        await cdp.send(
          "Runtime.evaluate",
          {
            expression:
              "document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))",
            awaitPromise: true,
          },
          sessionId
        );

        const { data: base64Png } = await cdp.send(
          "Page.captureScreenshot",
          {
            format: "png",
            fromSurface: true,
            clip: { x: 0, y: 0, width, height, scale: 1 },
          },
          sessionId
        );

        const rawBuffer = Buffer.from(base64Png, "base64");
        const outFilename = `store-${slideNumber}.${lang}.${format}`;
        const outPath = path.join(OUTPUT_DIR, outFilename);

        // 透過なし 24-bit RGB PNG（または JPEG）へ確実に変換して保存する
        let pipeline = sharp(rawBuffer).flatten({ background: "#f1f5f9" }).removeAlpha();
        if (format === "png") {
          pipeline = pipeline.png({ compressionLevel: 9, palette: false });
        } else {
          pipeline = pipeline.jpeg({ quality: 92, mozjpeg: true });
        }
        await pipeline.toFile(outPath);

        // 実ピクセル寸法とアルファチャンネル有無を自己検証する
        const meta = await sharp(outPath).metadata();
        if (meta.width !== width || meta.height !== height) {
          throw new Error(
            `寸法不一致 (${outFilename}): 期待=${width}x${height}, 実測=${meta.width}x${meta.height}`
          );
        }
        if (format === "png" && meta.hasAlpha) {
          throw new Error(`透過チャンネルが残っています: ${outFilename}`);
        }

        results.push({
          file: path.relative(PROJECT_ROOT, outPath),
          width: meta.width,
          height: meta.height,
          channels: meta.channels,
          hasAlpha: Boolean(meta.hasAlpha),
        });
      }
    }

    console.log(`\n生成完了: 合計 ${results.length} 枚`);
    for (const r of results) {
      console.log(
        `  - ${r.file} (${r.width}x${r.height}, channels=${r.channels}, hasAlpha=${r.hasAlpha})`
      );
    }
  } finally {
    cdp.close();
    if (proc.exitCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          proc.kill("SIGKILL");
          resolve();
        }, 2000);
        proc.once("close", () => {
          clearTimeout(timer);
          resolve();
        });
        proc.kill("SIGTERM");
      });
    }
    try {
      fs.rmSync(tmpUserDataDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    } catch {
      // OS の一時ディレクトリ削除失敗は生成結果に影響しないため無視する
    }
  }
};

main().catch((err) => {
  console.error("[エラー]", err);
  process.exit(1);
});
