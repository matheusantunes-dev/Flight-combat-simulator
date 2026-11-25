// Teste do multiplayer com 2 abas no mesmo navegador (?rede=local usa BroadcastChannel, sem internet).
// Cobre: lobby, PvP (acerto, queda, placar, renascimento) e coop (inimigos do anfitrião aparecem no convidado e o abate dele conta).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = (process.env.FCS_URL || 'http://localhost:8080/index.html').split('?')[0];
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1100, height: 650 } });
if (process.env.LIBS) {
  const lib = (f) => readFileSync(process.env.LIBS + '/' + f, 'utf8');
  await ctx.route(/three\.min\.js|GLTFLoader\.js|meshopt_decoder\.mjs|fonts\.g/, (r) => {
    const u = r.request().url();
    const f = u.includes('three.min') ? 'three.min.js' : u.includes('GLTFLoader') ? 'GLTFLoader.js' : u.includes('meshopt') ? 'meshopt_decoder.mjs' : null;
    return f ? r.fulfill({ body: lib(f), contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }) : r.fulfill({ body: '' });
  });
}
const errs = [];
const ready = (p) => p.waitForFunction(() => window.__tomcat && !document.querySelector('#go').disabled, null, { timeout: 120000 });
const open = async (n, q) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(n + ': ' + e)); await p.goto(BASE + q); await ready(p); return p; };
const ok = {};

const A = await open('A', '?rede=local');
await A.evaluate(() => { __tomcat.S.name = 'Alfa'; });
await A.click('#mpOpen'); await A.click('#mpCreate'); await A.waitForTimeout(800);
const code = await A.evaluate(() => __tomcat.NET.code);
const B = await open('B', '?sala=' + code + '&rede=local');
await B.evaluate(() => { __tomcat.S.name = 'Bravo'; }); await B.waitForTimeout(800);
await B.click('#mpEnter'); await B.waitForTimeout(3000);
ok.lobby = (await A.evaluate(() => __tomcat.NET.peers.size)) === 1 && (await B.evaluate(() => __tomcat.NET.hostId === [...__tomcat.NET.peers.keys()][0]));

await A.click('#mpMode [data-v=pvp]'); await A.waitForTimeout(2500); await A.click('#mpStart'); await A.waitForTimeout(3000);
ok.pvpStart = (await B.evaluate(() => __tomcat.NET.match && __tomcat.G.mission === 'pvp'));
await A.evaluate(() => { const r = __tomcat.T.find((t) => t.kind === 'remote'); for (let i = 0; i < 3; i++) __tomcat.damage(r, 1, 'aim9'); });
await A.waitForTimeout(1500);
ok.pvpKill = (await B.evaluate(() => __tomcat.P.state === 'dead')) && (await A.evaluate(() => __tomcat.G.kills === 1));
await B.waitForTimeout(6000);
ok.respawn = await B.evaluate(() => __tomcat.P.state === 'fly' && __tomcat.P.hp === 100);
await A.evaluate(() => { __tomcat.NET.board.get(__tomcat.NET.me).k = 10; }); await A.waitForTimeout(5000);
ok.pvpEnd = (await B.evaluate(() => document.getElementById('ovr').textContent)).includes('venceu');

await A.click('#again'); await B.click('#again'); await A.waitForTimeout(800);
await A.click('#mpMode [data-v=coop]'); await A.waitForTimeout(2500); await A.click('#mpStart'); await A.waitForTimeout(2500);
await A.evaluate(() => { __tomcat.G.waveT = 0.1; __tomcat.sim(1); }); await A.waitForTimeout(2500);
ok.coopGhosts = (await B.evaluate(() => __tomcat.T.filter((t) => t.ghost).length)) > 0;
await B.evaluate(() => { const g = __tomcat.T.find((t) => t.ghost && t.kind === 'bandit'); __tomcat.damage(g, 1, 'aim9'); __tomcat.damage(g, 1, 'aim9'); });
await B.waitForTimeout(2000);
ok.coopKill = (await B.evaluate(() => __tomcat.G.kills)) === 1;

console.log(JSON.stringify(ok, null, 2));
await b.close();
const failed = Object.entries(ok).filter(([, v]) => !v).map(([k]) => k);
if (errs.length) console.error('Erros na página:\n' + errs.join('\n'));
if (failed.length || errs.length) { console.error('FALHOU: ' + failed.join(', ')); process.exit(1); }
console.log('OK: multiplayer passou');
