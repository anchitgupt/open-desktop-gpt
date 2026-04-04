const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Fix <button> by adding type="button" if not present
    // We match <button followed by space or newline, not containing type= before >
    content = content.replace(/<button(?![^>]*?type=)([^>]*?)>/g, '<button type="button"$1>');

    // Fix <svg> by adding role="img" aria-label="icon" if not present
    // We match <svg followed by space or newline, not containing role="img" or aria-label or aria-hidden before >
    content = content.replace(/<svg(?![^>]*?(role=|aria-label=|aria-hidden=|title=))([^>]*?)>/g, '<svg role="img" aria-label="icon"$1>');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Fixed:', filePath);
    }
  }
});
