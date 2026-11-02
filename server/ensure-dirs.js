const fs = require('fs');
const path = require('path');
module.exports = function ensureDirs(root) {
  for (const rel of ['server/uploads', 'server/converted', 'uploads', 'converted']) {
    const p = path.join(root, rel);
    try {
      if (fs.existsSync(p) && !fs.statSync(p).isDirectory()) fs.unlinkSync(p);
      fs.mkdirSync(p, { recursive: true });
    } catch (e) {
      console.warn('mkdir', p, e.message);
    }
  }
};
