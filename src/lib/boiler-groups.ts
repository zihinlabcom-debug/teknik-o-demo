import {normalizePartText} from './parts-catalog';
import {BOILER_EFFECT_FACTOR,type BoilerCandidate,type BoilerAssessment,type BoilerQuestion,type BoilerQuestionEffect} from './boiler-probability';
import type {BoilerFuelType} from './boiler-fuel';
const names:Record<string,string>={gas_path:'Gaz besleme/armatür yolu',ignition:'Ateşleme/alev algılama',
  combustion_air_flue:'Yanma havası/atık gaz yolu',electrical_wiring:'Kablo/bağlantı/topraklama',
  electronic_control:'Elektronik kontrol',sensor:'Sensörler',hydraulic:'Hidrolik sistem',
  circulation_pump:'Pompa/dolaşım',heat_exchange:'Isı transferi/eşanjör',safety_thermal:'Termik/emniyet koruması',
  water_pressure:'Su basıncı/algılama',electric_supply:'Elektrik beslemesi',actuator_valve:'Vana/aktüatör',
  mechanical:'Mekanik noktalar',installation:'Montaj/ayar',technical_other:'Diğer kaynak destekli teknik noktalar'};
export function boilerTechnicalGroup(candidate:BoilerCandidate,fuel:BoilerFuelType='gas') {
  const n=normalizePartText(candidate.candidate_name);
  if(/(?:gaz vanasi|gaz valfi).*(?:geri bildirim|kontrol devre|surucu)/.test(n))return 'electronic_control';
  if(/termik|termostat|yuksek limit|sicaklik sinir/.test(n))return 'safety_thermal';
  if(/su basinc|tesisat basinc|genlesme kab/.test(n))return 'water_pressure';
  if(/esanjor|isi blog|isi transfer/.test(n))return 'heat_exchange';
  if(/pompa|dolasim|sirkulasyon/.test(n))return 'circulation_pump';
  if(/uc yollu|3 yollu|vana|aktuat/.test(n)&&candidate.fault_class!=='gas_supply')return 'actuator_valve';
  if(/elektrik besleme|gerilim|voltaj|elektrik sigorta/.test(n))return 'electric_supply';
  if(/kablo|soket|baglanti|topraklama|haberlesme/.test(n))return 'electrical_wiring';
  if(/atesleme|alev|iyonizasyon/.test(n))return 'ignition';
  if(candidate.fault_class==='gas_supply')return 'gas_path';
  if(candidate.fault_class==='combustion_air'||/baca|atik gaz|yanma havas/.test(n)||(fuel==='gas'&&/^fan/.test(n)))return 'combustion_air_flue';
  return ({electronic:'electronic_control',sensor:'sensor',hydraulic:'hydraulic',electrical:'electrical_wiring',
    ignition:'ignition',mechanical:'mechanical',installation:'installation'} as Record<string,string>)[candidate.fault_class??'']??'technical_other';
}
export interface BoilerGroupAssessment {key:string;name:string;probability:number;candidateIds:string[];candidateNames:string[]}
export function buildBoilerGroups(candidates:BoilerCandidate[],assessments:BoilerAssessment[],fuel:BoilerFuelType='gas'):BoilerGroupAssessment[] {
  if(!assessments.length)return [];
  const ids=new Set<string>(),semantics=new Set<string>();
  for(const c of candidates){
    const semantic=normalizePartText(c.candidate_name)+'|'+(c.fault_class??'');
    if(ids.has(c.id)||semantics.has(semantic))throw Error('Duplicate logical manufacturer candidate in group input');
    ids.add(c.id);semantics.add(semantic);
  }
  const seen=new Set<string>(),groups=new Map<string,{units:number;row:BoilerGroupAssessment}>();
  for(const a of assessments){
    const c=candidates.find(c=>c.id===a.candidateId);
    if(!c||seen.has(a.candidateId)||!Number.isFinite(a.probability)||a.probability<0)throw Error('Invalid group assessment');
    seen.add(a.candidateId);const key=boilerTechnicalGroup(c,fuel);
    const group=groups.get(key)??{units:0,row:{key,name:names[key],probability:0,candidateIds:[],candidateNames:[]}};
    group.units+=Math.round(a.probability*100);group.row.candidateIds.push(c.id);group.row.candidateNames.push(c.candidate_name);groups.set(key,group);
  }
  if(seen.size!==ids.size||[...groups.values()].reduce((sum,g)=>sum+g.units,0)!==10000)throw Error('Group input must retain the complete 100 percent candidate distribution');
  return [...groups.values()].map(g=>({...g.row,probability:g.units/100})).sort((a,b)=>b.probability-a.probability||a.key.localeCompare(b.key));
}
export function questionDiscrimination(candidates:BoilerCandidate[],assessments:BoilerAssessment[],questions:BoilerQuestion[],effects:BoilerQuestionEffect[],fuel:BoilerFuelType='gas') {
  const result:Record<string,{candidateDiscriminative:boolean;groupDiscriminative:boolean;supportsSingleton:boolean}>={};
  const active=assessments.filter(a=>a.probability>0);
  for(const q of questions){
    let candidateDiscriminative=false,groupDiscriminative=false,supportsSingleton=false;
    const answers=[...new Set(effects.filter(e=>e.question_id===q.id&&e.answer_key!=='unknown').map(e=>e.answer_key))];
    for(const answer of answers){
      const factors=active.map(a=>({a,factor:BOILER_EFFECT_FACTOR[effects.find(e=>e.question_id===q.id&&e.candidate_id===a.candidateId&&e.answer_key===answer)?.effect??'neutral']}));
      candidateDiscriminative ||=new Set(factors.map(f=>f.factor)).size>1;
      supportsSingleton ||=candidates.length===1&&factors.some(f=>f.factor===BOILER_EFFECT_FACTOR.support);
      const means=new Map<string,{mass:number;weighted:number}>();
      for(const f of factors){
        const key=boilerTechnicalGroup(candidates.find(c=>c.id===f.a.candidateId)!,fuel),g=means.get(key)??{mass:0,weighted:0};
        g.mass+=f.a.probability;g.weighted+=f.a.probability*f.factor;means.set(key,g);
      }
      groupDiscriminative ||=new Set([...means.values()].map(g=>Math.round(g.weighted/g.mass*1e8))).size>1;
    }
    result[q.id]={candidateDiscriminative,groupDiscriminative,supportsSingleton};
  }
  return result;
}
