import { SyncData, HostnamePattern } from "./types";

/**
 * DOM Elements references
 */
const Elements = {
  faviconEnabled: document.getElementById("faviconEnabled") as HTMLInputElement,
  saveButton: document.getElementById("save") as HTMLButtonElement,
  languageSelect: document.getElementById("languageSelect") as HTMLSelectElement,
  status: document.getElementById("status") as HTMLSpanElement,
  containers: {
    prod: document.getElementById("prodHostnamesContainer") as HTMLDivElement,
    stg: document.getElementById("stgHostnamesContainer") as HTMLDivElement,
    dev: document.getElementById("devHostnamesContainer") as HTMLDivElement,
  },
  addButtons: {
    prod: document.getElementById("addProdHostname") as HTMLButtonElement,
    stg: document.getElementById("addStgHostname") as HTMLButtonElement,
    dev: document.getElementById("addDevHostname") as HTMLButtonElement,
  },
  badges: {
    prod: {
      text: document.getElementById("prodBadgeText") as HTMLInputElement,
      color: document.getElementById("prodBadgeColor") as HTMLInputElement,
      outlineColor: document.getElementById("prodBadgeOutlineColor") as HTMLInputElement,
      reset: document.getElementById("resetProdBadge") as HTMLButtonElement,
    },
    stg: {
      text: document.getElementById("stgBadgeText") as HTMLInputElement,
      color: document.getElementById("stgBadgeColor") as HTMLInputElement,
      outlineColor: document.getElementById("stgBadgeOutlineColor") as HTMLInputElement,
      reset: document.getElementById("resetStgBadge") as HTMLButtonElement,
    },
    dev: {
      text: document.getElementById("devBadgeText") as HTMLInputElement,
      color: document.getElementById("devBadgeColor") as HTMLInputElement,
      outlineColor: document.getElementById("devBadgeOutlineColor") as HTMLInputElement,
      reset: document.getElementById("resetDevBadge") as HTMLButtonElement,
    },
  },
};

const i18nConfig = {
  en: {
    title: "Favicon Replacement Settings",
    enableFavicon: "Enable environment-specific favicon replacement",
    prodHostnames: "Production Hostnames",
    stgHostnames: "Staging Hostnames",
    devHostnames: "Development Hostnames",
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
  },
  ja: {
    title: "Favicon書き換え設定",
    enableFavicon: "環境ごとのFavicon書き換えを有効にする",
    prodHostnames: "本番環境 (Production) ホスト名",
    stgHostnames: "ステージング環境 (Staging) ホスト名",
    devHostnames: "開発環境 (Development) ホスト名",
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
  },
};

let currentLanguage: "en" | "ja" = "en";

const applyTranslations = () => {
  const dict = i18nConfig[currentLanguage];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n") as keyof typeof dict;
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
};

/**
 * Manages a list of hostname inputs in the UI.
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
   * Adds a new hostname input field to the container.
   * @param pattern Optional initial value for the input.
   */
  addInput(pattern: string | HostnamePattern = { value: "", isRegex: false }) {
    const value = typeof pattern === "string" ? pattern : pattern.value;
    const isRegex = typeof pattern === "string" ? false : pattern.isRegex;

    const div = document.createElement("div");
    div.className = "input-group mb-2";
    div.draggable = true;

    // Drag Handle
    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.innerHTML = "⋮⋮"; // Vertical dots for handle
    handle.title = "Drag to reorder";

    // Regex Checkbox
    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "input-group-text";
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `regex-${Math.random().toString(36).substr(2, 9)}`; // Unique ID
    checkbox.className = "form-check-input mt-0 is-regex";
    checkbox.title = "Use Regular Expression";
    checkbox.checked = isRegex;
    
    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.setAttribute("data-i18n", "regex");
    label.textContent = i18nConfig[currentLanguage].regex;
    label.className = "ms-2 small mb-0";
    label.style.cursor = "pointer";
    label.title = i18nConfig[currentLanguage].regex;

    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control hostname-input";
    input.value = value;
    input.placeholder = isRegex ? "e.g. ^.*\\.local$" : "example.com";

    // Update placeholder when checkbox toggles
    checkbox.onchange = () => {
      input.placeholder = checkbox.checked ? "e.g. ^.*\\.local$" : "example.com";
    };

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-outline-danger";
    removeBtn.type = "button";
    removeBtn.setAttribute("data-i18n", "remove");
    removeBtn.textContent = i18nConfig[currentLanguage].remove;
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

    // Bind Drag Events
    this.bindDragEvents(div);

    this.container.appendChild(div);
    this.updateRemoveButtonsState();
  }

  private bindDragEvents(el: HTMLElement) {
    el.addEventListener("dragstart", (e) => {
      this.draggingElement = el;
      el.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
      }
    });

    el.addEventListener("dragend", () => {
      this.draggingElement = null;
      el.classList.remove("dragging");
      this.container.querySelectorAll(".drag-over").forEach(node => node.classList.remove("drag-over"));
    });

    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (this.draggingElement && this.draggingElement !== el) {
        el.classList.add("drag-over");
      }
    });

    el.addEventListener("dragleave", () => {
      el.classList.remove("drag-over");
    });

    el.addEventListener("drop", (e) => {
      e.preventDefault();
      el.classList.remove("drag-over");
      if (this.draggingElement && this.draggingElement !== el) {
        const children = Array.from(this.container.children);
        const draggingIndex = children.indexOf(this.draggingElement);
        const targetIndex = children.indexOf(el);

        if (draggingIndex < targetIndex) {
          el.after(this.draggingElement);
        } else {
          el.before(this.draggingElement);
        }
      }
    });
  }

  private setupContainerEvents() {
    // Basic drop handling on container to allow dropping at the end
    this.container.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
  }

  /**
   * Renders multiple hostname inputs.
   * @param hostnames Array of hostnames or patterns to render.
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
   * Retrieves all row elements in this container.
   */
  getRows(): { input: HTMLInputElement; isRegex: HTMLInputElement }[] {
    return Array.from(this.container.children).map((div) => ({
      input: div.querySelector(".hostname-input") as HTMLInputElement,
      isRegex: div.querySelector(".is-regex") as HTMLInputElement,
    }));
  }

  /**
   * Updates the disabled state of remove buttons (prevents removing the last input).
   */
  private updateRemoveButtonsState() {
    const buttons = this.container.querySelectorAll(
      ".btn-outline-danger"
    ) as NodeListOf<HTMLButtonElement>;
    const isDisabled = buttons.length <= 1;
    buttons.forEach((btn) => (btn.disabled = isDisabled));
  }
}

// Initialize managers for each environment
const managers = {
  prod: new HostnameListManager(Elements.containers.prod, Elements.addButtons.prod),
  stg: new HostnameListManager(Elements.containers.stg, Elements.addButtons.stg),
  dev: new HostnameListManager(Elements.containers.dev, Elements.addButtons.dev),
};

/**
 * Validates and extracts a hostname from a string or URL.
 * @param input The raw input string.
 * @returns The extracted hostname in lowercase, or null if invalid.
 */
const getHostname = (input: string): string | null => {
  const text = input.trim();
  if (!text) return null;

  try {
    const hasProtocol = /^[a-z]+:\/\//i.test(text);
    const url = new URL(hasProtocol ? text : "http://" + text);
    const hostname = url.hostname.toLowerCase();

    if (!hostname) return null;

    // Validate hostname structure
    const isValidStructure =
      (/^[a-z0-9.-]+$/i.test(hostname) || /^\[[a-f0-9:]+\]$/.test(hostname)) &&
      !/^[.-]|[.-]$/.test(hostname) &&
      !hostname.includes("..");

    return isValidStructure ? hostname : null;
  } catch {
    return null;
  }
};

/**
 * UI State tracking
 */
let initialSettingsStr = "";

const getUIStateString = (): string => {
  return JSON.stringify({
    faviconEnabled: Elements.faviconEnabled.checked,
    prod: managers.prod.getRows().map((r) => ({ v: r.input.value, r: r.isRegex.checked })),
    prodBadge: { t: Elements.badges.prod.text.value, c: Elements.badges.prod.color.value, o: Elements.badges.prod.outlineColor.value },
    stg: managers.stg.getRows().map((r) => ({ v: r.input.value, r: r.isRegex.checked })),
    stgBadge: { t: Elements.badges.stg.text.value, c: Elements.badges.stg.color.value, o: Elements.badges.stg.outlineColor.value },
    dev: managers.dev.getRows().map((r) => ({ v: r.input.value, r: r.isRegex.checked })),
    devBadge: { t: Elements.badges.dev.text.value, c: Elements.badges.dev.color.value, o: Elements.badges.dev.outlineColor.value },
  });
};

const checkDirtyState = () => {
  const isDirty = getUIStateString() !== initialSettingsStr;
  Elements.saveButton.disabled = !isDirty;
};

/**
 * Loads settings from chrome storage and populates the UI.
 */
const loadSettings = () => {
  chrome.storage.local.get(["language"], (localData) => {
    if (localData.language === "ja" || localData.language === "en") {
      currentLanguage = localData.language;
    } else {
      currentLanguage = navigator.language.startsWith("ja") ? "ja" : "en";
    }
    Elements.languageSelect.value = currentLanguage;
    applyTranslations();

    chrome.storage.sync.get(
      null,
      (data: SyncData) => {
        Elements.faviconEnabled.checked = data.faviconEnabled ?? true;

        Elements.badges.prod.text.value = data.prodBadgeText || "prod";
        Elements.badges.prod.color.value = data.prodBadgeColor || "#ff0000";
        Elements.badges.prod.outlineColor.value = data.prodBadgeOutlineColor || "#ffffff";
        Elements.badges.stg.text.value = data.stgBadgeText || "stg";
        Elements.badges.stg.color.value = data.stgBadgeColor || "#0000ff";
        Elements.badges.stg.outlineColor.value = data.stgBadgeOutlineColor || "#ffffff";
        Elements.badges.dev.text.value = data.devBadgeText || "dev";
        Elements.badges.dev.color.value = data.devBadgeColor || "#008000";
        Elements.badges.dev.outlineColor.value = data.devBadgeOutlineColor || "#ffffff";

        managers.prod.render(data.prodHostnames);
        managers.stg.render(data.stgHostnames);
        managers.dev.render(data.devHostnames);

        initialSettingsStr = getUIStateString();
        checkDirtyState();
      }
    );
  });
};

/**
 * Validates all inputs, extracts hostnames, and saves settings to chrome storage.
 */
const saveSettings = () => {
  const allRows = [
    ...managers.prod.getRows(),
    ...managers.stg.getRows(),
    ...managers.dev.getRows(),
  ];

  // Reset UI states
  allRows.forEach(({ input }) => input.classList.remove("is-invalid"));
  Elements.status.textContent = "";

  let hasInvalid = false;
  let hasDuplicate = false;
  const processedPatterns = new Map<HTMLInputElement, HostnamePattern>();
  const seenPatterns = new Map<string, HTMLInputElement>();

  // Extract and validate
  allRows.forEach(({ input, isRegex }) => {
    const rawValue = input.value.trim();
    if (rawValue === "") return;

    let isValid = true;
    let patternKey = "";

    if (isRegex.checked) {
      // Validate Regex
      try {
        new RegExp(rawValue);
        patternKey = `regex:${rawValue}`;
        processedPatterns.set(input, { value: rawValue, isRegex: true });
      } catch (e) {
        input.classList.add("is-invalid");
        hasInvalid = true;
        isValid = false;
      }
    } else {
      // Validate Hostname
      const hostname = getHostname(rawValue);
      if (!hostname) {
        input.classList.add("is-invalid");
        hasInvalid = true;
        isValid = false;
      } else {
        input.value = hostname; // Update UI with cleaned hostname
        patternKey = `host:${hostname}`;
        processedPatterns.set(input, { value: hostname, isRegex: false });
      }
    }

    // Check for duplicates
    if (isValid && patternKey) {
      if (seenPatterns.has(patternKey)) {
        input.classList.add("is-invalid");
        const firstInput = seenPatterns.get(patternKey);
        if (firstInput) {
          firstInput.classList.add("is-invalid");
        }
        hasDuplicate = true;
      } else {
        seenPatterns.set(patternKey, input);
      }
    }
  });

  if (hasInvalid || hasDuplicate) {
    const msg = hasDuplicate
      ? i18nConfig[currentLanguage].errorDuplicate
      : i18nConfig[currentLanguage].errorInvalid;
    showStatus(msg, "red");
    return;
  }

  // Save to storage
  const settings: SyncData = {
    faviconEnabled: Elements.faviconEnabled.checked,
    prodBadgeText: Elements.badges.prod.text.value,
    prodBadgeColor: Elements.badges.prod.color.value,
    prodBadgeOutlineColor: Elements.badges.prod.outlineColor.value,
    stgBadgeText: Elements.badges.stg.text.value,
    stgBadgeColor: Elements.badges.stg.color.value,
    stgBadgeOutlineColor: Elements.badges.stg.outlineColor.value,
    devBadgeText: Elements.badges.dev.text.value,
    devBadgeColor: Elements.badges.dev.color.value,
    devBadgeOutlineColor: Elements.badges.dev.outlineColor.value,
    prodHostnames: getPatternsFromManager(managers.prod, processedPatterns),
    stgHostnames: getPatternsFromManager(managers.stg, processedPatterns),
    devHostnames: getPatternsFromManager(managers.dev, processedPatterns),
  };

  chrome.storage.sync.set(settings, () => {
    showStatus(i18nConfig[currentLanguage].saved, "");
    initialSettingsStr = getUIStateString();
    checkDirtyState();
    setTimeout(() => (Elements.status.textContent = ""), 2000);
  });
};

/**
 * Helper to get processed patterns for a specific manager.
 */
const getPatternsFromManager = (
  manager: HostnameListManager,
  processedMap: Map<HTMLInputElement, HostnamePattern>
): HostnamePattern[] => {
  return manager
    .getRows()
    .map(({ input }) => processedMap.get(input))
    .filter((v): v is HostnamePattern => v !== undefined);
};

/**
 * Displays a message in the status span.
 */
const showStatus = (message: string, color: string) => {
  Elements.status.textContent = message;
  Elements.status.style.color = color;
};

document.addEventListener("DOMContentLoaded", loadSettings);
Elements.saveButton.addEventListener("click", saveSettings);

// Reset badge configurations to default
const resetBadgeDefaults = (env: "prod" | "stg" | "dev") => {
  const defaults = {
    prod: { t: "prod", c: "#ff0000", o: "#ffffff" },
    stg: { t: "stg", c: "#0000ff", o: "#ffffff" },
    dev: { t: "dev", c: "#008000", o: "#ffffff" },
  };
  Elements.badges[env].text.value = defaults[env].t;
  Elements.badges[env].color.value = defaults[env].c;
  Elements.badges[env].outlineColor.value = defaults[env].o;
  checkDirtyState();
};
Elements.badges.prod.reset.addEventListener("click", () => resetBadgeDefaults("prod"));
Elements.badges.stg.reset.addEventListener("click", () => resetBadgeDefaults("stg"));
Elements.badges.dev.reset.addEventListener("click", () => resetBadgeDefaults("dev"));

// Track UI changes to enable/disable Save button
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
