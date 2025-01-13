async function analyzeCVWithJobDescription(cvText, jobDescription, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Sen bir İK uzmanısın. CV ile iş ilanı arasındaki uyumu analiz edeceksin."
        },
        {
          role: "user",
          content: `CV içeriği: ${cvText}\n\nİş ilanı: ${jobDescription}\n\nBu CV'nin iş ilanı ile uyumunu analiz et. Eksik yetkinlikleri ve güçlü yanları listele. Daha sonra uyumluluk oranının % olarak ver.`
        }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

async function processQueue() {
  const storage = await chrome.storage.local.get(['jobQueue', 'cvFile', 'openaiApiKey']);
  const { jobQueue, cvFile, openaiApiKey } = storage;

  if (!jobQueue || jobQueue.length === 0) return;
  if (!cvFile) return;
  if (!openaiApiKey) return;

  const updatedQueue = [...jobQueue];
  
  for (let i = 0; i < updatedQueue.length; i++) {
    const job = updatedQueue[i];
    if (job.status === "Kuyruğa Eklendi") {
      try {
        // CV içeriğini kontrol et
        if (!cvFile.content || cvFile.content === "CV içeriği okunamadı") {
          updatedQueue[i] = {
            ...job,
            status: "Hata: CV içeriği okunamadı. Lütfen CV'yi yeniden yükleyin."
          };
          continue;
        }

        // Önce durumu güncelle
        updatedQueue[i] = {
          ...job,
          status: "İnceleniyor..."
        };
        await chrome.storage.local.set({ jobQueue: updatedQueue });

        // Sonra analizi yap
        const analysis = await analyzeCVWithJobDescription(
          cvFile.content,
          job.text,
          openaiApiKey
        );

        updatedQueue[i] = {
          ...job,
          status: "Tamamlandı",
          analysis: analysis
        };
      } catch (error) {
        updatedQueue[i] = {
          ...job,
          status: "Hata: " + error.message
        };
      }
    }
  }

  await chrome.storage.local.set({ jobQueue: updatedQueue });
}

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

  // Her 5 saniyede bir kuyruğu kontrol et
  setInterval(processQueue, 5000);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "compareCV") {
    const jobData = {
      id: Date.now(),
      text: info.selectionText,
      url: tab.url,
      siteName: new URL(tab.url).hostname,
      status: "Kuyruğa Eklendi",
      timestamp: new Date().toLocaleString()
    };

    chrome.storage.local.get(['jobQueue'], function(result) {
      const queue = result.jobQueue || [];
      queue.push(jobData);
      chrome.storage.local.set({ jobQueue: queue });
    });
  }
}); 