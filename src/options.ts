import { SyncData } from "./types";

const faviconEnabledCheckbox = document.getElementById(
  "faviconEnabled"
) as HTMLInputElement;
const prodHostnameInput = document.getElementById(
  "prodHostname"
) as HTMLInputElement;
const stgHostnameInput = document.getElementById(
  "stgHostname"
) as HTMLInputElement;
const devHostnameInput = document.getElementById(
  "devHostname"
) as HTMLInputElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const statusSpan = document.getElementById("status") as HTMLSpanElement;

const loadSettings = () => {
  chrome.storage.sync.get(
    ["faviconEnabled", "prodHostname", "stgHostname", "devHostname"],
    (data: SyncData) => {
      faviconEnabledCheckbox.checked = data.faviconEnabled ?? true;
      prodHostnameInput.value = data.prodHostname ?? "";
      stgHostnameInput.value = data.stgHostname ?? "";
      devHostnameInput.value = data.devHostname ?? "";
    }
  );
};

const saveSettings = () => {
  chrome.storage.sync.set(
    {
      faviconEnabled: faviconEnabledCheckbox.checked,
      prodHostname: prodHostnameInput.value,
      stgHostname: stgHostnameInput.value,
      devHostname: devHostnameInput.value,
    },
    () => {
      statusSpan.textContent = "Sync settings saved.";
      setTimeout(() => {
        statusSpan.textContent = "";
      }, 2000);
    }
  );
};

document.addEventListener("DOMContentLoaded", loadSettings);
saveButton.addEventListener("click", saveSettings);
