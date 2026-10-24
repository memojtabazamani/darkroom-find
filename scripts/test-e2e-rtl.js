const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const fontPath = path.resolve('fonts/Vazirmatn-Medium.woff2').replace(/\\/g, '/');
const rendererScript = fs.readFileSync('src/content/spotlight-renderer.js', 'utf8');

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
  padding: 30px;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  direction: rtl;
}
.spacer {
  height: 3500px; /* Trigger vertical scrollbar on Windows */
}
</style>
</head>
<body>
<p id="target">پروژه وزیرمتن یک خانواده تایپ‌فیس فارسی-عربی با ۹ وزن است که در سال ۱۳۹۴ با نام «وزیر» آغاز شد و در طول این سال‌ها</p>
<div class="spacer"></div>
<script>
${rendererScript}

window.addEventListener('DOMContentLoaded', async () => {
  await document.fonts.ready;

  // 1. Create Shadow DOM host
  const hostElement = document.createElement('div');
  hostElement.id = 'spotlight-find-host';
  hostElement.style.cssText = 'all: initial; position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; overflow: visible !important; z-index: 2147483647 !important; pointer-events: none !important; direction: ltr !important;';
  (document.body || document.documentElement).appendChild(hostElement);

  const shadowRoot = hostElement.attachShadow({ mode: 'open' });

  // 2. Instantiate Renderer
  const renderer = new SpotlightRenderer(shadowRoot, {
    glowColor: 'rgba(255, 0, 127, 0.4)',
    currentGlowColor: 'rgba(255, 0, 127, 0.95)',
    dimOpacity: 0.85,
    dimRgb: '5, 7, 15'
  });

  const p = document.getElementById('target');
  const textNode = p.firstChild;
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, 5); // 'پروژه'

  const domRect = range.getBoundingClientRect();

  renderer.show();
  renderer.updateMatches([{ range, termIndex: 0 }], 0);

  // Allow frame to render
  requestAnimationFrame(() => {
    const canvas = renderer.canvas;
    const canvasBounds = canvas.getBoundingClientRect();

    console.log('E2E_TEST_START ' + JSON.stringify({
      canvasLeft: canvasBounds.left,
      canvasTop: canvasBounds.top,
      domRectLeft: domRect.left,
      domRectRight: domRect.right,
      domRectWidth: domRect.width,
      perfectlyAligned: canvasBounds.left === 0
    }) + ' E2E_TEST_END');
  });
});
</script>
</body>
</html>`;

fs.writeFileSync('test_e2e_rtl.html', htmlContent);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(chromePath, [
  '--headless',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--enable-logging=stderr',
  '--v=1',
  '--virtual-time-budget=3000',
  path.resolve('test_e2e_rtl.html')
]);

let output = '';
proc.stderr.on('data', data => { output += data.toString(); });
proc.stdout.on('data', data => { output += data.toString(); });

proc.on('close', code => {
  const match = output.match(/E2E_TEST_START (.*?) E2E_TEST_END/);
  if (match) {
    console.log(JSON.stringify(JSON.parse(match[1]), null, 2));
  } else {
    console.log('Output:', output.substring(0, 500));
  }
  try { fs.unlinkSync('test_e2e_rtl.html'); } catch {}
});
