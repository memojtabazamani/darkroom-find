const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version || '1.0.0';

const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const zipName = `darkroom-find-v${version}.zip`;
const zipPath = path.join(distDir, zipName);

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

const includeItems = ['manifest.json', 'src', 'icons', 'fonts', 'LICENSE', 'THIRD-PARTY-NOTICES.md']
  .filter(item => fs.existsSync(path.join(rootDir, item)));

console.log(`Packaging Darkroom Find v${version}...`);

if (process.platform === 'win32') {
  const itemsList = includeItems.map(item => `'${item}'`).join(', ');
  const psCmd = `Compress-Archive -Path ${itemsList} -DestinationPath '${zipPath}' -Force`;
  execSync(`powershell -NoProfile -Command "${psCmd}"`, { cwd: rootDir, stdio: 'inherit' });
} else {
  const itemsList = includeItems.join(' ');
  execSync(`zip -r "${zipPath}" ${itemsList}`, { cwd: rootDir, stdio: 'inherit' });
}

console.log(`Successfully created: dist/${zipName}`);
