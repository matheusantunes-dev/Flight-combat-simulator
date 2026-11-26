// Aerodinâmica: efeito solo perto da água, estol com o nariz caindo, parafuso com pedal (sem FBW) e saída com pedal contrário,
// FBW em modo assistido não entra em parafuso, e a cabeça do piloto com inércia (afunda ao puxar G; fixa no VR).
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
await start('f14', 'real');
ok.efeitoSolo = await p.evaluate(() => { const t = __tomcat, P = t.P; P.pos.set(0, 5.5, -30000); t.sim(.05); const low = P.ge; P.pos.set(0, 600, -30000); t.sim(.05); return low > .15 && P.ge < .05; });
// lento e puxando tudo com pedal: estola e entra em parafuso
const spin = await p.evaluate(() => { const t = __tomcat, P = t.P; P.pos.set(0, 5000, -30000); P.vel.set(0, 0, -95); P.thr = .3; const K = t.K; K.KeyS = true; K.KeyE = true; let stalled = false, spun = 0, sink = 0;
  t.sim(8, () => { if (P.stall) stalled = true; if (P.spin) spun = P.spin; }); sink = P.vel.y; const y0 = P.pos.y;
  // saída: pedal contrário (Q), manche à frente (W), manete reduzida
  K.KeyS = false; K.KeyE = false; K.KeyQ = spun > 0; K.KeyD = false; K.KeyW = true; if (spun < 0) K.KeyE = true; let out = false; t.sim(10, () => { if (!P.spin) out = true; }); for (const k in K) K[k] = false;
  return { stalled, spun, sink, out, alive: P.state === 'fly' }; });
ok.estola = spin.stalled; ok.parafusoComPedal = spin.spun !== 0 && spin.sink < -15; ok.saiDoParafuso = spin.out;
await start('f16', 'assist');
ok.fbwNaoEntraEmParafuso = await p.evaluate(() => { const t = __tomcat, P = t.P; P.pos.set(0, 5000, -30000); P.vel.set(0, 0, -95); const K = t.K; K.KeyS = true; K.KeyE = true; let spun = false; t.sim(8, () => { if (P.spin) spun = true; }); for (const k in K) K[k] = false; return !spun; });
// cabeça: puxar G afunda a cabeça; no VR fica parada
ok.cabecaComInercia = await p.evaluate(async () => { const t = __tomcat, P = t.P; P.pos.set(0, 5000, -30000); P.vel.set(0, 0, -260); t.K.KeyS = true; await new Promise((r) => setTimeout(r, 1500)); const y = t.cockCam.position.y, g = P.g; t.K.KeyS = false; return y < -.02 && g > 3; });
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), spin, errs.slice(0, 3)); await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: aerodinâmica passou'); else { console.log('FALHOU'); process.exit(1); }
