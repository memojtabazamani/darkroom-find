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
  padding: 0;
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  direction: rtl;
  width: 800px;
}
</style>
</head>
<body>
<p id="target">پروژه وزیرمتن یک خانواده تایپ‌فیس فارسی-عربی با ۹ وزن است</p>
<script>
window.addEventListener('DOMContentLoaded', async () => {
  await document.fonts.ready;
  const p = document.getElementById('target');
  const textNode = p.firstChild;

  function getCharRect(idx) {
    const r = document.createRange();
    r.setStart(textNode, idx);
    r.setEnd(textNode, idx + 1);
    const rect = r.getBoundingClientRect();
    return {
      char: textNode.nodeValue[idx],
      idx,
      left: rect.left,
      right: rect.right,
      width: rect.width
    };
  }

  const chars = [];
  for (let i = 0; i < 15; i++) {
    chars.push(getCharRect(i));
  }

  const rFull = document.createRange();
  rFull.setStart(textNode, 0);
  rFull.setEnd(textNode, 5);
  const fullRect = rFull.getBoundingClientRect();

  console.log('CHARS_START ' + JSON.stringify({
    chars,
    full: { left: fullRect.left, right: fullRect.right, width: fullRect.width }
  }) + ' CHARS_END');
});
</script>
</body>
</html>`;

fs.writeFileSync('test_chars.html', htmlContent);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(chromePath, [
  '--headless',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--enable-logging=stderr',
  '--v=1',
  '--virtual-time-budget=2000',
  path.resolve('test_chars.html')
]);

let output = '';
proc.stderr.on('data', data => { output += data.toString(); });
proc.stdout.on('data', data => { output += data.toString(); });

proc.on('close', code => {
  const match = output.match(/CHARS_START (.*?) CHARS_END/);
  if (match) {
    console.log(JSON.stringify(JSON.parse(match[1]), null, 2));
  } else {
    console.log('Output:', output.substring(0, 500));
  }
  try { fs.unlinkSync('test_chars.html'); } catch {}
});
