// Teste de fumaça do FCS: abre o jogo num Chrome headless e confere o essencial.
// Uso local: npx playwright install chromium && python3 -m http.server 8080 & node tests/smoke.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const URL = process.env.FCS_URL || 'http://localhost:8080/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
// Sem internet para o CDN (ex.: sandbox)? LIBS=pasta com three.min.js, GLTFLoader.js e meshopt_decoder.mjs
if (process.env.LIBS) {
  const lib = (f) => readFileSync(process.env.LIBS + '/' + f, 'utf8');
  await page.route(/three\.min\.js|GLTFLoader\.js|meshopt_decoder\.mjs|fonts\.g/, (r) => {
    const u = r.request().url();
    const f = u.includes('three.min') ? 'three.min.js' : u.includes('GLTFLoader') ? 'GLTFLoader.js' : u.includes('meshopt') ? 'meshopt_decoder.mjs' : null;
    return f ? r.fulfill({ body: lib(f), contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }) : r.fulfill({ body: '' });
  });
}

await page.goto(URL);
await page.waitForFunction(() => window.__tomcat && !document.querySelector('#go').disabled, null, { timeout: 120000 });

const results = await page.evaluate(() => {
  const t = window.__tomcat, P = t.P, G = t.G, out = {};
  // 1) decolagem por catapulta
  t.S.mission = 'c0'; t.startGame(); P.thr = P.spool = 1;
  dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL' }));
  t.sim(10);
  out.catapulta = P.state === 'fly' && P.pos.y > 30;
  // 2) pouso com cabo, mãos fora do manche
  t.S.mission = 'trap'; t.startGame();
  P.pos.set(0, 21.8 + 3.73 + 120 * Math.tan(3.5 / 57.3), 224);
  t.sim(10);
  out.pouso = G.traps === 1;
  // 3) combate: os alas derrubam a primeira onda
  t.S.mission = 'free'; t.startGame(); t.sim(5); G.waveT = 0.1; t.sim(100);
  out.alas = t.AL.length === 6;
  out.abates = G.kills + G.allyKills > 0;
  // 4) rádio responde no roteiro
  t.RADIO.eng = null; t.RADIO.ai = null;
  return out;
});

console.log(JSON.stringify(results, null, 2));
await browser.close();
const failed = Object.entries(results).filter(([, ok]) => !ok).map(([k]) => k);
if (errors.length) console.error('Erros na página:\n' + errors.join('\n'));
if (failed.length || errors.length) { console.error('FALHOU: ' + failed.join(', ')); process.exit(1); }
console.log('OK: tudo passou');
