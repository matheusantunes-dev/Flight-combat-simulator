// Testa o joystick programável (com um manche falso) e o modo VR (tela dividida + giroscópio simulado).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const URL0 = (process.env.FCS_URL || 'http://localhost:8080/index.html').split('?')[0];
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
if (process.env.LIBS) {
  const lib = (f) => readFileSync(process.env.LIBS + '/' + f, 'utf8');
  await ctx.route(/three\.min\.js|GLTFLoader\.js|meshopt_decoder\.mjs|fonts\.g/, (r) => {
    const u = r.request().url();
    const f = u.includes('three.min') ? 'three.min.js' : u.includes('GLTFLoader') ? 'GLTFLoader.js' : u.includes('meshopt') ? 'meshopt_decoder.mjs' : null;
    return f ? r.fulfill({ body: lib(f), contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }) : r.fulfill({ body: '' });
  });
}
// manche falso: 6 eixos e 12 botões, sem layout padrão (como um joystick de voo USB)
await ctx.addInitScript(() => {
  window.__pad = { id: 'Fake Flight Stick (Vendor: 1234 Product: 5678)', index: 0, connected: true, mapping: '', timestamp: 0,
    axes: [0, 0, 0, 0, 0, 0], buttons: Array.from({ length: 12 }, () => ({ pressed: false, value: 0 })) };
  navigator.getGamepads = () => [window.__pad];
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(URL0);
await p.waitForFunction(() => window.__tomcat && !document.querySelector('#go').disabled, null, { timeout: 120000 });
const ok = {};

await p.click('.tabs button[data-tab=opts]'); await p.click('#ctlOpen'); await p.waitForTimeout(300);
const bind = async (act, fn) => {
  await p.evaluate((a) => { const rows = [...document.querySelectorAll('#joyList .jrow')]; const r = rows.find((x) => x.querySelector('span').textContent.startsWith(a)); r.querySelector('button').click(); }, act);
  await p.waitForTimeout(150); await p.evaluate(fn); await p.waitForTimeout(250);
  await p.evaluate(() => { __pad.axes = [0, 0, 0, 0, 0, 0]; __pad.buttons.forEach((x) => { x.pressed = false; x.value = 0; }); }); await p.waitForTimeout(150);
};
await bind('Arfagem', () => { __pad.axes[1] = 0.9; });
await bind('Rolagem', () => { __pad.axes[0] = -0.9; });
await bind('Manete', () => { __pad.axes[2] = -1; });
await bind('Disparar', () => { __pad.buttons[3].pressed = true; __pad.buttons[3].value = 1; });
const B = await p.evaluate(() => __tomcat.JOY.b);
ok.gravouEixos = B.pitch && B.pitch.i === 1 && !B.pitch.inv && B.roll.i === 0 && B.roll.inv && B.thr.i === 2 && B.thr.inv;
ok.gravouBotao = B.fire && B.fire.t === 'b' && B.fire.i === 3;
await p.click('#ctlClose');

await p.evaluate(() => { const t = __tomcat; t.S.mission = 'fly'; t.startGame(); __pad.axes[1] = 0.8; __pad.axes[0] = -0.5; __pad.axes[2] = -1; t.sim(0.5); });
const st = await p.evaluate(() => ({ pitch: __tomcat.IN.pitch, roll: __tomcat.IN.roll, thr: __tomcat.P.thr }));
ok.manche = st.pitch > 0.4 && st.roll > 0.2; // eixo 0 invertido: -0.5 vira rolagem para a direita
ok.manete = st.thr > 1.25; // manete toda à frente = pós-combustor

await p.evaluate(() => __tomcat.vrSet(true)); await p.waitForTimeout(300);
await p.evaluate(() => { dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 90, gamma: 0 })); dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 30, beta: 90, gamma: 0 })); __tomcat.sim(0.1); });
await p.waitForTimeout(1500);
ok.vr = await p.evaluate(() => __tomcat.VR.on && __tomcat.VR.gyro && document.body.classList.contains('vr'));
ok.giroscopio = await p.evaluate(() => Math.abs(__tomcat.VR.rel.y) > 0.05);
if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + '/vr.png' });
await p.evaluate(() => __tomcat.vrSet(false)); await p.waitForTimeout(300);
ok.saiuVR = await p.evaluate(() => !__tomcat.VR.on && !document.body.classList.contains('vr'));

// celular em pé (rotação travada) com o óculos deitado: o jogo desenha em paisagem e gira a tela
const m = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
if (process.env.LIBS) await m.route(/three\.min\.js|GLTFLoader\.js|meshopt_decoder\.mjs|fonts\.g/, (r) => {
  const u = r.request().url(), lib = (f) => readFileSync(process.env.LIBS + '/' + f, 'utf8');
  const f = u.includes('three.min') ? 'three.min.js' : u.includes('GLTFLoader') ? 'GLTFLoader.js' : u.includes('meshopt') ? 'meshopt_decoder.mjs' : null;
  return f ? r.fulfill({ body: lib(f), contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }) : r.fulfill({ body: '' });
});
const q = await m.newPage(); q.on('pageerror', (e) => errs.push(String(e)));
await q.goto(URL0); await q.waitForFunction(() => window.__tomcat && !document.querySelector('#go').disabled, null, { timeout: 120000 });
await q.evaluate(() => { const t = __tomcat; t.S.mission = 'fly'; t.startGame(); t.sim(0.3); });
await q.evaluate(() => __tomcat.vrSet(true)); await q.waitForTimeout(300);
await q.evaluate(() => dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 0, gamma: -88 }))); await q.waitForTimeout(600);
const pr = await q.evaluate(() => { const c = document.querySelector('#gl'); return { rot: __tomcat.VR.rot, wide: c.width > c.height, aviso: !document.querySelector('#rot').classList.contains('hide') }; });
ok.vrDeitadoComTelaEmPe = pr.rot === 90 && pr.wide && !pr.aviso;
console.log(JSON.stringify(ok, null, 2));
await b.close();
const failed = Object.entries(ok).filter(([, v]) => !v).map(([k]) => k);
if (errs.length) console.error('Erros na página:\n' + errs.join('\n'));
if (failed.length || errs.length) { console.error('FALHOU: ' + failed.join(', ')); process.exit(1); }
console.log('OK: joystick e VR passaram');
