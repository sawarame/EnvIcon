import { parseUrlPattern } from "../features/utils";

/**
 * 通常モードのパターン入力文字列を検証し、正規化済みのURLパターン文字列（hostname[:port][/path]）を返す関数
 * @param input - ユーザーが入力したURLまたはホスト・パス文字列
 * @returns 正規化済みのパターン文字列、無効な入力の場合は null
 */
export const normalizeUrlPattern = (input: string): string | null => {
  const parsed = parseUrlPattern(input);
  return parsed ? parsed.normalized : null;
};

/**
 * 入力された文字列から小文字のホスト名部分を抽出・バリデーションする関数
 * @param input - 入力されたURLまたはホスト名文字列
 * @returns 有効な小文字ホスト名、無効な入力の場合は null
 */
export const getHostname = (input: string): string | null => {
  const parsed = parseUrlPattern(input);
  return parsed ? parsed.hostname : null;
};

/** トースト表示のタイマーID */
let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * 保存完了やエラーなどのステータスをトースト要素へ表示する関数
 * @param message - 表示するステータスメッセージ
 * @param color - 表示色種別（"red" または "danger" でエラー色）
 * @param elements - トースト表示に使用するDOM要素群
 * @returns なし
 */
export const showStatus = (
  message: string,
  color: string,
  elements: { toast: HTMLDivElement; toastMessage: HTMLSpanElement }
): void => {
  if (!elements.toast || !elements.toastMessage) return;
  elements.toastMessage.textContent = message;
  if (color === "red" || color === "danger") {
    elements.toast.classList.remove("text-bg-success");
    elements.toast.classList.add("text-bg-danger");
  } else {
    elements.toast.classList.remove("text-bg-danger");
    elements.toast.classList.add("text-bg-success");
  }
  elements.toast.classList.add("show");
  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(
    () => elements.toast.classList.remove("show"),
    3000
  );
};
