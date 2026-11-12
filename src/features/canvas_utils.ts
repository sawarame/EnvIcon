/**
 * Canvas上にバッジテキストを描画するための設定オプション
 */
export interface BadgeTextDrawOptions {
  /** 描画するテキスト文字列 */
  text: string;
  /** テキストの塗りつぶし色（HEX形式等） */
  color: string;
  /** テキストのフチドリ色（HEX形式等） */
  outlineColor: string;
  /** キャンバスの縦横サイズ（px） */
  canvasSize: number;
  /** 明示的なフォントサイズ（px、省略時は canvasSize から自動算出） */
  fontSize?: number;
  /** フチドリの太さ（px、省略時は canvasSize から自動算出） */
  lineWidth?: number;
  /** 描画基準X座標（省略時は中央: canvasSize / 2） */
  x?: number;
  /** 描画基準Y座標（省略時は下部基準: canvasSize - 2） */
  y?: number;
}

/**
 * Canvas または OffscreenCanvas 上にフチドリ付きのバッジテキストを描画する共通関数
 * @param ctx - 描画対象の2Dレンダリングコンテキスト
 * @param options - バッジテキストの描画設定オプション
 * @returns なし
 */
export const drawBadgeText = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  options: BadgeTextDrawOptions
): void => {
  const {
    text,
    color,
    outlineColor,
    canvasSize,
    fontSize = Math.max(Math.round(canvasSize / 2.5), 12),
    lineWidth = Math.max(canvasSize / 10, 2),
    x = canvasSize / 2,
    y = canvasSize - 2,
  } = options;

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // フチドリを描画
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.strokeText(text, x, y);

  // 内部を塗りつぶし描画
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
};
