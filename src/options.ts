import { SyncData, HostnamePattern } from "./types";

/**
 * DOM Elements references
 */
const Elements = {
  faviconEnabled: document.getElementById("faviconEnabled") as HTMLInputElement,
  saveButton: document.getElementById("save") as HTMLButtonElement,
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
    label.textContent = "Regex";
    label.className = "ms-2 small mb-0";
    label.style.cursor = "pointer";
    label.title = "Use Regular Expression";

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
    removeBtn.textContent = "Remove";
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
 * Loads settings from chrome storage and populates the UI.
 */
const loadSettings = () => {
  chrome.storage.sync.get(
    ["faviconEnabled", "prodHostnames", "stgHostnames", "devHostnames"],
    (data: SyncData) => {
      Elements.faviconEnabled.checked = data.faviconEnabled ?? true;
      managers.prod.render(data.prodHostnames);
      managers.stg.render(data.stgHostnames);
      managers.dev.render(data.devHostnames);
    }
  );
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
  const processedPatterns = new Map<HTMLInputElement, HostnamePattern>();

  // Extract and validate
  allRows.forEach(({ input, isRegex }) => {
    const rawValue = input.value.trim();
    if (rawValue === "") return;

    if (isRegex.checked) {
      // Validate Regex
      try {
        new RegExp(rawValue);
        processedPatterns.set(input, { value: rawValue, isRegex: true });
      } catch (e) {
        input.classList.add("is-invalid");
        hasInvalid = true;
      }
    } else {
      // Validate Hostname
      const hostname = getHostname(rawValue);
      if (!hostname) {
        input.classList.add("is-invalid");
        hasInvalid = true;
      } else {
        input.value = hostname; // Update UI with cleaned hostname
        processedPatterns.set(input, { value: hostname, isRegex: false });
      }
    }
  });

  if (hasInvalid) {
    showStatus("Error: Invalid URL, hostname, or regex found.", "red");
    return;
  }

  // Save to storage
  const settings: SyncData = {
    faviconEnabled: Elements.faviconEnabled.checked,
    prodHostnames: getPatternsFromManager(managers.prod, processedPatterns),
    stgHostnames: getPatternsFromManager(managers.stg, processedPatterns),
    devHostnames: getPatternsFromManager(managers.dev, processedPatterns),
  };

  chrome.storage.sync.set(settings, () => {
    showStatus("Sync settings saved.", "");
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
