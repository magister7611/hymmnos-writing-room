import{test}from'node:test';import assert from'node:assert/strict';
import{Garu}from'garu-ko/node';import{generateLocal}from'../src/engine/generate.js';
import{dictionary,inScope,inspectHymmnos}from'../src/engine/catalog.js';import{splitUnits}from'../src/engine/parse.js';
const garu=await Garu.load();
const defaults={emotion:{enabled:true,intensity:'Was',feeling:'yea',wish:'ra'},emotionScope:'first',scope:'standard',style:'close',format:'sentence'};
function generate(text,overrides={}){return generateLocal({...defaults,text,...overrides},s=>garu.analyze(s));}
function line(text,overrides={}){return generate(text,overrides).lines[0];}
test('all 866 distinct dictionary records and 549 standard entries survive migration',()=>{assert.equal(dictionary.length,866);assert.equal(new Set(dictionary.map(e=>e.id)).size,866);assert.equal(dictionary.filter(e=>inScope(e,'standard')).length,549);});
test('real morphology handles conjugated love, future forms and contracted objects',()=>{
 for(const text of ['나는 너를 사랑해.','나는 널 사랑한다.','당신을 사랑합니다.','나는 그대를 사랑할 거야.','난 널 사랑하겠어.']){
  const l=line(text);assert.ok(l.text.includes('hartes yor'),text);assert.equal(l.structure.actor,'speaker');assert.equal(l.structure.object.person,'addressee');
 }
 assert.ok(line('나는 너를 사랑할 거야.').unresolved.some(s=>s.includes('미래')));
});
test('postposed object remains attached across ellipsis',()=>{assert.deepEqual(splitUnits('좋아해요... 당신을...','sentence'),['좋아해요... 당신을...']);const l=line('좋아해요, 당신을...');assert.equal(l.structure.object.person,'addressee');assert.ok(l.approximations.some(s=>s.includes('강도')));});
test('paragraphs produce separate actions and only the selected first prefix',()=>{const r=generate('나는 너를 사랑해. 앞으로도 영원히 널 사랑할거야.');assert.equal(r.lines.length,2);assert.ok(r.lines[0].text.startsWith('Was yea ra '));assert.equal(r.lines[1].text,'hartes yor yanje.');assert.ok(r.lines[1].unresolved.some(s=>s.includes('미래')));});
test('negative action is different from negative object or passive voice',()=>{
 for(const text of ['나는 너를 사랑하지 않아.','나는 너를 안 사랑해.','나는 노래하지 않는다.']){const l=line(text);assert.equal(l.structure.actionNegated,true);assert.match(l.text,/\bna (hartes|hymme)\b/u);assert.ok(!l.text.includes('hartes na yor'));}
});
test('desire preserves two levels of actor, including the opposite-actor sentence',()=>{
 const own=line('나는 당신 곁에 있고 싶어요.');assert.equal(own.text,'Was yea ra wearequewie irs pitod yor.');assert.equal(own.structure.actor,'speaker');assert.equal(own.structure.wisher,'speaker');
 const other=line('나는 네가 내 곁에 있기를 바라.');assert.equal(other.text,'Was yea ra wearequewie yorr irs pitod mea.');assert.equal(other.structure.actor,'addressee');assert.equal(other.structure.wisher,'speaker');assert.equal(other.structure.object,null);assert.ok(other.meaning.includes('당신이 내 곁'));
});
test('wanting not to act differs from not wanting to act',()=>{
 const noWish=line('나는 너를 사랑하고 싶지 않아.');assert.match(noWish.text,/na wearequewie hartes yor/u);assert.equal(noWish.structure.wishNegated,true);assert.equal(noWish.structure.actionNegated,false);
 const negativeEvent=line('나는 너를 사랑하지 않고 싶어.');assert.match(negativeEvent.text,/wearequewie na hartes yor/u);assert.equal(negativeEvent.structure.wishNegated,false);assert.equal(negativeEvent.structure.actionNegated,true);
});
test('desire is compositional for protection and walking, not only the original screenshot',()=>{
 const protect=line('나는 너를 지키고 싶어.');assert.match(protect.text,/wearequewie khal yor/u);assert.equal(protect.structure.predicate.lemma,'지키');
 const walk=line('나는 너와 함께 걷고 싶어.');assert.match(walk.text,/wearequewie walaka an yor/u);assert.ok(walk.meaning.includes('당신과 함께'));
});
test('poetic presence is an explicit fragment with contextual desire, not a reversed actor',()=>{
 const r=generate('좋아해요, 당신을... 언제까지나 당신의 곁에 있고 싶어요.',{style:'poetic'});
 assert.ok(r.lines[0].text.includes('melenas yor'));assert.ok(r.lines[0].meaning.includes('깊이 사랑'));assert.equal(r.lines[1].text,'yanje pitod yor...');assert.equal(r.lines[1].syntax,'fragment');assert.ok(r.lines[1].contextMeaning.includes('나는'));assert.ok(r.lines[1].approximations.some(s=>s.includes('생략')));assert.equal(r.lines[1].structure.actor,'speaker');assert.ok(!r.lines[1].usedIds.includes('irs:1'));assert.ok(!r.lines[1].usedIds.includes('wearequewie:5'));
});
test('central scope can explain care-for and together paraphrases without leaked dialects',()=>{
 const care=line('나는 너를 사랑해.',{scope:'central',style:'poetic'});assert.ok(care.text.includes('yanwe yor'));assert.ok(care.approximations.length);
 const centralDirect=line('나는 너를 사랑해.',{scope:'central'});assert.equal(centralDirect.text,'');assert.ok(centralDirect.unresolved.some(s=>s.includes('범위')));
 const place=line('나는 당신 곁에 있고 싶어요.',{scope:'central',style:'poetic',format:'lyrics'});assert.ok(place.text.includes('an yor'));assert.ok(place.approximations.some(s=>s.includes('공간')));
 for(const e of inspectHymmnos(place.text,'central').entries)assert.equal(e.dialectId,1);
});
test('a song object stays a noun, with its owner separated from the listener',()=>{
 const a=line('나는 너의 노래를 듣는다.');assert.equal(a.text,'Was yea ra reen yos hymmnos.');assert.equal(a.structure.object.owner,'addressee');assert.equal(a.structure.actor,'speaker');
 const b=line('너는 내 노래를 듣는다.',{emotion:{...defaults.emotion,enabled:false}});assert.equal(b.text,'yorr reen hymmnos oz mea.');assert.equal(b.structure.object.owner,'speaker');assert.equal(b.structure.actor,'addressee');
});
test('other subject does not gain an invented speaker wish under an emotion prefix',()=>{const a=line('너는 노래한다.');assert.equal(a.text,'');assert.ok(a.unresolved.some(s=>s.includes('감정구')));const b=line('너는 노래한다.',{emotion:{...defaults.emotion,enabled:false}});assert.equal(b.text,'yorr hymme.');});
test('topic-object inversion does not swap the protector',()=>{const l=line('너는 내가 지킬게.');assert.equal(l.structure.actor,'speaker');assert.equal(l.structure.object.person,'addressee');assert.ok(l.text.includes('khal yor'));assert.ok(l.unresolved.some(s=>s.includes('미래')));});
test('nominal phrases keep adjective and noun without an invented event',()=>{const opts={emotion:{...defaults.emotion,enabled:false}};const a=line('작은 마을',opts);assert.equal(a.text,'titilia forlinden.');assert.equal(a.syntax,'fragment');assert.equal(a.structure.kind,'noun');const b=line('아름다운 노래',opts);assert.equal(b.text,'bautifal hymmnos.');assert.equal(line('작은 마을',{...opts,scope:'central'}).text,'');});
test('lyric line order, refrains and location fragments survive',()=>{const r=generate('좋아해요, 당신을…\n언제까지나, 언제까지나…\n당신 곁에…',{format:'lyrics',style:'poetic'});assert.equal(r.lines.length,3);assert.equal(r.lines[1].text,'yanje yanje...');assert.equal(r.lines[2].text,'pitod yor...');assert.ok(!r.lines[2].contextMeaning.includes('싶'));});
test('two sentences in one lyric line preserve the original line and sentence roles',()=>{const r=generate('나는 너를 사랑해. 나는 노래한다.\n나는 너를 지킨다.',{format:'lyrics'});assert.equal(r.lines.length,2);assert.equal(r.lines[0].text,'Was yea ra hartes yor. hymme.');assert.equal(r.lines[1].text,'khal yor.');});
test('coordinated clauses preserve different actors instead of merging words',()=>{const r=line('나는 노래하고 너는 듣는다.',{emotion:{...defaults.emotion,enabled:false}});assert.equal(r.structure.kind,'coordination');assert.equal(r.structure.children[0].actor,'speaker');assert.equal(r.structure.children[1].actor,'addressee');assert.equal(r.text,'hymme en yorr reen.');});
test('unknown concepts, conditional clauses, questions, requests and passive voice are withheld',()=>{for(const text of ['나는 스마트폰을 사랑해.','나는 와이파이를 켠다.','네가 오면 나는 노래한다.','나를 사랑해줘.','너는 나를 사랑해?','나는 사랑받고 싶어.']){const l=line(text);assert.equal(l.text,'',text);assert.ok(l.unresolved.length,text);}});
test('past time is not silently declared a fully preserved present translation',()=>{const l=line('나는 너를 사랑했어.');assert.equal(l.structure.features.past,true);assert.ok(l.unresolved.some(s=>s.includes('과거')));});
test('Hymmnos dotted words are not split internally and unknown spellings never pass',()=>{assert.deepEqual(splitUnits('a.u.k. ciel.','sentence'),['a.u.k. ciel.']);assert.equal(line('totallyfakeword yor.').text,'');});
test('all generated words come from the requested dictionary scope, with zero runtime fetch',()=>{
 const save=globalThis.fetch;globalThis.fetch=()=>{throw new Error('No network allowed during generation');};
 try{for(const scope of ['central','standard'])for(const style of ['close','poetic'])for(const text of ['나는 너를 사랑해.','나는 빛을 지킨다.','나는 너와 함께 걷고 싶어.','언제까지나…','작은 마을','나는 노래하지 않아.']){
  const r=generate(text,{scope,style});for(const l of r.lines){assert.equal(inspectHymmnos(l.text,scope).unknown.length,0);assert.ok(!/[가-힣]/u.test(l.text));}
 }}finally{globalThis.fetch=save;}
});
