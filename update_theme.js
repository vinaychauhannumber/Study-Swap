const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

const replacements = [
  // Backgrounds
  { regex: /bg-\[#212A31\]/g, replacement: 'bg-[#FFFAF3]' },
  { regex: /bg-\[#1A1714\]/g, replacement: 'bg-[#FFFAF3]' },
  { regex: /bg-\[#2E3944\]/g, replacement: 'bg-[#FFF2DB]' },
  { regex: /bg-\[#124E66\]/g, replacement: 'bg-[#3E362E]' },
  { regex: /hover:bg-\[#124E66\]/g, replacement: 'hover:bg-[#1A1714]' },
  { regex: /bg-rose-950/g, replacement: 'bg-rose-100' },
  { regex: /hover:bg-rose-950/g, replacement: 'hover:bg-rose-200' },
  { regex: /bg-blue-950/g, replacement: 'bg-blue-100' },

  // Borders
  { regex: /border-\[#2E3944\]/g, replacement: 'border-[#FFE5BF]' },
  { regex: /border-\[#212A31\]/g, replacement: 'border-[#FFE5BF]' },
  { regex: /border-\[#124E66\]/g, replacement: 'border-[#3E362E]' },
  { regex: /border-rose-900/g, replacement: 'border-rose-300' },
  { regex: /border-blue-800/g, replacement: 'border-blue-300' },

  // Text colors
  { regex: /text-white/g, replacement: 'text-[#3E362E]' },
  { regex: /text-\[#D3D9D4\]/g, replacement: 'text-[#3E362E]' },
  { regex: /text-\[#748D92\]/g, replacement: 'text-[#A69080]' },
  { regex: /text-\[#124E66\]/g, replacement: 'text-[#3E362E]' },
  { regex: /text-rose-300/g, replacement: 'text-rose-600' },
  { regex: /text-blue-300/g, replacement: 'text-blue-600' },
  { regex: /hover:text-white/g, replacement: 'hover:text-[#1A1714]' },
  { regex: /hover:text-\[#D3D9D4\]/g, replacement: 'hover:text-[#1A1714]' },

  // Shadows
  { regex: /shadow-\[#212A31\]/g, replacement: 'shadow-[#FFE5BF]' },
  { regex: /shadow-\[#124E66\]/g, replacement: 'shadow-[#3E362E]' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('JSX files updated successfully.');
