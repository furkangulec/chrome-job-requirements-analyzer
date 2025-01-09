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
        jobElement.innerHTML = `
          <h4 class="site-name">${job.siteName}</h4>
          <p>${job.text.substring(0, 150)}${job.text.length > 150 ? '...' : ''}</p>
          <p class="status">${job.status}</p>
          <p class="timestamp">${job.timestamp}</p>
        `;
        queueItems.appendChild(jobElement);
      });
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
      const fileData = {
        name: file.name,
        lastModified: file.lastModified
      };
      
      chrome.storage.local.set({ cvFile: fileData }, function() {
        showFileInfo(fileData);
      });
    }
  });

  function showFileInfo(fileData) {
    fileName.textContent = `Dosya Adı: ${fileData.name}`;
    fileInfo.style.display = 'block';
  }
}); 