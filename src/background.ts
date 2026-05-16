// background.ts - Service Worker

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "options.html" });
  }
});

// アイコンをクリックしたらオプション画面を開く
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "options.html" });
});

// Content Scriptからのリクエストを中継してCORSを回避する
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_IMAGE") {
    fetch(message.url)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ dataUrl: reader.result });
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error("Proxy fetch failed:", error);
        sendResponse({ error: error.message });
      });
    return true; // 非同期応答を許可
  } else if (message.type === "GET_TAB_INFO") {
    sendResponse({
      favIconUrl: sender.tab?.favIconUrl,
      url: sender.tab?.url
    });
    return false;
  }
});
