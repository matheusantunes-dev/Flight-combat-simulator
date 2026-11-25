// Calibra o arrasto de cada caça para bater a velocidade máxima real (usa as mesmas fórmulas do jogo).
// Uso: node tools/velocidade.mjs   → mostra Mach máximo a 11 km e nós ao nível do mar de cada avião do index.html.
import fs from 'node:fs';import {topSpeed} from './velocidade-lib.mjs';
const s=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const grab=(name)=>{const i=s.indexOf('const '+name+'={');let d=0,j=i+name.length+7;for(;j<s.length;j++){if(s[j]=='{')d++;if(s[j]=='}'){d--;if(!d)break}}return eval('('+s.slice(i+name.length+7,j+1)+')')};
const ACFT=grab('ACFT'),NEW=grab('NEWAC');for(const k in NEW)ACFT[k]={...NEW[k]};
for(const m of s.matchAll(/Object\.assign\(ACFT\.(\w+),(\{[^}]*\})\)/g))Object.assign(ACFT[m[1]],eval('('+m[2]+')'));
const rows={};for(const [id,A] of Object.entries(ACFT))rows[id]={'Mach 11 km':topSpeed(A,11000).toFixed(2),'nós nível do mar':Math.round(topSpeed(A,0)*340.3*1.9438)};console.table(rows);
