document.addEventListener('DOMContentLoaded', function() {
  const selectFileButton = document.getElementById('selectFile');
  const fileInput = document.getElementById('cvFile');
  const fileInfo = document.getElementById('fileInfo');
  const fileName = document.getElementById('fileName');
  const queueItems = document.getElementById('queueItems');
  const favoriteItems = document.getElementById('favoriteItems');
  const notificationContainer = document.getElementById('notificationContainer');
  const warningMessage = document.getElementById('warningMessage');

  // Uyarı mesajını göster
  function showWarning(message) {
    warningMessage.textContent = message;
    warningMessage.classList.add('show');
  }

  // Uyarı mesajını gizle
  function hideWarning() {
    warningMessage.textContent = '';
    warningMessage.classList.remove('show');
  }

  // Durum kontrolü
  function checkStatus() {
    chrome.storage.local.get(['cvFile', 'openaiApiKey'], function(result) {
      hideWarning();
      
      let warnings = [];
      if (!result.openaiApiKey) {
        warnings.push('API anahtarı girilmeli');
      }
      if (!result.cvFile) {
        warnings.push('CV dosyası eklenmeli');
      } else if (!result.cvFile.content || result.cvFile.content === "CV içeriği okunamadı") {
        warnings.push('CV dosyası yeniden yüklenmeli');
      }

      if (warnings.length > 0) {
        showWarning(warnings.join(' • '));
      }
    });
  }

  // Sayfa yüklendiğinde ve storage değiştiğinde durumu kontrol et
  checkStatus();
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && (changes.cvFile || changes.openaiApiKey)) {
      checkStatus();
    }
  });

  // Bildirim göster
  function showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notificationContainer.appendChild(notification);

    // Belirli bir süre sonra bildirimi kaldır
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.5s ease-out forwards';
      setTimeout(() => {
        notificationContainer.removeChild(notification);
      }, 500);
    }, duration);
  }

  // Tab değiştirme
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Aktif tab'ı değiştir
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Tab içeriğini göster/gizle
      const tabName = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(tabName + 'Tab').classList.add('active');

      // Eğer favoriler tab'ı seçildiyse, favorileri güncelle
      if (tabName === 'favorites') {
        updateFavorites();
      }
    });
  });

  // Favorileri güncelle
  function updateFavorites() {
    chrome.storage.local.get(['favorites'], function(result) {
      const favorites = result.favorites || [];
      favoriteItems.innerHTML = '';

      if (favorites.length === 0) {
        favoriteItems.innerHTML = '<p>Henüz favori ilan yok.</p>';
        return;
      }

      favorites.reverse().forEach(job => {
        const jobElement = document.createElement('div');
        jobElement.className = 'queue-item';
        let content = `
          <h4 class="site-name">
            <a href="${job.url}" target="_blank" style="color: inherit; text-decoration: none; cursor: pointer;">
              ${job.siteName}
            </a>
          </h4>
          <p>${job.text.substring(0, 150)}${job.text.length > 150 ? '...' : ''}</p>
          <p class="timestamp">${job.timestamp}</p>
        `;

        if (job.analysis) {
          content += `
            <div class="analysis">
              <h4>Analiz Sonucu:</h4>
              <p>${job.analysis}</p>
            </div>
          `;
        }

        content += `
          <div class="button-container">
            <button class="button button-small button-red" data-action="removeFavorite" data-id="${job.id}">Favorilerden Kaldır</button>
            <button class="button button-small button-blue" data-action="save" data-id="${job.id}">Analizi Kaydet</button>
          </div>
          <div class="save-options" id="saveOptions-${job.id}">
            <button class="button button-small" data-action="saveAs" data-format="txt" data-id="${job.id}">Metin (.txt)</button>
          </div>
        `;

        jobElement.innerHTML = content;
        favoriteItems.appendChild(jobElement);
      });

      addFavoriteItemListeners();
    });
  }

  // Favori item'ları için event listener'lar
  function addFavoriteItemListeners() {
    document.querySelectorAll('[data-action="removeFavorite"]').forEach(button => {
      button.addEventListener('click', function() {
        const jobId = parseInt(this.getAttribute('data-id'));
        removeFromFavorites(jobId);
      });
    });

    // Kaydetme butonları için listener'ları ekle
    document.querySelectorAll('[data-action="save"]').forEach(button => {
      button.addEventListener('click', function() {
        const jobId = this.getAttribute('data-id');
        const saveOptions = document.getElementById(`saveOptions-${jobId}`);
        saveOptions.style.display = saveOptions.style.display === 'none' ? 'block' : 'none';
      });
    });

    document.querySelectorAll('[data-action="saveAs"]').forEach(button => {
      button.addEventListener('click', function() {
        const jobId = parseInt(this.getAttribute('data-id'));
        const format = this.getAttribute('data-format');
        saveAnalysis(jobId, format);
      });
    });
  }

  // Favorilerden kaldır
  function removeFromFavorites(jobId) {
    chrome.storage.local.get(['favorites'], function(result) {
      const favorites = result.favorites || [];
      const updatedFavorites = favorites.filter(job => job.id !== jobId);
      chrome.storage.local.set({ favorites: updatedFavorites }, function() {
        updateFavorites();
      });
    });
  }

  // Kuyruk bilgisini göster
  function updateQueue() {
    chrome.storage.local.get(['jobQueue'], function(result) {
      const queue = result.jobQueue || [];
      queueItems.innerHTML = '';
      
      if (queue.length === 0) {
        queueItems.innerHTML = '<p>Henüz inceleme kuyruğunda öğe yok.</p>';
        return;
      }

      queue.reverse().forEach(job => {
        const jobElement = document.createElement('div');
        jobElement.className = 'queue-item';
        let content = `
          <h4 class="site-name">
            <a href="${job.url}" target="_blank" style="color: inherit; text-decoration: none; cursor: pointer;">
              ${job.siteName}
            </a>
          </h4>
          <p>${job.text.substring(0, 150)}${job.text.length > 150 ? '...' : ''}</p>
          <p class="status">${job.status}</p>
          <p class="timestamp">${job.timestamp}</p>
        `;

        if (job.analysis) {
          content += `
            <div class="analysis">
              <h4>Analiz Sonucu:</h4>
              <p>${job.analysis}</p>
            </div>
          `;
        }

        content += `
          <div class="button-container">
            <button class="button button-small button-red" data-action="remove" data-id="${job.id}">Kaldır</button>
        `;

        if (job.status === "Tamamlandı") {
          content += `
            <button class="button button-small button-blue" data-action="save" data-id="${job.id}">Analizi Kaydet</button>
            <button class="button button-small button-yellow" data-action="favorite" data-id="${job.id}">Favorilere Ekle</button>
          `;
        }

        content += `</div>`;

        content += `
          <div class="save-options" id="saveOptions-${job.id}">
            <button class="button button-small" data-action="saveAs" data-format="txt" data-id="${job.id}">Metin (.txt)</button>
          </div>
        `;

        jobElement.innerHTML = content;
        queueItems.appendChild(jobElement);
      });

      addQueueItemListeners();
    });
  }

  function addQueueItemListeners() {
    // Kaldır butonu için listener
    document.querySelectorAll('[data-action="remove"]').forEach(button => {
      button.addEventListener('click', function() {
        const jobId = parseInt(this.getAttribute('data-id'));
        removeFromQueue(jobId);
      });
    });

    // Kaydet butonu için listener
    document.querySelectorAll('[data-action="save"]').forEach(button => {
      button.addEventListener('click', function() {
        const jobId = this.getAttribute('data-id');
        const saveOptions = document.getElementById(`saveOptions-${jobId}`);
        saveOptions.style.display = saveOptions.style.display === 'none' ? 'block' : 'none';
      });
    });

    // Format seçimi için listener
    document.querySelectorAll('[data-action="saveAs"]').forEach(button => {
      button.addEventListener('click', function() {
        const jobId = parseInt(this.getAttribute('data-id'));
        const format = this.getAttribute('data-format');
        saveAnalysis(jobId, format);
      });
    });

    // Favori butonu için listener
    document.querySelectorAll('[data-action="favorite"]').forEach(button => {
      button.addEventListener('click', function() {
        const jobId = parseInt(this.getAttribute('data-id'));
        addToFavorites(jobId);
      });
    });
  }

  // Favorilere ekle
  function addToFavorites(jobId) {
    chrome.storage.local.get(['jobQueue', 'favorites'], function(result) {
      const queue = result.jobQueue || [];
      const favorites = result.favorites || [];
      
      const job = queue.find(j => j.id === jobId);
      if (!job) return;

      // Eğer zaten favorilerde değilse ekle
      if (!favorites.some(f => f.id === jobId)) {
        favorites.push(job);
        chrome.storage.local.set({ favorites: favorites }, function() {
          showNotification('İlan favorilere eklendi!');
          // Favoriler sekmesine geç
          document.querySelector('.tab[data-tab="favorites"]').click();
        });
      } else {
        showNotification('Bu ilan zaten favorilerinizde!');
      }
    });
  }

  // CV dosyası bilgisini göster
  chrome.storage.local.get(['cvFile'], function(result) {
    if (result.cvFile) {
      showFileInfo(result.cvFile);
    }
  });

  // Kuyruk bilgisini göster
  function updateQueue() {
    chrome.storage.local.get(['jobQueue'], function(result) {
      const queue = result.jobQueue || [];
      queueItems.innerHTML = ''; // Mevcut listeyi temizle
      
      if (queue.length === 0) {
        queueItems.innerHTML = '<p>Henüz inceleme kuyruğunda öğe yok.</p>';
        return;
      }

      // Kuyruktaki öğeleri tersten göster (en yeni en üstte)
      queue.reverse().forEach(job => {
        const jobElement = document.createElement('div');
        jobElement.className = 'queue-item';
        let content = `
          <h4 class="site-name">
            <a href="${job.url}" target="_blank" style="color: inherit; text-decoration: none; cursor: pointer;">
              ${job.siteName}
            </a>
          </h4>
          <p>${job.text.substring(0, 150)}${job.text.length > 150 ? '...' : ''}</p>
          <p class="status">${job.status}</p>
          <p class="timestamp">${job.timestamp}</p>
        `;

        // Eğer analiz sonucu varsa göster
        if (job.analysis) {
          content += `
            <div class="analysis">
              <h4>Analiz Sonucu:</h4>
              <p>${job.analysis}</p>
            </div>
          `;
        }

        // Butonları ekle
        content += `
          <div class="button-container">
            <button class="button button-small button-red" data-action="remove" data-id="${job.id}">Kaldır</button>
        `;

        // Eğer analiz tamamlandıysa kaydet butonu göster
        if (job.status === "Tamamlandı") {
          content += `
            <button class="button button-small button-blue" data-action="save" data-id="${job.id}">Analizi Kaydet</button>
            <button class="button button-small button-yellow" data-action="favorite" data-id="${job.id}">Favorilere Ekle</button>
          `;
        }

        content += `</div>`;

        // Kaydetme seçenekleri
        content += `
          <div class="save-options" id="saveOptions-${job.id}">
            <button class="button button-small" data-action="saveAs" data-format="txt" data-id="${job.id}">Metin (.txt)</button>
          </div>
        `;

        jobElement.innerHTML = content;
        queueItems.appendChild(jobElement);
      });

      // Event listener'ları ekle
      addQueueItemListeners();
    });
  }

  function removeFromQueue(jobId) {
    chrome.storage.local.get(['jobQueue'], function(result) {
      const queue = result.jobQueue || [];
      const updatedQueue = queue.filter(job => job.id !== jobId);
      chrome.storage.local.set({ jobQueue: updatedQueue }, function() {
        updateQueue();
      });
    });
  }

  function saveAnalysis(jobId, format) {
    chrome.storage.local.get(['jobQueue'], function(result) {
      const queue = result.jobQueue || [];
      const job = queue.find(j => j.id === jobId);
      
      if (!job) return;

      const content = `Site: ${job.siteName}\nURL: ${job.url}\n\nİş İlanı:\n${job.text}\n\nAnaliz:\n${job.analysis}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analiz_${job.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Sayfa yüklendiğinde ve storage değiştiğinde kuyruğu güncelle
  updateQueue();
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.jobQueue) {
      updateQueue();
    }
  });

  // CV dosyası seçme butonu
  selectFileButton.addEventListener('click', function() {
    fileInput.click();
  });

  // Dosya seçildiğinde
  fileInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      let fileContent;
      if (file.type === 'application/pdf') {
        // API'ye PDF'i gönder
        const formData = new FormData();
        formData.append("Target", "txt");
        formData.append("File", file);

        const response = await fetch('https://api.pdfconverted.com/api/convert/file', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw await response.text();
        }

        const result = await response.json();
        
        // İndirme URL'ini al
        const downloadUrl = 'https://api.pdfconverted.com/' + (result.downloadUrl.startsWith('/') ? result.downloadUrl.substr(1) : result.downloadUrl);
        
        // Text dosyasını indir
        const textResponse = await fetch(downloadUrl);
        if (!textResponse.ok) {
          throw new Error('Text dosyası indirilemedi');
        }
        
        fileContent = await textResponse.text();
      } else {
        // Text dosyasını normal oku
        fileContent = await file.text();
      }

      const fileData = {
        name: file.name,
        content: fileContent,
        lastModified: file.lastModified
      };
      
      chrome.storage.local.set({ cvFile: fileData }, function() {
        showFileInfo(fileData);
      });
    } catch (error) {
      console.error('Dosya okuma hatası:', error);
      alert('Dosya okunamadı: ' + error.message);
    }
  });

  function showFileInfo(fileData) {
    fileName.textContent = `Dosya Adı: ${fileData.name}`;
    fileInfo.style.display = 'block';
  }
}); 