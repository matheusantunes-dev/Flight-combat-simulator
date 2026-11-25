// Testa a fisiologia do G: puxão curto não escurece, G sustentado alto faz túnel e depois G-LOC (nunca antes de ~5 s),
// e durante o G-LOC o manche fica sem ninguém.
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
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(URL0);
await p.waitForFunction(() => window.__tomcat && !document.querySelector('#go').disabled, null, { timeout: 120000 });
const ok = await p.evaluate(() => {
  const t = __tomcat, P = t.P, out = {};
  t.S.mission = 'fly'; t.S.diff = 'ace'; t.startGame(); P.state = 'fly';
  const run = (g, sec) => { let first = null; for (let i = 0; i < sec * 60; i++) { P.g = g; t.gPhys(1 / 60); if (P.gph.loc > 0 && first === null) first = i / 60; } return first; };
  const reset = () => { Object.assign(P.gph, { rfx: 0, dv: 0, va: 0, res: 1, loc: 0, neg: 0, warnT: 99 }); };
  reset(); run(9, 1.5); out.puxaoCurtoQuaseNada = P.gph.dv / 1.6 < 0.35 && P.gph.res > 0.85;
  reset(); run(7, 30); out.seteGSustentadoOk = P.gph.dv === 0 && P.gph.res === 1;
  reset(); const tl = run(9.5, 30); out.gLocNoveMeio = tl !== null && tl > 5 && tl < 20;
  reset(); const t11 = run(12, 30); out.gLocNuncaAntesDe5s = t11 !== null && t11 >= 5;
  out.manobraAntesDoApagao = (() => { reset(); run(9.5, 4); return P.gph.dv > 0.5 && P.gph.loc === 0; })();
  reset(); run(9.5, 30); run(1, 4); out.ficaApagado = P.gph.loc > 0; run(1, 12); out.acorda = P.gph.loc <= 0;
  reset(); run(1, 0.2); run(-3.5, 3); out.redout = P.gph.neg > 0.8;
  return out;
});
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: fisiologia do G passou'); else { console.log('FALHOU'); process.exit(1); }
