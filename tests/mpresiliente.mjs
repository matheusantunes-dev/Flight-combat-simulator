// Multiplayer que não morre quando alguém cai: W.O. quando um time esvazia, volta com o mesmo time e abates,
// e migração de anfitrião (PvP e coop: a IA passa a rodar no novo anfitrião).
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
const open = async (n, q, pid) => { const p = await ctx.newPage(); await p.addInitScript((v) => { try { sessionStorage.setItem('fcs-pid', v); } catch (e) {} }, pid); p.on('pageerror', (e) => errs.push(n + ': ' + e)); await p.goto(BASE + q, { timeout: 120000 }); await ready(p); return p; };
const join = async (p, name, code) => { await p.evaluate((n) => { __tomcat.S.name = n; }, name); if (code) { await p.click('#mpEnter'); } await p.waitForTimeout(2500); };
const ok = {};
const nt = (p) => p.evaluate(() => Object.fromEntries(__tomcat.NET.teams));
const me = (p) => p.evaluate(() => __tomcat.NET.me);

// ---------- PvP ----------
const A = await open('A', '?rede=local', 'pa');
await A.evaluate(() => { __tomcat.S.name = 'Alfa'; }); await A.click('#mpOpen'); await A.click('#mpCreate'); await A.waitForTimeout(800);
const code = await A.evaluate(() => __tomcat.NET.code);
const B = await open('B', '?sala=' + code + '&rede=local', 'pb'); await join(B, 'Bravo', code);
const C = await open('C', '?sala=' + code + '&rede=local', 'pc'); await join(C, 'Charlie', code);
await A.click('#mpMode [data-v=pvp]'); await A.waitForTimeout(2000);
const idB = await me(B), idC = await me(C);
ok.times = (await nt(A))[idB] === 'vm' && (await nt(A))[idC] === 'az';
await A.click('#mpStart'); await A.waitForTimeout(3500);
await B.evaluate((c) => { const r = __tomcat.T.find((t) => t.kind === 'remote' && t.id === c); for (let i = 0; i < 3; i++) __tomcat.damage(r, 1, 'aim9'); }, idC);
await A.waitForTimeout(2000);
ok.abateDoVermelho = await A.evaluate((b) => (__tomcat.NET.board.get(b) || {}).k === 1, idB);
// o único do Vermelho cai: começa a contagem do W.O.
const B2 = await open('B2', '?sala=' + code + '&rede=local', 'pb'); // já carregada, entra só depois
await B.close(); await A.waitForTimeout(7000);
ok.contagemWO = await A.evaluate(() => __tomcat.NET.woTeam === 'vm' && __tomcat.NET.match);
// ele volta (mesmo piloto) antes dos 15 s: mesmo time, mesmos abates, W.O. cancelado
await join(B2, 'Bravo', code); await A.waitForTimeout(4000);
const idB2 = await me(B2);
ok.voltouNoMesmoTime = (await nt(A))[idB2] === 'vm' && (await B2.evaluate(() => __tomcat.NET.match && __tomcat.G.mission === 'pvp'));
ok.voltouComAbates = await A.evaluate((b) => (__tomcat.NET.board.get(b) || {}).k === 1, idB2) && await B2.evaluate(() => (__tomcat.NET.board.get(__tomcat.NET.me) || {}).k === 1);
ok.woCancelado = await A.evaluate(() => __tomcat.NET.woTeam === '' && __tomcat.NET.match);
// o anfitrião cai: alguém assume e a partida segue
await A.close(); await B2.waitForTimeout(7000);
const h = [await B2.evaluate(() => [__tomcat.NET.host, __tomcat.NET.hostId, __tomcat.NET.match, __tomcat.G.mode]), await C.evaluate(() => [__tomcat.NET.host, __tomcat.NET.hostId, __tomcat.NET.match, __tomcat.G.mode])];
ok.umNovoAnfitriao = h.filter((x) => x[0]).length === 1 && h[0][1] === h[1][1] && h[0][1] !== '';
ok.partidaSegue = h.every((x) => x[2] && x[3] === 'play');
// o novo anfitrião ainda decide o fim
const H = h[0][0] ? B2 : C, O = h[0][0] ? C : B2;
await H.evaluate((c) => { __tomcat.NET.board.set(c, { k: 12, d: 0 }); }, idC); await H.waitForTimeout(4000);
ok.fimComNovoAnfitriao = (await O.evaluate(() => document.getElementById('ovr').textContent)).includes('Time Azul venceu');
await B2.close(); await C.close();

// ---------- Coop: a IA migra ----------
const D = await open('D', '?rede=local', 'pd');
await D.evaluate(() => { __tomcat.S.name = 'Delta'; }); await D.click('#mpOpen'); await D.click('#mpCreate'); await D.waitForTimeout(800);
const code2 = await D.evaluate(() => __tomcat.NET.code);
const E = await open('E', '?sala=' + code2 + '&rede=local', 'pe'); await join(E, 'Eco', code2);
await D.click('#mpStart'); await D.waitForTimeout(2500);
await D.evaluate(() => { __tomcat.G.waveT = 0.1; __tomcat.sim(1); }); await D.waitForTimeout(2500);
ok.coopFantasmas = (await E.evaluate(() => __tomcat.T.filter((t) => t.ghost).length)) > 0;
await D.close(); await E.waitForTimeout(7000);
ok.coopAssumiu = await E.evaluate(() => __tomcat.NET.host && __tomcat.NET.match && __tomcat.G.mission === 'free');
ok.iaViraReal = await E.evaluate(() => __tomcat.T.some((t) => t.kind === 'bandit' && !t.ghost && t.alive) && !__tomcat.T.some((t) => t.ghost));
await E.close();

ok.semErros = errs.length === 0;
console.log(JSON.stringify(ok, null, 2), errs.slice(0, 5));
await b.close();
if (Object.values(ok).every(Boolean)) console.log('OK: multiplayer resiliente passou'); else { console.log('FALHOU'); process.exit(1); }
