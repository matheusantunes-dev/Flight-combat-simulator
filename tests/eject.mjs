// Ejeção, paraquedas e modo a pé: modos do assento por altitude/velocidade, descida de ~7 m/s, RIO no F-14,
// bote no mar, resgate, sair/entrar no avião no convés, cair do convés no mar e ejeção baixa demais (fatal).
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
const ok = {};
// Ctrl+E três vezes, no teclado de verdade
await p.evaluate(() => { const t = __tomcat; t.S.mission = 'fly'; t.startGame(); t.placeAir(); t.sim(0.5); });
// três Ctrl+E seguidos (o teclado do Playwright é lento demais no Chrome sem GPU para caber nos 2 s)
await p.evaluate(() => { for (let i = 0; i < 3; i++) { dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', ctrlKey: true })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', ctrlKey: true })); } });
Object.assign(ok, await p.evaluate(() => {
  const t = __tomcat, P = t.P, PB = t.PB, o = {};
  o.ctrlE3x = PB.on && P.state === 'out';
  t.sim(1); const b = PB.b, rio = t.EJ.find((x) => x.npc);
  o.rioSaiPrimeiro = !!rio && rio.t > b.t;
  o.modo3Alto = b.mode === 3 && b.phase === 'drogue';
  t.sim(40); o.abreAbaixoDe15mil = b.phase === 'chute' && b.pos.y * 3.28084 < 15000;
  o.aviaoCaiu = P.wreck === true;
  // ---- ejeção baixa e lenta: modo 1, paraquedas logo, descida ~7 m/s, pouso no mar, bote, resgate
  t.startGame(); t.placeAir(); P.pos.set(0, 700, -8000); P.vel.set(0, 0, -115); t.sim(0.2); t.eject(); t.sim(0.6);
  const c = PB.b; o.modo1 = c.mode === 1 && c.phase === 'seat' || c.mode === 1 && c.phase === 'chute';
  t.sim(8); o.paraquedasAberto = c.phase === 'chute' && c.chuteK === 1;
  const vs = -c.vel.y; o.descida7ms = vs > 5.5 && vs < 8.5;
  t.sim(120); o.pousoNoMar = c.phase === 'water' && c.land === 'water';
  t.sim(6); o.boteSaiu = !!c.raft;
  c.pos.copy(c.raft.position); c.pos.y = 0; t.pbAction(); o.subiuNoBote = c.phase === 'raft';
  t.pbAction(); o.resgateChamado = PB.sar > 0; t.sim(13);
  o.resgatadoNoConves = PB.on && PB.b.phase === 'walk' && Math.abs(PB.b.pos.y - 21.8) < .2 && P.parked && P.state === 'out';
  // anda até o avião novo e entra
  PB.b.pos.set(P.pos.x - 5, 21.8, P.pos.z); t.pbAction(); o.entrouNoAviao = !PB.on && P.state === 'cat';
  // sair do avião parado e andar
  t.pbAction(); const w = PB.b; o.saiuDoAviao = PB.on && w.phase === 'walk';
  const x0 = w.pos.clone(); t.K.KeyW = true; t.sim(3); t.K.KeyW = false; o.andou = w.pos.distanceTo(x0) > 3;
  // corre até a borda e cai no mar
  w.pos.set(-37, 21.8, 40); PB.yaw = Math.PI / 2; t.K.KeyW = true; t.K.ShiftLeft = true; t.sim(4); t.K.KeyW = false; t.K.ShiftLeft = false;
  o.caiuDoConvesNoMar = w.phase === 'water';
  // ejeção invertida a 30 m: fatal
  t.startGame(); t.placeAir(); P.pos.set(0, 30, -9000); P.vel.set(0, 0, -150); P.q.setFromEuler(new THREE.Euler(0, 0, Math.PI)); t.sim(0.05); P.q.setFromEuler(new THREE.Euler(0, 0, Math.PI)); P.up.set(0, -1, 0); t.eject(); t.sim(6);
  o.invertidoBaixoFatal = t.G.mode === 'over' && /baixa/.test(document.getElementById('ovr').textContent + (PB.deadSaid ? 'baixa' : ''));
  // ejeção zero-zero do convés
  t.S.mission = 'fly'; t.startGame(); t.placeCat(); t.sim(0.5); t.eject(); t.sim(30);
  const z = PB.b; o.zeroZeroSobrevive = z && ['walk', 'water'].includes(z.phase) && z.land !== 'fatal';
  return o;
}));
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok, null, 1), errs.slice(0, 5));
await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: ejeção e modo a pé passaram'); else { console.log('FALHOU'); process.exit(1); }
