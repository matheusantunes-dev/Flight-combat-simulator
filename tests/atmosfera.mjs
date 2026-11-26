// Atmosfera: Sol pelo relógio e posição (SunCalc), clima ao vivo (Open-Meteo, aqui simulado), vento como massa de ar,
// nuvem atravessável (neblina + turbulência), estrelas à noite, chuva no canopi e spray no voo rasante sobre a água.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const URL0 = (process.env.FCS_URL || 'http://localhost:8080/index.html').split('?')[0];
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
let meteo = 0;
await ctx.route(/api\.open-meteo\.com/, (r) => { meteo++; return r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ current: { temperature_2m: 24, precipitation: 2, cloud_cover: 85, wind_speed_10m: 10, wind_direction_10m: 90, wind_gusts_10m: 16 } }) }); });
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
await p.evaluate(async () => { const t = __tomcat; t.S.fh = true; await t.selectAircraft('f16'); setupPlayer('f16'); t.S.mission = 'fly'; t.startGame(); t.placeAir(); });
const ok = {};
// equinócio, meio-dia solar no equador: Sol quase a pino; meia-noite: bem abaixo do horizonte
ok.solPeloRelogio = await p.evaluate(() => { const A = __tomcat.AST, n = A.sun(new Date('2026-03-20T12:07:00Z'), 0, 0), m = A.sun(new Date('2026-03-21T00:07:00Z'), 0, 0); return n.alt * 180 / Math.PI > 85 && m.alt * 180 / Math.PI < -80; });
ok.estrelasSoANoite = await p.evaluate(() => { const t = __tomcat; t.S.tod = 'night'; t.applyTOD2(); const nOp = t.starOp(); t.S.tod = 'day'; t.applyTOD2(); return nOp > .3 && t.starOp() < .05; });
await p.evaluate(() => { const t = __tomcat; t.S.wx = 'live'; t.wxApply2(); });
await p.waitForFunction(() => __tomcat.ATM.wxSrc === 'ao vivo', null, { timeout: 15000 });
ok.climaAoVivo = meteo > 0 && await p.evaluate(() => { const A = __tomcat.ATM; return A.cover > .8 && A.rain > .4 && A.wind.x < -9 && Math.abs(A.wind.z) < .5 && /Open-Meteo/.test(document.getElementById('msgs').textContent); });
// vento de leste (vem de 090°), avião indo para o norte: o nariz vira para o vento (o avião "caranguejeia"),
// porque a aerodinâmica é relativa ao ar; e a velocidade no ar fica diferente da velocidade no solo
ok.ventoMassaDeAr = await p.evaluate(() => { const t = __tomcat; t.placeAir(); t.sim(6, () => {}); return t.P.fwd.x > .02 && Math.abs(t.P.spd - t.P.gs) > 1; });
ok.chuvaNoCanopi = await p.evaluate(async () => { await new Promise((r) => setTimeout(r, 800)); return document.getElementById('rainGlass').style.display === 'block'; });
// dentro de uma nuvem: neblina sobe e há turbulência
ok.nuvemAtravessavel = await p.evaluate(async () => { const t = __tomcat, c = t.CLOUDS[0]; const f0 = t.fog(); t.P.pos.set(c.x, c.y, c.z); await new Promise((r) => setTimeout(r, 600)); return t.cloudDepth(t.P.pos) > .5 && t.fog() > f0 * 1.5 && t.ATM.turb > .3; });
// rasante sobre o mar: spray
ok.sprayNoRasante = await p.evaluate(async () => { const t = __tomcat; t.S.wx = 'clear'; t.wxApply2(); t.P.pos.set(0, 9, -30000); t.P.vel.set(0, 0, -200); const n0 = t.smkN(); await new Promise((r) => setTimeout(r, 400)); return t.smkN() > n0 + 5; });
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: atmosfera passou'); else { console.log('FALHOU'); process.exit(1); }
