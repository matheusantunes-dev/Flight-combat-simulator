// Bases em terra: pista plana no terreno, pouso e corrida na pista, PAPI (2 brancas + 2 vermelhas na rampa certa),
// rearme/reabastecimento parado abaixo de 15 kt, seta da base mais próxima e lista de teleporte.
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
const start = (ac, flight) => p.evaluate(async ([ac, flight]) => { const t = __tomcat; t.S.fh = true; t.S.flight = flight; t.S.wx = 'clear'; await t.selectAircraft(ac); setupPlayer(ac); t.S.mission = 'fly'; t.startGame(); t.placeAir(); for (const k in t.K) t.K[k] = false; }, [ac, flight]);
const ok = {};
await start('f16', 'assist');

// 1) a pista é um platô plano na cota natural do morro
const pad = await p.evaluate(() => { const t = __tomcat, b = t.BASES[0], hs = [];
  for (let u = -b.len / 2 + 50; u <= b.len / 2 - 50; u += 200) { const a = b.hdg * Math.PI / 180;
    hs.push(terrainH(b.x + Math.sin(a) * u, b.z - Math.cos(a) * u)); }
  const fora = terrainH(b.x + 2500, b.z + 2500);
  return { elev: b.elev, min: Math.min(...hs), max: Math.max(...hs), fora, n: t.BASES.length }; });
ok.duasBases = pad.n >= 2;
ok.pistaPlana = Math.abs(pad.max - pad.min) < .8 && Math.abs(pad.min - pad.elev) < .8;
ok.pistaNaCotaDoTerreno = pad.elev > 18;

// 2) pousa na pista: vira estado "land", corre na pista e não cai no terreno
const ld = await p.evaluate(() => { const t = __tomcat, P = t.P, b = t.BASES[0], a = b.hdg * Math.PI / 180;
  const u = b.len / 2 - 500;                                   // rodas quase na zona de toque
  P.pos.set(b.x - Math.sin(a) * u, b.elev + t.GEAR_H + 1.2, b.z + Math.cos(a) * u);  // atrás da cabeceira, no rumo de pouso
  t.setQ(a, 0, 0); P.vel.set(Math.sin(a) * 68, -1.6, -Math.cos(a) * 68);
  P.gear = 1; P.gearPos = 1; P.flaps = 1; P.thr = .35; P.state = 'fly';
  let land = false, morreu = '', saiu = false, kiasToque = 0;
  // manete em idle e freio no instante em que as rodas tocam, como na vida real
  t.sim(40, () => { if (P.state === 'land') { if (!land) { land = true; kiasToque = P.kias; P.thr = 0; P.sb = 1; } if (!t.rwyAt(P.pos.x, P.pos.z)) saiu = true; } if (P.state === 'dead') morreu = 'crash'; });
  const r = { land, morreu, estado: P.state, kiasToque: +kiasToque.toFixed(0), kias: +P.kias.toFixed(0), naPista: !!t.rwyAt(P.pos.x, P.pos.z), saiu };
  P.sb = 0; return r; });
ok.pousaNaPista = ld.land && !ld.morreu;
ok.correNaPista = ld.land && ld.estado === 'land' && ld.kias < ld.kiasToque - 25 && !ld.saiu;

// 3) PAPI: alto = 4 brancas, na rampa = 2 brancas + 2 vermelhas, baixo = 4 vermelhas
const pp = await p.evaluate(() => { const t = __tomcat, P = t.P, b = t.BASES[0], a = b.hdg * Math.PI / 180;
  const at = (deg, d) => { const u = b.len / 2 - 300 + d;      // d metros antes do ponto de toque
    P.pos.set(b.x - Math.sin(a) * (b.len / 2 - 300) + Math.sin(a) * -d, b.elev + Math.tan(deg * Math.PI / 180) * d, b.z + Math.cos(a) * (b.len / 2 - 300) + Math.cos(a) * d);
    t.papiTick(); return t.papi()[0].map((c) => (c === 0xffffff ? 'B' : 'V')).join(''); };
  return { alto: at(6, 2500), rampa: at(3, 2500), baixo: at(1.5, 2500) }; });
ok.papiAlto = pp.alto === 'BBBB';
ok.papiNaRampa = pp.rampa === 'BBVV';
ok.papiBaixo = pp.baixo === 'VVVV';

await start('f16', 'assist');
// 4) parado na pista: 5 s e a equipe rearma/reabastece
const sv = await p.evaluate(() => { const t = __tomcat, P = t.P, b = t.BASES[0];
  P.state = 'land'; P.pos.set(b.x, b.elev + 3, b.z); P.vel.set(0, 0, 0); P.kias = 4; P.fuel = 500; P.hp = 60; P.flr = 2;
  P.svcT = 0; P.svc = false; for (let i = 0; i < 4; i++) t.baseTick(1); const antes = P.fuel;
  t.baseTick(1); t.baseTick(1); const depois = { fuel: P.fuel, hp: P.hp, flr: P.flr };
  P.kias = 300; t.baseTick(1); return { antes, depois, cancelou: P.svcT === 0 }; });
ok.rearmeEsperaCincoSegundos = sv.antes === 500;
ok.rearmeAcontece = sv.depois.fuel > 500 && sv.depois.hp === 100 && sv.depois.flr > 2;
ok.rearmeCancelaAoAndar = sv.cancelou;

// 5) seta da base mais próxima aponta para a certa
const nb = await p.evaluate(() => { const t = __tomcat, P = t.P, b = t.BASES[0];
  P.pos.set(b.x + 600, b.elev + 2000, b.z + 600); const perto = t.nearBase();
  P.pos.set(0, 3000, 400); const carrier = t.nearBase();
  return { perto: perto && perto.name, dPerto: perto ? Math.round(perto.p.distanceTo(P.pos)) : -1, carrier: carrier && carrier.name }; });
ok.setaBaseMaisProxima = nb.perto === 'SBIG';
ok.setaAchaPortaAvioes = nb.carrier === 'CVN';

// 6) teleporte: lista de lugares no menu de pausa
const tp = await p.evaluate(() => ({ n: __tomcat.TPLACES.length, botoes: document.querySelectorAll('#tpList .btn').length, tem: __tomcat.TPLACES.some(([n]) => /Anápolis/.test(n)) }));
ok.teleporteNoMenu = tp.n >= 5 && tp.botoes === tp.n && tp.tem;

ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), JSON.stringify({ pad, ld, pp, sv, nb, tp }).slice(0, 800), errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: bases em terra passaram'); else { console.log('FALHOU'); process.exit(1); }
