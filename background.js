chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "compareCV",
    title: "CV ile Karşılaştır",
    contexts: ["selection"]
  });

  chrome.storage.local.get(['jobQueue'], function(result) {
    if (!result.jobQueue) {
      chrome.storage.local.set({ jobQueue: [] });
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "compareCV") {
    const jobData = {
      id: Date.now(),
      text: info.selectionText,
      url: tab.url,
      siteName: new URL(tab.url).hostname,
      status: "İnceleniyor...",
      timestamp: new Date().toLocaleString()
    };

    chrome.storage.local.get(['jobQueue'], function(result) {
      const queue = result.jobQueue || [];
      queue.push(jobData);
      chrome.storage.local.set({ jobQueue: queue });
    });
  }
}); 