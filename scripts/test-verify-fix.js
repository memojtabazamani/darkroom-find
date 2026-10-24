const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const fontPath = path.resolve('fonts/Vazirmatn-Medium.woff2').replace(/\\/g, '/');

const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'Vazirmatn';
  src: url('file:///${fontPath}') format('woff2');
}
body {
  margin: 0;
  padding: 20px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  direction: rtl;
}
.spacer {
  height: 3000px; /* Trigger vertical scrollbar on Windows */
}
</style>
</head>
<body>
<p id="target">پروژه وزیرمتن یک خانواده تایپ‌فیس فارسی-عربی با ۹ وزن است که در سال ۱۳۹۴ با نام «وزیر» آغاز شد و در طول این سال‌ها</p>
<div class="spacer"></div>
<script>
window.addEventListener('DOMContentLoaded', async () => {
  await document.fonts.ready;

  // 1. Create host element like extension
  const hostElement = document.createElement('div');
  hostElement.id = 'spotlight-find-host';
  hostElement.style.cssText = 'all: initial; position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; overflow: visible !important; z-index: 2147483647 !important; pointer-events: none !important; direction: ltr !important;';
  document.body.appendChild(hostElement);

  const shadowRoot = hostElement.attachShadow({ mode: 'open' });

  // 2. Fixed clean canvas
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;';
  shadowRoot.appendChild(canvas);

  const canvasBounds = canvas.getBoundingClientRect();

  const p = document.getElementById('target');
  const textNode = p.firstChild;
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, 5); // 'پروژه'

  const rect = range.getBoundingClientRect();

  // Test alignment: canvas offset + rect.left
  const canvasRelativeX = rect.left - canvasBounds.left;

  console.log('VERIFY_START ' + JSON.stringify({
    canvasLeft: canvasBounds.left,
    canvasTop: canvasBounds.top,
    rectLeft: rect.left,
    rectRight: rect.right,
    rectWidth: rect.width,
    canvasRelativeX: canvasRelativeX,
    aligned: canvasBounds.left === 0 && canvasRelativeX === rect.left
  }) + ' VERIFY_END');
});
</script>
</body>
</html>`;

fs.writeFileSync('test_verify_fix.html', htmlContent);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(chromePath, [
  '--headless',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--enable-logging=stderr',
  '--v=1',
  '--virtual-time-budget=2000',
  path.resolve('test_verify_fix.html')
]);

let output = '';
proc.stderr.on('data', data => { output += data.toString(); });
proc.stdout.on('data', data => { output += data.toString(); });

proc.on('close', code => {
  const match = output.match(/VERIFY_START (.*?) VERIFY_END/);
  if (match) {
    console.log(JSON.stringify(JSON.parse(match[1]), null, 2));
  } else {
    console.log('Output:', output.substring(0, 500));
  }
  try { fs.unlinkSync('test_verify_fix.html'); } catch {}
});
