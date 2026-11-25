// Testa os alvos de solo e mar e as missões de ataque: AGM no radar, AAA atirando, SAM lançando,
// comboio andando até o porto (derrota), fragata no mar e vitória com solo + céu limpos.
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
// menu: abas e campanha 2 liberada desde o início
ok.abas = await p.evaluate(() => document.querySelectorAll('.tabs button').length === 4 && !!document.querySelector('section.tab.on[data-tab=play]'));
await p.click('.tabs button[data-tab=world]');
ok.abaMundo = await p.evaluate(() => getComputedStyle(document.querySelector('section[data-tab=world]')).display === 'block' && getComputedStyle(document.querySelector('section[data-tab=play]')).display === 'none');
await p.click('.tabs button[data-tab=play]');
ok.campanha2Liberada = await p.evaluate(() => !document.querySelector('[data-v=c5]').disabled && document.querySelector('[data-v=c6]').disabled);
await p.click('[data-v=c5]');
ok.selecaoUnica = await p.evaluate(() => document.querySelectorAll('[data-k=mission] button.on').length === 1 && /Martelo/.test(document.querySelector('#selLine').textContent));

const r = await p.evaluate(async () => {
  const t = window.__tomcat, P = t.P, G = t.G, T = t.T, out = {};
  t.S.fh = true; await t.selectAircraft('f16'); // o F-16 leva AGM-65 (o F-14 real não levava Maverick)
  const fly = (pos, look) => { P.state = 'fly'; P.gear = false; P.gearPos = 0; P.pos.copy(pos); const d = look.clone().sub(pos); d.y = 0; d.normalize(); const sp = 220; P.vel.set(d.x * sp, 0, d.z * sp); const h = Math.atan2(d.x, -d.z); P.q.setFromEuler(new THREE.Euler(-0.35, -h, 0, 'YXZ')); P.thr = P.spool = 0.9; };
  // ---- Missão 6: ataque à ilha
  t.S.mission = 'c5'; t.startGame();
  const gr = T.filter((u) => u.kind === 'ground');
  out.spawnSolo = gr.length === 7 && G.gtot === 4 && t.groundLeft() === 4;
  out.naTerra = gr.every((u) => u.gy > 5);
  const rad = gr.find((u) => u.type === 'rad');
  // AGM: arma 5, trava o radar e dispara
  fly(rad.pos.clone().add(new THREE.Vector3(0, 3500, 3500)), rad.pos);
  t.sim(0.2); t.radar(); P.wpn = 5; P.lock = null; t.lockCycle();
  out.travaSolo = P.lock && P.lock.kind === 'ground';
  P.lock = rad; t.fireMissile();
  out.agmNoAr = t.MS.some((m) => m.type === 'agm' && m.target === rad);
  const hold = rad.pos.clone().add(new THREE.Vector3(0, 3500, 3500)); t.sim(25, () => { P.pos.copy(hold); P.hp = 100; });
  out.agmDestruiu = !rad.alive && G.gkills >= 1 && t.WR.length >= 1;
  // míssil ar-ar não vai no chão
  const dep = gr.find((u) => u.type === 'dep' && u.alive); P.wpn = 3; P.lock = dep; const n0 = t.MS.length; t.fireMissile();
  out.arArRecusado = t.MS.length === n0;
  // AAA atira de perto
  const aaa = gr.find((u) => u.type === 'aaa');
  P.hp = 100; fly(aaa.pos.clone().add(new THREE.Vector3(0, 600, 1400)), aaa.pos); P.vel.set(0, 0, 0);
  let hit = false; t.sim(15, () => { P.vel.set(0, 0, 0); P.pos.copy(aaa.pos).add(new THREE.Vector3(0, 600, 1400)); if (P.hp < 100) hit = true; });
  out.aaaAtira = hit;
  // vitória: destrói o resto do solo e o céu
  for (const u of T.filter((u) => u.kind === 'ground' && u.alive)) t.damage(u, 9, 'gun');
  out.soloLimpo = t.groundLeft() === 0;
  G.waveT = 0.05; const safe = new THREE.Vector3(0, 3000, 8000); t.sim(0.5, () => { P.pos.copy(safe); P.hp = 100; });
  for (const e of T.filter((u) => u.alive && u.kind === 'bandit')) t.damage(e, 9, 'gun');
  t.sim(60, () => { P.pos.copy(safe); P.hp = 100; });
  out.vitoria = G.win === true;
  // ---- Missão 7: SEAD, SAM lança
  t.S.mission = 'c6'; t.startGame();
  const sam = T.find((u) => u.type === 'sam');
  P.hp = 100; fly(sam.pos.clone().add(new THREE.Vector3(0, 3000, 9000)), sam.pos);
  let lan = false; t.sim(12, () => { if (t.MS.some((m) => m.type === 'gsam' && m.owner === 'enemy')) lan = true; });
  out.samLanca = lan;
  // sem radar o SAM enxerga menos
  for (const u of T.filter((u) => u.type === 'rad')) t.damage(u, 9, 'gun');
  out.radarCaiu = !T.some((u) => u.alive && u.type === 'rad');
  // ---- Missão 8: comboio chega ao porto = derrota
  t.S.mission = 'c7'; t.startGame();
  const cv = T.filter((u) => u.kind === 'ground' && u.path);
  const p0 = cv[0].pos.clone(); P.pos.set(0, 5000, 20000); t.sim(5);
  out.comboioAnda = cv[0].pos.distanceTo(p0) > 40;
  for (const u of cv) { u.wp = u.path.length - 1; u.pos.copy(u.path[u.path.length - 1]); }
  t.sim(2);
  out.comboioDerrota = G.mode === 'over' && !G.win;
  // ---- Missão 9: fragatas no mar
  t.S.mission = 'c8'; t.startGame();
  const sh = T.filter((u) => u.type === 'ship');
  out.fragatasNoMar = sh.length === 3 && sh.every((u) => u.gy === 0 && u.pos.y > 5);
  t.damage(sh[0], 2, 'agm'); out.fragataAguenta = sh[0].alive; t.damage(sh[0], 2, 'agm'); out.fragataAfunda = !sh[0].alive;
  return out;
});
Object.assign(ok, r);
ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok), errs.slice(0, 5));
await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: solo e missões passaram'); else { console.log('FALHOU'); process.exit(1); }
