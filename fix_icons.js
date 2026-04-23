const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

content = content.replace(/const icons = \{ success:'\?', error:'\?', info:'\?\?', warn:'\?\?' \};/g, "const icons = { success:'✅', error:'❌', info:'ℹ️', warn:'⚠️' };");

fs.writeFileSync('app.js', content, 'utf8');
console.log('Fixed icons in app.js');
