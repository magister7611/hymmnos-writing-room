import {dictionary,inScope} from './catalog.js';

const VERB=[2,9,11,22],NOUN=[4,9,10,19,24],ADJ=[8,10,11,20];
const normalize=s=>s.normalize('NFKC').replace(/[\s~·“”‘’()]/gu,'').toLowerCase();
const parts=e=>(e.glossKo||'').replace(/\([^)]*\)/gu,'').split(/[,;/]/u).map(s=>normalize(s)).filter(Boolean);
const preferred={
 '사랑하':['hartes','melenas'],'아끼':['yanwe'],'소중히대하':['yanwe'],
 '노래하':['hymme'],'노래부르':['hymme'],'연주하':['leat','hymme'],
 '듣':['reen','kiafa'],'지키':['khal','grandus'],'보호하':['khal','grandus'],
 '있':['irs'],'존재하':['irs'],'걷':['walaka'],'바라':['wearequewie'],
 '원하':['wearequewie'],'기원하':['wearequewie','enne'],'기도하':['enne'],
 '잊':['rete'],'웃':['yaha'],'미소짓':['fernia','yaha'],'울':['raklya','werlwe'],
 '만들':['crushue','pomb'],'전하':['messe','riomo'],'알리':['messe'],
 '살':['manafeeze'],'죽':['morto'],'날':['famfa'],'날아가':['famfa'],
 '가':['tek'],'떠나':['sik'],'다가가':['neia'],'머무르':['teyys','tarfe'],
 '잠들':['slep'],'자':['slep'],'읽':['viss'],'보':['vit'],'달리':['rana'],
 '미워하':['desfel'],'싫어하':['delij','desfel'],'용서하':['fogabe'],
 '구하':['jass'],'돕':['suwant'],'구조하':['suwant'],'나누':['arsye','crannidale'],
 '약속하':['skit'],'맹세하':['geeow','skit'],'춤추':['grlanza','tanta'],
 '빛나':['keen'],'공명하':['echrra','hymme'],'안':['houd'],'품':['houd'],
 '느끼':['firle','paul'],'생각하':['murfan','ene'],'위로하':['yosyua','fowrlle'],
 '축복하':['afezeria'],'축하하':['warce'],'말하':['pagle','linen'],
 '먹':['eta'],'기억하':[], '그리워하':[],
};
const nounPreferred={
 '노래':['hymmnos'],'시':['hymmnos'],'빛':['shen'],'세계':['ciel'],'세상':['ciel'],'하늘':['ciel'],
 '마을':['forlinden'],'꽃':['frawr'],'밤':['nuih'],'마음':['hopb'],'사랑':['harton'],
 '기억':['memora'],'추억':['memora'],'꿈':['revm'],'손':['hand'],'생명':['manac'],
 '선율':['hymmne'],'이야기':['akata'],'별':['stelle'],'달':['weak'],'태양':['sol'],
};
const adjectivePreferred={'작':['titilia'],'아름답':['bautifal'],'예쁘':['bautifal'],'어둡':['vonn'],'멀':['yeeel']};
function pick(candidates,scope){return candidates.filter(e=>inScope(e,scope)).sort((a,b)=>(a.dialectId===1?-1:0)-(b.dialectId===1?-1:0))[0];}
function lookupWord(words,classes,scope){for(const word of words){const entry=dictionary.find(e=>e.word===word&&classes.includes(e.classId)&&inScope(e,scope));if(entry)return entry;}}
export function lexical(lemma,kind,scope='standard'){
 const key=normalize(lemma);const classes=kind==='verb'?VERB:kind==='adjective'?ADJ:NOUN;
 const special=kind==='verb'?preferred:kind==='adjective'?adjectivePreferred:nounPreferred;
 if(Object.hasOwn(special,key))return lookupWord(special[key],classes,scope);
 const entries=dictionary.filter(e=>classes.includes(e.classId)&&parts(e).some(p=>(kind!=='noun'&&p.endsWith('다')?p.slice(0,-1):p)===key));
 return pick(entries,scope);
}
export function verbChoice(lemma,{scope,style,personObject=false}){
 const approximations=[];
 if(lemma==='좋아하'){
  const word=scope==='central'?'yanwe':style==='poetic'&&personObject?'melenas':'hartes';
  const entry=dictionary.find(e=>e.word===word&&inScope(e,scope));
  if(entry)approximations.push(word==='yanwe'?'‘좋아하다’를 ‘소중히 대하다’로 가까이 표현했습니다.':word==='melenas'?'‘좋아하다’를 melenas(매우 깊이 사랑하다)로 표현해 감정을 더 강하게 담았습니다.':'‘좋아하다’를 hartes(사랑하다)로 표현해 감정의 강도가 달라집니다.');
  return {entry,approximations,lemma:word==='yanwe'?'소중히 대하다':word==='melenas'?'깊이 사랑하다':'사랑하다'};
 }
 if(lemma==='사랑하'&&scope==='central'&&style==='poetic'){
  approximations.push('중앙정순률의 직접 사랑 동사 대신 yanwe(소중히 대하다)로 의역했습니다. 같은 뜻은 아닙니다.');
  return {entry:lexical('아끼','verb',scope),approximations,lemma:'소중히 대하다'};
 }
 const entry=lexical(lemma,'verb',scope);
 return {entry,approximations,lemma:entry?entry.glossKo?.split(',')[0].trim()||lemma+'다':lemma+'다'};
}
export function outsideScope(lemma,kind,scope){return scope==='central'&&!!lexical(lemma,kind,'standard')&&!lexical(lemma,kind,scope);}
export function byWord(word,scope){return dictionary.find(e=>e.word===word&&inScope(e,scope));}
export const personForms={
 speaker:{object:'mea',subject:null,name:'나'},addressee:{object:'yor',subject:'yorr',name:'당신'},
 us:{object:'mean',subject:'merra',name:'우리'},them:{object:'hers',subject:'rre hers',name:'그들'},
 him:{object:'hes',subject:'rre hes',name:'그'},her:{object:'has',subject:'rre has',name:'그녀'},
};
export function personOf(s){return /^(나|저|내|제|자신|난)$/u.test(s)?'speaker':/^(너|네|당신|그대|자네|널|넌)$/u.test(s)?'addressee':s==='우리'?'us':s==='그녀'?'her':s==='그'?'him':s==='그들'?'them':null;}
