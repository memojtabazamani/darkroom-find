const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const engineCode = fs.readFileSync('src/content/search-engine.js', 'utf8');

const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<style>
body {
  font-family: Arial, Tahoma, sans-serif;
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
${engineCode}

window.addEventListener('DOMContentLoaded', async () => {
  const queries = ['پروژه', 'وزیر', 'وزیرمتن', 'وژه', 'وز', 'پ'];
  const results = {};
  for (const q of queries) {
    const res = await SpotlightSearchEngine.search(q, {
      matchCase: false,
      wholeWord: false,
      useRegex: false,
      multiTerm: false
    });
    results[q] = res.matches.map(m => {
      const rects = Array.from(m.range.getClientRects()).map(r => ({
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width)
      }));
      return {
        text: m.range.toString(),
        startContainer: m.range.startContainer.nodeValue?.substring(0, 15),
        startOffset: m.range.startOffset,
        endOffset: m.range.endOffset,
        rects
      };
    });
  }
  console.log('SEARCH_RESULTS_START ' + JSON.stringify(results) + ' SEARCH_RESULTS_END');
});
</script>
</body>
</html>`;

fs.writeFileSync('test_engine.html', htmlContent);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(chromePath, [
  '--headless',
  '--disable-gpu',
  '--enable-logging=stderr',
  '--v=1',
  '--virtual-time-budget=2000',
  path.resolve('test_engine.html')
]);

let output = '';
proc.stderr.on('data', data => { output += data.toString(); });
proc.stdout.on('data', data => { output += data.toString(); });

proc.on('close', code => {
  const match = output.match(/SEARCH_RESULTS_START (.*?) SEARCH_RESULTS_END/);
  if (match) {
    console.log(JSON.stringify(JSON.parse(match[1]), null, 2));
  } else {
    console.log('Raw output:', output.substring(0, 1000));
  }
  try { fs.unlinkSync('test_engine.html'); } catch {}
});
