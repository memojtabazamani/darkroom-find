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
</style>
</head>
<body>
<div id="container" style="max-width: 800px; margin: 0 auto;">
  <p id="target">پروژه وزیرمتن یک خانواده تایپ‌فیس فارسی-عربی با ۹ وزن است که در سال ۱۳۹۴ با نام «وزیر» آغاز شد و در طول این سال‌ها</p>
</div>
<script>
window.addEventListener('DOMContentLoaded', async () => {
  await document.fonts.ready;
  const p = document.getElementById('target');
  const textNode = p.firstChild;

  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, 5); // 'پروژه'

  const clientRects = Array.from(range.getClientRects());
  const bounding = range.getBoundingClientRect();

  console.log('COMPARE_START ' + JSON.stringify({
    text: range.toString(),
    clientRects: clientRects.map(r => ({ left: r.left, right: r.right, width: r.width, x: r.x })),
    bounding: { left: bounding.left, right: bounding.right, width: bounding.width, x: bounding.x }
  }) + ' COMPARE_END');
});
</script>
</body>
</html>`;

fs.writeFileSync('test_compare.html', htmlContent);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(chromePath, [
  '--headless',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--enable-logging=stderr',
  '--v=1',
  '--virtual-time-budget=2000',
  path.resolve('test_compare.html')
]);

let output = '';
proc.stderr.on('data', data => { output += data.toString(); });
proc.stdout.on('data', data => { output += data.toString(); });

proc.on('close', code => {
  const match = output.match(/COMPARE_START (.*?) COMPARE_END/);
  if (match) {
    console.log(JSON.stringify(JSON.parse(match[1]), null, 2));
  } else {
    console.log('Output:', output.substring(0, 500));
  }
  try { fs.unlinkSync('test_compare.html'); } catch {}
});
