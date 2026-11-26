// Câmera do cockpit ajustável em qualquer avião: Ctrl+Shift+setas/PgUp/PgDn movem a cabeça, botões na pausa também,
// fica salvo por avião (sobrevive a recarregar) e "Voltar ao padrão" desfaz. O modelo de fora não muda.
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
const ready = () => p.waitForFunction(() => window.__tomcat && !document.querySelector('#go').disabled, null, { timeout: 120000 });
const start = () => p.evaluate(async () => { const t = __tomcat; t.S.fh = true; await t.selectAircraft('f16'); setupPlayer('f16'); t.S.mission = 'fly'; t.startGame(); t.placeAir(); });
const off = () => p.evaluate(() => (__tomcat.CAMO.v.f16 || [0, 0, 0]).map((v) => +v.toFixed(3)));
await p.goto(URL0); await ready(); await start(); await p.waitForTimeout(500);
const ok = {};
for (let i = 0; i < 4; i++) await p.keyboard.press('Control+Shift+ArrowUp');
for (let i = 0; i < 2; i++) await p.keyboard.press('Control+Shift+PageDown');
let o = await off(); ok.tecladoMoveFrenteEDesce = o[0] === .1 && o[1] === -.05;
await p.keyboard.press('KeyP'); await p.waitForTimeout(300);
await p.click('[data-cam="0,0,1"]'); await p.click('[data-cam="0,0,1"]');
o = await off(); ok.botoesDaPausa = Math.abs(o[2] - .05) < 1e-6 && /lado \+5 cm/.test(await p.textContent('#camInfo'));
await p.reload(); await ready(); await start(); await p.waitForTimeout(300);
o = await off(); ok.salvoPorAviao = o[0] === .1 && o[1] === -.05 && Math.abs(o[2] - .05) < 1e-6;
await p.keyboard.press('Control+Shift+Backspace'); o = await off(); ok.voltaAoPadrao = o.every((v) => v === 0);
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: câmera ajustável passou'); else { console.log('FALHOU'); process.exit(1); }
