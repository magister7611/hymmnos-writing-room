import entries from "../data/entries.json" with {type:'json'};
import sourceMetadata from "../data/metadata.json" with {type:'json'};
import { splitSourceUnits as splitSourceUnits2 } from "./korean-analysis.js";
const dictionary = entries;
const metadata = sourceMetadata;
const standardEntries = dictionary.filter((e) => e.grammarFamily === "standard" && !e.unofficial);
const dialectLabels = { 0: "미분류", 1: "중앙정순률", 2: "고대 메타팔스 (Cult Ciel)", 3: "클러스터", 4: "알파", 5: "메타팔스", 6: "신약 파스탈리에", 7: "EOLIA", 50: "미분류 · 비공식", 56: "파스탈리에 · 비공식" };
const classLabels = { 1: "감정 동사", 2: "동사", 3: "부사", 4: "명사", 5: "접속사", 6: "전치사", 7: "감정구 Ⅱ", 8: "형용사", 9: "명사·동사", 10: "형용사·명사", 11: "형용사·동사", 12: "조사", 13: "감정구 Ⅲ", 14: "감정구 Ⅰ", 15: "대명사", 16: "감탄사", 17: "전치사·조사", 18: "구문", 19: "부사·명사", 20: "형용사·부사", 21: "접속사·전치사", 22: "조사·동사", 23: "부사·조사", 24: "명사·전치사", 25: "부사·전치사" };
const emotions = {
  intensity: [["Was", "강렬하게"], ["Rrha", "자아를 잊을 만큼"], ["Wee", "상당히"], ["Fou", "조금"], ["Ma", "평정심으로"], ["Nn", "내키지 않게"]],
  feeling: [["yea", "기쁨"], ["ki", "집중"], ["granme", "용기 · 지키고 싶은 마음"], ["touwaka", "희망"], ["zweie", "결의 · 진심"], ["guwo", "분노"], ["au", "슬픔"], ["jyel", "외로움"], ["wol", "열정"], ["apea", "행복에 감싸임"], ["paks", "두근거림"], ["quel", "간절함"], ["yant", "두려움"], ["i", "초조함"], ["num", "무감정"]],
  wish: [["ra", "이대로 계속되기를"], ["erra", "영원히 계속되기를"], ["ga", "어서 벗어나기를"], ["gaya", "이전 상태로 돌아가지 않기를"], ["wa", "있는 그대로 받아들임"], ["gagis", "자신이 어떻게 되어도 상관없음"]]
};
const defaultEmotion = { enabled: true, intensity: "Was", feeling: "yea", wish: "ra" };
function prefixFor(e) {
  return e.enabled ? `${e.intensity} ${e.feeling} ${e.wish}` : "";
}
function prefixForUnit(options, index) {
  return options.emotionScope === "first" && index > 0 ? "" : prefixFor(options.emotion);
}
function meaningKo(e) {
  return e.glossKo || e.meaning;
}
function inScope(e, scope) {
  return !e.unofficial && e.grammarFamily === "standard" && (scope === "standard" || e.dialectId === 1);
}
const aliases = {
  "hartes": ["사랑", "사랑하", "사랑해", "love"],
  "khal": ["지키", "지켜", "지킨", "보호", "protect", "defend"],
  "hymme": ["노래하", "노래해", "노래한다", "부르", "불러", "sing"],
  "hymmnos": ["노래", "song"],
  "chs": ["되다", "되어", "변하", "become"],
  "yor": ["너를", "널", "너에게", "네게", "그대를", "그대에게", "당신을", "당신에게", "you"],
  "yos": ["너의", "당신의", "그대의", "your"],
  "yanje": ["영원히", "영원토록", "언제나", "언제까지나", "항상", "계속", "forever", "always"],
  "pitod": ["곁에", "옆에", "함께", "beside"],
  "irs": ["있다", "있고", "있기", "존재하", "exist"],
  "mea": ["나를", "나의", "내", "자신을", "myself", "me"],
  "ciel": ["세계", "세상", "하늘", "world", "sky"],
  "shen": ["빛", "light"],
  "memora": ["기억", "추억", "memory"],
  "meo": ["이상", "ideal"],
  "revm": ["꿈", "dream"],
  "frawr": ["꽃", "flower"],
  "forlinden": ["마을", "village"],
  "titilia": ["작은", "작고", "조그만", "small", "tiny"],
  "akata": ["이야기", "story"],
  "nuih": ["밤", "night"],
  "walaka": ["걷", "걸어", "walk"],
  "reen": ["듣", "들어", "들으며", "listen", "hear"],
  "accrroad": ["주다", "주고", "줄게", "건네", "give"],
  "rete": ["잊", "forget"],
  "harton": ["사랑을", "사랑의"],
  "hopb": ["마음", "심장", "heart"],
  "bautifal": ["아름다운", "아름답", "beautiful"],
  "vonn": ["어두운", "어둡", "dark"],
  "yeeel": ["먼", "멀리", "아득한", "distant"],
  "ween": ["미소", "웃음"],
  "manac": ["생명", "life"],
  "wearequewie": ["소망", "기원", "기도", "바라", "wish", "pray"],
  "eternal": ["영원", "eternity"],
  "eterne": ["영원", "eternity"],
  "hand": ["손", "hand"]
};
function normalize(s) {
  return s.toLowerCase().normalize("NFKC").trim();
}
function stems(e) {
  const korean = (e.glossKo || "").split(/[,;·/()]+/).map((s) => s.trim()).filter((s) => s.length >= 2);
  const verb = [2, 9, 11, 22].includes(e.classId);
  return [...aliases[e.word] || [], ...korean.map((s) => verb ? s.replace(/다$/u, "") : s), ...e.meaning.toLowerCase().split(/[,;()]+/).map((s) => s.trim()).filter((s) => s.length > 2), e.word].filter(Boolean);
}
function searchEntries(query, { scope = "all", part = "all", favorites = [], onlyFavorites = false } = {}) {
  const q = normalize(query);
  const favoriteSet = new Set(favorites);
  return dictionary.filter((e) => {
    if (scope === "standard" && !inScope(e, "standard")) return false;
    if (scope === "central" && !inScope(e, "central")) return false;
    if (scope === "pastalie" && e.grammarFamily !== "pastalie") return false;
    if (scope === "unofficial" && !e.unofficial) return false;
    if (part === "noun" && ![4, 9, 10, 19, 24].includes(e.classId)) return false;
    if (part === "verb" && ![2, 9, 11, 22].includes(e.classId)) return false;
    if (part === "emotion" && ![7, 13, 14].includes(e.classId)) return false;
    if (part === "adjective" && ![8, 10, 11, 20].includes(e.classId)) return false;
    if (onlyFavorites && !favoriteSet.has(e.id)) return false;
    return !q || normalize([e.word, e.meaning, e.glossKo, e.japanese, e.kana, e.romaji, ...aliases[e.word] || []].join(" ")).includes(q);
  }).sort((a, b) => {
    const score = (e) => (normalize(e.word) === q ? 100 : 0) + (normalize(e.glossKo || "") === q ? 50 : 0) + (normalize(e.word).startsWith(q) ? 10 : 0) + (e.unofficial ? 0 : 2) + (e.dialectId === 1 ? 1 : 0);
    return score(b) - score(a) || a.word.localeCompare(b.word);
  });
}
function getEntry(id) {
  return dictionary.find((e) => e.id === id);
}
function tokenizeHymmnos(text) {
  return text.match(/[A-Za-z0-9_]+(?:[.'#/-][A-Za-z0-9_]+)*\.?/g)?.map((s) => s.replace(/\.$/, "")) || [];
}
function inspectHymmnos(text, scope = "standard") {
  const allowed = dictionary.filter((e) => inScope(e, scope));
  const words = tokenizeHymmnos(text);
  return { entries: words.map((w) => allowed.find((e) => e.word === w) || allowed.find((e) => e.word.toLowerCase() === w.toLowerCase())).filter(Boolean), unknown: words.filter((w) => !allowed.some((e) => e.word.toLowerCase() === w.toLowerCase())) };
}
function emotionDescription(e) {
  if (!e.enabled) return "감정구 없이 일반 문장으로";
  const find = (a, w) => a.find((x) => x[0] === w)?.[1] || w;
  return [find(emotions.intensity, e.intensity), find(emotions.feeling, e.feeling), find(emotions.wish, e.wish)].join(" · ");
}
function generationText(g, includeMeaning = false) {
  return g.lines.map((l) => l.text ? [l.text, includeMeaning ? l.meaning : "", includeMeaning && l.contextMeaning ? `문맥상 뜻: ${l.contextMeaning}` : ""].filter(Boolean).join("\n") : includeMeaning ? `[표현 보류]
${l.meaning}` : "").filter(Boolean).join(g.format === "lyrics" ? "\n\n" : "\n");
}
export {
  classLabels,
  defaultEmotion,
  dialectLabels,
  dictionary,
  emotionDescription,
  emotions,
  generationText,
  getEntry,
  inScope,
  inspectHymmnos,
  meaningKo,
  metadata,
  prefixFor,
  prefixForUnit,
  searchEntries,
  splitSourceUnits2 as splitSourceUnits,
  standardEntries,
  tokenizeHymmnos
};
