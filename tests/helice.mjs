// Hélice do A-29: gira sempre que o motor funciona; em baixa rotação as pás aparecem girando,
// com a manete toda vira um disco translúcido (como os simuladores e o olho humano); sem combustível para.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const URL0 = (process.env.FCS_URL || 'http://localhost:8080/index.html').split('?')[0];
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
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
await p.evaluate(async () => { const t = __tomcat; t.S.fh = true; await t.selectAircraft('a29'); setupPlayer('a29'); t.S.mission = 'fly'; t.startGame(); t.placeAir(); });
const ok = {};
const st = (thr, fuel) => p.evaluate(async ([thr, fuel]) => { const t = __tomcat; t.P.thr = t.P.spool = thr; if (fuel !== undefined) t.P.fuel = fuel; const pr = t.propOf(); const a0 = pr.piv.rotation.x; await new Promise((r) => setTimeout(r, 700)); return { d: pr.piv.rotation.x - a0, disc: pr.disc.material.opacity, pas: pr.blades[0].visible }; }, [thr, fuel]);
ok.temHelice = await p.evaluate(() => !!__tomcat.propOf());
ok.comecaAbaixoDaVne = await p.evaluate(() => __tomcat.P.vel.length() < 170);
let s = await st(.3); ok.girandoComPas = s.d > .5 && s.pas;
s = await st(1); ok.discoNaPotenciaMaxima = s.disc > .2 && !s.pas;
s = await st(1, 0); ok.semCombustivelQuaseParada = s.d < 5 && s.pas;
ok.jatoNaoTemHelice = await p.evaluate(async () => { const t = __tomcat; await t.selectAircraft('f16'); setupPlayer('f16'); return !t.propOf(); });
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: hélice passou'); else { console.log('FALHOU'); process.exit(1); }
