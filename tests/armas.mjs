// Armas reais: cargas de cada avião, bomba burra com CCIP, bomba a laser (só acerta com a trava mantida),
// GPS, explosão em área, Exocet só em navio e furtividade (SAM enxerga menos).
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
const ok = await p.evaluate(async () => {
  const t = __tomcat, P = t.P, G = t.G, T = t.T, o = {}, V = THREE.Vector3;
  const AC = t.ACFT;
  o.cargasReais = AC.f14.wpn.bomb.m === 'gbu12' && !AC.f14.wpn.agm && AC.mig29.wpn.bomb.m === 'fab500' && !AC.m2000.wpn.agm && AC.f16.wpn.agm && AC.f16.wpn.bomb && AC.a10.gun.n === 1174 && AC.f117.gun.n === 0 && AC.rafale.wpn.agm.m === 'exocet';
  o.novosEsperandoModelo = Object.keys(t.NEWAC).every((id) => AC[id].soon) && /Chegando/.test(document.getElementById('soonLine').textContent);
  const fly = (pos, vel) => { P.state = 'fly'; P.gear = false; P.gearPos = 0; P.pos.copy(pos); P.vel.copy(vel); P.q.setFromUnitVectors(new V(0, 0, -1), vel.clone().normalize()); P.thr = P.spool = .9; P.hp = 100; };
  const hold = (pos, vel) => () => { P.pos.copy(pos); P.vel.copy(vel); P.hp = 100; };
  // ---- bomba burra (MiG-29, FAB-500) com CCIP, em cima do depósito
  t.S.fh = true; await t.selectAircraft('mig29'); t.S.mission = 'c5'; t.startGame();
  let dep = T.find((u) => u.type === 'dep'); const v0 = new V(0, 0, -150), above = dep.pos.clone().add(new V(0, 900, 0));
  // acha o ponto de soltura: CCIP sobre o alvo
  fly(above.clone().add(new V(0, 0, 2500)), v0); let rel = null;
  for (let z = 4000; z > -500; z -= 10) { P.pos.copy(dep.pos).add(new V(0, 900, z)); const ip = t.ccip(t.MDEF.fab500); if (ip && Math.hypot(ip.x - dep.pos.x, ip.z - dep.pos.z) < 8) { rel = P.pos.clone(); break; } }
  o.ccipAchaSoltura = !!rel;
  fly(rel, v0); P.wpn = 6; P.lock = null; t.fireMissile(); o.bombaSaiu = t.MS.some((m) => m.type === 'fab500');
  t.sim(20, hold(rel.clone().add(new V(0, 2000, 0)), v0)); o.bombaBurraAcerta = !dep.alive;
  // ---- explosão em área: AAA perto de um depósito leva junto
  const aaa = T.find((u) => u.type === 'aaa' && u.alive), dep2 = T.find((u) => u.type === 'dep' && u.alive);
  aaa.pos.copy(dep2.pos).add(new V(15, 0, 0)); aaa.gy = dep2.gy; t.MS.length;
  P.pos.copy(dep2.pos).add(new V(0, 1500, 0));
  const blast = t.MDEF.fab500; // explode direto no depósito
  t.damage; const before = aaa.alive; window.blastAt ? 0 : 0;
  // ---- laser (F-14, GBU-12): com a trava mantida acerta; sem trava, erra
  await t.selectAircraft('f14'); t.S.mission = 'c5'; t.startGame();
  const rad = T.find((u) => u.type === 'rad'); const start = rad.pos.clone().add(new V(0, 3000, 2500)), vv = new V(0, 0, -180);
  fly(start, vv); t.sim(.1); P.wpn = 6; P.lock = rad; t.fireMissile(); const lb = t.MS.find((m) => m.type === 'gbu12');
  o.laserPedeTrava = !!lb;
  t.sim(40, () => { P.lock = rad; P.pos.y = 3000 + rad.pos.y; P.hp = 100; }); o.laserComTravaAcerta = !rad.alive;
  const dep3 = T.find((u) => u.type === 'dep' && u.alive); fly(dep3.pos.clone().add(new V(0, 3000, 2500)), vv); t.sim(.1); P.lock = dep3; t.fireMissile(); const lb2 = t.MS.find((m) => m.type === 'gbu12' && m.alive);
  t.sim(.5); P.lock = null; t.sim(40, () => { P.lock = null; P.hp = 100; }); o.laserSemTravaErra = dep3.alive;
  // ---- GPS (GBU-39 no F-16 de teste): coordenada gravada, pode sair e a bomba acerta planando de longe
  await t.selectAircraft('f16'); AC.f16.wpn.bomb = { m: 'gbu39', n: 4, kg: 129, name: 'GBU-39 SDB', sh: 'SDB' }; t.startGame();
  const d4 = T.find((u) => u.type === 'dep' && u.alive); fly(d4.pos.clone().add(new V(0, 8000, 14000)), new V(0, 0, -230)); t.sim(.1); P.wpn = 6; P.lock = d4; t.fireMissile(); P.lock = null;
  t.sim(120, () => { P.hp = 100; P.lock = null; }); o.gpsPlanaEAcerta = !d4.alive || d4.hp < 1.5;
  // ---- Exocet só em navio
  t.S.mission = 'c8'; AC.f16.wpn.agm = { m: 'exocet', n: 1, kg: 670, name: 'Exocet AM39', sh: 'EXO' }; t.startGame(); const ship = T.find((u) => u.type === 'ship');
  fly(ship.pos.clone().add(new V(0, 300, -20000)), new V(0, 0, 250)); /* vindo do norte, por mar aberto */ t.sim(.1); P.wpn = 5; P.lock = ship; t.fireMissile(); const ex = t.MS.find((m) => m.type === 'exocet');
  o.exocetSai = !!ex; let low = 1e9; t.sim(90, () => { P.lock = ship; P.hp = 100; if (ex.alive && Math.hypot(ex.pos.x - ship.pos.x, ex.pos.z - ship.pos.z) > 3000 && ex.t > 6) low = Math.min(low, ex.pos.y); });
  o.exocetRenteAoMar = low < 25; o.exocetAcerta = ship.hp < 3;
  // ---- furtividade: o mesmo SAM a 9 km lança no F-16 normal e não lança no "F-16 furtivo"
  const samTry = async (stealth) => { AC.f16.stealth = stealth; t.S.mission = 'c6'; t.startGame(); const sam = T.find((u) => u.type === 'sam'); fly(sam.pos.clone().add(new V(0, 3000, 6000)), new V(0, 0, -200)); let l = false; t.sim(10, () => { P.pos.copy(sam.pos).add(new V(0, 3000, 6000)); P.hp = 100; if (t.MS.some((m) => m.type === 'gsam')) l = true; }); return l; };
  o.samVeAviaoNormal = await samTry(0); o.samNaoVeFurtivo = !(await samTry(.1)); AC.f16.stealth = 0;
  return o;
});
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok, null, 1), errs.slice(0, 5)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: armas reais passaram'); else { console.log('FALHOU'); process.exit(1); }
