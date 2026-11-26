// Hangar 3D: o avião aparece na plataforma, trocar de avião troca o modelo (sem sobrar o anterior),
// a inspeção esconde o menu e mostra a ficha, e clicar num avião bloqueado não muda o avião escolhido.
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
await p.waitForTimeout(2500);
const ok = {};
const st = () => p.evaluate(() => { const H = __tomcat.HG; return { on: H.on, id: H.id, n: H.tt.children.length, ac: __tomcat.S.ac }; });
let s = await st(); ok.hangarLigado = s.on && s.id === 'f14' && s.n === 3;
await p.click('[data-k=ac] button[data-v=mig29]'); await p.waitForTimeout(2500);
s = await st(); ok.trocaModelo = s.id === 'mig29' && s.n === 3; ok.bloqueadoNaoSeleciona = s.ac === 'f14';
ok.ficha = await p.evaluate(() => /MiG-29A/.test(document.getElementById('hgStats').textContent) && document.querySelectorAll('#hgStats .hgb').length === 6);
await p.click('#hgOpen'); await p.waitForTimeout(500);
ok.inspecao = await p.evaluate(() => document.body.classList.contains('hginsp') && getComputedStyle(document.querySelector('#menu .card.main')).display === 'none');
await p.click('#hgNext'); await p.waitForTimeout(2500); s = await st(); ok.proximo = s.id === 'm2000' && s.n === 3;
const y0 = await p.evaluate(() => __tomcat.HG.yaw); await p.mouse.move(700, 400); await p.mouse.down(); await p.mouse.move(500, 380, { steps: 5 }); await p.mouse.up();
ok.girarArrastando = (await p.evaluate(() => __tomcat.HG.yaw)) !== y0;
await p.click('#hgBack'); await p.click('.tabs button[data-tab=world]'); await p.waitForTimeout(300);
ok.foraDaAbaJogarVoltaOPortaAvioes = !(await p.evaluate(() => __tomcat.HG.on));
await p.click('.tabs button[data-tab=play]'); await p.click('#go'); await p.waitForTimeout(800);
ok.emJogoDesliga = await p.evaluate(() => !__tomcat.HG.on && __tomcat.G.mode === 'play');
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: hangar 3D passou'); else { console.log('FALHOU'); process.exit(1); }
