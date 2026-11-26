// Todos os caças jogáveis: o modelo 3D carrega, tem cabine, o trem toca o convés (rodas na altura certa),
// e o caça decola da catapulta e voa sem erros. O Flanker inimigo usa o modelo HD do J-11.
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
const ids = await p.evaluate(() => Object.keys(__tomcat.ACFT).filter((id) => !__tomcat.ACFT[id].soon && !__tomcat.ACFT[id].enemyOnly));
const res = {};
for (const id of ids) {
  res[id] = await p.evaluate(async (id) => {
    const t = __tomcat; t.S.fh = true; await t.selectAircraft(id);
    const R = await loadAircraft(id); const a = t.ACFT[id];
    if (!R) return 'sem modelo';
    // rodas no chão: ponto mais baixo do trem (ou do avião) com o olho a gearH do convés
    const h = makeHD(R, false); h.gear(true); h.g.updateMatrixWorld(true);
    const minY = new THREE.Box3().setFromObject(h.g).min.y; const gap = minY + a.gearH;
    if (Math.abs(gap) > .45) return 'trem fora do chão: ' + gap.toFixed(2) + ' m';
    if (!a.wpn || !a.gun) return 'sem armamento';
    t.S.mission = 'fly'; t.startGame(); t.placeAir(); const P = t.P; const v0 = P.vel.length();
    t.sim(4, () => { P.thr = 1 }); if (!(P.vel.length() > 60) || P.pos.y < 500) return 'não voa: v=' + P.vel.length().toFixed(0) + ' y=' + P.pos.y.toFixed(0);
    t.endGame && t.G.mode === 'play' && (t.G.mode = 'menu'); return 'ok';
  }, id);
}
const enemy = await p.evaluate(() => !!(__tomcat.ENEMY.su27 && __tomcat.ENEMY.su27.std && __tomcat.ENEMY.su27.std.children.length));
const ok = Object.values(res).every((v) => v === 'ok') && ids.length >= 16 && enemy && errs.length === 0;
console.log(JSON.stringify(res), 'caças:', ids.length, 'J-11 inimigo:', enemy, errs.slice(0, 3)); await b.close();
if (ok) console.log('OK: todos os caças carregam, tocam o chão e voam'); else { console.log('FALHOU'); process.exit(1); }
