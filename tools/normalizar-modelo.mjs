// Uso: node tools/normalizar-modelo.mjs entrada.glb saida.glb id [glass=regex] [gear=regex] [drop=regex] [ax=X|Z] [nose=1|-1] [blend=1] [paint=r,g,b] [fixroot=1] [gearmat=regex] [shift=x,y,z]
// Depende de: npm i @gltf-transform/core @gltf-transform/extensions meshoptimizer
// Normaliza um GLB genérico pro padrão do jogo: nariz em +X, Y pra cima, nós renomeados (airframe/canopy/landingOn).
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';import {MeshoptDecoder} from 'meshoptimizer';
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const [inp,out,tag,...kv]=process.argv.slice(2);const O=Object.fromEntries(kv.map(a=>a.split('=')));const {glass:glassRe,gear:gearRe,drop:dropRe,ax:forceAx,nose:forceNose}=O;const doc=await io.read(inp);const r=doc.getRoot(),sc=r.listScenes()[0];
const GL=new RegExp(glassRe||'glass|canopy','i'),GR=gearRe?new RegExp(gearRe,'i'):null,DR=dropRe?new RegExp(dropRe,'i'):null;
if(O.fixroot)sc.listChildren()[0].setRotation([-Math.SQRT1_2,0,0,Math.SQRT1_2]);
const items=[];const walk=(n,anc)=>{const a=anc+'/'+n.getName();if(n.getMesh())items.push({n,a,W:n.getWorldMatrix().slice()});n.listChildren().forEach(c=>walk(c,a))};sc.listChildren().forEach(c=>walk(c,''));
const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];let top=[0,-1e9,0];
for(const it of items)for(const p of it.n.getMesh().listPrimitives()){const A=p.getAttribute('POSITION'),v=[0,0,0],m=it.W;for(let i=0;i<A.getCount();i++){A.getElement(i,v);const w=[0,1,2].map(k=>m[k]*v[0]+m[4+k]*v[1]+m[8+k]*v[2]+m[12+k]);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],w[k]);mx[k]=Math.max(mx[k],w[k])}if(w[1]>top[1])top=w}}
const ext=[0,1,2].map(k=>mx[k]-mn[k]),c=[0,1,2].map(k=>(mx[k]+mn[k])/2);const ax=forceAx?(forceAx==='Z'?2:0):(ext[0]>=ext[2]?0:2);
const tailSign=Math.sign(top[ax]-c[ax]),nose=forceNose?+forceNose:-tailSign;
const th=ax===0?(nose>0?0:Math.PI):(nose>0?Math.PI/2:-Math.PI/2);
console.log(tag,'ext',ext.map(v=>v.toFixed(2)).join(','),'len axis',ax?'Z':'X','nose',nose>0?'+':'-','rotY',(th*180/Math.PI).toFixed(0));
const root=doc.createNode(tag).setRotation([0,Math.sin(th/2),0,Math.cos(th/2)]);if(O.shift)root.setTranslation(O.shift.split(',').map(Number));
const cls={};const get=k=>cls[k]||(cls[k]=(()=>{const n=doc.createNode(tag+'-'+k);root.addChild(n);return n})());
const cnt={};let dropped=0;
for(const it of items){if(DR&&DR.test(it.a)){it.n.setMesh(null);dropped++;continue}
 const mats=it.n.getMesh().listPrimitives().map(p=>p.getMaterial());const glass=mats.every(m=>m&&((O.blend&&m.getAlphaMode()==='BLEND')||GL.test(m.getName())));
 const GM=O.gearmat?new RegExp(O.gearmat):null;const k=(GR&&GR.test(it.a))||(GM&&mats.every(m=>m&&GM.test(m.getName())))?'landingOn':glass?'canopy':'airframe';cnt[k]=(cnt[k]||0)+1;
 const n=doc.createNode(tag+'-'+k).setMesh(it.n.getMesh()).setMatrix(it.W);it.n.setMesh(null);get(k).addChild(n)}
if(O.paint){const c=O.paint.split(',').map(Number);for(const m of r.listMaterials())if(!m.getBaseColorTexture()&&m.getBaseColorFactor().slice(0,3).every(v=>v>.95)&&m.getAlphaMode()==='OPAQUE')m.setBaseColorFactor([...c,1]).setMetallicFactor(.25).setRoughnessFactor(.55)}
for(const ch of sc.listChildren())sc.removeChild(ch);sc.addChild(root);
for(const n of r.listNodes())if(!n.getMesh()&&!n.listChildren().length&&n!==root)n.dispose();
console.log(' classes',JSON.stringify(cnt),'dropped',dropped);await io.write(out,doc);
