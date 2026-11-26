// Olhar livre (PC): Alt+C prende o mouse (Pointer Lock), mover o mouse sem clicar vira a cabeça do piloto,
// a cabeça não volta sozinha pro centro, Alt+C de novo solta, e o C sozinho continua trocando cockpit/externa.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const URL0 = (process.env.FCS_URL || 'http://localhost:8080/index.html').split('?')[0];
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
if (process.env.LIBS) {
  const lib = (f) => readFileSync(process.env.LIBS + '/' + f, 'utf8');
  await ctx.route(/three\.min\.js|GLTFLoader\.js|meshopt_decoder\.mjs|fonts\.g|esm\.run/, (r) => {
    const u = r.request().url();
    const f = u.includes('three.min') ? 'three.min.js' : u.includes('GLTFLoader') ? 'GLTFLoader.js' : u.includes('meshopt') ? 'meshopt_decoder.mjs' : null;
    return f ? r.fulfill({ body: lib(f), contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }) : r.fulfill({ status: 404, body: '' });
  });
}
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(URL0);
await p.waitForFunction(() => window.__tomcat && !document.querySelector('#go').disabled, null, { timeout: 120000 });
await p.click('#go'); await p.waitForTimeout(1500);
const st = () => p.evaluate(() => ({ lock: document.pointerLockElement === document.getElementById('gl'), on: __tomcat.ML.on, yaw: __tomcat.cam().yaw, view: __tomcat.cam().view, chip: !document.getElementById('mlChip').classList.contains('hide') }));
const ok = {};
await p.mouse.move(640, 360);
await p.keyboard.press('Alt+KeyC'); await p.waitForTimeout(600);
let s = await st(); ok.altCPrende = s.on && s.lock && s.chip; ok.altCNaoTrocaCamera = s.view === 'cock';
const y0 = s.yaw;
await p.mouse.move(400, 360, { steps: 8 }); await p.waitForTimeout(300);
s = await st(); ok.mouseViraSemClicar = s.yaw > y0 + .3;
await p.waitForTimeout(2000); const s2 = await st(); ok.naoVoltaProCentro = Math.abs(s2.yaw - s.yaw) < .05;
await p.keyboard.press('Alt+KeyC'); await p.waitForTimeout(600);
s = await st(); ok.altCSolta = !s.on && !s.lock && !s.chip;
await p.keyboard.press('KeyC'); await p.waitForTimeout(200); ok.cSozinhoTrocaCamera = (await st()).view === 'ext';
await p.keyboard.press('KeyC');
await p.keyboard.press('Alt+KeyC'); await p.waitForTimeout(600); await p.keyboard.press('KeyP'); await p.waitForTimeout(400);
s = await st(); ok.pausaSolta = !s.on;
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: olhar livre passou'); else { console.log('FALHOU'); process.exit(1); }
