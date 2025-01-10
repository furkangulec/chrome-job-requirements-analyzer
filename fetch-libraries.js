const fs = require('fs');
const https = require('https');
const path = require('path');

const libraries = {
  'pdf.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.7.107/pdf.min.js',
  'pdf.worker.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.7.107/pdf.worker.min.js'
};

// lib klasörünü oluştur
const libDir = path.join(__dirname, 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir);
}

// Önceki dosyaları temizle
fs.readdirSync(libDir).forEach(file => {
  fs.unlinkSync(path.join(libDir, file));
  console.log(`Silindi: ${file}`);
});

// Her bir kütüphaneyi indir
Object.entries(libraries).forEach(([filename, url]) => {
  const filePath = path.join(libDir, filename);
  const file = fs.createWriteStream(filePath);

  https.get(url, response => {
    if (response.statusCode !== 200) {
      console.error(`Hata: ${filename} için ${response.statusCode} yanıtı alındı`);
      file.close();
      fs.unlinkSync(filePath);
      return;
    }

    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`İndirildi: ${filename}`);
    });
  }).on('error', err => {
    fs.unlink(filePath);
    console.error(`Hata: ${filename} indirilemedi - ${err.message}`);
  });
}); 