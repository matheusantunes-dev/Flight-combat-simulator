// Testa o Mundo Real (Rio) com relevo, satélite e prédios SINTÉTICOS: não depende de AWS/EOX/OpenFreeMap no CI.
// Confere: blocos de terreno na tela, altura do terreno na física, prédios carregados e colisão com prédio.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import geojsonVt from 'geojson-vt';
import vtpbf from 'vt-pbf';
const LIBS=process.env.LIBS,L=f=>readFileSync(LIBS+'/'+f,'utf8');const URL0=(process.env.FCS_URL||'http://localhost:8080/index.html').split('?')[0];
const t2lon=(x,z)=>x/2**z*360-180,t2lat=(y,z)=>Math.atan(Math.sinh(Math.PI*(1-2*y/2**z)))*180/Math.PI;
// relevo falso: mar ao sul de -22.985 (orla), "morros" ao norte, "Pão de Açúcar" perto de -22.95,-43.155
const H=(lat,lon)=>{if(lat<-22.985)return -20;let h=10+(lat+22.985)*9000;h+=380*Math.exp(-(((lat+22.95)/.006)**2+((lon+43.155)/.006)**2));h+=700*Math.exp(-(((lat+22.95)/.02)**2+((lon+43.21)/.02)**2));return Math.min(h,1100)};
const terr=(z,x,y)=>{const p=new PNG({width:256,height:256});for(let j=0;j<256;j++)for(let i=0;i<256;i++){const lat=t2lat(y+j/256,z),lon=t2lon(x+i/256,z),v=H(lat,lon)+32768,k=(j*256+i)*4;p.data[k]=Math.floor(v/256);p.data[k+1]=Math.floor(v)%256;p.data[k+2]=Math.floor((v%1)*256);p.data[k+3]=255}return PNG.sync.write(p)};
const img=(z,x,y)=>{const p=new PNG({width:256,height:256});for(let j=0;j<256;j++)for(let i=0;i<256;i++){const lat=t2lat(y+j/256,z),lon=t2lon(x+i/256,z),h=H(lat,lon),k=(j*256+i)*4;const city=h>0&&h<120&&((Math.floor(i/8)+Math.floor(j/8))%2);const c=h<0?[20,60,90]:h<15?[205,190,150]:city?[150,150,145]:[70+h/12,110,60];p.data[k]=c[0];p.data[k+1]=c[1];p.data[k+2]=c[2];p.data[k+3]=255}return PNG.sync.write(p)};
// prédios falsos: grade de blocos na orla
const feats=[];for(let a=0;a<40;a++)for(let b=0;b<12;b++){const lat=-22.983+b*.0012,lon=-43.19+a*.0012,d=.00035;feats.push({type:'Feature',properties:{render_height:15+((a*7+b*3)%10)*8,render_min_height:0},geometry:{type:'Polygon',coordinates:[[[lon,lat],[lon,lat+d],[lon+d,lat+d],[lon+d,lat],[lon,lat]]]}})}
const idx=geojsonVt({type:'FeatureCollection',features:feats},{maxZoom:14,indexMaxZoom:14,extent:4096,buffer:64});
const hits={t:0,i:0,b:0};
const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1280,height:720}});
await ctx.route(LIBS?/three\.min|GLTFLoader|meshopt|fonts\.g|esm\.run|elevation-tiles-prod|tiles\.maps\.eox|openfreemap/:/elevation-tiles-prod|tiles\.maps\.eox|openfreemap/,r=>{const u=r.request().url();let m;
 if(u.includes('three.min'))return r.fulfill({body:L('three.min.js'),contentType:'application/javascript'});
 if(u.includes('GLTF'))return r.fulfill({body:L('GLTFLoader.js'),contentType:'application/javascript'});
 if(u.includes('meshopt'))return r.fulfill({body:L('meshopt_decoder.mjs'),contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'}});
 if(u.includes('vector-tile'))return r.fulfill({body:L('vt.mjs'),contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'}});
 if(u.includes('esm.run/pbf'))return r.fulfill({body:L('pb.mjs'),contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'}});
 if((m=u.match(/terrarium\/(\d+)\/(\d+)\/(\d+)/))){hits.t++;return r.fulfill({body:terr(+m[1],+m[2],+m[3]),contentType:'image/png',headers:{'Access-Control-Allow-Origin':'*'}})}
 if((m=u.match(/\/g\/(\d+)\/(\d+)\/(\d+)\.jpg/))){hits.i++;return r.fulfill({body:img(+m[1],+m[3],+m[2]),contentType:'image/png',headers:{'Access-Control-Allow-Origin':'*'}})}
 if(u.endsWith('/planet'))return r.fulfill({body:JSON.stringify({tiles:['https://tiles.openfreemap.org/planet/test/{z}/{x}/{y}.pbf']}),contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'}});
 if((m=u.match(/test\/(\d+)\/(\d+)\/(\d+)\.pbf/))){hits.b++;const t=idx.getTile(+m[1],+m[2],+m[3]);const buf=t?vtpbf.fromGeojsonVt({building:t},{version:2}):new Uint8Array(0);return r.fulfill({body:Buffer.from(buf),contentType:'application/x-protobuf',headers:{'Access-Control-Allow-Origin':'*'}})}
 return r.fulfill({body:''})});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='warning'||m.type()==='error')errs.push(m.text())});
await p.goto(URL0);await p.waitForFunction(()=>window.__tomcat&&!document.querySelector('#go').disabled,null,{timeout:120000});
await p.click('[data-k=world] [data-v=rio]');await p.click('[data-k=wq] [data-v=alta]');await p.waitForTimeout(6000);

console.log('menu: carrierH',await p.evaluate(()=>__tomcat.terrainH?0:0),'hits',JSON.stringify(hits));
await p.evaluate(()=>{const t=__tomcat;t.S.mission='free';t.startGame();t.P.pos.set(0,900,-7500);t.sim(.1)});await p.waitForTimeout(8000);
console.log('fly: hits',JSON.stringify(hits),await p.evaluate(()=>{const W=__tomcat.WORLD;let bt=0,bb=0;for(const t of W.B.tiles.values()){if(t.mesh)bt++;if(t.boxes)bb+=t.boxes.length}return 'shown '+W.shown.size+' nodes '+W.nodes.size+' bTiles '+bt+' boxes '+bb+' h(0,-7500)='+__tomcat.realH(0,-7500).toFixed(1)+' h(carrier)='+__tomcat.realH(0,0).toFixed(1)}));

await p.evaluate(()=>{document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyC'}));window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyC',key:'c'}))});await p.waitForTimeout(3000);

await p.evaluate(()=>{const t=__tomcat;t.P.pos.set(-2300,260,-6300);t.setQ(0,-.12,0);t.P.vel.set(0,0,-120);t.sim(.05)});await p.waitForTimeout(7000);await p.evaluate(()=>{__tomcat.G.paused=true});await p.waitForTimeout(1500);await p.evaluate(()=>{__tomcat.G.paused=false});
// colisão com prédio: põe o avião dentro de um bloco
const crash=await p.evaluate(()=>{const W=__tomcat.WORLD;for(const t of W.B.tiles.values())if(t.boxes&&t.boxes.length){const bx=t.boxes[0];__tomcat.P.pos.set((bx[0]+bx[1])/2,bx[4]-3,(bx[2]+bx[3])/2);__tomcat.sim(.05);return __tomcat.P.state}return 'sem prédios'});
const st=await p.evaluate(()=>{const W=__tomcat.WORLD;let bt=0;for(const t of W.B.tiles.values())if(t.boxes)bt++;return {shown:W.shown.size,bt,land:__tomcat.realH(0,-7500),sea:__tomcat.realH(0,0)}});
// lugar sem mar (no relevo falso, só há mar ao sul do Rio): vira decolagem no ar, sem porta-aviões
await p.evaluate(()=>__tomcat.worldGo('Nova York',40.71,-74.0));await p.waitForTimeout(500);
const ny=await p.evaluate(()=>({nc:__tomcat.WORLD.noCarrier,lat:__tomcat.WORLD.lat0}));
await p.evaluate(()=>__tomcat.worldGo('Rio de Janeiro',-22.97,-43.18));await p.waitForTimeout(500);
const rio=await p.evaluate(()=>({nc:__tomcat.WORLD.noCarrier,lat:__tomcat.WORLD.lat0}));
// voo sem fim: no Voo livre, passar de 60 km recentraliza o mundo
const shift=await p.evaluate(()=>{const t=__tomcat;t.S.mission='fly';t.startGame();const lat0=t.WORLD.lat0;t.P.pos.set(0,3000,-61000);t.sim(.1);return {moved:Math.abs(t.WORLD.lat0-lat0)>.4,near:Math.hypot(t.P.pos.x,t.P.pos.z)<2000,state:t.P.state}});
const ok={terreno:st.shown>8,alturaTerra:st.land>20,alturaMar:st.sea<0,predios:st.bt>0,colisao:crash==='dead',semMar:ny.nc===true&&ny.lat>40,comMar:rio.nc===false&&rio.lat<-22.98,vooSemFim:shift.moved&&shift.near&&shift.state==='fly'};console.log(JSON.stringify(ok,null,2));
const bad=errs.filter(e=>!/GL Driver|GPU stall/.test(e));await b.close();const failed=Object.entries(ok).filter(([,v])=>!v).map(([k])=>k);
if(bad.length)console.error(bad.join('\n'));if(failed.length||bad.length){console.error('FALHOU: '+failed.join(', '));process.exit(1)}console.log('OK: mundo real passou');
