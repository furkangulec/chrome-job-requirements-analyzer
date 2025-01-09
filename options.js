document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');

  // Mevcut API anahtarını yükle
  chrome.storage.local.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
  });

  // API anahtarını kaydet
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('API anahtarı boş olamaz!', false);
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      showStatus('Geçersiz API anahtarı formatı!', false);
      return;
    }

    chrome.storage.local.set({ openaiApiKey: apiKey }, function() {
      showStatus('API anahtarı başarıyla kaydedildi!', true);
    });
  });

  function showStatus(message, success) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + (success ? 'success' : 'error');
    statusDiv.style.display = 'block';
    
    setTimeout(function() {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}); 