const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<style>
body {
  margin: 0;
  padding: 0;
  direction: rtl;
}
.spacer {
  height: 3000px; /* Trigger scrollbar */
}
#test-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
}
#test-canvas-fixed-clean {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
</head>
<body>
<canvas id="test-canvas"></canvas>
<canvas id="test-canvas-fixed-clean"></canvas>
<div class="spacer"></div>
<script>
window.addEventListener('DOMContentLoaded', () => {
  const c1 = document.getElementById('test-canvas');
  const c2 = document.getElementById('test-canvas-fixed-clean');

  const r1 = c1.getBoundingClientRect();
  const r2 = c2.getBoundingClientRect();

  console.log('CANVAS_BOUNDS_START ' + JSON.stringify({
    direction: document.documentElement.dir,
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollBarWidth: window.innerWidth - document.documentElement.clientWidth,
    canvasWith100vw: { left: r1.left, right: r1.right, width: r1.width, x: r1.x },
    canvasClean: { left: r2.left, right: r2.right, width: r2.width, x: r2.x }
  }) + ' CANVAS_BOUNDS_END');
});
</script>
</body>
</html>`;

fs.writeFileSync('test_canvas_rtl.html', htmlContent);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(chromePath, [
  '--headless',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--enable-logging=stderr',
  '--v=1',
  '--virtual-time-budget=2000',
  path.resolve('test_canvas_rtl.html')
]);

let output = '';
proc.stderr.on('data', data => { output += data.toString(); });
proc.stdout.on('data', data => { output += data.toString(); });

proc.on('close', code => {
  const match = output.match(/CANVAS_BOUNDS_START (.*?) CANVAS_BOUNDS_END/);
  if (match) {
    console.log(JSON.stringify(JSON.parse(match[1]), null, 2));
  } else {
    console.log('Output:', output.substring(0, 500));
  }
  try { fs.unlinkSync('test_canvas_rtl.html'); } catch {}
});
