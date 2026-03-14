let _prodHostname: string | undefined;
let _stgHostname: string | undefined;
let _devHostname: string | undefined;

const getFavicon = (): HTMLLinkElement | null => {
  return (
    document.querySelector<HTMLLinkElement>("link[rel='icon']") ||
    document.querySelector<HTMLLinkElement>("link[rel='shortcut icon']")
  );
};

const updateFavicon = () => {
  const favicon = getFavicon();
  if (!favicon) {
    console.log("Favicon not found.");
    return;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const img = new Image();
  img.crossOrigin = "Anonymous";

  img.onload = () => {
    const size = img.width; // Assume square
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    let text: string, color: string;
    if (_prodHostname && window.location.hostname === _prodHostname) {
      text = "prod";
      color = "#FF0000"; // Red
    } else if (_stgHostname && window.location.hostname === _stgHostname) {
      text = "stg";
      color = "#0000FF"; // Blue
    } else if (_devHostname && window.location.hostname === _devHostname) {
      text = "dev";
      color = "#008000"; // Green
    } else {
      return;
    }

    // Text styling
    const fontSize = Math.max(Math.round(size / 2.5), 6); // Dynamic font size
    ctx.font = `bold ${fontSize}px "Arial"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    // Add a background for the text
    const textMetrics = ctx.measureText(text);
    const textHeight = fontSize; // Approximation
    const padding = 2;
    const rectHeight = textHeight + padding;
    const rectY = size - rectHeight;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillRect(0, rectY, size, rectHeight);

    // Draw text
    ctx.fillStyle = color;
    ctx.fillText(text, size / 2, size);

    // Replace favicon
    favicon.href = canvas.toDataURL("image/png");
  };

  img.onerror = (e) => {
    console.error("Error loading favicon image:", e);
  };

  fetch(favicon.href, { cache: "no-cache" })
    .then((response) => response.blob())
    .then((blob) => {
      img.src = URL.createObjectURL(blob);
    })
    .catch((e) => {
      console.error("Fetching favicon failed:", e);
      img.src = favicon.href;
    });
};

const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      const faviconNode = Array.from(mutation.addedNodes).find(
        (node) =>
          node instanceof HTMLLinkElement &&
          (node.rel === "icon" || node.rel === "shortcut icon")
      );
      if (faviconNode) {
        updateFavicon();
        return;
      }
    }
  }
});

export const initializeFaviconChangerFeature = (
  prodHostname?: string,
  stgHostname?: string,
  devHostname?: string
) => {
  _prodHostname = prodHostname;
  _stgHostname = stgHostname;
  _devHostname = devHostname;

  // Handle cases where the favicon already exists at script injection time
  if (getFavicon()) {
    window.addEventListener("load", updateFavicon);
    updateFavicon();
  }

  // Observe the head for dynamically added favicons
  const head = document.querySelector("head");
  if (head) {
    observer.observe(head, {
      childList: true,
      subtree: true,
    });
  }
};
