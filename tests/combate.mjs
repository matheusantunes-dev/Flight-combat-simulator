// Combate realista: míssil com fases (boost, sustentação, planeio), perde energia em curva fechada e em ar rarefeito;
// flare quase não engana com pós-combustor; chaff só funciona no feixe (notch); brilho do míssil pequeno.
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
await p.evaluate(async () => { const t = __tomcat; t.S.fh = true; await t.selectAircraft('f16'); setupPlayer('f16'); t.S.mission = 'fly'; t.startGame(); t.placeAir(); });
const ok = {};
// voo de um míssil sem alvo, reto: velocidade sobe no boost, se mantém na sustentação e cai no planeio
const fly = (type, y, tgt) => p.evaluate(([type, y, tgt]) => { const t = __tomcat; t.MS.length = 0; const pos = new THREE.Vector3(0, y, 0), vel = new THREE.Vector3(0, 0, -250);
  let target = null; if (tgt) target = { alive: true, pos: new THREE.Vector3(0, y, -3000), vel: new THREE.Vector3(0, 0, 0), kind: 'dummy' };
  const m = t.spawnMissile(type, 'enemy', pos, vel, target); const out = []; for (let i = 0; i < 1500 && m.alive; i++) { if (target) { target.pos.set(Math.sin(i * .02) * 2500, y + Math.cos(i * .03) * 600, -3000 - i * 2); target.vel.set(250, 0, -100); } t.updMissiles(.02); if (i % 25 === 0) out.push(+m.vel.length().toFixed(0)); }
  return out; }, [type, y, tgt]);
const a120 = await fly('aim120', 5000, false);
// amostras a cada 0,5 s: boost de 4 s (0–8), sustentação até 8 s (8–16), depois planeio
ok.boostSustentacaoPlaneio = a120[8] > a120[0] + 600 && Math.abs(a120[15] - a120[9]) < 60 && a120[a120.length - 1] < a120[16] - 150;
const hiAlt = await fly('aim9', 13000, true), loAlt = await fly('aim9', 2000, true);
ok.curvaGastaEnergia = Math.min(...loAlt.slice(6)) < Math.max(...loAlt) - 150;
ok.semAlvoNaoCaiAAltaAltitudeIgual = hiAlt.length > 0;
// contramedidas
const cm = await p.evaluate(() => { const t = __tomcat, P = t.P; P.pos.set(0, 5000, 0); const mk = (type, from) => ({ type, d: t.MDEF[type], pos: from.clone(), alive: true });
  P.vel.set(0, 0, -250); const behind = new THREE.Vector3(0, 5000, 3000), side = new THREE.Vector3(3000, 5000, 0);
  P.ab = 1; const flareAB = t.cmChance(mk('aim9', behind), P, 'flare'); P.ab = 0; P.thr = .6; const flareIdle = t.cmChance(mk('aim9', side), P, 'flare');
  const flare9x = t.cmChance(mk('aim9x', side), P, 'flare'); const chaffBeam = t.cmChance(mk('aim120', side), P, 'chaff'), chaffNose = t.cmChance(mk('aim120', behind), P, 'chaff');
  return { flareAB, flareIdle, flare9x, chaffBeam, chaffNose }; });
ok.flareComPosNaoEngana = cm.flareAB < cm.flareIdle * .4;
ok.buscadorModernoResiste = cm.flare9x < cm.flareIdle * .4;
ok.chaffSoNoFeixe = cm.chaffBeam > cm.chaffNose * 3;
// brilho do bocal: pequeno de perto
ok.brilhoPequeno = await p.evaluate(() => { const t = __tomcat; t.MS.length = 0; const m = t.spawnMissile('aim9', 'player', t.P.pos.clone().add(new THREE.Vector3(0, 0, -30)), new THREE.Vector3(0, 0, -300), null); t.updMissiles(.05); return m.fl.scale.x < 2.2; });
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), { a120, loAlt: loAlt.slice(0, 12), cm }, errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: combate passou'); else { console.log('FALHOU'); process.exit(1); }
