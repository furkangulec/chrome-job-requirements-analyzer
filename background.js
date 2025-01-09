chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "helloWorld",
    title: "Say Hello World",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "helloWorld") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        alert("Hello World!");
      }
    });
  }
}); 