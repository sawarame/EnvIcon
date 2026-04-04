import { SyncData, HostnamePattern, EnvironmentConfig } from "./types";

// ─── DOM Elements ────────────────────────────────────────────────────────────
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

// ─── i18n ────────────────────────────────────────────────────────────────────
const i18nConfig = {
  en: {
    title: "Favicon Replacement Settings",
    enableFavicon: "Enable environment-specific favicon replacement",
    addHostname: "Add Hostname",
    remove: "Remove",
    regex: "Regex",
    save: "Save",
    saved: "Sync settings saved.",
    errorInvalid: "Error: Invalid URL, hostname, or regex found.",
    errorDuplicate: "Error: Duplicate hostnames or regex patterns found.",
    badgeTextLabel: "Badge Text",
    badgeColorLabel: "Color",
    badgeOutlineColorLabel: "Outline",
    resetDefault: "Reset to default",
    addEnvironment: "+ Add Environment",
    deleteEnvironment: "Delete",
    newEnvPrompt: "Enter a name for the new environment:",
    newEnvCancel: "Cancelled: no environment name was entered.",
    ProductionName: "Production Environment",
    StagingName: "Staging Environment",
    DevelopmentName: "Development Environment",
  },
  ja: {
    title: "Favicon書き換え設定",
    enableFavicon: "環境ごとのFavicon書き換えを有効にする",
    addHostname: "ホスト名を追加",
    remove: "削除",
    regex: "正規表現",
    save: "保存",
    saved: "設定を保存しました。",
    errorInvalid: "エラー: 無効なURL、ホスト名、または正規表現が含まれています。",
    errorDuplicate: "エラー: 重複するホスト名または正規表現パターンが含まれています。",
    badgeTextLabel: "バッジ文字",
    badgeColorLabel: "色",
    badgeOutlineColorLabel: "フチ色",
    resetDefault: "デフォルトに戻す",
    addEnvironment: "+ 環境追加",
    deleteEnvironment: "環境を削除",
    newEnvPrompt: "新しい環境名を入力してください:",
    newEnvCancel: "キャンセルされました。",
    ProductionName: "本番環境（Production）",
    StagingName: "ステージング環境（Staging）",
    DevelopmentName: "開発環境（Development）",
  },
};

let currentLanguage: "en" | "ja" = "en";

const t = (key: keyof typeof i18nConfig["en"]): string =>
  i18nConfig[currentLanguage][key];

const applyTranslations = () => {
  const dict = i18nConfig[currentLanguage];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n") as keyof typeof dict;
    if (dict[key]) el.textContent = dict[key];
  });
};

// ─── HostnameListManager ─────────────────────────────────────────────────────
class HostnameListManager {
  private draggingElement: HTMLElement | null = null;

  constructor(
    private container: HTMLDivElement,
    private addButton: HTMLButtonElement
  ) {
    this.addButton.addEventListener("click", () => this.addInput());
    this.setupContainerEvents();
  }

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

  render(hostnames: (string | HostnamePattern)[] | undefined) {
    this.container.innerHTML = "";
    if (hostnames && hostnames.length > 0) {
      hostnames.forEach((hn) => this.addInput(hn));
    } else {
      this.addInput();
    }
  }

  getRows(): { input: HTMLInputElement; isRegex: HTMLInputElement }[] {
    return Array.from(this.container.children).map((div) => ({
      input: div.querySelector(".hostname-input") as HTMLInputElement,
      isRegex: div.querySelector(".is-regex") as HTMLInputElement,
    }));
  }

  private updateRemoveButtonsState() {
    const buttons = this.container.querySelectorAll(
      ".btn-outline-danger"
    ) as NodeListOf<HTMLButtonElement>;
    const isDisabled = buttons.length <= 1;
    buttons.forEach((btn) => (btn.disabled = isDisabled));
  }
}

// ─── Environment Section Manager ─────────────────────────────────────────────
interface EnvSection {
  envId: string;
  badgeTextInput: HTMLInputElement;
  badgeColorInput: HTMLInputElement;
  badgeOutlineColorInput: HTMLInputElement;
  hostnameManager: HostnameListManager;
}

const envSections: EnvSection[] = [];

/**
 * 環境セクションのDOM要素を動的に生成してコンテナに追加する
 */
const renderEnvironmentSection = (
  env: EnvironmentConfig,
  container: HTMLDivElement
) => {
  
  const section = document.createElement("div");
  section.className = "mt-3 env-section";
  section.dataset.envId = env.id;

  // ヘッダー
  const headerDiv = document.createElement("div");
  headerDiv.className = "d-flex align-items-center mb-1";
  const label = document.createElement("label");
  label.className = "form-label fw-bold mb-0";
  if (["prod", "stg", "dev"].includes(env.id)) {
    label.textContent = env.id === "prod" ? t("ProductionName") : env.id === "stg" ? t("StagingName") : t("DevelopmentName");
    label.dataset.i18n = env.id === "prod" ? "ProductionName" : env.id === "stg" ? "StagingName" : "DevelopmentName";
  } else {
    label.textContent = env.name;
  }
  headerDiv.appendChild(label);

  // 削除ボタン（deletableな環境のみ）
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

  // バッジ設定ロー
  const badgeRow = document.createElement("div");
  badgeRow.className = "row align-items-center mb-2";

  const makeColLabel = (i18nKey: keyof typeof i18nConfig["en"]) => {
    const col = document.createElement("div");
    col.className = "col-auto";
    const lbl = document.createElement("label");
    lbl.className = "col-form-label small text-muted";
    lbl.textContent = t(i18nKey);
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

  // Reset button
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

  // ホスト名コンテナとAddボタン
  const hostnameContainer = document.createElement("div");
  hostnameContainer.className = "hostnames-container";

  const addHostnameBtn = document.createElement("button");
  addHostnameBtn.type = "button";
  addHostnameBtn.className = "btn btn-sm btn-outline-secondary mt-2";
  addHostnameBtn.textContent = t("addHostname");
  addHostnameBtn.dataset.i18n = "addHostname";

  section.appendChild(hostnameContainer);
  section.appendChild(addHostnameBtn);

  if (container.children.length > 0) {
    container.appendChild(document.createElement("hr"));
  }
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

// ─── Hostname validation ──────────────────────────────────────────────────────
const getHostname = (input: string): string | null => {
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

// ─── UI State tracking ────────────────────────────────────────────────────────
let initialSettingsStr = "";

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

const checkDirtyState = () => {
  Elements.saveButton.disabled = getUIStateString() === initialSettingsStr;
};

// ─── Load Settings ────────────────────────────────────────────────────────────
const loadSettings = () => {
  chrome.storage.local.get(["language"], (localData) => {
    if (localData.language === "ja" || localData.language === "en") {
      currentLanguage = localData.language;
    } else {
      currentLanguage = navigator.language.startsWith("ja") ? "ja" : "en";
    }
    Elements.languageSelect.value = currentLanguage;
    applyTranslations();

    chrome.storage.sync.get(null, (data: SyncData) => {
      Elements.faviconEnabled.checked = data.faviconEnabled ?? true;

      // Clean up container
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
const saveSettings = () => {
  const allRows = envSections.flatMap((s) => s.hostnameManager.getRows());

  allRows.forEach(({ input }) => input.classList.remove("is-invalid"));
  Elements.toast.classList.remove("show");

  let hasInvalid = false;
  let hasDuplicate = false;
  const processedPatterns = new Map<HTMLInputElement, HostnamePattern>();
  const seenPatterns = new Map<string, HTMLInputElement>();

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
      "red"
    );
    return;
  }

  const environments: EnvironmentConfig[] = envSections.map((s) => ({
    id: s.envId,
    // 名前はDOMのラベルから復元するため、既存データから参照
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
    showStatus(t("saved"), "");
    initialSettingsStr = getUIStateString();
    checkDirtyState();
  });
};

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;
const showStatus = (message: string, color: string) => {
  if (!Elements.toast || !Elements.toastMessage) return;
  Elements.toastMessage.textContent = message;
  if (color === "red" || color === "danger") {
    Elements.toast.classList.remove("text-bg-success");
    Elements.toast.classList.add("text-bg-danger");
  } else {
    Elements.toast.classList.remove("text-bg-danger");
    Elements.toast.classList.add("text-bg-success");
  }
  Elements.toast.classList.add("show");
  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => Elements.toast.classList.remove("show"), 3000);
};

Elements.toastClose?.addEventListener("click", () =>
  Elements.toast.classList.remove("show")
);

// ─── Add Environment ─────────────────────────────────────────────────────────
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

Elements.languageSelect.addEventListener("change", (e) => {
  const val = (e.target as HTMLSelectElement).value as "en" | "ja";
  currentLanguage = val;
  applyTranslations();
  chrome.storage.local.set({ language: val });
  checkDirtyState();
});
