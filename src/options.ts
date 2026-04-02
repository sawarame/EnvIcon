import { SyncData } from "./types";

const faviconEnabledCheckbox = document.getElementById(
  "faviconEnabled"
) as HTMLInputElement;

const prodHostnamesContainer = document.getElementById("prodHostnamesContainer") as HTMLDivElement;
const stgHostnamesContainer = document.getElementById("stgHostnamesContainer") as HTMLDivElement;
const devHostnamesContainer = document.getElementById("devHostnamesContainer") as HTMLDivElement;

const addProdHostnameBtn = document.getElementById("addProdHostname") as HTMLButtonElement;
const addStgHostnameBtn = document.getElementById("addStgHostname") as HTMLButtonElement;
const addDevHostnameBtn = document.getElementById("addDevHostname") as HTMLButtonElement;

const saveButton = document.getElementById("save") as HTMLButtonElement;
const statusSpan = document.getElementById("status") as HTMLSpanElement;

const updateRemoveButtons = (container: HTMLDivElement) => {
  const removeButtons = container.querySelectorAll(".btn-outline-danger") as NodeListOf<HTMLButtonElement>;
  const isDisabled = removeButtons.length <= 1;
  removeButtons.forEach(btn => {
    btn.disabled = isDisabled;
  });
};

const createHostnameInput = (value: string = "") => {
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
    const container = div.parentElement as HTMLDivElement;
    if (container && container.children.length > 1) {
      div.remove();
      updateRemoveButtons(container);
    }
  };
  
  div.appendChild(input);
  div.appendChild(removeBtn);
  return div;
};

const getHostnamesFromContainer = (container: HTMLDivElement): string[] => {
  const inputs = container.querySelectorAll(".hostname-input") as NodeListOf<HTMLInputElement>;
  return Array.from(inputs).map(input => input.value.trim()).filter(value => value !== "");
};

const renderHostnames = (container: HTMLDivElement, hostnames: string[] | undefined) => {
  container.innerHTML = "";
  if (hostnames && hostnames.length > 0) {
    hostnames.forEach(hn => {
      container.appendChild(createHostnameInput(hn));
    });
  } else {
    container.appendChild(createHostnameInput(""));
  }
  updateRemoveButtons(container);
};

const getHostname = (input: string): string | null => {
  const text = input.trim();
  if (!text) return null;

  try {
    // Check if it already has a protocol, otherwise add http:// for parsing
    const hasProtocol = /^[a-z]+:\/\//i.test(text);
    const url = new URL(hasProtocol ? text : "http://" + text);

    const hostname = url.hostname;
    if (!hostname) return null;

    // Validate hostname characters (alphanumeric, dots, hyphens, or IPv6 brackets)
    if (
      !/^[a-z0-9.-]+$/i.test(hostname) &&
      !/^\[[a-f0-9:]+\]$/i.test(hostname)
    ) {
      return null;
    }

    // Prevent hostnames that start/end with dot or hyphen, or have double dots
    if (/^[.-]|[.-]$/.test(hostname) || hostname.includes("..")) {
      return null;
    }

    return hostname.toLowerCase();
  } catch (e) {
    return null;
  }
};

const loadSettings = () => {
  chrome.storage.sync.get(
    ["faviconEnabled", "prodHostnames", "stgHostnames", "devHostnames"],
    (data: SyncData) => {
      faviconEnabledCheckbox.checked = data.faviconEnabled ?? true;
      renderHostnames(prodHostnamesContainer, data.prodHostnames);
      renderHostnames(stgHostnamesContainer, data.stgHostnames);
      renderHostnames(devHostnamesContainer, data.devHostnames);
    }
  );
};

const saveSettings = () => {
  const allInputs = [
    ...Array.from(prodHostnamesContainer.querySelectorAll(".hostname-input")),
    ...Array.from(stgHostnamesContainer.querySelectorAll(".hostname-input")),
    ...Array.from(devHostnamesContainer.querySelectorAll(".hostname-input")),
  ] as HTMLInputElement[];

  // Clear previous validation states
  allInputs.forEach((input) => input.classList.remove("is-invalid"));
  statusSpan.textContent = "";

  let hasInvalid = false;
  const processedValues = new Map<HTMLInputElement, string>();

  allInputs.forEach((input) => {
    const rawValue = input.value.trim();
    if (rawValue === "") return;

    const hostname = getHostname(rawValue);
    if (!hostname) {
      input.classList.add("is-invalid");
      hasInvalid = true;
    } else {
      input.value = hostname; // Update UI with extracted hostname
      processedValues.set(input, hostname);
    }
  });

  if (hasInvalid) {
    statusSpan.textContent = "Error: Invalid URL or hostname found.";
    statusSpan.style.color = "red";
    return;
  }

  // Check for duplicates
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
    statusSpan.textContent = "Error: Duplicate hostnames found.";
    statusSpan.style.color = "red";
    return;
  }

  const prodHostnames = getHostnamesFromContainer(prodHostnamesContainer);
  const stgHostnames = getHostnamesFromContainer(stgHostnamesContainer);
  const devHostnames = getHostnamesFromContainer(devHostnamesContainer);

  chrome.storage.sync.set(
    {
      faviconEnabled: faviconEnabledCheckbox.checked,
      prodHostnames,
      stgHostnames,
      devHostnames,
    },
    () => {
      statusSpan.textContent = "Sync settings saved.";
      statusSpan.style.color = "";
      setTimeout(() => {
        statusSpan.textContent = "";
      }, 2000);
    }
  );
};

addProdHostnameBtn.addEventListener("click", () => {
  prodHostnamesContainer.appendChild(createHostnameInput());
  updateRemoveButtons(prodHostnamesContainer);
});
addStgHostnameBtn.addEventListener("click", () => {
  stgHostnamesContainer.appendChild(createHostnameInput());
  updateRemoveButtons(stgHostnamesContainer);
});
addDevHostnameBtn.addEventListener("click", () => {
  devHostnamesContainer.appendChild(createHostnameInput());
  updateRemoveButtons(devHostnamesContainer);
});

document.addEventListener("DOMContentLoaded", loadSettings);
saveButton.addEventListener("click", saveSettings);
