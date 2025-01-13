async function analyzeCVWithJobDescription(cvText, jobDescription, apiKey) {
  console.log('API çağrısı başlıyor');
  try {
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
            content: "Sen bir İK uzmanısın. CV ile iş ilanı arasındaki uyumu analiz edeceksin. Eğer gönderilen iş ilanı yazısı bir iş ilanı değilse veya gönderilen cv bir cv değilse bunu belirt."
          },
          {
            role: "user",
            content: `CV içeriği: ${cvText}\n\n İş ilanı: ${jobDescription}\n\nBu CV'nin iş ilanı ile uyumunu analiz et. Eksik yetkinlikleri ve güçlü yanları listele. Daha sonra uyumluluk oranının % olarak ver. Eğer sana gönderilen iş ilanı yazısı bir iş ilanı değilse veya gönderilen cv bir cv değilse bunu belirt. `
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API yanıt hatası:', response.status, errorText);
      throw new Error(`API yanıt hatası: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Geçersiz API yanıtı:', data);
      throw new Error('API yanıtı geçersiz format');
    }

    console.log('API çağrısı başarılı');
    return data.choices[0].message.content;
  } catch (error) {
    console.error('API çağrısı hatası:', error);
    throw error;
  }
}

async function processQueue() {
  console.log('ProcessQueue başladı');
  const storage = await chrome.storage.local.get(['jobQueue', 'cvFile', 'openaiApiKey']);
  const { jobQueue, cvFile, openaiApiKey } = storage;

  console.log('Storage durumu:', {
    hasJobQueue: !!jobQueue,
    hasCvFile: !!cvFile,
    hasApiKey: !!openaiApiKey
  });

  if (!jobQueue || jobQueue.length === 0) {
    console.log('İş kuyruğu boş');
    return;
  }
  if (!cvFile) {
    console.log('CV dosyası yok');
    return;
  }
  if (!openaiApiKey) {
    console.log('API anahtarı yok');
    return;
  }

  const updatedQueue = [...jobQueue];
  
  for (let i = 0; i < updatedQueue.length; i++) {
    const job = updatedQueue[i];
    console.log('İşlenen iş:', { id: job.id, status: job.status });

    if (job.status === "Kuyruğa Eklendi") {
      try {
        // CV içeriğini kontrol et
        if (!cvFile.content || cvFile.content === "CV içeriği okunamadı") {
          console.log('CV içeriği okunamadı');
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
        console.log('Durum güncellendi: İnceleniyor...');
        await chrome.storage.local.set({ jobQueue: updatedQueue });

        // Sonra analizi yap
        console.log('Analiz başlıyor');
        const analysis = await analyzeCVWithJobDescription(
          cvFile.content,
          job.text,
          openaiApiKey
        );
        console.log('Analiz tamamlandı');

        updatedQueue[i] = {
          ...job,
          status: "Tamamlandı",
          analysis: analysis
        };
        console.log('İş tamamlandı');
      } catch (error) {
        console.error('Hata oluştu:', error);
        updatedQueue[i] = {
          ...job,
          status: "Hata: " + error.message
        };
      }
    }
  }

  console.log('Kuyruk güncelleniyor');
  await chrome.storage.local.set({ jobQueue: updatedQueue });
  console.log('ProcessQueue tamamlandı');
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