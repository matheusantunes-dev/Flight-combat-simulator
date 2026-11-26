// Câmeras de cinema e áudio: fly-by com Doppler (som grave ao afastar, agudo ao aproximar), câmera presa ao míssil,
// replay de 20 s do próprio avião, cone de vapor perto de Mach 1 e avisos falados Over-G / Pull Up.
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

// 1) fly-by: a câmera fica parada à frente e o avião passa por ela
const fb = await p.evaluate(() => { const t = __tomcat, P = t.P; P.pos.set(0, 4000, -30000); P.vel.set(0, 0, -300); t.fbySet(true);
  const d0 = [], dop = []; t.simc(.5); const camA = t.camera.position.clone();
  for (let i = 0; i < 90; i++) { t.simc(1 / 60); d0.push(P.pos.distanceTo(t.camera.position)); dop.push(t.dop()); }
  const camB = t.camera.position.clone(); const parada = camA.distanceTo(camB) < 1;
  const aprox = Math.max(...dop.slice(0, 8)), afasta = Math.min(...dop.slice(-8));
  const perto = Math.min(...d0); t.fbySet(false); t.simc(.1);
  return { parada, aprox, afasta, perto, dop1: t.dop(), vol: t.dvol() }; });
ok.flybyParada = fb.parada;
ok.flybyPassaPerto = fb.perto < 400;
ok.dopplerSobeEDesce = fb.aprox > 1.05 && fb.afasta < .95;   // f' = f·c/(c+vr)
ok.dopplerVoltaAoNormal = Math.abs(fb.dop1 - 1) < 1e-6 && Math.abs(fb.vol - 1) < 1e-6;

// 2) câmera do míssil: só com míssil no ar, e fica atrás dele olhando para a frente
const mc = await p.evaluate(() => { const t = __tomcat, P = t.P; P.pos.set(0, 5000, -30000); P.vel.set(0, 0, -260); t.MS.length = 0;
  t.mcamSet(true); const semMissil = !t.MCAM.on;
  const tg = t.spawnBandit(new THREE.Vector3(0, 5000, -36000), 'fighter', 'mig29', null);
  t.spawnMissile('aim9', 'player', P.pos.clone().add(new THREE.Vector3(0, 0, -40)), new THREE.Vector3(0, 0, -420), tg).delay = 0;
  t.mcamSet(true); const ligou = t.MCAM.on; t.simc(.5);
  const m = t.MCAM.m, atras = m ? t.camera.position.distanceTo(m.pos) : 999;
  const olhaPraFrente = m ? (() => { const f = new THREE.Vector3(0, 0, -1).applyQuaternion(t.camera.quaternion); const d = m.pos.clone().sub(t.camera.position).normalize(); return f.dot(d) > .5; })() : false;
  t.mcamSet(false); t.MS.length = 0;
  return { semMissil, ligou, atras, olhaPraFrente }; });
ok.missilCamPrecisaDeMissil = mc.semMissil;
ok.missilCamLiga = mc.ligou && mc.atras > 8 && mc.atras < 45 && mc.olhaPraFrente;

// 3) replay: grava fita e toca os últimos segundos sem mexer no avião vivo
const rp = await p.evaluate(async () => { const t = __tomcat, P = t.P; P.pos.set(0, 6000, -30000); P.vel.set(0, 0, -280);
  t.RPL.n = 0; t.RPL.w = 0; t.simc(3); const fita = t.RPL.n;
  const viva = P.pos.clone(); const ligou = t.rplStart(); t.simc(.5);
  const paradoNoAr = P.pos.distanceTo(viva) < 1;             // o jogo pausa durante o replay
  const modeloNaFita = typeof me !== 'undefined' ? me.g.position.distanceTo(P.pos) > 50 : true;
  t.rplStop(); t.simc(.2);
  return { fita, ligou, paradoNoAr, modeloNaFita, voltou: !t.RPL.on && !t.G.paused }; });
ok.replayGravaFita = rp.fita > 80;      // ~30 amostras/s em 3 s
ok.replayToca = rp.ligou && rp.paradoNoAr && rp.modeloNaFita;
ok.replaySai = rp.voltou;

// 4) cone de vapor perto de Mach 1 (visível só de fora) e o boom ao cruzar
const vp = await p.evaluate(() => { const t = __tomcat, P = t.P; P.pos.set(0, 3000, -30000); P.state = 'fly'; t.fbySet(true);
  const op = (m) => { P.mach = m; t.vaporTick(1 / 60); const v = t.vapor(); return v && v.visible ? v.material.opacity : 0; };
  const off = op(.6), on1 = op(.99); P.mach = .9; t.vaporTick(1 / 60);
  P.mach = 1.02; t.vaporTick(1 / 60); const boom = t.boom(); const off2 = op(1.7);
  t.fbySet(false); return { off, on1, off2, boom }; });
ok.vaporPertoDeMach1 = vp.on1 > .05 && vp.off < .02 && vp.off2 < .05;
ok.boomAoCruzarMach1 = vp.boom > 0;

// 5) vozes: Over-G e Pull Up, com intervalo mínimo (o aviso não repete a cada quadro)
const vx = await p.evaluate(() => { const t = __tomcat, P = t.P; t.VOX.og = t.VOX.pu = 0;
  P.pos.set(0, 5000, -30000); P.vel.set(0, 0, -260); P.g = 9; t.voxTick([], 1 / 60); const og1 = t.VOX.og;
  t.voxTick([], 1 / 60); const og2 = t.VOX.og;                      // só conta o tempo, não rearma
  P.g = 1; P.pos.set(0, 300, -30000); P.vel.set(0, -90, -200); P.gearPos = 0; t.voxTick([], 1 / 60); const pu = t.VOX.pu;
  P.vel.set(0, 0, -200); P.pos.set(0, 5000, -30000); return { og1, og2, pu }; });
ok.vozOverG = vx.og1 > 3 && vx.og2 < vx.og1;
ok.vozPullUp = vx.pu > 3;

// 6) botões de toque (celular não tem F2/F6/F3): a linha CINE liga as mesmas câmeras
await start('f16', 'assist');
const tap = (id) => p.evaluate((id) => { const el = document.getElementById(id);
  for (const t of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 1, isPrimary: true })); }, id);
const st = () => p.evaluate(() => ({ fby: __tomcat.FBY.on, mcam: __tomcat.MCAM.on, rpl: __tomcat.RPL.on, row: !document.getElementById('tCineRow').classList.contains('hide'), onCine: document.getElementById('tCine').classList.contains('on') }));
await p.evaluate(() => { const t = __tomcat, P = t.P; __tomcat.TOUCH.ui = true; document.getElementById('tc').classList.remove('hide'); P.pos.set(0, 4000, -30000); P.vel.set(0, 0, -280); t.RPL.n = 0; t.simc(2); });
await tap('tCine'); const s1 = await st();
await tap('tFby'); const s2 = await st();
await tap('tFby'); const s3 = await st();
await tap('tRpl'); const s4 = await st();
await tap('tRpl'); const s5 = await st();
ok.toqueAbreLinhaCine = s1.row;
ok.toqueLigaFlyby = s2.fby && s2.onCine;
ok.toqueDesligaFlyby = !s3.fby;
ok.toqueReplay = s4.rpl && !s5.rpl;

ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), JSON.stringify({ fb, mc, rp, vp, vx, s1, s2, s4 }).slice(0, 700), errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: câmeras de cinema e áudio passaram'); else { console.log('FALHOU'); process.exit(1); }
