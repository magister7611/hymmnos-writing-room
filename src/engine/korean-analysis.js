function splitSourceUnits(text, format) {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (format === "lyrics") return lines;
  return lines.flatMap((line) => {
    const result = [];
    let start = 0;
    for (const match of line.matchAll(/[.!?。！？]+(?=\s|$)/gu)) {
      const end = match.index + match[0].length;
      const token = line.slice(0, end).match(/\S+$/u)?.[0] || "";
      if (/^(?:[A-Za-z]\.){2,}$/u.test(token)) continue;
      const unit = line.slice(start, end).trim();
      if (unit) result.push(unit);
      start = end;
    }
    const tail = line.slice(start).trim();
    if (tail) result.push(tail);
    return result.length ? result : [line];
  });
}
function normalizeKorean(text) {
  return text.replace(/(^|\s)널(?=\s|[.!?,。！？]|$)/gu, "$1\uB108\uB97C").replace(/(^|\s)난(?=\s|$)/gu, "$1\uB098\uB294").replace(/(^|\s)네게(?=\s|[.!?,。！？]|$)/gu, "$1\uB108\uC5D0\uAC8C");
}
function analyzeKorean(text) {
  return {
    lovePredicate: /사랑(?:하|해|할|했|합|한다|하고|한|받)/u.test(text),
    futurePromise: /(?:할|될|줄|갈|올)\s*(?:거(?:야|예요|에요)|것(?:이다|이야)|게)|겠|리라/u.test(text),
    futureContinuity: /앞으로도/u.test(text),
    eternity: /영원|언제나|언제까지나|항상/u.test(text),
    negated: /(^|\s)(안|못)\s|안(?:하|해|한|할|되|돼|가|갈|오|올|보|볼|듣|먹|자|살|사랑|지키|지켜)|못(?:하|해|한|할|되|돼|가|갈|오|올|보|볼|듣|먹|자|살)|않|없|말아|말자/u.test(text)
  };
}
function looksLikePredicate(text) {
  return /(?:하(?:다|고|지|는|면|며|겠다)|해(?:요|서|도|줘|줄|야)?|할(?:\s*(?:거|것)[가-힣]*|게|까|래|수)|했다|했어|합니다|한다|킨다|키고|켜|부른다|부르고|듣는다|들어|준다|줘|된다|돼)$/u.test(text.replace(/[,.!?。！？]+$/gu, ""));
}
export {
  analyzeKorean,
  looksLikePredicate,
  normalizeKorean,
  splitSourceUnits
};
