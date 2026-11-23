/**
 * Chrome ウェブストア用スクリーンショットの HTML/CSS テンプレート生成モジュール
 *
 * 1280x800 を基準キャンバスとして描画し、640x400 出力時は CSS スケール変換で
 * レイアウト崩れなく縮小レンダリングします。外部ネットワーク通信は一切行いません。
 */

import { FONT_STACKS } from "./slides-data.mjs";

/**
 * HTML 特殊文字を安全にエスケープする関数
 * @param {string} str - エスケープ対象の文字列
 * @returns {string} エスケープ済み文字列
 */
const esc = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * 環境バッジを重ねた Favicon のインライン SVG を生成する関数
 * @param {object} opts - バッジ設定
 * @param {string} opts.label - バッジ文字（最大4文字）
 * @param {string} opts.color - バッジ文字色
 * @param {string} opts.baseFill - ベースアイコンの塗り色
 * @returns {string} SVG マークアップ
 */
const renderFaviconWithBadgeSvg = ({ label, color, baseFill }) => `
  <svg width="20" height="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="display:block;flex-shrink:0;">
    <rect x="2" y="2" width="28" height="28" rx="7" fill="${baseFill}" />
    <circle cx="16" cy="12" r="5" fill="rgba(255,255,255,0.85)" />
    <path d="M9 22 C9 18 23 18 23 22" stroke="rgba(255,255,255,0.85)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <text x="16" y="29" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="11.5"
      stroke="#ffffff" stroke-width="4" stroke-linejoin="round" paint-order="stroke" fill="${color}">${esc(label)}</text>
  </svg>
`;

/**
 * ツールバーアイコン（通常・バッジ付き・一時OFF）のインライン SVG を生成する関数
 * @param {object} opts - アイコン設定
 * @param {string} opts.iconDataUri - EnvIcon の Data URI
 * @param {string} opts.label - 重ねる文字
 * @param {string} opts.color - 文字色
 * @param {boolean} [opts.muted] - 一時OFFグレースケール表示かどうか
 * @param {number} [opts.size] - 表示サイズ（px）
 * @returns {string} HTML マークアップ
 */
const renderToolbarIconBadge = ({
  iconDataUri,
  label,
  color,
  muted = false,
  size = 28,
}) => `
  <div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0;">
    <img src="${iconDataUri}" alt="" style="width:${size}px;height:${size}px;display:block;border-radius:6px;${
      muted ? "filter:grayscale(1);opacity:0.65;" : ""
    }" />
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" style="position:absolute;inset:0;display:block;">
      <text x="16" y="29" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="${
        muted ? "11" : "10.2"
      }" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" paint-order="stroke" fill="${color}">${esc(label)}</text>
    </svg>
  </div>
`;

/**
 * 全スライド共通のベーススタイル定義を生成する関数
 * @param {string} lang - 正規化済み言語コード
 * @param {number} scale - スケール倍率（1280x800 は 1、640x400 は 0.5）
 * @returns {string} CSS 文字列
 */
const buildCommonStyles = (lang, scale) => {
  const fontFamily = FONT_STACKS[lang] || FONT_STACKS.en;
  const targetW = Math.round(1280 * scale);
  const targetH = Math.round(800 * scale);

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${targetW}px;
      height: ${targetH}px;
      overflow: hidden;
      background: #f1f5f9;
      font-family: ${fontFamily};
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    .canvas-root {
      width: 1280px;
      height: 800px;
      transform: scale(${scale});
      transform-origin: top left;
      position: relative;
      overflow: hidden;
      background: #f1f5f9;
      padding: 36px 52px 40px;
      display: flex;
      flex-direction: column;
    }

    /* 上部ブランドヘッダー */
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      position: relative;
      z-index: 2;
    }
    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 38px;
      height: 38px;
      border-radius: 9px;
      box-shadow: 0 6px 16px rgba(26, 28, 44, 0.18);
    }
    .brand-name {
      font-size: 21px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
    }

    /* 見出しブロック */
    .hero-head {
      position: relative;
      z-index: 2;
      margin-bottom: 22px;
    }
    .eyebrow {
      display: inline-block;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.09em;
      color: #4f46e5;
      background: rgba(79, 70, 229, 0.1);
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 10px;
    }
    .headline {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: -0.025em;
      line-height: 1.22;
      color: #0f172a;
      margin-bottom: 8px;
      overflow-wrap: break-word;
    }
    .subhead {
      font-size: 16.5px;
      font-weight: 500;
      line-height: 1.5;
      color: #475569;
      max-width: 980px;
      overflow-wrap: break-word;
    }

    /* 共通 UI 部品 */
    .card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);
    }
    .pill-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.04em;
      line-height: 1.2;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .switch {
      width: 38px;
      height: 22px;
      border-radius: 9999px;
      position: relative;
      flex-shrink: 0;
    }
    .switch-on {
      background: #10b981;
    }
    .switch-off {
      background: #cbd5e1;
    }
    .switch-knob {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ffffff;
      position: absolute;
      top: 3px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .switch-on .switch-knob { right: 3px; }
    .switch-off .switch-knob { left: 3px; }
  `;
};

/**
 * 全スライド共通の上部ブランドバーを描画する関数
 * @param {object} data - 対象言語のテキストデータ
 * @param {string} iconDataUri - EnvIcon の Data URI
 * @returns {string} HTML マークアップ
 */
const renderTopBar = (data, iconDataUri) => `
  <div class="top-bar">
    <div class="brand-lockup">
      <img src="${iconDataUri}" alt="EnvIcon" class="brand-logo" />
      <div>
        <div class="brand-name">EnvIcon</div>
        <div class="brand-sub">${esc(data.brandSubtitle)}</div>
      </div>
    </div>
  </div>
`;

/**
 * スライド 01: コア価値と 4 つの視覚インジケーターを描画する関数
 * @param {object} data - 対象言語のテキストデータ
 * @param {string} iconDataUri - EnvIcon の Data URI
 * @returns {{ styles: string, body: string }} 追加スタイルと本文 HTML
 */
const renderSlide01 = (data, iconDataUri) => {
  const s = data.slide01;
  const styles = `
    .s1-stage {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 308px;
      gap: 24px;
      position: relative;
      z-index: 2;
      min-height: 0;
    }
    .browser-win {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.11);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .browser-tabs {
      background: #e2e8f0;
      padding: 10px 14px 0;
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }
    .win-dots {
      display: flex;
      gap: 6px;
      padding: 0 10px 11px 2px;
    }
    .win-dot { width: 11px; height: 11px; border-radius: 50%; }
    .btab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 10px 10px 0 0;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      background: #cbd5e1;
      min-width: 158px;
    }
    .btab.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 -2px 8px rgba(15, 23, 42, 0.05);
      position: relative;
    }
    .btab-ring {
      position: relative;
      outline: 2.5px solid #ef4444;
      outline-offset: 2px;
      border-radius: 6px;
    }
    .browser-bar {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 9px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .url-box {
      flex: 1;
      background: #f1f5f9;
      border-radius: 9999px;
      padding: 6px 14px;
      font-size: 13px;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 0;
    }
    .toolbar-ext {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 6px;
      border-radius: 8px;
      outline: 2.5px solid #4f46e5;
      background: rgba(79, 70, 229, 0.07);
    }
    .browser-content {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 272px;
      min-height: 0;
    }
    .mock-page {
      position: relative;
      background: #f8fafc;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      border-right: 1px solid #e2e8f0;
    }
    .mock-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .mock-nav-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .mock-nav-links {
      display: flex;
      gap: 14px;
      font-size: 12.5px;
      font-weight: 600;
      color: #64748b;
    }
    .mock-nav-links span:first-child { color: #1e293b; }
    .mock-metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .mock-metric {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
    }
    .mock-metric-label { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .mock-metric-val { font-size: 20px; font-weight: 800; color: #0f172a; }
    .mock-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .mock-bars {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      height: 82px;
      padding-top: 8px;
    }
    .mock-bar {
      flex: 1;
      border-radius: 5px 5px 0 0;
      background: linear-gradient(180deg, #6366f1 0%, #a5b4fc 100%);
    }
    .mock-action-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
    }
    .mock-danger-btn {
      font-size: 12px;
      font-weight: 700;
      color: #b91c1c;
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 6px 12px;
      border-radius: 8px;
    }
    /* 実際の EnvIcon ページ内バッジの表現に忠実な半透明バッジ */
    .inpage-badge {
      position: absolute;
      right: 16px;
      bottom: 14px;
      font-family: sans-serif;
      font-size: 36px;
      font-weight: 900;
      line-height: 1;
      color: #ff0000;
      opacity: 0.58;
      text-shadow: 0 0 6px #ffffff, 0 0 2px #ffffff;
      padding: 6px 10px;
      border-radius: 10px;
      outline: 2.5px dashed #ef4444;
      background: rgba(255, 255, 255, 0.35);
    }
    /* DevTools コンソール */
    .devtools {
      background: #1e293b;
      color: #e2e8f0;
      display: flex;
      flex-direction: column;
      font-size: 12px;
    }
    .devtools-head {
      background: #0f172a;
      padding: 9px 12px;
      display: flex;
      gap: 14px;
      border-bottom: 1px solid #334155;
      color: #94a3b8;
      font-weight: 600;
    }
    .devtools-head .active {
      color: #60a5fa;
      border-bottom: 2px solid #60a5fa;
      padding-bottom: 4px;
      margin-bottom: -9px;
    }
    .devtools-body {
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      line-height: 1.5;
    }
    .console-line {
      background: rgba(15, 23, 42, 0.72);
      border: 1.5px solid #38bdf8;
      border-radius: 8px;
      padding: 10px;
      font-size: 12px;
      word-break: break-word;
    }
    .console-dim { color: #94a3b8; font-size: 11px; opacity: 0.85; }
    .callout-col {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
    }
    .callout-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-left: 5px solid #4f46e5;
      border-radius: 14px;
      padding: 15px 16px;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .callout-title {
      font-size: 15.5px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .callout-desc {
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      line-height: 1.45;
    }
  `;

  const body = `
    ${renderTopBar(data, iconDataUri)}
    <div class="hero-head">
      <div class="eyebrow">${esc(s.eyebrow)}</div>
      <div class="headline">${esc(s.title)}</div>
      <div class="subhead">${esc(s.subtitle)}</div>
    </div>
    <div class="s1-stage">
      <div class="browser-win">
        <div class="browser-tabs">
          <div class="win-dots">
            <span class="win-dot" style="background:#ef4444;"></span>
            <span class="win-dot" style="background:#f59e0b;"></span>
            <span class="win-dot" style="background:#22c55e;"></span>
          </div>
          <div class="btab active">
            <div class="btab-ring">${renderFaviconWithBadgeSvg({ label: "PROD", color: "#ff0000", baseFill: "#1e293b" })}</div>
            <span>${esc(s.browserTabProd)}</span>
          </div>
          <div class="btab">
            ${renderFaviconWithBadgeSvg({ label: "STG", color: "#0000ff", baseFill: "#334155" })}
            <span>${esc(s.browserTabStg)}</span>
          </div>
          <div class="btab">
            ${renderFaviconWithBadgeSvg({ label: "DEV", color: "#008000", baseFill: "#475569" })}
            <span>${esc(s.browserTabDev)}</span>
          </div>
        </div>
        <div class="browser-bar">
          <div class="url-box mono">
            <span style="color:#16a34a;font-weight:700;">https://</span><span>admin.example.com/dashboard</span>
          </div>
          <div class="toolbar-ext">
            ${renderToolbarIconBadge({ iconDataUri, label: "PROD", color: "#ff0000", size: 28 })}
          </div>
        </div>
        <div class="browser-content">
          <div class="mock-page">
            <div class="mock-nav">
              <div class="mock-nav-title">${esc(s.pageHeader)}</div>
              <div class="mock-nav-links">
                <span>${esc(s.pageNavOverview)}</span>
                <span>${esc(s.pageNavDeploy)}</span>
                <span>${esc(s.pageNavUsers)}</span>
              </div>
            </div>
            <div class="mock-metrics">
              <div class="mock-metric">
                <div class="mock-metric-label">${esc(s.pageMetric1Label)}</div>
                <div class="mock-metric-val">24</div>
              </div>
              <div class="mock-metric">
                <div class="mock-metric-label">${esc(s.pageMetric2Label)}</div>
                <div class="mock-metric-val" style="color:#16a34a;">99.98%</div>
              </div>
              <div class="mock-metric">
                <div class="mock-metric-label">${esc(s.pageMetric3Label)}</div>
                <div class="mock-metric-val">3</div>
              </div>
            </div>
            <div class="mock-panel">
              <div class="mock-bars">
                <div class="mock-bar" style="height:46%;"></div>
                <div class="mock-bar" style="height:68%;"></div>
                <div class="mock-bar" style="height:54%;"></div>
                <div class="mock-bar" style="height:82%;"></div>
                <div class="mock-bar" style="height:75%;"></div>
                <div class="mock-bar" style="height:92%;"></div>
                <div class="mock-bar" style="height:64%;"></div>
              </div>
              <div class="mock-action-row">
                <span class="mock-danger-btn">${esc(s.pageActionDanger)}</span>
              </div>
            </div>
            <div class="inpage-badge">PROD</div>
          </div>
          <div class="devtools">
            <div class="devtools-head">
              <span>Elements</span>
              <span class="active">${esc(s.consoleTab)}</span>
              <span>Network</span>
            </div>
            <div class="devtools-body mono">
              <div class="console-line">
                <span style="color:#cbd5e1;">[EnvIcon] Current Env: </span>
                <span style="color:#ff6b6b;font-weight:800;text-shadow:0 0 1px rgba(255,255,255,0.45);">${esc(s.consoleEnvName)}</span>
              </div>
              <div class="console-dim">&gt; Application initialized (v2.4.1)</div>
              <div class="console-dim">&gt; Connected to cluster-ap-east-1</div>
              <div class="console-dim">&gt; _</div>
            </div>
          </div>
        </div>
      </div>

      <div class="callout-col">
        <div class="callout-card" style="border-left-color:#ef4444;">
          <div class="callout-title">${esc(s.calloutFavicon)}</div>
          <div class="callout-desc">${esc(s.calloutFaviconDesc)}</div>
        </div>
        <div class="callout-card" style="border-left-color:#4f46e5;">
          <div class="callout-title">${esc(s.calloutToolbar)}</div>
          <div class="callout-desc">${esc(s.calloutToolbarDesc)}</div>
        </div>
        <div class="callout-card" style="border-left-color:#f97316;">
          <div class="callout-title">${esc(s.calloutPageBadge)}</div>
          <div class="callout-desc">${esc(s.calloutPageBadgeDesc)}</div>
        </div>
        <div class="callout-card" style="border-left-color:#0284c7;">
          <div class="callout-title">${esc(s.calloutConsole)}</div>
          <div class="callout-desc">${esc(s.calloutConsoleDesc)}</div>
        </div>
      </div>
    </div>
  `;

  return { styles, body };
};

/**
 * スライド 02: クイック操作ポップアップと一時OFF機能を描画する関数
 * @param {object} data - 対象言語のテキストデータ
 * @param {string} iconDataUri - EnvIcon の Data URI
 * @returns {{ styles: string, body: string }} 追加スタイルと本文 HTML
 */
const renderSlide02 = (data, iconDataUri) => {
  const s = data.slide02;
  const styles = `
    .s2-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 455px 1fr;
      gap: 36px;
      align-items: center;
      position: relative;
      z-index: 2;
    }
    .s2-points {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .s2-point {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 18px 20px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .s2-num {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
      flex-shrink: 0;
    }
    .s2-point-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .s2-point-desc {
      font-size: 14px;
      color: #475569;
      line-height: 1.5;
    }
    .s2-mockups {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 22px;
    }
    /* 実 UI に忠実なポップアップカード (356px スケール) */
    .popup-mock {
      width: 360px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 22px 46px rgba(15, 23, 42, 0.14);
    }
    .popup-header {
      background: #ffffff;
      border-bottom: 1px solid #cbd5e1;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .popup-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 800;
      color: #1e293b;
    }
    .popup-body {
      padding: 14px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .site-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .site-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .site-caption {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #64748b;
    }
    .site-host {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .site-mute-row {
      border-top: 1px solid #e2e8f0;
      padding-top: 9px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .site-mute-label { font-size: 13px; font-weight: 700; color: #1e293b; }
    .site-mute-hint { font-size: 11px; color: #64748b; margin-top: 2px; }
    .assign-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2px;
    }
    .unassign-link {
      font-size: 12px;
      font-weight: 700;
      color: #ef4444;
    }
    .env-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .env-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 9px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13.5px;
      font-weight: 700;
      color: #1e293b;
    }
    .env-btn.active {
      background: #eff6ff;
      border: 1.5px solid #3b82f6;
      color: #1d4ed8;
    }
    .mini-badge {
      min-width: 46px;
      text-align: center;
      padding: 3px 7px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.03em;
      color: #ffffff;
    }
    .check-mark {
      margin-left: auto;
      color: #2563eb;
      font-weight: 900;
      font-size: 15px;
    }
    /* 右側のダークモード＋一時OFFプレビューカード */
    .popup-dark-wrap {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 24px;
    }
    .popup-dark {
      width: 304px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 22px 46px rgba(15, 23, 42, 0.24);
      color: #f8fafc;
    }
    .popup-dark .popup-header {
      background: #1e293b;
      border-bottom-color: #334155;
    }
    .popup-dark .popup-brand { color: #f8fafc; }
    .pause-banner {
      background: #451a03;
      color: #fcd34d;
      border-bottom: 1px solid #78350f;
      padding: 9px 14px;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.4;
    }
    .dark-site-card {
      margin: 14px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .toolbar-compare {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
    }
    .toolbar-compare-label {
      font-size: 11.5px;
      font-weight: 700;
      color: #475569;
      white-space: nowrap;
    }
  `;

  const body = `
    ${renderTopBar(data, iconDataUri)}
    <div class="hero-head">
      <div class="eyebrow">${esc(s.eyebrow)}</div>
      <div class="headline">${esc(s.title)}</div>
      <div class="subhead">${esc(s.subtitle)}</div>
    </div>
    <div class="s2-grid">
      <div class="s2-points">
        <div class="s2-point">
          <div class="s2-num" style="background:#3b82f6;">1</div>
          <div>
            <div class="s2-point-title">${esc(s.bullet1Title)}</div>
            <div class="s2-point-desc">${esc(s.bullet1Desc)}</div>
          </div>
        </div>
        <div class="s2-point">
          <div class="s2-num" style="background:#f59e0b;">2</div>
          <div>
            <div class="s2-point-title">${esc(s.bullet2Title)}</div>
            <div class="s2-point-desc">${esc(s.bullet2Desc)}</div>
          </div>
        </div>
        <div class="s2-point">
          <div class="s2-num" style="background:#10b981;">3</div>
          <div>
            <div class="s2-point-title">${esc(s.bullet3Title)}</div>
            <div class="s2-point-desc">${esc(s.bullet3Desc)}</div>
          </div>
        </div>
      </div>

      <div class="s2-mockups">
        <div class="popup-mock">
          <div class="popup-header">
            <div class="popup-brand">
              <img src="${iconDataUri}" alt="" style="width:22px;height:22px;border-radius:5px;" />
              <span>EnvIcon</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="switch switch-on"><div class="switch-knob"></div></div>
              <span style="color:#64748b;font-size:17px;line-height:1;">⚙</span>
            </div>
          </div>
          <div class="popup-body">
            <div class="site-card">
              <div class="site-top">
                <span class="site-caption">${esc(s.popupCurrentSite)}</span>
                <span class="pill-badge" style="background:#15803d;color:#ffffff;">DEV</span>
              </div>
              <div class="site-host mono">localhost:3000</div>
              <div class="site-mute-row">
                <div>
                  <div class="site-mute-label">${esc(s.popupSiteMute)}</div>
                  <div class="site-mute-hint">${esc(s.popupSiteMuteHint)}</div>
                </div>
                <div class="switch switch-off"><div class="switch-knob"></div></div>
              </div>
            </div>
            <div class="assign-head">
              <span class="site-caption">${esc(s.popupAssignTitle)}</span>
              <span class="unassign-link">${esc(s.popupUnassign)}</span>
            </div>
            <div class="env-list">
              <div class="env-btn">
                <span class="mini-badge" style="background:#ef4444;">PROD</span>
                <span>${esc(s.popupEnvProd)}</span>
              </div>
              <div class="env-btn">
                <span class="mini-badge" style="background:#2563eb;">STG</span>
                <span>${esc(s.popupEnvStg)}</span>
              </div>
              <div class="env-btn active">
                <span class="mini-badge" style="background:#15803d;">DEV</span>
                <span>${esc(s.popupEnvDev)}</span>
                <span class="check-mark">✓</span>
              </div>
              <div class="env-btn">
                <span class="mini-badge" style="background:#7c3aed;">QA</span>
                <span>${esc(s.popupEnvQa)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="popup-dark-wrap">
          <div class="popup-dark">
            <div class="popup-header">
              <div class="popup-brand">
                <img src="${iconDataUri}" alt="" style="width:22px;height:22px;border-radius:5px;filter:grayscale(1);opacity:0.6;" />
                <span>EnvIcon</span>
              </div>
              <div class="switch switch-off" style="background:#475569;"><div class="switch-knob"></div></div>
            </div>
            <div class="pause-banner">⚠ ${esc(s.pausedBanner)}</div>
            <div class="dark-site-card">
              <div class="site-top">
                <span class="site-caption" style="color:#94a3b8;">${esc(s.popupCurrentSite)}</span>
                <span class="pill-badge" style="background:#451a03;color:#fcd34d;border:1px solid #78350f;">${esc(s.pausedStatus)}</span>
              </div>
              <div class="site-host mono" style="color:#f8fafc;font-size:15px;">admin.example.com</div>
            </div>
          </div>

          <div class="toolbar-compare">
            <span class="toolbar-compare-label">${esc(s.pausedCardCaption)}</span>
            <div style="display:flex;align-items:center;gap:10px;">
              ${renderToolbarIconBadge({ iconDataUri, label: "PROD", color: "#ff0000", size: 32 })}
              <span style="color:#94a3b8;font-weight:800;">→</span>
              ${renderToolbarIconBadge({ iconDataUri, label: "OFF", color: "#475569", muted: true, size: 32 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return { styles, body };
};

/**
 * スライド 03: ポート番号・URLパス・正規表現と詳細度優先マッチング＋URLチェッカーを描画する関数
 * @param {object} data - 対象言語のテキストデータ
 * @param {string} iconDataUri - EnvIcon の Data URI
 * @returns {{ styles: string, body: string }} 追加スタイルと本文 HTML
 */
const renderSlide03 = (data, iconDataUri) => {
  const s = data.slide03;
  const styles = `
    .s3-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 440px 1fr;
      gap: 28px;
      position: relative;
      z-index: 2;
      min-height: 0;
    }
    .priority-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 20px 22px;
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
    }
    .priority-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .tier-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .tier-item {
      border-radius: 12px;
      padding: 12px 14px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .tier-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 800;
      color: #1e293b;
    }
    .tier-example {
      font-size: 13px;
      color: #334155;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .exact-rule-box {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      color: #3730a3;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13.5px;
      font-weight: 800;
      text-align: center;
    }
    .spa-note {
      font-size: 13px;
      color: #475569;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 10px 12px;
      font-weight: 600;
      line-height: 1.45;
    }
    .s3-right {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .checker-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 18px 20px;
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .checker-title {
      font-size: 15.5px;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .checker-input {
      background: #f8fafc;
      border: 1.5px solid #3b82f6;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
    }
    .checker-result {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 700;
      color: #1e3a8a;
    }
    .env-urls-card {
      flex: 1;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 18px 20px;
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .env-card-head {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .env-card-title { font-size: 17px; font-weight: 800; color: #0f172a; }
    .rules-chip {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      background: #f1f5f9;
      padding: 3px 10px;
      border-radius: 9999px;
    }
    .tabs-bar {
      display: flex;
      gap: 20px;
      border-bottom: 1.5px solid #e2e8f0;
      font-size: 13.5px;
      font-weight: 700;
    }
    .tab-item {
      padding-bottom: 8px;
      color: #64748b;
    }
    .tab-item.active {
      color: #2563eb;
      border-bottom: 2.5px solid #2563eb;
      margin-bottom: -1.5px;
    }
    .hint-line {
      font-size: 12.5px;
      color: #64748b;
    }
    .pattern-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      font-size: 13.5px;
    }
    .pattern-row.matched {
      background: #f0fdf4;
      border: 2px solid #22c55e;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.14);
    }
    .grip { color: #94a3b8; font-weight: 800; letter-spacing: -1px; }
    .regex-tag {
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #64748b;
    }
    .regex-tag.on {
      background: #eef2ff;
      border-color: #818cf8;
      color: #4338ca;
    }
  `;

  const body = `
    ${renderTopBar(data, iconDataUri)}
    <div class="hero-head">
      <div class="eyebrow">${esc(s.eyebrow)}</div>
      <div class="headline">${esc(s.title)}</div>
      <div class="subhead">${esc(s.subtitle)}</div>
    </div>
    <div class="s3-grid">
      <div class="priority-card">
        <div class="priority-title">${esc(s.priorityTitle)}</div>
        <div class="tier-list">
          <div class="tier-item" style="border-left:4px solid #2563eb;">
            <div class="tier-head">
              <span>${esc(s.priorityTier1)}</span>
              <span class="pill-badge" style="background:#2563eb;color:#ffffff;">STG</span>
            </div>
            <div class="tier-example mono">
              <span>example.com<strong>/stg</strong></span>
              <span style="color:#2563eb;font-weight:800;">Tier 3</span>
            </div>
          </div>
          <div class="tier-item" style="border-left:4px solid #16a34a;">
            <div class="tier-head">
              <span>${esc(s.priorityTier2)}</span>
              <span class="pill-badge" style="background:#15803d;color:#ffffff;">DEV</span>
            </div>
            <div class="tier-example mono">
              <span>localhost<strong>:3000</strong></span>
              <span style="color:#15803d;font-weight:800;">Tier 2</span>
            </div>
          </div>
          <div class="tier-item" style="border-left:4px solid #ef4444;">
            <div class="tier-head">
              <span>${esc(s.priorityTier3)}</span>
              <span class="pill-badge" style="background:#ef4444;color:#ffffff;">PROD</span>
            </div>
            <div class="tier-example mono">
              <span>example.com</span>
              <span style="color:#dc2626;font-weight:800;">Tier 1</span>
            </div>
          </div>
        </div>
        <div class="exact-rule-box">${esc(s.priorityExactVsRegex)}</div>
        <div class="spa-note">✓ ${esc(s.spaNote)}</div>
      </div>

      <div class="s3-right">
        <div class="checker-card">
          <div class="checker-title">🔍 ${esc(s.checkerTitle)}</div>
          <div class="checker-input mono">${esc(s.checkerInput)}</div>
          <div class="checker-result">
            <span>${esc(s.checkerMatched)}</span>
            <span class="pill-badge" style="background:#2563eb;color:#ffffff;">STG</span>
            <span>${esc(s.checkerEnvName)}</span>
          </div>
        </div>

        <div class="env-urls-card">
          <div class="env-card-head">
            <span class="env-card-title">${esc(s.checkerEnvName)}</span>
            <span class="pill-badge" style="background:#2563eb;color:#ffffff;">STG</span>
            <span class="rules-chip">${esc(s.rulesCount)}</span>
          </div>
          <div class="tabs-bar">
            <div class="tab-item active">${esc(s.tabUrls)}</div>
            <div class="tab-item">${esc(s.tabDesign)}</div>
          </div>
          <div class="hint-line">ℹ ${esc(s.hintText)}</div>
          <div class="pattern-row matched">
            <span class="grip">⋮⋮</span>
            <div class="switch switch-on"><div class="switch-knob"></div></div>
            <span class="mono" style="font-weight:700;color:#0f172a;flex:1;">example.com/stg</span>
            <span class="pill-badge" style="background:#16a34a;color:#ffffff;">${esc(s.matchedPill)}</span>
          </div>
          <div class="pattern-row">
            <span class="grip">⋮⋮</span>
            <div class="switch switch-on"><div class="switch-knob"></div></div>
            <span class="mono" style="color:#334155;flex:1;">stg.example.com:8443</span>
            <span class="regex-tag">${esc(s.regexLabel)}</span>
          </div>
          <div class="pattern-row">
            <span class="grip">⋮⋮</span>
            <div class="switch switch-on"><div class="switch-knob"></div></div>
            <span class="mono" style="color:#334155;flex:1;">^preview-[0-9]+\\.example\\.com$</span>
            <span class="regex-tag on">${esc(s.regexLabel)}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  return { styles, body };
};

/**
 * スライド 04: タブ構成の設定画面・カスタマイズ・5言語・ダークモード・JSON共有を描画する関数
 * @param {object} data - 対象言語のテキストデータ
 * @param {string} iconDataUri - EnvIcon の Data URI
 * @returns {{ styles: string, body: string }} 追加スタイルと本文 HTML
 */
const renderSlide04 = (data, iconDataUri) => {
  const s = data.slide04;
  const styles = `
    .s4-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
      position: relative;
      z-index: 2;
      min-height: 0;
    }
    .options-shell {
      flex: 1;
      min-height: 0;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.09);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .options-body {
      flex: 1;
      min-height: 0;
      padding: 16px 24px 12px;
      display: flex;
      flex-direction: column;
      gap: 11px;
    }
    .opt-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .opt-card-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .opt-title { font-size: 18px; font-weight: 800; color: #0f172a; }
    .opt-tabs {
      display: flex;
      gap: 24px;
      border-bottom: 1.5px solid #e2e8f0;
      font-size: 13.5px;
      font-weight: 700;
    }
    .opt-tab { padding-bottom: 6px; color: #64748b; }
    .opt-tab.active {
      color: #10b981;
      border-bottom: 2.5px solid #10b981;
      margin-bottom: -1.5px;
    }
    .appearance-grid {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: 18px;
    }
    .group-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }
    .group-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.03em;
    }
    .field-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .field-label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
    }
    .input-mock {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px 11px;
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .color-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .swatch {
      width: 18px;
      height: 18px;
      border-radius: 5px;
      border: 1px solid #cbd5e1;
      flex-shrink: 0;
    }
    .toggle-row {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 13.5px;
      font-weight: 600;
      color: #1e293b;
    }
    .sub-settings-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .options-footer {
      flex-shrink: 0;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .primary-btn {
      background: #10b981;
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
      padding: 7px 15px;
      border-radius: 10px;
    }
    .save-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12.5px;
      font-weight: 700;
    }
    .feature-chips {
      flex-shrink: 0;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    .fchip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 11px 14px;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
    }
    .fchip-title {
      font-size: 14.5px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .fchip-desc {
      font-size: 12.5px;
      font-weight: 500;
      color: #475569;
    }
  `;

  const body = `
    ${renderTopBar(data, iconDataUri)}
    <div class="hero-head">
      <div class="eyebrow">${esc(s.eyebrow)}</div>
      <div class="headline">${esc(s.title)}</div>
      <div class="subhead">${esc(s.subtitle)}</div>
    </div>
    <div class="s4-main">
      <div class="options-shell">
        <div class="options-body">
          <div class="opt-card-head">
            <div class="opt-card-left">
              <span class="opt-title">${esc(s.envTitle)}</span>
              <span class="pill-badge" style="background:#ef4444;color:#ffffff;">PROD</span>
              <span class="pill-badge" style="background:#f1f5f9;color:#64748b;">${esc(s.rulesCount)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="pill-badge" style="background:#0f172a;color:#f8fafc;">☾ Dark</span>
              <span class="pill-badge" style="background:#eef2ff;color:#4338ca;">🌐 Auto (5)</span>
            </div>
          </div>

          <div class="opt-tabs">
            <div class="opt-tab">${esc(s.tabUrls)}</div>
            <div class="opt-tab active">${esc(s.tabDesign)}</div>
          </div>

          <div class="appearance-grid">
            <div class="group-box">
              <div class="group-title">${esc(s.badgeAppearance)}</div>
              <div class="field-row">
                <div class="field-label">${esc(s.badgeTextLabel)}</div>
                <div class="input-mock mono">PROD</div>
              </div>
              <div class="color-row">
                <div class="field-row">
                  <div class="field-label">${esc(s.badgeColorLabel)}</div>
                  <div class="input-mock mono"><span class="swatch" style="background:#ff0000;"></span>#ff0000</div>
                </div>
                <div class="field-row">
                  <div class="field-label">${esc(s.badgeOutlineLabel)}</div>
                  <div class="input-mock mono"><span class="swatch" style="background:#ffffff;"></span>#ffffff</div>
                </div>
              </div>
              <div class="sub-settings-row">
                <div class="field-row">
                  <div class="field-label">${esc(s.posLabel)}</div>
                  <div class="input-mock" style="justify-content:space-between;"><span>${esc(s.posValue)}</span><span style="color:#94a3b8;">▾</span></div>
                </div>
                <div class="field-row">
                  <div class="field-label">${esc(s.fontSizeLabel)}</div>
                  <div class="input-mock mono" style="justify-content:space-between;"><span>24 px</span><span style="color:#94a3b8;">±</span></div>
                </div>
              </div>
            </div>

            <div class="group-box">
              <div class="group-title">${esc(s.featuresTitle)}</div>
              <div class="toggle-row">
                <span>${esc(s.toggleFavicon)}</span>
                <div class="switch switch-on"><div class="switch-knob"></div></div>
              </div>
              <div class="toggle-row">
                <span>${esc(s.togglePageBadge)}</span>
                <div class="switch switch-on"><div class="switch-knob"></div></div>
              </div>
              <div class="toggle-row">
                <span>${esc(s.toggleConsole)}</span>
                <div class="switch switch-on"><div class="switch-knob"></div></div>
              </div>
            </div>
          </div>
        </div>
        <div class="options-footer">
          <div class="primary-btn">${esc(s.addEnvBtn)}</div>
          <div class="save-pill">✓ ${esc(s.autoSaved)}</div>
        </div>
      </div>

      <div class="feature-chips">
        <div class="fchip" style="border-top:3px solid #4f46e5;">
          <div class="fchip-title">${esc(s.chip1Title)}</div>
          <div class="fchip-desc">${esc(s.chip1Desc)}</div>
        </div>
        <div class="fchip" style="border-top:3px solid #0f172a;">
          <div class="fchip-title">${esc(s.chip2Title)}</div>
          <div class="fchip-desc">${esc(s.chip2Desc)}</div>
        </div>
        <div class="fchip" style="border-top:3px solid #0ea5e9;">
          <div class="fchip-title">${esc(s.chip3Title)}</div>
          <div class="fchip-desc">${esc(s.chip3Desc)}</div>
        </div>
        <div class="fchip" style="border-top:3px solid #10b981;">
          <div class="fchip-title">${esc(s.chip4Title)}</div>
          <div class="fchip-desc">${esc(s.chip4Desc)}</div>
        </div>
      </div>
    </div>
  `;

  return { styles, body };
};

/**
 * 指定言語・スライド番号・サイズに対する完全な HTML ドキュメントを生成する関数
 * @param {object} params - 描画パラメータ
 * @param {string} params.lang - 正規化済み言語コード（例: "en", "ja", "zh-CN"）
 * @param {string} params.slideNumber - スライド番号（"01"〜"04"）
 * @param {object} params.data - 言語別テキストデータ
 * @param {string} params.iconDataUri - EnvIcon アイコンの Base64 Data URI
 * @param {number} params.scale - 出力スケール倍率（1280x800 は 1、640x400 は 0.5）
 * @returns {string} HTML 文字列
 */
export const renderSlideHtml = ({
  lang,
  slideNumber,
  data,
  iconDataUri,
  scale,
}) => {
  const renderers = {
    "01": renderSlide01,
    "02": renderSlide02,
    "03": renderSlide03,
    "04": renderSlide04,
  };
  const renderer = renderers[slideNumber];
  if (!renderer) {
    throw new Error(`未対応のスライド番号です: ${slideNumber}`);
  }

  const { styles, body } = renderer(data, iconDataUri);

  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    ${buildCommonStyles(lang, scale)}
    ${styles}
  </style>
</head>
<body>
  <div class="canvas-root">
    ${body}
  </div>
</body>
</html>`;
};
