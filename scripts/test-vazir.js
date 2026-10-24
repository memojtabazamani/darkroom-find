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
  font-weight: 500;
  font-style: normal;
}
body {
  font-family: 'Vazirmatn', sans-serif;
  font-size: 16px;
  width: 900px;
  direction: rtl;
}
p {
  line-height: 1.5;
}
</style>
</head>
<body>
<p id="target">پروژه وزیرمتن یک خانواده تایپ‌فیس فارسی-عربی با ۹ وزن است که در سال ۱۳۹۴ با نام «وزیر» آغاز شد و در طول این سال‌ها</p>
<script>
window.addEventListener('DOMContentLoaded', async () => {
  await document.fonts.ready;
  const p = document.getElementById('target');
  const textNode = p.firstChild;
  const str = textNode.nodeValue;

  function testRange(start, end, label) {
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const rects = Array.from(range.getClientRects()).map(r => ({
      left: Math.round(r.left),
      right: Math.round(r.right),
      width: Math.round(r.width)
    }));
    return {
      label,
      sub: str.substring(start, end),
      rects
    };
  }

  const results = [
    testRange(0, 5, '0..5 پروژه'),
    testRange(0, 2, '0..2 پر'),
    testRange(2, 5, '2..5 وژه'),
    testRange(5, 6, '5..6 space'),
    testRange(6, 8, '6..8 وز'),
    testRange(6, 14, '6..14 وزیرمتن')
  ];
  console.log('VAZIRMATN_RESULTS ' + JSON.stringify(results));
});
</script>
</body>
</html>`;

fs.writeFileSync('test_vazir.html', htmlContent);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(chromePath, [
  '--headless',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--enable-logging=stderr',
  '--v=1',
  '--virtual-time-budget=2000',
  path.resolve('test_vazir.html')
]);

let output = '';
proc.stderr.on('data', data => { output += data.toString(); });
proc.stdout.on('data', data => { output += data.toString(); });

proc.on('close', code => {
  const match = output.match(/VAZIRMATN_RESULTS (.*)/);
  if (match) {
    console.log(JSON.stringify(JSON.parse(match[1]), null, 2));
  } else {
    console.log('Raw output:', output.substring(0, 500));
  }
  try { fs.unlinkSync('test_vazir.html'); } catch {}
});
