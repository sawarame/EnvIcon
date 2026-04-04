/**
 * 入力された文字列からホスト名部分を抽出・バリデーションする
 * @param input 入力文字列
 * @returns 有効なホスト名、または null
 */
export const getHostname = (input: string): string | null => {
  const text = input.trim();
  if (!text) return null;
  try {
    const hasProtocol = /^[a-z]+:\/\//i.test(text);
    const url = new URL(hasProtocol ? text : "http://" + text);
    const hostname = url.hostname.toLowerCase();
    if (!hostname) return null;
    const isValidStructure =
      (/^[a-z0-9.-]+$/i.test(hostname) || /^\[[a-f0-9:]+\]$/.test(hostname)) &&
      !/^[.-]|[.-]$/.test(hostname) &&
      !hostname.includes("..");
    return isValidStructure ? hostname : null;
  } catch {
    return null;
  }
};

/** トースト表示のタイマーID */
let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * 保存完了やエラーなどのステータスをトースト表示する
 * @param message 表示するメッセージ
 * @param color 背景色 ("red" または "danger" で赤色)
 * @param elements トースト表示に使用するDOM要素
 */
export const showStatus = (
  message: string,
  color: string,
  elements: { toast: HTMLDivElement; toastMessage: HTMLSpanElement }
) => {
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
  toastTimeoutId = setTimeout(() => elements.toast.classList.remove("show"), 3000);
};
