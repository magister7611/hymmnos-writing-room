import {personOf,lexical} from './lexicon.js';

export function splitUnits(text,format){
 const lines=text.split(/\r?\n/u).map(s=>s.trim()).filter(Boolean);
 if(format==='lyrics')return lines;
 return lines.flatMap(line=>{
  const units=[];let start=0;
  for(const m of line.matchAll(/[.!?。！？…]+(?=\s|$)/gu)){
   const end=m.index+m[0].length;
   if(/^(?:[A-Za-z]\.){2,}$/u.test(line.slice(0,end).match(/\S+$/u)?.[0]||''))continue;
   const part=line.slice(start,end).trim();if(part)units.push(part);start=end;
  }
  if(line.slice(start).trim())units.push(line.slice(start).trim());
  return units.reduce((all,unit)=>{
   if(all.length&&/^(?:너|널|당신|그대)(?:을|를)?[.…!?]*$/u.test(unit))all[all.length-1]+=' '+unit;
   else all.push(unit);return all;
  },[]);
 });
}
function groupTokens(text,tokens){
 const groups=[];const chars=Array.from(text);
 for(const token of tokens){
  let g=groups.at(-1);
  if(!g||g.start!==token.start||g.end!==token.end){g={start:token.start,end:token.end,raw:chars.slice(token.start,token.end).join(''),tokens:[],index:groups.length};groups.push(g);}
  g.tokens.push(token);
 }
 return groups;
}
const content=t=>/^(?:NNG|NNP|NNB|NP|NR)$/u.test(t.pos);
const stripped=s=>s.replace(/[\s.,!?…。！？"“”‘’]/gu,'');
const tags=(g,p)=>g.tokens.some(t=>t.pos===p);
const forms=g=>g.tokens.map(t=>t.text);
const nounText=g=>g.tokens.filter(content).map(t=>t.text).join('');
function predicateIn(group,groups){
 const ts=group.tokens;
 const light=ts.findIndex(t=>t.pos==='XSV'||t.pos==='XSA');
 if(light>0){const stem=ts.slice(0,light).filter(t=>content(t)||t.pos==='XR').map(t=>t.text).join('')+ts[light].text;return {stem,adjective:ts[light].pos==='XSA'};}
 const t=ts.find(t=>/^(VV|VA)(?:-[IR])?$/u.test(t.pos));
 if(!t)return null;
 let stem=t.text;
 if(stem==='부르'&&groups.some(g=>nounText(g)==='노래'))stem='노래부르';
 if(stem==='대하'&&groups.some(g=>stripped(g.raw)==='소중히'))stem='소중히대하';
 return {stem,adjective:t.pos.startsWith('VA')};
}
function personGroup(g){return personOf(g.tokens.find(t=>t.pos==='NP')?.text||nounText(g));}

export function parseUnit(original,analyze,{depth=0,inheritedActor='speaker'}={}){
 const analyzed=analyze(original);const groups=groupTokens(original,analyzed.tokens||[]);
 const futureGroup=g=>forms(g).some(t=>['것','거'].includes(t))||groups[g.index+1]?.tokens.some(t=>t.pos==='NNB'&&['것','거'].includes(t.text));
 const predicates=groups.map(g=>({group:g,...predicateIn(g,groups)})).filter(p=>p.stem&&(!tags(p.group,'ETM')||futureGroup(p.group)));
 const allPredicates=groups.map(g=>({group:g,...predicateIn(g,groups)})).filter(p=>p.stem);
 const features={
  past:groups.some(g=>g.tokens.some(t=>t.pos==='EP'&&/[었았였]/u.test(t.text))),
  future:/(?:ㄹ|을)\s*(?:것|거)|거(?:야|예요|에요)|겠|할게|킬게|리라/u.test(original)||groups.some(g=>g.tokens.some(t=>t.pos==='ETM'&&['ㄹ','을'].includes(t.text))&&g.tokens.some(t=>['것','거'].includes(t.text))),
  duration:/언제까지나|언제나|항상|영원히|영원토록|계속/u.test(original),
  durationCount:(original.match(/언제까지나|언제나|항상|영원(?:히|토록)?|계속/gu)||[]).length,
  futureContinuity:/앞으로도/u.test(original),
  sourcePause:/…|\.{3}/u.test(original),
 };
 const issues=[];const consumed=new Set();const subjects=[];const objects=[];const locations=[];const nouns=[];const modifiers=[];
 let possessor=null;
 for(const g of groups){
  const ff=forms(g);const word=nounText(g);const person=personGroup(g);
  if(features.future&&g.tokens.some(t=>t.pos==='NNB'&&['거','것'].includes(t.text))&&groups[g.index-1]?.tokens.some(t=>t.pos==='ETM')){consumed.add(g.index);continue;}
  const np={kind:person?'person':'noun',person,lemma:word,label:person?{speaker:'나',addressee:'당신',us:'우리',her:'그녀',him:'그',them:'그들'}[person]:word,owner:possessor?.person||null,modifiers:[...modifiers],group:g.index};
  if(features.duration&&/언제까지나|언제나|항상|영원|계속/u.test(g.raw)||features.futureContinuity&&/앞으로도/u.test(g.raw)){consumed.add(g.index);continue;}
  if(person&&ff.includes('의')){possessor={person,group:g.index};consumed.add(g.index);continue;}
  if(person&&(ff.includes('와')||ff.includes('과')||ff.includes('랑'))){
   locations.push({kind:'together',reference:{...np,owner:null},group:g.index});consumed.add(g.index);possessor=null;continue;
  }
  if(['곁','옆'].includes(word)){
   if(!possessor&&nouns.at(-1)?.kind==='person'&&nouns.at(-1).group===g.index-1){const previous=nouns.pop();possessor={person:previous.person,group:previous.group};consumed.add(previous.group);}
   const reference=possessor?{kind:'person',person:possessor.person,label:{speaker:'나',addressee:'당신',us:'우리',her:'그녀',him:'그'}[possessor.person],owner:null,modifiers:[]}:null;
   if(!reference)issues.push({kind:'role',text:'누구의 곁·옆인지 확정하지 못했습니다.'});
   locations.push({kind:'beside',reference,group:g.index});consumed.add(g.index);possessor=null;modifiers.length=0;continue;
  }
  if(ff.includes('함께')||ff.includes('같이')){consumed.add(g.index);continue;}
  if(tags(g,'ETM')){
   const p=predicateIn(g,groups);if(p&&(p.adjective||lexical(p.stem,'adjective','standard'))){modifiers.push({lemma:p.stem,group:g.index});consumed.add(g.index);continue;}
  }
  if(predicates.some(p=>p.group.index===g.index))continue;
  if(person&&(tags(g,'JKS')||tags(g,'JX')&&['는','은','ㄴ','도'].some(t=>ff.includes(t)))){
   subjects.push({...np,case:tags(g,'JKS')?'subject':'topic'});consumed.add(g.index);possessor=null;modifiers.length=0;continue;
  }
  if(word&&(tags(g,'JKO')||person&&/^(널|날)$/u.test(stripped(g.raw)))){
   objects.push(np);consumed.add(g.index);possessor=null;modifiers.length=0;continue;
  }
  if(word&&tags(g,'JKB')){
   if(ff.some(t=>['에','에서','에게'].includes(t))){locations.push({kind:ff.includes('에게')?'recipient':'place',reference:np,group:g.index});consumed.add(g.index);possessor=null;modifiers.length=0;continue;}
  }
  if(word){nouns.push(np);possessor=null;modifiers.length=0;}
 }
 let desire=groups.some(g=>g.tokens.some(t=>t.pos==='VX'&&t.text==='싶'));
 const wishes=['바라','원하','기원하','기도하'];
 let outer=predicates.at(-1);let predicate=predicates[0]||null;
 let wishPredicate=null;
 if(predicates.length>1&&wishes.includes(outer.stem)){desire=true;wishPredicate=outer;outer=null;}
 const subjectBefore=(index,list=subjects)=>list.filter(s=>s.group<=index);
 const actualSubjects=subjectBefore(predicate?.group.index??Infinity);
 let actor=(actualSubjects.filter(s=>s.case==='subject').at(-1)||actualSubjects.at(-1))?.person||inheritedActor;
 let wisher=wishPredicate?(actualSubjects.length>1?actualSubjects[0].person:inheritedActor):actor;
 if(!wisher)wisher='speaker';
 // Topic-object inversion: 너는 내가 지킬게. The nominative 내가 is the actor.
 if(!desire&&!objects.length&&actualSubjects.length>1&&actualSubjects.at(-1).case==='subject'){
  const topic=actualSubjects.find(s=>s.case==='topic'&&s.person!==actor);if(topic)objects.push({...topic,case:undefined});
 }
 // Ordinary coordinated clauses are separate frames, not a bag of verbs.
 if(!desire&&predicates.length>1&&depth<3){
  const first=predicates[0].group;
  if(first.tokens.some(t=>t.pos==='EC'&&t.text==='고')){
   const chars=Array.from(original);const a=chars.slice(0,first.end).join('');const b=chars.slice(first.end).join('').trim();
   if(b)return {kind:'coordination',original,children:[parseUnit(a,analyze,{depth:depth+1,inheritedActor}),parseUnit(b,analyze,{depth:depth+1,inheritedActor:actor})],relation:'and',features,issues:[],tokens:analyzed.tokens};
  }
 }
 if(predicates.length>(wishPredicate?2:1))issues.push({kind:'grammar',text:'여러 동사의 절 연결을 확정하지 못했습니다.'});
 if(groups.some(g=>g.tokens.some(t=>t.pos==='EC'&&/지만|면|는데|아서|어서|으니까|니까/u.test(t.text))))issues.push({kind:'grammar',text:'조건·대조·원인으로 이어지는 절은 아직 지원 범위를 벗어납니다.'});
 if(/(?:사랑|보호|지킴).*받|(?:사랑|보호).*되/u.test(original))issues.push({kind:'grammar',text:'수동태의 주체와 대상을 확정하지 못했습니다.'});
 if(/(?:해|켜|아|어|여)\s*줘|주세요|십시오|세요|하라|해라|하자[.!?…]*$/u.test(original))issues.push({kind:'grammar',text:'요청·명령문의 행위자와 말투는 아직 지원 범위를 벗어납니다.'});
 if(/[?？]/u.test(original)||groups.some(g=>g.tokens.some(t=>t.pos==='EF'&&['니','냐','까','습니까','나요'].includes(t.text))))issues.push({kind:'grammar',text:'의문문의 말투를 서술문으로 바꾸지 않도록 표현을 보류했습니다.'});
 if(!predicate&&features.duration)return {kind:'duration',original,features,issues,tokens:analyzed.tokens};
 if(!predicate&&locations.length===1&&!nouns.length&&!objects.length)return {kind:'location',original,locations,features,issues,tokens:analyzed.tokens};
 if(!predicate){
  const phrase=nouns.at(-1)||objects.at(-1);if(phrase){for(const n of nouns)if(n!==phrase)issues.push({kind:'unknown',text:n.label});return {kind:'noun',original,phrase,features,issues,tokens:analyzed.tokens};}
  issues.push({kind:'grammar',text:'동사나 명사구의 중심 뜻을 찾지 못했습니다.'});
 }
 let actionNegated=false,wishNegated=false,inability=false;
 const negateGroups=groups.filter(g=>g.tokens.some(t=>['않','아니','못','안'].includes(t.text))||/^(안|못)/u.test(stripped(g.raw)));
 for(const g of negateGroups){
  consumed.add(g.index);
  if(forms(g).includes('못'))inability=true;
  const wishGroup=groups.find(x=>x.tokens.some(t=>t.text==='싶'&&t.pos==='VX'))||wishPredicate?.group;
  if(desire&&wishGroup&&g.index>=wishGroup.index)wishNegated=true;else actionNegated=true;
 }
 if(predicate?.stem==='없'){predicate={...predicate,stem:'있'};actionNegated=true;}
 for(const p of allPredicates)consumed.add(p.group.index);
 for(const g of groups){
  if(consumed.has(g.index)||g.tokens.every(t=>!content(t)&&!['VV','VA','MAG','XR'].includes(t.pos)))continue;
  if(nouns.some(n=>n.group===g.index)&&predicate){
   if(predicate.stem==='소중히대하'&&/소중히/u.test(g.raw)){consumed.add(g.index);continue;}
   const n=nouns.find(n=>n.group===g.index);
   if(!objects.length&&['노래부르','노래하'].includes(predicate.stem)&&n.lemma==='노래'){consumed.add(g.index);continue;}
   issues.push({kind:'unknown',text:`${n.label}의 문장 역할`});
  }else if(g.tokens.some(t=>t.pos==='MAG')&&!/함께|같이|안|못|영원|항상|언제나|계속|소중히/u.test(g.raw)){
   if(!/정말|매우|아주|진심|깊이|더/u.test(g.raw))issues.push({kind:'unknown',text:stripped(g.raw)});
   else issues.push({kind:'nuance',text:`강조 표현 ‘${stripped(g.raw)}’`});
  }
 }
 for(const g of groups)if(g.tokens.some(t=>t.pos==='JX'&&t.text==='만'))issues.push({kind:'nuance',text:'한정 표현 ‘~만’'});
 if(objects.length>1)issues.push({kind:'grammar',text:'여러 목적어의 관계를 확정하지 못했습니다.'});
 if(desire&&wisher!=='speaker')issues.push({kind:'grammar',text:'화자가 아닌 사람의 바람은 아직 지원하지 않습니다.'});
 return {kind:'event',original,actor,wisher,desire,predicate:predicate?{lemma:predicate.stem,adjective:predicate.adjective}:null,object:objects[0]||null,locations,actionNegated,wishNegated,inability,features,issues,tokens:analyzed.tokens};
}
