const fs = require('fs');
let code = fs.readFileSync('src/components/MatchesClient.tsx', 'utf8');

// Remove TimeConverter function
const startIndex = code.indexOf('/* ══════════ TIME CONVERTER ══════════ */');
if (startIndex !== -1) {
  const endIndex = code.indexOf('export default function MatchesClient');
  if (endIndex !== -1 && endIndex > startIndex) {
    code = code.substring(0, startIndex) + code.substring(endIndex);
  }
}

// Remove tab
const tabStr = "{ key: 'converter', label: '⏰ Time Converter', activeClass: 'active-emerald' },";
code = code.replace(tabStr, '');

// Remove rendering
const renderStr1 = "{activeSection === 'converter' && (\n          <TimeConverter />\n        )}";
const renderStr2 = "{activeSection === 'converter' && (\r\n          <TimeConverter />\r\n        )}";
code = code.replace(renderStr1, '').replace(renderStr2, '');

// Revert useState
code = code.replace("useState<'matches' | 'scorers' | 'squad' | 'converter'>('matches')", "useState<'matches' | 'scorers' | 'squad'>('matches')");

// Clean up extra blank lines
code = code.replace(/\n\s*\n\s*\n/g, '\n\n');

fs.writeFileSync('src/components/MatchesClient.tsx', code);
console.log('TimeConverter deleted');
