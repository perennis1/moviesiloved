const fs = require('fs');
const path = require('path');

const directoryToScan = path.join(__dirname, 'app');
const componentsDir = path.join(__dirname, 'components');
const rootDir = __dirname;

const colorMap = {
  '#111118': '#0a0a0a',
  '#0B0F19': '#0a0a0a',
  '#151521': '#111111',
  '#1a1a28': '#161616',
  '#1e1e2d': '#1a1a1a',
  '#2b2b40': '#222222',
  '#0d0d14': '#050505',
};

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css') || fullPath.endsWith('.tailwind.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [oldColor, newColor] of Object.entries(colorMap)) {
        const regex = new RegExp(oldColor, 'gi');
        if (regex.test(content)) {
          content = content.replace(regex, newColor);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', fullPath);
      }
    }
  }
}

processDirectory(directoryToScan);
processDirectory(componentsDir);
console.log('Done!');
