import {dictionary,inspectHymmnos,prefixFor,prefixForUnit} from './catalog.js';
import {lexical,verbChoice,outsideScope,byWord,personForms} from './lexicon.js';
import {splitUnits,parseUnit} from './parse.js';

const unique=a=>[...new Set(a)];
const stripEnd=s=>s.replace(/[.!?…。！？]+$/gu,'').trim();
const join=(...pieces)=>pieces.flat().filter(Boolean).join(' ');
function particle(word,withFinal,withoutFinal){
 const n=word.charCodeAt(word.length-1)-0xAC00;return word+(n>=0&&n<11172&&n%28!==0?withFinal:withoutFinal);
}
function declarative(lemma,adjective=false){
 if(adjective||['있다','없다','존재하다'].includes(lemma))return lemma==='존재하다'?'존재한다':lemma;
 const stem=lemma.endsWith('다')?lemma.slice(0,-1):lemma;const n=stem.charCodeAt(stem.length-1)-0xAC00;
 if(n<0||n>=11172)return stem+'다';const jong=n%28;
 return jong===0?stem.slice(0,-1)+String.fromCharCode(0xAC00+n+4)+'다':jong===8?stem.slice(0,-1)+String.fromCharCode(0xAC00+n-4)+'다':stem+'는다';
}
function context(){return {unresolved:[],approximations:[],notes:[],ids:[]};}
function need(word,options,c){const e=byWord(word,options.scope);if(e)c.ids.push(e.id);else c.unresolved.push(`현재 어휘 범위에서 ‘${word}’를 사용할 수 없습니다.`);return e?.word||'';}
function nominal(np,options,c){
 if(!np)return {words:[],meaning:''};
 if(np.kind==='person'){const p=personForms[np.person];if(!p){c.unresolved.push('사람을 나타내는 대명사');return {words:[],meaning:''};}return {words:[need(p.object,options,c)],meaning:p.name};}
 const e=lexical(np.lemma,'noun',options.scope);
 if(!e){c.unresolved.push(outsideScope(np.lemma,'noun',options.scope)?`‘${np.label}’에 해당하는 단어는 선택한 방언 범위 밖입니다.`:`명사 ‘${np.label}’의 대응 어휘`);return {words:[],meaning:np.label};}
 c.ids.push(e.id);let words=[e.word];let meaning=np.label;
 for(const mod of np.modifiers||[]){const adj=lexical(mod.lemma,'adjective',options.scope);if(adj){words.unshift(adj.word);c.ids.push(adj.id);meaning=(adj.glossKo?.split(',')[0]||mod.lemma+'다')+' '+meaning;}else c.unresolved.push(`‘${mod.lemma}다’의 수식 어휘 (선택 범위)`);}
 if(np.owner==='addressee'){words.unshift(need('yos',options,c));meaning='당신의 '+meaning;}
 else if(np.owner){const owner=personForms[np.owner];words.push(need('oz',options,c),need(owner.object,options,c));meaning=owner.name+'의 '+meaning;c.notes.push('소유자는 명사구 안에 따로 보존했습니다. oz(소유의 of)를 이용한 문법 조합 초안입니다.');}
 return {words,meaning};
}
function locationWords(location,options,c){
 const ref=nominal(location.reference,options,c);if(!location.reference)return {words:[],meaning:''};
 if(location.kind==='beside'||location.kind==='together'){
  const direct=location.kind==='beside'&&byWord('pitod',options.scope);
  const w=direct?'pitod':'an';
  if(location.kind==='beside'&&!direct)c.approximations.push('‘곁에’의 공간적 뜻을 중앙정순률 an(함께)으로 가까이 표현했습니다. 위치의 정밀도가 달라집니다.');
  return {words:[need(w,options,c),...ref.words],meaning:location.kind==='beside'&&direct?(location.reference.person==='speaker'?'내':ref.meaning)+' 곁에':particle(ref.meaning,'과','와')+' 함께'};
 }
 return {words:[need('tes',options,c),...ref.words],meaning:particle(ref.meaning,location.kind==='recipient'?'에게':'에',location.kind==='recipient'?'에게':'에')};
}
function featureNotes(frame,options,c,words){
 if(frame.features.futureContinuity&&!frame.features.duration)c.unresolved.push('‘앞으로도’의 미래 지속성');
 if(frame.features.future){
  const note='미래의 의지·약속을 별도의 시제로 표시하지 못했습니다.';
  if(options.style==='poetic'&&frame.features.duration)c.approximations.push('미래의 약속을 yanje(계속·영원히)의 지속으로 압축했습니다. 별도의 미래 시제나 약속 표지는 아닙니다.');else c.unresolved.push(note);
 }
 if(frame.features.past)c.unresolved.push('과거 시제: 본문은 기본 동작 표현이므로 과거를 명시한 완전한 번역은 아닙니다.');
 if(frame.features.duration&&!words.includes('yanje'))c.unresolved.push('지속·영원의 시간 의미');
}
function event(frame,options,c,prefix){
 if(!frame.predicate)return {words:[],meaning:'동작을 확정하지 못했습니다.',held:true};
 const subject=personForms[frame.actor]||personForms.speaker;
 const object=nominal(frame.object,options,c);
 const choice=verbChoice(frame.predicate.lemma,{...options,personObject:frame.object?.kind==='person'});
 if(!choice.entry){c.unresolved.push(outsideScope(frame.predicate.lemma,'verb',options.scope)?`‘${frame.predicate.lemma}다’의 동사는 선택한 방언 범위 밖입니다.`:`동사 ‘${frame.predicate.lemma}다’의 대응 어휘`);return {words:[],meaning:'동사에 대응하는 어휘를 찾지 못했습니다.',held:true};}
 c.ids.push(choice.entry.id);c.approximations.push(...choice.approximations);
 const locations=frame.locations.map(l=>locationWords(l,options,c));
 const duration=frame.features.duration?[need('yanje',options,c)]:[];
 let actionWords=[...(frame.actionNegated?[need('na',options,c)]:[]),choice.entry.word,...object.words,...locations.flatMap(l=>l.words),...duration];
 const actionParts=[object.meaning?particle(object.meaning,'을','를'):'',...locations.map(l=>l.meaning),duration.length?'언제나':''];
 let lemma=choice.lemma;
 if(frame.predicate.lemma==='있')lemma='있다';
 const stem=lemma.endsWith('다')?lemma.slice(0,-1):lemma;
 let meaning=join(particle(subject.name,'은','는'),actionParts,frame.actionNegated?stem+'지 않는다':declarative(lemma,frame.predicate.adjective));
 if(frame.inability){c.unresolved.push('능력·여건의 부정(못 하다)을 동작의 부정과 완전히 대응시키지 못했습니다.');if(options.style==='close')return {words:[],meaning,held:true};c.approximations.push('‘못 하다’를 동작의 부정으로 근사했습니다.');}
 if(frame.desire){
  let wish=byWord('wearequewie',options.scope);
  if(!wish&&options.style==='poetic'){
   wish=byWord('enne',options.scope);
   if(wish)c.approximations.push('‘~하고 싶다’를 중앙정순률 enne(기도·소원)로 의역했습니다. 개인적인 바람과 기도는 같은 뜻이 아닙니다.');
  }
  if(!wish){c.unresolved.push('바람·희망 동사의 직접 대응 어휘 (표준계열 전체로 넓히면 사용 가능)');return {words:[],meaning,held:true};}
  c.ids.push(wish.id);
  const external=frame.actor!=='speaker';
  const subjectWords=external?subject.subject?.split(' ').map(w=>need(w,options,c))||[]:[];
  actionWords=[...(frame.wishNegated?[need('na',options,c)]:[]),wish.word,...subjectWords,...actionWords];
  const innerSubject=external?particle(subject.name,'이','가'):'';
  const wishReading=wish.word==='enne'?'기도한다':'바란다';
  meaning=join('나는',innerSubject,actionParts,frame.actionNegated?stem+'지 않기를':stem+'기를',frame.wishNegated?'바라지 않는다':wishReading)+'.';
  const canOmit=options.style==='poetic'&&(options.format==='lyrics'||frame.features.sourcePause||options.lyricalContext)&&frame.actor==='speaker'&&frame.locations.length===1&&frame.predicate.lemma==='있'&&!frame.actionNegated&&!frame.wishNegated;
  if(canOmit){
   const fragment=[...duration,...locations[0].words];
   c.approximations.push('존재와 바람의 동사를 생략하고 문맥에 맡겼습니다. 곁에 있고 싶은 주체는 화자입니다.');
   featureNotes(frame,options,c,fragment);
   return {words:fragment,meaning:join(duration.length?'언제까지나':'',locations[0].meaning)+'…',contextMeaning:meaning,syntax:'fragment',suffix:'...'};
  }
 }else if(frame.actor!=='speaker'){
  if(prefix){c.unresolved.push('다른 사람을 주어로 하는 이 서술은 감정구를 끄고 만들 수 있습니다. 원문에 없는 화자의 동사를 추가하지 않았습니다.');return {words:[],meaning,held:true};}
  actionWords=[...subject.subject.split(' ').map(w=>need(w,options,c)),...actionWords];
 }
 featureNotes(frame,options,c,actionWords);
 c.notes.push(frame.desire?`바라는 사람: 나 · 바라는 동작의 주체: ${subject.name}${frame.object?' · 대상: '+object.meaning:''}`:`동작의 주체: ${subject.name}${frame.object?' · 대상: '+object.meaning:''}`);
 return {words:actionWords,meaning:meaning.endsWith('.')?meaning:meaning+'.',syntax:'sentence',suffix:options.style==='poetic'&&frame.features.sourcePause?'...':'.'};
}
function render(frame,options,c,prefix){
 for(const issue of frame.issues){if(issue.kind==='nuance')c.unresolved.push(issue.text);else c.unresolved.push(issue.text);}
 const blocked=frame.issues.some(i=>['unknown','role','grammar'].includes(i.kind));
 if(frame.kind==='coordination'){
  if(prefix&&frame.children.some(child=>child.kind==='event'&&child.actor!=='speaker')){c.unresolved.push('주체가 바뀌는 연결절은 감정구를 끄거나 줄을 나누어 만들어 주세요.');return {words:[],meaning:'주체가 서로 다른 절의 연결을 보류했습니다.',held:true};}
  const children=frame.children.map((child,i)=>render(child,options,c,i===0?prefix:''));
  if(children.some(x=>x.held))return {words:[],meaning:children.map(x=>x.meaning).join(' 그리고 '),held:true};
  return {words:children.flatMap((x,i)=>i?[need('en',options,c),...x.words]:x.words),meaning:children.map(x=>stripEnd(x.meaning)).join(' 그리고 ')+'.',syntax:'sentence',suffix:'.'};
 }
 if(frame.kind==='duration'){
  const words=Array.from({length:Math.min(4,Math.max(1,frame.features.durationCount))},()=>need('yanje',options,c));
  if(options.style==='close'&&prefix){c.unresolved.push('동사가 없는 시간 어구입니다. 감정구를 끄거나 시적 표현을 선택해 주세요.');return {words:[],meaning:'언제까지나…',held:true};}
  return {words,meaning:words.map(()=>'언제까지나').join(', ')+'…',syntax:'fragment',contextMeaning:'지속의 뜻을 반복하는 구절입니다.',suffix:'...'};
 }
 if(frame.kind==='location'){
  const location=locationWords(frame.locations[0],options,c);
  if(prefix&&options.style==='close'){c.unresolved.push('위치 어구는 감정구를 끄거나 시적 표현으로 만들 수 있습니다.');return {words:[],meaning:location.meaning,held:true};}
  return {words:location.words,meaning:location.meaning+'…',syntax:'fragment',contextMeaning:location.meaning+'…',suffix:'...',held:blocked};
 }
 if(frame.kind==='noun'){
  const np=nominal(frame.phrase,options,c);
  if(prefix&&options.style==='close'){c.unresolved.push('명사구는 감정구를 끄거나 시적 표현으로 만들 수 있습니다.');return {words:[],meaning:np.meaning,held:true};}
  return {words:np.words,meaning:np.meaning,syntax:'fragment',contextMeaning:np.meaning,suffix:'.',held:blocked};
 }
 const result=event(frame,options,c,prefix);return {...result,held:result.held||blocked};
}
function frameSummary(frame){
 if(frame.kind==='coordination')return {kind:frame.kind,relation:frame.relation,children:frame.children.map(frameSummary)};
 const {tokens,original,issues,...summary}=frame;return summary;
}
export function generateLocal(options,analyze){
 if(!options||typeof options.text!=='string'||!options.text.trim()||options.text.length>2000)throw new Error('문장은 1~2,000자 이내로 입력해 주세요.');
 if(!['standard','central'].includes(options.scope)||!['close','poetic'].includes(options.style)||!['lyrics','sentence'].includes(options.format))throw new Error('작성 설정을 확인해 주세요.');
 const lockedPrefix=prefixFor(options.emotion);const inputUnits=splitUnits(options.text,options.format);const start=performance.now();
 const lines=inputUnits.map((original,index)=>{
  const c=context();const prefix=prefixForUnit(options,index);
  if(options.format==='lyrics'&&splitUnits(original,'sentence').length>1){
   const inner=generateLocal({...options,text:original,format:'sentence',emotion:{...options.emotion,enabled:!!prefix},emotionScope:'first'},analyze).lines;
   return {original,text:inner.some(l=>!l.text)?'':inner.map(l=>l.text).join(' '),meaning:inner.map(l=>l.meaning).join(' / '),usedIds:unique(inner.flatMap(l=>l.usedIds)),unresolved:unique(inner.flatMap(l=>l.unresolved)),approximations:unique(inner.flatMap(l=>l.approximations)),notes:unique(inner.flatMap(l=>l.notes)),syntax:'sentence',structure:{kind:'sequence',children:inner.map(l=>l.structure)}};
  }
  if(/^[A-Za-z0-9\s.,!?;'_#/-]+$/u.test(original)){
   const checked=inspectHymmnos(original,options.scope);return {original,text:checked.unknown.length?'':original,meaning:checked.entries.map(e=>e.glossKo||e.meaning).join(' / '),usedIds:checked.entries.map(e=>e.id),unresolved:checked.unknown.map(w=>'미등재·범위 밖 표기: '+w),approximations:[],notes:['입력한 휴므노스 어휘를 조회했습니다. 문법을 보증하는 검사는 아닙니다.'],syntax:'fragment'};
  }
  if(/나\s*자신을\s*노래로\s*표현/u.test(original)){
   const words=['chs','hymmnos','mea'];return {original,text:join(prefix,words)+'.',meaning:'나 자신을 노래로 표현한다.',usedIds:words.map(w=>byWord(w,options.scope)?.id).filter(Boolean),unresolved:[],approximations:[],notes:['Hymmnoserver 문법 페이지의 변환 예문 구조를 사용했습니다.'],syntax:'sentence'};
  }
  const frame=parseUnit(original,analyze);const localOptions={...options,lyricalContext:/…|\.{3}/u.test(options.text)};
  const result=render(frame,localOptions,c,prefix);
  const meaningfulIssues=c.unresolved.filter(s=>!/과거 시제|미래|강조 표현|한정 표현/u.test(s));
  const text=result.held||meaningfulIssues.length?'':join(prefix,result.words)+(result.suffix||'.');
  const checked=inspectHymmnos(text,options.scope);
  if(checked.unknown.length)throw new Error('생성된 어휘의 사전 범위를 확인하지 못했습니다.');
  const usedIds=unique(text?checked.entries.map(e=>e.id):c.ids);
  return {original,text,meaning:result.meaning||'뜻의 관계를 확정하지 못했습니다.',contextMeaning:result.contextMeaning||'',syntax:result.syntax||'sentence',usedIds,unresolved:unique(c.unresolved),approximations:unique(c.approximations),notes:unique(c.notes),structure:frameSummary(frame)};
 });
 return {lines,engine:'dictionary',model:'브라우저 문장 엔진',createdAt:new Date().toISOString(),input:options.text,prefix:lockedPrefix,emotionScope:options.emotionScope||'each',format:options.format,elapsedMs:Math.round(performance.now()-start),notes:['한국어 형태소 분석과 문장 관계 규칙으로 만든 초안입니다. 입력 문장은 기기 밖으로 전송하지 않습니다.','표준계열 사전의 등재 어휘만 사용합니다. 문법·관용 표현의 자연성에는 검토가 필요합니다.','시제·의지·수식의 정밀도가 부족한 부분과 뜻을 바꾼 부분을 구분해 표시합니다.']};
}
