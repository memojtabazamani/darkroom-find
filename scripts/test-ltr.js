const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {
  font-family: Arial, Tahoma, sans-serif;
  font-size: 16px;
  width: 900px;
  /* LTR container with RTL text! */
}
</style>
</head>
<body>
<p id="target">پروژه وزیرمتن یک خانواده تایپ‌فیس فارسی-عربی با ۹ وزن است</p>
<script>
window.addEventListener('DOMContentLoaded', () => {
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
    testRange(6, 8, '6..8 وز')
  ];
  console.log('LTR_CONTAINER_RESULTS ' + JSON.stringify(results));
});
</script>
</body>
</html>`;

fs.writeFileSync('test_ltr.html', htmlContent);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(chromePath, [
  '--headless',
  '--disable-gpu',
  '--enable-logging=stderr',
  '--v=1',
  '--virtual-time-budget=2000',
  path.resolve('test_ltr.html')
]);

let output = '';
proc.stderr.on('data', data => { output += data.toString(); });
proc.stdout.on('data', data => { output += data.toString(); });

proc.on('close', code => {
  const match = output.match(/LTR_CONTAINER_RESULTS (.*)/);
  if (match) {
    console.log(JSON.stringify(JSON.parse(match[1]), null, 2));
  } else {
    console.log('Output:', output.substring(0, 500));
  }
  try { fs.unlinkSync('test_ltr.html'); } catch {}
});
