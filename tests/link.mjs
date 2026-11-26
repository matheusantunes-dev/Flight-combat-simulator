// Avião por link: cola o link de um .glb, escolhe o caça base, o jogo baixa, ajusta e coloca no hangar;
// o avião voa com a física/armas da base, sobrevive a recarregar a página (IndexedDB) e no multiplayer vira a base.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const URL0 = (process.env.FCS_URL || 'http://localhost:8080/index.html').split('?')[0];
const GLB = new URL('models/su25.glb', URL0).href;
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
await p.goto(URL0); await ready();
const ok = {};
await p.click('#custOpen'); ok.abreJanela = await p.isVisible('#cust');
await p.fill('#custUrl', GLB); await p.selectOption('#custBase', 'a10'); await p.fill('#custLen', '15.5'); await p.fill('#custName', 'Gralha de teste');
await p.click('#custGo');
await p.waitForFunction(() => /Pronto|⚠️/.test(document.getElementById('custMsg').textContent), null, { timeout: 120000 });
ok.baixouEAjustou = await p.evaluate(() => /Pronto/.test(document.getElementById('custMsg').textContent));
const id = await p.evaluate(() => Object.keys(__tomcat.ACFT).find((k) => __tomcat.ACFT[k].custom));
ok.noHangar = !!id && await p.isVisible(`[data-k=ac] button[data-v="${id}"]`);
const r = await p.evaluate(async (id) => {
  const t = __tomcat, a = t.ACFT[id], base = t.ACFT.a10;
  const R = await loadAircraft(id); const h = R && makeHD(R, false); h && h.gear(true);
  const bb = h ? new THREE.Box3().setFromObject(h.g) : null;
  return { herda: a.mil === base.mil && a.gun === base.gun && JSON.stringify(Object.keys(a.wpn)) === JSON.stringify(Object.keys(base.wpn)), escala: a.scale > 0, modelo: !!R,
    comprimento: bb ? +(bb.max.z - bb.min.z).toFixed(1) : 0, chao: bb ? +(bb.min.y + a.gearH).toFixed(2) : 9 };
}, id);
ok.herdaFisicaEArmas = r.herda; ok.modelo3D = r.modelo; ok.tamanhoReal = Math.abs(r.comprimento - 15.5) < 1.2; ok.rodasNoChao = Math.abs(r.chao) < .5;
await p.click('#custClose');
ok.voa = await p.evaluate(async (id) => { const t = __tomcat; t.S.fh = true; await t.selectAircraft(id); t.S.mission = 'fly'; t.startGame(); t.placeAir(); t.sim(3, () => { t.P.thr = 1 }); const v = t.P.vel.length(); t.G.mode = 'menu'; return v > 60; }, id);
ok.multiplayerVeABase = await p.evaluate(() => window.netAcT ? true : true) && await p.evaluate((id) => { __tomcat.S.ac = id; return __tomcat.netAc() === 'a10'; }, id);
await p.evaluate(() => { __tomcat.S.ac = 'f14'; });
await p.reload(); await ready();
ok.sobreviveRecarregar = await p.evaluate(async (id) => !!(__tomcat.ACFT[id] && await loadAircraft(id)), id);
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok, null, 1), r, errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: avião por link passou'); else { console.log('FALHOU'); process.exit(1); }
