import { SyncData, HostnamePattern, EnvironmentConfig } from "./types";
import { setLanguage, t, applyTranslations, Language } from "./options/i18n";
import { getHostname, showStatus } from "./options/utils";

/**
 * ページ内の主要なDOM要素
 */
const Elements = {
  faviconEnabled: document.getElementById("faviconEnabled") as HTMLInputElement,
  saveButton: document.getElementById("save") as HTMLButtonElement,
  addEnvironmentButton: document.getElementById("addEnvironment") as HTMLButtonElement,
  languageSelect: document.getElementById("languageSelect") as HTMLSelectElement,
  environmentsContainer: document.getElementById("environmentsContainer") as HTMLDivElement,
  toast: document.getElementById("saveToast") as HTMLDivElement,
  toastMessage: document.getElementById("toastMessage") as HTMLSpanElement,
  toastClose: document.getElementById("closeToast") as HTMLButtonElement,
};

/**
 * ホスト名入力リストの表示と操作（追加・削除・ドラッグ順序変更）を管理するクラス
 */
class HostnameListManager {
  private draggingElement: HTMLElement | null = null;

  constructor(
    private container: HTMLDivElement,
    private addButton: HTMLButtonElement
  ) {
    this.addButton.addEventListener("click", () => this.addInput());
    this.setupContainerEvents();
  }

  /**
   * 新しいホスト名入力行を追加する
   * @param pattern 初期値としてのパターン情報
   */
  addInput(pattern: string | HostnamePattern = { value: "", isRegex: false }) {
    const value = typeof pattern === "string" ? pattern : pattern.value;
    const isRegex = typeof pattern === "string" ? false : pattern.isRegex;

    const div = document.createElement("div");
    div.className = "input-group mb-2";
    div.draggable = true;

    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.innerHTML = "⋮⋮";
    handle.title = "Drag to reorder";

    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "input-group-text";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `regex-${Math.random().toString(36).substr(2, 9)}`;
    checkbox.className = "form-check-input mt-0 is-regex";
    checkbox.title = "Use Regular Expression";
    checkbox.checked = isRegex;
    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.className = "ms-2 small mb-0";
    label.style.cursor = "pointer";
    label.textContent = t("regex");
    label.title = t("regex");
    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control hostname-input";
    input.value = value;
    input.placeholder = isRegex ? "e.g. ^.*\\.local$" : "example.com";
    checkbox.onchange = () => {
      input.placeholder = checkbox.checked ? "e.g. ^.*\\.local$" : "example.com";
    };

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-outline-danger";
    removeBtn.type = "button";
    removeBtn.textContent = t("remove");
    removeBtn.onclick = () => {
      if (this.container.children.length > 1) {
        div.remove();
        this.updateRemoveButtonsState();
      }
    };

    div.appendChild(handle);
    div.appendChild(checkboxDiv);
    div.appendChild(input);
    div.appendChild(removeBtn);
    this.bindDragEvents(div);
    this.container.appendChild(div);
    this.updateRemoveButtonsState();
  }

  /**
   * 要素にドラッグ＆ドロップイベントをバインドする
   */
  private bindDragEvents(el: HTMLElement) {
    el.addEventListener("dragstart", (e) => {
      this.draggingElement = el;
      el.classList.add("dragging");
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    });
    el.addEventListener("dragend", () => {
      this.draggingElement = null;
      el.classList.remove("dragging");
      this.container.querySelectorAll(".drag-over").forEach((n) => n.classList.remove("drag-over"));
    });
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (this.draggingElement && this.draggingElement !== el)
        el.classList.add("drag-over");
    });
    el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      el.classList.remove("drag-over");
      if (this.draggingElement && this.draggingElement !== el) {
        const children = Array.from(this.container.children);
        const di = children.indexOf(this.draggingElement);
        const ti = children.indexOf(el);
        if (di < ti) el.after(this.draggingElement);
        else el.before(this.draggingElement);
      }
    });
  }

  private setupContainerEvents() {
    this.container.addEventListener("dragover", (e) => e.preventDefault());
  }

  /**
   * 指定されたホスト名リストを元にUIをレンダリングする
   */
  render(hostnames: (string | HostnamePattern)[] | undefined) {
    this.container.innerHTML = "";
    if (hostnames && hostnames.length > 0) {
      hostnames.forEach((hn) => this.addInput(hn));
    } else {
      this.addInput();
    }
  }

  /**
   * 現在表示されている全ての入力行の要素を返す
   */
  getRows(): { input: HTMLInputElement; isRegex: HTMLInputElement }[] {
    return Array.from(this.container.children).map((div) => ({
      input: div.querySelector(".hostname-input") as HTMLInputElement,
      isRegex: div.querySelector(".is-regex") as HTMLInputElement,
    }));
  }

  /**
   * 削除ボタンの有効/無効状態を更新する（1行だけのときは削除不可）
   */
  private updateRemoveButtonsState() {
    const buttons = this.container.querySelectorAll(
      ".btn-outline-danger"
    ) as NodeListOf<HTMLButtonElement>;
    const isDisabled = buttons.length <= 1;
    buttons.forEach((btn) => (btn.disabled = isDisabled));
  }
}

/** 環境セクションごとの管理データ構造 */
interface EnvSection {
  envId: string;
  badgeTextInput: HTMLInputElement;
  badgeColorInput: HTMLInputElement;
  badgeOutlineColorInput: HTMLInputElement;
  hostnameManager: HostnameListManager;
}

/** 現在画面に表示されている環境セクションのリスト */
const envSections: EnvSection[] = [];

/**
 * 環境セクション（名前、バッジ設定、ホスト名リスト）のDOM要素を動的に生成してコンテナに追加する
 * @param env 環境設定データ
 * @param container 追加先のコンテナ要素
 */
const renderEnvironmentSection = (
  env: EnvironmentConfig,
  container: HTMLDivElement
) => {
  
  const section = document.createElement("div");
  section.className = "mt-3 env-section";
  section.dataset.envId = env.id;

  section.appendChild(document.createElement("hr"));

  // ヘッダー（環境名と削除ボタン）
  const headerDiv = document.createElement("div");
  headerDiv.className = "d-flex align-items-center mb-1";
  const label = document.createElement("label");
  label.className = "form-label fw-bold mb-0";
  if (["prod", "stg", "dev"].includes(env.id)) {
    const i18nKey = env.id === "prod" ? "ProductionName" : env.id === "stg" ? "StagingName" : "DevelopmentName";
    label.textContent = t(i18nKey as any);
    label.dataset.i18n = i18nKey;
  } else {
    label.textContent = env.name;
  }
  headerDiv.appendChild(label);

  if (env.isDeletable) {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-sm btn-outline-danger ms-3";
    deleteBtn.textContent = t("deleteEnvironment");
    deleteBtn.addEventListener("click", () => {
      const idx = envSections.findIndex((s) => s.envId === env.id);
      if (idx !== -1) envSections.splice(idx, 1);
      section.remove();
      checkDirtyState();
    });
    headerDiv.appendChild(deleteBtn);
  }
  section.appendChild(headerDiv);

  // バッジ設定エリア
  const badgeRow = document.createElement("div");
  badgeRow.className = "row align-items-center mb-2";

  const makeColLabel = (i18nKey: string) => {
    const col = document.createElement("div");
    col.className = "col-auto";
    const lbl = document.createElement("label");
    lbl.className = "col-form-label small text-muted";
    lbl.textContent = t(i18nKey as any);
    lbl.dataset.i18n = i18nKey;
    col.appendChild(lbl);
    return col;
  };

  const makeColInput = (type: string, extraClass: string, value: string, maxlength?: number) => {
    const col = document.createElement("div");
    col.className = "col-auto";
    const inp = document.createElement("input");
    inp.type = type;
    inp.className = `form-control ${extraClass}`;
    inp.value = value;
    if (maxlength) inp.maxLength = maxlength;
    if (type === "text") inp.style.width = "80px";
    col.appendChild(inp);
    return { col, inp };
  };

  const { col: textCol, inp: badgeTextInput } = makeColInput(
    "text", "form-control-sm", env.badgeText, 4
  );
  const { col: colorCol, inp: badgeColorInput } = makeColInput(
    "color", "form-control-color", env.badgeColor
  );
  const { col: outlineCol, inp: badgeOutlineColorInput } = makeColInput(
    "color", "form-control-color", env.badgeOutlineColor
  );

  // デフォルトに戻すボタン
  const resetColDiv = document.createElement("div");
  resetColDiv.className = "col-auto ms-auto";
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "btn btn-sm btn-link text-decoration-none";
  resetBtn.textContent = t("resetDefault");
  resetBtn.dataset.i18n = "resetDefault";
  resetBtn.addEventListener("click", () => {
    badgeTextInput.value = env.id === "prod" ? "prod" : env.id === "stg" ? "stg" : env.id === "dev" ? "dev" : env.name.substring(0, 4).toLowerCase();
    badgeColorInput.value = env.id === "prod" ? "#ff0000" : env.id === "stg" ? "#0000ff" : env.id === "dev" ? "#008000" : "#888888";
    badgeOutlineColorInput.value = "#ffffff";
    checkDirtyState();
  });
  resetColDiv.appendChild(resetBtn);

  badgeRow.appendChild(makeColLabel("badgeTextLabel"));
  badgeRow.appendChild(textCol);
  badgeRow.appendChild(makeColLabel("badgeColorLabel"));
  badgeRow.appendChild(colorCol);
  badgeRow.appendChild(makeColLabel("badgeOutlineColorLabel"));
  badgeRow.appendChild(outlineCol);
  badgeRow.appendChild(resetColDiv);
  section.appendChild(badgeRow);

  // ホスト名リストエリア
  const hostnameContainer = document.createElement("div");
  hostnameContainer.className = "hostnames-container";

  const addHostnameBtn = document.createElement("button");
  addHostnameBtn.type = "button";
  addHostnameBtn.className = "btn btn-sm btn-outline-secondary mt-2";
  addHostnameBtn.textContent = t("addHostname");
  addHostnameBtn.dataset.i18n = "addHostname";

  section.appendChild(hostnameContainer);
  section.appendChild(addHostnameBtn);

  container.appendChild(section);

  const manager = new HostnameListManager(
    hostnameContainer as HTMLDivElement,
    addHostnameBtn
  );
  manager.render(env.hostnames);

  const record: EnvSection = {
    envId: env.id,
    badgeTextInput,
    badgeColorInput,
    badgeOutlineColorInput,
    hostnameManager: manager,
  };
  envSections.push(record);
};

// ─── UI State tracking ────────────────────────────────────────────────────────
/** 読み込み時の初期状態を保存する文字列（変更検知用） */
let initialSettingsStr = "";

/**
 * 現在のUI上の設定値をJSON文字列として取得する
 */
const getUIStateString = (): string => {
  return JSON.stringify({
    faviconEnabled: Elements.faviconEnabled.checked,
    envs: envSections.map((s) => ({
      id: s.envId,
      bt: s.badgeTextInput.value,
      bc: s.badgeColorInput.value,
      bo: s.badgeOutlineColorInput.value,
      hn: s.hostnameManager.getRows().map((r) => ({ v: r.input.value, r: r.isRegex.checked })),
    })),
  });
};

/**
 * UIが変更されたかチェックし、保存ボタンの有効/無効を切り替える
 */
const checkDirtyState = () => {
  if (Elements.saveButton) {
    Elements.saveButton.disabled = getUIStateString() === initialSettingsStr;
  }
};

// ─── Load Settings ────────────────────────────────────────────────────────────
/**
 * ストレージから設定を読み込み、UIを初期化する
 */
const loadSettings = () => {
  chrome.storage.local.get(["language"], (localData) => {
    let currentLanguage: Language;
    if (localData.language === "ja" || localData.language === "en") {
      currentLanguage = localData.language;
    } else {
      currentLanguage = navigator.language.startsWith("ja") ? "ja" : "en";
    }
    setLanguage(currentLanguage);
    Elements.languageSelect.value = currentLanguage;
    applyTranslations();

    chrome.storage.sync.get(null, (data: SyncData) => {
      Elements.faviconEnabled.checked = data.faviconEnabled ?? true;

      // コンテナをクリア
      Elements.environmentsContainer.innerHTML = "";
      envSections.length = 0;

      const environments = data.environments && data.environments.length > 0
        ? data.environments
        : [
            { id: "prod", name: "Production", badgeText: "prod", badgeColor: "#ff0000", badgeOutlineColor: "#ffffff", hostnames: [], isDeletable: false },
            { id: "stg",  name: "Staging",    badgeText: "stg",  badgeColor: "#0000ff", badgeOutlineColor: "#ffffff", hostnames: [], isDeletable: false },
            { id: "dev",  name: "Development",badgeText: "dev",  badgeColor: "#008000", badgeOutlineColor: "#ffffff", hostnames: [], isDeletable: false },
          ];

      environments.forEach((env) =>
        renderEnvironmentSection(env, Elements.environmentsContainer)
      );

      initialSettingsStr = getUIStateString();
      checkDirtyState();
    });
  });
};

// ─── Save Settings ────────────────────────────────────────────────────────────
/**
 * 現在のUI上の設定をストレージに保存する
 */
const saveSettings = () => {
  const allRows = envSections.flatMap((s) => s.hostnameManager.getRows());

  // バリデーション状態をリセット
  allRows.forEach(({ input }) => input.classList.remove("is-invalid"));
  Elements.toast.classList.remove("show");

  let hasInvalid = false;
  let hasDuplicate = false;
  const processedPatterns = new Map<HTMLInputElement, HostnamePattern>();
  const seenPatterns = new Map<string, HTMLInputElement>();

  // 全ての行をチェック
  allRows.forEach(({ input, isRegex }) => {
    const rawValue = input.value.trim();
    if (rawValue === "") return;

    let isValid = true;
    let patternKey = "";

    if (isRegex.checked) {
      try {
        new RegExp(rawValue);
        patternKey = `regex:${rawValue}`;
        processedPatterns.set(input, { value: rawValue, isRegex: true });
      } catch {
        input.classList.add("is-invalid");
        hasInvalid = true;
        isValid = false;
      }
    } else {
      const hostname = getHostname(rawValue);
      if (!hostname) {
        input.classList.add("is-invalid");
        hasInvalid = true;
        isValid = false;
      } else {
        input.value = hostname;
        patternKey = `host:${hostname}`;
        processedPatterns.set(input, { value: hostname, isRegex: false });
      }
    }

    // 重複チェック
    if (isValid && patternKey) {
      if (seenPatterns.has(patternKey)) {
        input.classList.add("is-invalid");
        seenPatterns.get(patternKey)?.classList.add("is-invalid");
        hasDuplicate = true;
      } else {
        seenPatterns.set(patternKey, input);
      }
    }
  });

  if (hasInvalid || hasDuplicate) {
    showStatus(
      hasDuplicate ? t("errorDuplicate") : t("errorInvalid"),
      "red",
      Elements
    );
    return;
  }

  // 保存用データ作成
  const environments: EnvironmentConfig[] = envSections.map((s) => ({
    id: s.envId,
    name: (document.querySelector(`.env-section[data-env-id="${s.envId}"] .form-label`) as HTMLElement)?.textContent || s.envId,
    badgeText: s.badgeTextInput.value,
    badgeColor: s.badgeColorInput.value,
    badgeOutlineColor: s.badgeOutlineColorInput.value,
    hostnames: s.hostnameManager
      .getRows()
      .map(({ input }) => processedPatterns.get(input))
      .filter((v): v is HostnamePattern => v !== undefined),
    isDeletable: !["prod", "stg", "dev"].includes(s.envId),
  }));

  const settings: SyncData = {
    faviconEnabled: Elements.faviconEnabled.checked,
    environments,
  };

  chrome.storage.sync.set(settings, () => {
    showStatus(t("saved"), "", Elements);
    initialSettingsStr = getUIStateString();
    checkDirtyState();
  });
};

// トーストの閉じるボタン
Elements.toastClose?.addEventListener("click", () =>
  Elements.toast.classList.remove("show")
);

// ─── Add Environment ─────────────────────────────────────────────────────────
/**
 * 新しい環境を追加する
 */
Elements.addEnvironmentButton.addEventListener("click", () => {
  const name = prompt(t("newEnvPrompt"));
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  const id = `custom_${Date.now()}`;
  const newEnv: EnvironmentConfig = {
    id,
    name: trimmed,
    badgeText: trimmed.substring(0, 4).toLowerCase(),
    badgeColor: "#888888",
    badgeOutlineColor: "#ffffff",
    hostnames: [],
    isDeletable: true,
  };
  renderEnvironmentSection(newEnv, Elements.environmentsContainer);
  checkDirtyState();
});

// ─── Event Listeners ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", loadSettings);
Elements.saveButton.addEventListener("click", saveSettings);
document.addEventListener("input", checkDirtyState);
document.addEventListener("change", checkDirtyState);
document.addEventListener("click", () => setTimeout(checkDirtyState, 0));
document.addEventListener("dragend", () => setTimeout(checkDirtyState, 0));

/**
 * 言語切り替えイベント
 */
Elements.languageSelect.addEventListener("change", (e) => {
  const val = (e.target as HTMLSelectElement).value as Language;
  setLanguage(val);
  applyTranslations();
  chrome.storage.local.set({ language: val });
  checkDirtyState();
});
