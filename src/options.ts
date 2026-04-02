import { SyncData } from "./types";

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
  constructor(
    private container: HTMLDivElement,
    private addButton: HTMLButtonElement
  ) {
    this.addButton.addEventListener("click", () => this.addInput());
  }

  /**
   * Adds a new hostname input field to the container.
   * @param value Optional initial value for the input.
   */
  addInput(value: string = "") {
    const div = document.createElement("div");
    div.className = "input-group mb-2";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control hostname-input";
    input.value = value;
    input.placeholder = "example.com";

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

    div.appendChild(input);
    div.appendChild(removeBtn);
    this.container.appendChild(div);
    this.updateRemoveButtonsState();
  }

  /**
   * Renders multiple hostname inputs.
   * @param hostnames Array of hostnames to render.
   */
  render(hostnames: string[] | undefined) {
    this.container.innerHTML = "";
    if (hostnames && hostnames.length > 0) {
      hostnames.forEach((hn) => this.addInput(hn));
    } else {
      this.addInput("");
    }
  }

  /**
   * Retrieves all input elements in this container.
   */
  getInputs(): HTMLInputElement[] {
    return Array.from(
      this.container.querySelectorAll(".hostname-input")
    ) as HTMLInputElement[];
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
  const allInputs = [
    ...managers.prod.getInputs(),
    ...managers.stg.getInputs(),
    ...managers.dev.getInputs(),
  ];

  // Reset UI states
  allInputs.forEach((input) => input.classList.remove("is-invalid"));
  Elements.status.textContent = "";

  let hasInvalid = false;
  const processedValues = new Map<HTMLInputElement, string>();

  // Extract and validate
  allInputs.forEach((input) => {
    const rawValue = input.value.trim();
    if (rawValue === "") return;

    const hostname = getHostname(rawValue);
    if (!hostname) {
      input.classList.add("is-invalid");
      hasInvalid = true;
    } else {
      input.value = hostname; // Update UI with cleaned hostname
      processedValues.set(input, hostname);
    }
  });

  if (hasInvalid) {
    showStatus("Error: Invalid URL or hostname found.", "red");
    return;
  }

  // Duplicate check
  const counts = new Map<string, number>();
  processedValues.forEach((hn) => counts.set(hn, (counts.get(hn) || 0) + 1));

  let hasDuplicates = false;
  processedValues.forEach((hn, input) => {
    if ((counts.get(hn) || 0) > 1) {
      input.classList.add("is-invalid");
      hasDuplicates = true;
    }
  });

  if (hasDuplicates) {
    showStatus("Error: Duplicate hostnames found.", "red");
    return;
  }

  // Save to storage
  const settings: SyncData = {
    faviconEnabled: Elements.faviconEnabled.checked,
    prodHostnames: getValuesFromManager(managers.prod, processedValues),
    stgHostnames: getValuesFromManager(managers.stg, processedValues),
    devHostnames: getValuesFromManager(managers.dev, processedValues),
  };

  chrome.storage.sync.set(settings, () => {
    showStatus("Sync settings saved.", "");
    setTimeout(() => (Elements.status.textContent = ""), 2000);
  });
};

/**
 * Helper to get processed hostname values for a specific manager.
 */
const getValuesFromManager = (
  manager: HostnameListManager,
  processedMap: Map<HTMLInputElement, string>
): string[] => {
  return manager
    .getInputs()
    .map((input) => processedMap.get(input) || "")
    .filter((v) => v !== "");
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
