document.addEventListener('DOMContentLoaded', function() {
  const selectFileButton = document.getElementById('selectFile');
  const fileInput = document.getElementById('cvFile');
  const fileInfo = document.getElementById('fileInfo');
  const fileName = document.getElementById('fileName');
  const queueItems = document.getElementById('queueItems');

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
          <h4 class="site-name">${job.siteName}</h4>
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
          `;
        }

        content += `</div>`;

        // Kaydetme seçenekleri
        content += `
          <div class="save-options" id="saveOptions-${job.id}">
            <button class="button button-small" data-action="saveAs" data-format="xlsx" data-id="${job.id}">Excel (.xlsx)</button>
            <button class="button button-small" data-action="saveAs" data-format="doc" data-id="${job.id}">Word (.doc)</button>
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

      let content = '';
      let mimeType = '';
      let extension = '';

      // Format içeriğini hazırla
      switch (format) {
        case 'xlsx':
          content = `Site: ${job.siteName}\nURL: ${job.url}\n\nİş İlanı:\n${job.text}\n\nAnaliz:\n${job.analysis}`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extension = 'xlsx';
          break;
        case 'doc':
          content = `Site: ${job.siteName}\nURL: ${job.url}\n\nİş İlanı:\n${job.text}\n\nAnaliz:\n${job.analysis}`;
          mimeType = 'application/msword';
          extension = 'doc';
          break;
        case 'txt':
          content = `Site: ${job.siteName}\nURL: ${job.url}\n\nİş İlanı:\n${job.text}\n\nAnaliz:\n${job.analysis}`;
          mimeType = 'text/plain';
          extension = 'txt';
          break;
      }

      // Dosyayı indir
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analiz_${job.id}.${extension}`;
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
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const fileData = {
          name: file.name,
          content: e.target.result,
          lastModified: file.lastModified
        };
        
        chrome.storage.local.set({ cvFile: fileData }, function() {
          showFileInfo(fileData);
        });
      };
      reader.readAsText(file);
    }
  });

  function showFileInfo(fileData) {
    fileName.textContent = `Dosya Adı: ${fileData.name}`;
    fileInfo.style.display = 'block';
  }
}); 