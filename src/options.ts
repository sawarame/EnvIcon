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
  removeBtn.onclick = () => div.remove();
  
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
  chrome.storage.sync.set(
    {
      faviconEnabled: faviconEnabledCheckbox.checked,
      prodHostnames: getHostnamesFromContainer(prodHostnamesContainer),
      stgHostnames: getHostnamesFromContainer(stgHostnamesContainer),
      devHostnames: getHostnamesFromContainer(devHostnamesContainer),
    },
    () => {
      statusSpan.textContent = "Sync settings saved.";
      setTimeout(() => {
        statusSpan.textContent = "";
      }, 2000);
    }
  );
};

addProdHostnameBtn.addEventListener("click", () => {
  prodHostnamesContainer.appendChild(createHostnameInput());
});
addStgHostnameBtn.addEventListener("click", () => {
  stgHostnamesContainer.appendChild(createHostnameInput());
});
addDevHostnameBtn.addEventListener("click", () => {
  devHostnamesContainer.appendChild(createHostnameInput());
});

document.addEventListener("DOMContentLoaded", loadSettings);
saveButton.addEventListener("click", saveSettings);
