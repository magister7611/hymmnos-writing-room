"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, BookOpen, Bookmark, Check, ChevronDown, Copy, Download, Feather, Heart, Info, Leaf, LoaderCircle, Moon, Music2, Plus, Search, Settings2, Sparkles, Sun, Trash2, Upload, X } from "lucide-react";
import { classLabels, defaultEmotion, dialectLabels, dictionary, emotionDescription, emotions, generationText, getEntry, meaningKo, prefixFor, searchEntries, standardEntries } from "./engine/catalog.js";
import { prepareEngine, generateInBrowser, cancelGeneration } from "./engine/client.js";
const defaults = { text: "나는 너를 사랑해.", emotion: defaultEmotion, emotionScope: "first", format: "sentence", scope: "standard", style: "close" };
const storageKey = "hymmnos-writing-room-v1";
const presets = [{ name: "기쁜 마음", prefix: "Was yea ra" }, { name: "깊은 몰입", prefix: "Rrha yea ra" }, { name: "지키는 마음", prefix: "Was granme ra" }, { name: "진심 어린 결의", prefix: "Wee zweie ra" }];
const examples = [{ label: "사랑을 전하기", text: "나는 너를 사랑해.", emotion: "Was yea ra" }, { label: "지키고 싶은 마음", text: "나는 너를 지킨다.", emotion: "Was granme ra" }, { label: "나 자신을 노래로", text: "나는 기쁜 마음으로 나 자신을 노래로 표현한다.", emotion: "Was yea ra" }];
function download(name, text, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2e3);
}
function dateLabel(s) {
  return new Date(s).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}
function safeSaved(value) {
  if (!value || typeof value !== "object") return false;
  const s = value;
  return typeof s.id === "string" && typeof s.title === "string" && s.title.length < 300 && !!s.generation && typeof s.generation.input === "string" && s.generation.input.length <= 1e4 && Array.isArray(s.generation.lines) && s.generation.lines.length <= 100 && s.generation.lines.every((l) => typeof l.text === "string" && l.text.length < 2e4 && typeof l.meaning === "string" && (l.contextMeaning === void 0 || typeof l.contextMeaning === "string") && (l.syntax === void 0 || ["sentence", "fragment"].includes(l.syntax)) && typeof l.original === "string" && Array.isArray(l.usedIds) && l.usedIds.every((id) => typeof id === "string") && Array.isArray(l.notes) && l.notes.every((n) => typeof n === "string") && Array.isArray(l.unresolved) && l.unresolved.every((n) => typeof n === "string") && (l.approximations === void 0 || Array.isArray(l.approximations) && l.approximations.every((n) => typeof n === "string"))) && typeof s.generation.createdAt === "string" && Array.isArray(s.generation.notes) && s.generation.notes.every((n) => typeof n === "string") && typeof s.generation.prefix === "string";
}
function Studio() {
  const [tab, setTab] = useState("create");
  const [draft, setDraft] = useState(defaults);
  const [result, setResult] = useState(null);
  const [analyzerReady, setAnalyzerReady] = useState(false);
  const [analyzerError, setAnalyzerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [theme, setTheme] = useState("light");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dictScope, setDictScope] = useState("standard");
  const [part, setPart] = useState("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedWords, setSelectedWords] = useState([]);
  const [advanced, setAdvanced] = useState(false);
  const [modal, setModal] = useState(null);
  const dialogRef = useRef(null);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");
  const [saveTitle, setSaveTitle] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [saveFilter, setSaveFilter] = useState("");
  const [activeSection, setActiveSection] = useState("도입부");
  const [lyricParts, setLyricParts] = useState({});
  const sections = ["도입부", "첫 번째 절", "후렴", "두 번째 절", "마무리"];
  const toastTimer = useRef(null);
  const requestRef = useRef(null);
  const notify = (text) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };
  useEffect(() => {
    let alive = true;
    prepareEngine().then(() => {
      if (alive) setAnalyzerReady(true);
    }).catch((e) => {
      if (alive) setAnalyzerError(e.message);
    });
    return () => {
      alive = false;
    };
  }, []);
  const update = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey + "-lyrics") || "null");
      if (!data || !data.parts) return;
      const valid = {};
      for (const [name, value] of Object.entries(data.parts)) {
        const p = value;
        if (!sections.includes(name) || !p || typeof p.text !== "string" || p.text.length > 2e3 || !p.emotion || typeof p.emotion.enabled !== "boolean" || !emotions.intensity.some((x) => x[0] === p.emotion.intensity) || !emotions.feeling.some((x) => x[0] === p.emotion.feeling) || !emotions.wish.some((x) => x[0] === p.emotion.wish)) continue;
        valid[name] = { ...p, result: p.result && safeSaved({ id: "draft", title: "draft", generation: p.result }) ? p.result : null };
      }
      setLyricParts(valid);
      if (sections.includes(data.active)) {
        setActiveSection(data.active);
        const global = JSON.parse(localStorage.getItem(storageKey) || "null");
        if (global?.draft?.format === "lyrics") setResult(valid[data.active]?.result || null);
      }
    } catch {
    }
  }, []);
  useEffect(() => {
    if (!loaded || draft.format !== "lyrics") return;
    try {
      const parts = { ...lyricParts, [activeSection]: { text: draft.text, emotion: draft.emotion, result: result?.format === "lyrics" ? result : null } };
      localStorage.setItem(storageKey + "-lyrics", JSON.stringify({ version: 1, active: activeSection, parts }));
    } catch {
      notify("가사 초안을 저장하지 못했습니다. 전체 가사를 파일로 내려받아 주세요.");
    }
  }, [loaded, lyricParts, activeSection, draft, result]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.saved)) setSaved(data.saved.filter(safeSaved).slice(0, 300));
        if (Array.isArray(data.favorites)) setFavorites(data.favorites.filter((id) => typeof id === "string" && Boolean(getEntry(id))).slice(0, 1e3));
        if (data.theme === "dark") setTheme("dark");
        const d = data.draft;
        if (d && typeof d.text === "string" && d.text.length <= 2e3) {
          const e = d.emotion;
          const valid = e && typeof e.enabled === "boolean" && emotions.intensity.some((x) => x[0] === e.intensity) && emotions.feeling.some((x) => x[0] === e.feeling) && emotions.wish.some((x) => x[0] === e.wish);
          setDraft({ ...defaults, text: d.text, format: d.format === "lyrics" ? "lyrics" : "sentence", scope: d.scope === "central" ? "central" : "standard", style: d.style === "poetic" ? "poetic" : "close", emotionScope: d.emotionScope === "each" ? "each" : "first", emotion: valid ? e : defaultEmotion });
        }
      }
    } catch {
      notify("저장된 정보를 읽지 못했습니다. 새 작업은 계속할 수 있습니다.");
    }
    setLoaded(true);
    return () => {
      cancelGeneration();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, saved, favorites, draft, theme }));
    } catch {
      notify("기기 저장 공간이 부족합니다. 내 문장을 파일로 백업해 주세요.");
    }
  }, [saved, favorites, draft, theme, loaded]);
  useEffect(() => {
    const d = dialogRef.current;
    if (modal && d && !d.open) d.showModal();
    if (!modal && d?.open) d.close();
  }, [modal]);
  useEffect(() => setPage(0), [query, dictScope, part, onlyFavorites]);
  const matches = useMemo(() => searchEntries(query, { scope: dictScope, part, favorites, onlyFavorites }), [query, dictScope, part, favorites, onlyFavorites]);
  const displayed = matches.slice(page * 30, (page + 1) * 30);
  const prefix = prefixFor(draft.emotion);
  const allUsed = useMemo(() => [...new Set(result?.lines.flatMap((l) => l.usedIds) || [])].map(getEntry).filter(Boolean), [result]);
  const unresolved = [...new Set(result?.lines.flatMap((l) => l.unresolved) || [])];
  const approximations = [...new Set(result?.lines.flatMap((l) => l.approximations || []) || [])];
  const resultContent = result ? generationText(result) : "";
  const toggleFavorite = (id) => setFavorites((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id]);
  function switchSection(section) {
    if (section === activeSection) return;
    setLyricParts((old) => ({ ...old, [activeSection]: { text: draft.text, emotion: draft.emotion, result: result?.format === "lyrics" ? result : null } }));
    const next = lyricParts[section];
    setActiveSection(section);
    setDraft((d) => ({ ...d, text: next?.text || "", emotion: next?.emotion || d.emotion }));
    setResult(next?.result || null);
    setEditMode(false);
    setError("");
  }
  function changeFormat(format) {
    if (format === draft.format) return;
    if (draft.format === "lyrics") setLyricParts((old) => ({ ...old, [activeSection]: { text: draft.text, emotion: draft.emotion, result: result?.format === "lyrics" ? result : null } }));
    const next = format === "lyrics" ? lyricParts[activeSection] : null;
    setDraft((d) => ({ ...d, format, text: next?.text ?? d.text, emotion: next?.emotion ?? d.emotion }));
    setResult(next?.result || null);
    setEditMode(false);
  }
  function exportSong() {
    const parts = { ...lyricParts, [activeSection]: { text: draft.text, emotion: draft.emotion, result: result?.format === "lyrics" ? result : null } };
    const labels = { "도입부": "Intro", "첫 번째 절": "Verse 1", "후렴": "Chorus", "두 번째 절": "Verse 2", "마무리": "Outro" };
    const text = sections.filter((s) => parts[s]?.result?.lines.some((l) => l.text.trim())).map((s) => `[${labels[s]}]
${parts[s].result.lines.map((l) => l.text).filter(Boolean).join("\n")}`).join("\n\n");
    if (!text) {
      notify("먼저 한 구절을 만들어 주세요.");
      return;
    }
    download("나의-휴므노스-가사.txt", text);
    notify("작성한 구간을 곡 순서대로 내려받았습니다.");
  }
  function setPrefix(value) {
    if (!value) {
      update("emotion", { ...draft.emotion, enabled: false });
      return;
    }
    const [intensity, feeling, wish] = value.split(" ");
    update("emotion", { enabled: true, intensity, feeling, wish });
  }
  async function generate() {
    if (busy || requestRef.current) return;
    setError("");
    if (!draft.text.trim()) {
      setError("표현하고 싶은 문장을 먼저 적어주세요.");
      return;
    }
    setBusy(true);
    setEditMode(false);
    requestRef.current = true;
    try {
      const value = await generateInBrowser(draft);
      setResult(value);
      setAnalyzerReady(true);
      setAnalyzerError("");
    } catch (e) {
      if (e.message !== "작업을 중단했습니다.") setError(e.message);
    } finally {
      setBusy(false);
      requestRef.current = null;
    }
  }
  function addWord(entry) {
    if (entry.grammarFamily !== "standard" || entry.unofficial) {
      notify("이 항목은 확장 사전용입니다. 기본 조합에는 표준계열 단어를 사용해 주세요.");
      return;
    }
    setSelectedWords((a) => [...a, entry.id]);
    setTab("create");
    setModal(null);
    notify(`${entry.word} · 조합할 단어에 추가했습니다.`);
  }
  function compose() {
    const entries = selectedWords.map(getEntry).filter(Boolean);
    if (!entries.length) return;
    const body = entries.map((e) => e.word).join(" ");
    setResult({ engine: "dictionary", createdAt: (/* @__PURE__ */ new Date()).toISOString(), prefix, emotionScope: draft.emotionScope, format: draft.format, input: draft.text, notes: ["직접 선택한 단어의 순서입니다. 어순과 뜻은 직접 검토해 주세요."], lines: [{ original: draft.text, text: [prefix, body + "."].filter(Boolean).join(" "), meaning: entries.map(meaningKo).join(" / "), usedIds: entries.map((e) => e.id), unresolved: [], notes: [] }] });
    setEditMode(false);
  }
  async function copy(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      notify("복사했습니다.");
    } catch {
      setEditMode(true);
      setEditText(text);
      notify("복사 권한을 사용할 수 없습니다. 결과의 텍스트를 직접 선택해 주세요.");
    }
  }
  function saveResult() {
    if (!result || !result.lines.some((l) => l.text.trim())) return;
    const title = saveTitle.trim() || `${draft.format === "lyrics" ? activeSection : "나의 문장"} · ${result.input.replace(/\n/g, " ").slice(0, 28)}`;
    setSaved((a) => [{ id: crypto.randomUUID(), title, generation: result }, ...a].slice(0, 300));
    setSaveTitle("");
    notify("내 문장에 저장했습니다. 이 브라우저에 보관됩니다.");
  }
  function applyEdit() {
    if (!result || !editText.trim()) return;
    setResult({ ...result, createdAt: (/* @__PURE__ */ new Date()).toISOString(), notes: [...result.notes, "직접 수정한 결과입니다. 기존 단어 풀이와 달라질 수 있습니다."], lines: [{ original: result.input, text: editText.trim(), meaning: "직접 수정한 문장 · 단어사전에서 뜻을 확인해 주세요.", usedIds: [], unresolved: [], notes: [] }] });
    setEditMode(false);
  }
  async function importSaved(file) {
    if (!file) return;
    if (file.size > 3e6) {
      notify("3MB 이하의 백업 파일을 선택해 주세요.");
      return;
    }
    try {
      const data = JSON.parse(await file.text());
      const items = Array.isArray(data) ? data : data.saved;
      if (!Array.isArray(items) || !items.every(safeSaved)) throw new Error();
      setSaved((old) => {
        const seen = new Set(old.map((x) => x.id));
        return [...items.filter((x) => {
          if (seen.has(x.id)) return false;
          seen.add(x.id);
          return true;
        }), ...old].slice(0, 300);
      });
      notify("백업한 문장을 가져왔습니다.");
    } catch {
      notify("이 작업실에서 내보낸 올바른 백업 파일을 선택해 주세요.");
    }
  }
  const nav = (value, label, Icon) => <button type="button" className={`nav-item ${tab === value ? "active" : ""}`} aria-current={tab === value ? "page" : void 0} onClick={() => setTab(value)}><Icon size={17} /><span>{label}</span>{value === "saved" && saved.length > 0 && <small>{saved.length}</small>}</button>;
  const modeButton = (value, label, Icon) => <button type="button" className={draft.format === value ? "selected" : ""} aria-pressed={draft.format === value} onClick={() => changeFormat(value)}><Icon size={16} />{label}</button>;
  const wordCard = (entry) => <article className="word-card" key={entry.id}><div className="word-card-top"><button type="button" className="word-name" onClick={() => setModal(entry)}>{entry.word}</button><button type="button" className={`icon-button ${favorites.includes(entry.id) ? "favorited" : ""}`} aria-label={`${entry.word} 즐겨찾기 ${favorites.includes(entry.id) ? "해제" : "추가"}`} aria-pressed={favorites.includes(entry.id)} onClick={() => toggleFavorite(entry.id)}><Heart size={17} fill={favorites.includes(entry.id) ? "currentColor" : "none"} /></button></div><p className="word-meaning">{meaningKo(entry)}</p><p className="word-original">{entry.meaning}</p><div className="word-card-bottom"><span className="word-tag">{classLabels[entry.classId] || entry.class}</span><span className="dialect-tag">{dialectLabels[entry.dialectId] || entry.dialect}</span></div><div className="word-actions"><button className="text-button" onClick={() => setModal(entry)}>자세히 <ArrowRight size={13} /></button>{!entry.unofficial && entry.grammarFamily === "standard" && <button className="text-button" onClick={() => addWord(entry)}><Plus size={14} /> 조합에 추가</button>}</div></article>;
  return <div className="site-shell"><a className="skip-link" href="#main-content">본문으로 건너뛰기</a><header className="site-header"><div className="header-inner"><button className="brand" onClick={() => setTab("create")} aria-label="Hymmnos 작업실 홈"><span className="brand-symbol"><Music2 size={22} strokeWidth={1.5} /></span><span>HYMMNOS<small>마음을 노래로</small></span></button><nav className="main-nav" aria-label="주 메뉴">{nav("create", "창작하기", Feather)}{nav("dictionary", "단어사전", BookOpen)}{nav("saved", "내 문장", Bookmark)}</nav><div className="header-tools"><button type="button" className="icon-button" aria-label={theme === "light" ? "어두운 화면으로" : "밝은 화면으로"} onClick={() => setTheme((t) => t === "light" ? "dark" : "light")}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button><button type="button" className="icon-button" aria-label="작업실 안내" onClick={() => setModal("settings")}><Settings2 size={18} /></button></div></div></header>
 <main id="main-content" className="main-content">
 {tab === "create" && <><section className="page-heading"><div><p className="eyebrow"><span /> YOUR WORDS, YOUR HYMN</p><h1>마음을 문장으로,<br className="mobile-break" /> 문장을 노래로.</h1><p className="intro">단어를 찾아 마음을 잇는, 나만의 휴므노스 작업실.</p></div><div className="heading-note"><Leaf size={17} /><span>당신의 속도로,<br />한 구절씩.</span></div></section><div className="workbench-top"><div className="segmented" aria-label="창작 형식">{modeButton("sentence", "문장 · 대사", Feather)}{modeButton("lyrics", "노래 가사", Music2)}</div><button className={`connection-badge ${analyzerReady ? "connected" : ""}`} onClick={() => setModal("settings")}><span />{analyzerReady ? "내 기기에서 처리" : analyzerError ? "분석기 확인 필요" : "분석기 준비 중"}<ChevronDown size={13} /></button></div>
 {draft.format === "lyrics" && <div className="lyrics-sections" aria-label="가사 구간">{sections.map((s) => <button type="button" aria-pressed={activeSection === s} className={activeSection === s ? "active" : ""} onClick={() => switchSection(s)} key={s}>{s}</button>)}<span>한 줄에 한 구절씩 입력해 주세요.</span><button type="button" className="text-button" onClick={exportSong}><Download size={13} /> 전체 가사</button></div>}
 <div className={`workbench ${draft.format === "lyrics" ? "lyrics-mode" : ""}`}><section className="editor-panel"><div className="panel-label"><span className="step-number">01</span><h2>표현하고 싶은 마음</h2><span className="mini-note">한국어 또는 휴므노스</span></div><label className="sr-only" htmlFor="source-text">표현하고 싶은 문장</label><textarea id="source-text" className="source-input" maxLength={2e3} value={draft.text} placeholder={draft.format === "lyrics" ? "한 줄에 한 구절씩 마음을 이어가세요." : "전하고 싶은 말이나 마음을 적어주세요."} onChange={(e) => update("text", e.target.value)} onKeyDown={(e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void generate();
    }
  }} /><div className="input-footer"><span>{draft.format === "lyrics" ? "줄바꿈을 구절로 유지해요." : "Ctrl + Enter로 빠르게 만들기"}</span><span>{draft.text.length.toLocaleString()} / 2,000</span></div>
 <div className="emotion-section"><div className="section-label"><label htmlFor="emotion-toggle">주문 앞부분 <small>감정구</small></label><label className="toggle"><input id="emotion-toggle" type="checkbox" checked={draft.emotion.enabled} onChange={(e) => update("emotion", { ...draft.emotion, enabled: e.target.checked })} /><span /><span className="sr-only">감정구 사용</span></label></div><div className="preset-list">{presets.map((p) => <button key={p.prefix} type="button" className={prefix === p.prefix ? "chosen" : ""} aria-pressed={prefix === p.prefix} onClick={() => setPrefix(p.prefix)}><span>{p.prefix}</span><small>{p.name}</small></button>)}</div><p className="emotion-description">{emotionDescription(draft.emotion)}</p><label className="emotion-placement">감정구 넣는 위치<select value={draft.emotionScope} disabled={!draft.emotion.enabled} onChange={(e) => update("emotionScope", e.target.value)}><option value="first">글 처음에만</option><option value="each">문장 · 구절마다</option></select></label><button type="button" className="text-button custom-emotion" aria-expanded={advanced} onClick={() => setAdvanced((a) => !a)}>감정구 직접 조합 <ChevronDown size={14} className={advanced ? "rotated" : ""} /></button>{advanced && <div className="emotion-fields">{["intensity", "feeling", "wish"].map((key, index) => <label key={key}>{["강도", "감정", "바람"][index]}<select value={draft.emotion[key]} disabled={!draft.emotion.enabled} onChange={(e) => update("emotion", { ...draft.emotion, [key]: e.target.value })}>{emotions[key].map(([word, label]) => <option value={word} key={word}>{word} · {label}</option>)}</select></label>)}</div>}</div>
 <div className="generation-options"><label>본문 어휘<select value={draft.scope} onChange={(e) => update("scope", e.target.value)}><option value="standard">표준계열 전체</option><option value="central">중앙정순률만</option></select></label><label>표현 방식<select value={draft.style} onChange={(e) => update("style", e.target.value)}><option value="close">원문에 가깝게</option><option value="poetic">시적인 의역 허용</option></select></label></div><p className="style-help">{draft.style === "poetic" ? "반복과 생략으로 운율을 다듬고, 달라진 뜻을 함께 보여드려요." : "주체·대상·바람·부정을 구분해 문장을 만들어요."}</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button generate-button" type="button" disabled={busy || !draft.text.trim()} onClick={() => void generate()}>{busy ? <LoaderCircle size={18} className="spin" /> : <Sparkles size={18} />} {busy ? "마음을 다듬고 있어요…" : draft.format === "lyrics" ? "구절 만들기" : "문장 만들기"}{!busy && <ArrowRight size={17} />}</button>{busy && <button className="text-button" onClick={() => cancelGeneration()}>요청 중단</button>}</section>
 <section className="result-panel" aria-busy={busy}><div className="panel-label"><span className="step-number">02</span><h2>{draft.format === "lyrics" ? "나의 노랫말" : "완성된 문장"}</h2>{result && <span className="result-label">{result.engine === "gpt" ? "가져온 GPT 초안" : "브라우저 문장 초안"}</span>}</div>{!result ? <div className="empty-result"><div className="empty-mark"><Feather size={35} strokeWidth={1.1} /></div><h3>당신의 첫 문장이<br />이곳에서 시작됩니다.</h3><p>전하고 싶은 마음을 적고<br />어울리는 감정구를 골라보세요.</p><div className="empty-rule" /><span className="serif">Was yea ra…</span></div> : <div className="result-body">{(result.input !== draft.text || result.prefix !== prefix || (result.emotionScope || "each") !== draft.emotionScope) && <p className="draft-changed">입력이나 감정구 설정이 바뀌었어요. 다시 만들면 반영됩니다.</p>}<div className="result-toolbar"><span className="tiny-label">{result.format === "lyrics" ? activeSection : "HYMMNOS"}</span><button className="text-button" onClick={() => {
    setEditText(resultContent);
    setEditMode((a) => !a);
  }}>{editMode ? "편집 닫기" : "직접 다듬기"} <Feather size={13} /></button></div>{editMode ? <div className="edit-result"><label htmlFor="edit-result" className="sr-only">휴므노스 결과 직접 수정</label><textarea id="edit-result" value={editText} maxLength={5e3} onChange={(e) => setEditText(e.target.value)} /><button className="small-button" onClick={applyEdit}>수정 적용</button></div> : <div className="generated-lines" aria-live="polite">{result.lines.map((line, i) => <div key={i} className="generated-line">{result.format === "lyrics" && <span className="line-index">{String(i + 1).padStart(2, "0")}</span>}<div>{line.text ? <p className="hymmnos-text">{result.prefix && line.text.startsWith(result.prefix) ? <><span className="emotion-text">{result.prefix}</span><span>{line.text.slice(result.prefix.length).trim()}</span></> : line.text}</p> : <p className="held-line">이 구절은 표현을 보류했어요.</p>}<p className="literal-meaning">{line.syntax === "fragment" && <span className="fragment-label">생략을 쓴 어구 · 직역</span>}{line.meaning}</p>{line.contextMeaning && <p className="context-meaning"><span>문맥상 담은 뜻</span>{line.contextMeaning}</p>}{line.notes.length > 0 && <details className="line-note"><summary>이 구절의 해설</summary>{line.notes.map((note, j) => <p key={j}>{note}</p>)}</details>}</div></div>)}</div>}{approximations.length > 0 && <div className="adaptations"><div><Feather size={15} /><strong>의역·근사한 부분</strong></div><ul>{approximations.map((text, i) => <li key={i}>{text}</li>)}</ul></div>}{unresolved.length > 0 && <div className="unresolved"><div><Info size={15} /><strong>아직 담지 못한 뜻</strong></div><p>{unresolved.join(" · ")}</p><span>이 부분은 결과나 위의 의역만으로 충분히 담지 못했습니다. 어휘 범위를 넓히거나 직접 다듬어 주세요.</span></div>}<div className="result-actions"><button className="small-button" disabled={!resultContent} onClick={() => void copy(resultContent)}><Copy size={15} /> 문장 복사</button><button className="small-button subtle" disabled={!resultContent} onClick={() => void copy(generationText(result, true))}>뜻과 함께 복사</button></div>{allUsed.length > 0 && <details className="used-words" open><summary>사용한 단어 <span>{allUsed.length}</span><ChevronDown size={15} /></summary><div className="used-word-list">{allUsed.map((e) => <button key={e.id} type="button" onClick={() => setModal(e)}><span className="serif">{e.word}</span><span>{meaningKo(e)}</span><small>{classLabels[e.classId] || e.class}</small></button>)}</div></details>}<details className="result-notes"><summary>작성 방식과 참고 사항</summary>{result.notes.map((n, i) => <p key={i}>{n}</p>)}{typeof result.model === "string" && <p>사용 모델: {result.model}</p>}{result.usage && Number.isFinite(result.usage.inputTokens) && Number.isFinite(result.usage.outputTokens) && <p>입력 {result.usage.inputTokens.toLocaleString()} · 출력 {result.usage.outputTokens.toLocaleString()} 토큰{result.usage.calls > 1 ? " (자동 수정 포함)" : ""}<br />입력 중 캐시 재사용 {Number.isFinite(result.usage.cachedInputTokens) ? result.usage.cachedInputTokens.toLocaleString() : 0} 토큰 · 새 캐시 저장 {Number.isFinite(result.usage.cacheWriteTokens) ? result.usage.cacheWriteTokens.toLocaleString() : 0} 토큰</p>}<a href="https://hymmnoserver.uguu.ca/grammar.php" target="_blank" rel="noreferrer">표준 문법 원문 보기 ↗</a></details><div className="save-result"><label className="sr-only" htmlFor="save-title">저장할 제목</label><input id="save-title" value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} maxLength={100} placeholder={draft.format === "lyrics" ? `${activeSection} · 제목을 붙여보세요` : "제목을 붙여보세요 (선택)"} /><button type="button" className="small-button" onClick={saveResult} disabled={!result.lines.some((l) => l.text.trim())}><Bookmark size={15} /> 저장</button><button className="icon-button" aria-label="결과 텍스트 내려받기" onClick={() => download("나의-휴므노스.txt", generationText(result, true))}><Download size={17} /></button></div><p className="storage-note">내 문장은 현재 기기·브라우저에 저장됩니다.</p></div>}</section></div>
 <section className="inspiration-strip"><div><span className="tiny-label">작은 시작</span><h3>어떤 마음을 전할까요?</h3></div><div className="example-list">{examples.map((ex) => <button key={ex.label} type="button" onClick={() => {
    update("text", ex.text);
    setPrefix(ex.emotion);
    setError("");
  }}>{ex.label}<ArrowUp size={13} /></button>)}</div></section>{selectedWords.length > 0 && <section className="word-composer"><div className="row-between"><div><p className="tiny-label">MY WORDS</p><h2>단어로 직접 조합하기</h2></div><button className="text-button" onClick={() => setSelectedWords([])}>선택 비우기</button></div><p className="muted">왼쪽부터 사용할 순서입니다. 단어사전에서 마음에 드는 단어를 더해보세요.</p><div className="composer-words">{selectedWords.map((id, i) => {
    const e = getEntry(id);
    return <div key={`${id}-${i}`}><button className="word-name" onClick={() => setModal(e)}>{e.word}</button><span>{meaningKo(e)}</span><div><button className="icon-button" aria-label={`${e.word} 앞으로 이동`} disabled={i === 0} onClick={() => setSelectedWords((a) => {
      const b = [...a];
      [b[i - 1], b[i]] = [b[i], b[i - 1]];
      return b;
    })}><ArrowLeft size={13} /></button><button className="icon-button" aria-label={`${e.word} 뒤로 이동`} disabled={i === selectedWords.length - 1} onClick={() => setSelectedWords((a) => {
      const b = [...a];
      [b[i + 1], b[i]] = [b[i], b[i + 1]];
      return b;
    })}><ArrowRight size={13} /></button><button className="icon-button" aria-label={`${e.word} 제거`} onClick={() => setSelectedWords((a) => a.filter((_, j) => j !== i))}><X size={13} /></button></div></div>;
  })}</div><button className="small-button" onClick={compose}>선택한 순서로 조합 <ArrowRight size={15} /></button></section>}</>}
 {tab === "dictionary" && <><section className="page-heading"><div><p className="eyebrow"><span /> A LIBRARY OF FEELINGS</p><h1>마음에 닿는 단어를 찾아요.</h1><p className="intro">한국어 뜻, 휴므노스 표기, 영어·일본어로 찾아볼 수 있어요.</p></div><span className="dictionary-count">전체 {dictionary.length}항목<br /><small>기본 생성 어휘 {standardEntries.length}항목</small></span></section><div className="dictionary-tools"><div className="search-field"><Search size={19} /><label className="sr-only" htmlFor="dictionary-search">사전 검색</label><input id="dictionary-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="사랑, 빛, 노래… 또는 hymmnos" />{query && <button className="icon-button" aria-label="검색어 지우기" onClick={() => setQuery("")}><X size={16} /></button>}</div><div className="filter-row"><label><span className="sr-only">어휘 범위</span><select value={dictScope} onChange={(e) => setDictScope(e.target.value)}><option value="standard">표준계열</option><option value="central">중앙정순률</option><option value="all">전체 사전</option><option value="pastalie">파스탈리에 · 조회용</option><option value="unofficial">비공식 · 조회용</option></select></label><label><span className="sr-only">품사</span><select value={part} onChange={(e) => setPart(e.target.value)}><option value="all">모든 품사</option><option value="noun">명사</option><option value="verb">동사</option><option value="adjective">형용사</option><option value="emotion">감정구</option></select></label><button className={`small-button ${onlyFavorites ? "chosen" : ""}`} aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites((x) => !x)}><Heart size={15} /> 즐겨찾기</button></div></div><div className="dictionary-meta"><span>{matches.length}개의 항목{query ? ` · “${query}”` : ""}</span><span>한국어 뜻은 검토용 번역 · 원문 함께 확인</span></div>{displayed.length ? <div className="dictionary-grid">{displayed.map(wordCard)}</div> : <div className="page-empty"><Search size={28} /><h2>일치하는 단어가 없어요.</h2><p>비슷한 한국어 표현이나 영어 뜻으로 검색해 보세요.</p><button className="small-button" onClick={() => {
    setQuery("");
    setPart("all");
    setOnlyFavorites(false);
    setDictScope("standard");
  }}>필터 초기화</button></div>}{matches.length > 30 && <div className="pagination"><button className="small-button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ArrowLeft size={15} /> 이전</button><span>{page + 1} / {Math.ceil(matches.length / 30)}</span><button className="small-button" disabled={(page + 1) * 30 >= matches.length} onClick={() => setPage((p) => p + 1)}>다음 <ArrowRight size={15} /></button></div>}<p className="dictionary-caution">파스탈리에는 문법이 달라 기본 생성에서 제외합니다. 비공식 항목은 출처를 구분해 조회용으로만 제공합니다.</p></>}
 {tab === "saved" && <><section className="page-heading"><div><p className="eyebrow"><span /> YOUR LITTLE COLLECTION</p><h1>남겨둔 마음들.</h1><p className="intro">다시 꺼내 다듬고 싶은 문장과 노랫말을 모아두세요.</p></div><div className="backup-actions"><button className="small-button" onClick={() => download("hymmnos-backup.json", JSON.stringify({ version: 1, saved }, null, 2), "application/json")} disabled={!saved.length}><Download size={15} /> 백업</button><label className="small-button upload-label"><Upload size={15} /> 가져오기<input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => {
    void importSaved(e.target.files?.[0]);
    e.target.value = "";
  }} /></label></div></section><div className="saved-notice"><Info size={17} /><span>현재 기기·브라우저에 보관됩니다. 다른 기기에서 이어 쓰려면 백업 파일을 가져와 주세요.</span></div>{saved.length > 0 && <div className="search-field saved-search"><Search size={18} /><input aria-label="내 문장 검색" value={saveFilter} onChange={(e) => setSaveFilter(e.target.value)} placeholder="제목이나 원문으로 찾기" /></div>}{saved.length === 0 ? <div className="page-empty"><Bookmark size={33} strokeWidth={1.3} /><h2>아직 남겨둔 문장이 없어요.</h2><p>작업실에서 만든 문장을 저장해 보세요.</p><button className="primary-button" onClick={() => setTab("create")}>첫 문장 만들기 <ArrowRight size={16} /></button></div> : <div className="saved-grid">{saved.filter((s) => `${s.title} ${s.generation.input} ${generationText(s.generation)}`.toLowerCase().includes(saveFilter.toLowerCase())).map((s) => <article className="saved-card" key={s.id}><div className="row-between"><span className="tiny-label">{s.generation.format === "lyrics" ? "노래 가사" : "문장 · 대사"}</span><span className="muted small">{dateLabel(s.generation.createdAt)}</span></div><h2>{s.title}</h2><p className="saved-hymmnos">{generationText(s.generation)}</p><p className="saved-original">{s.generation.input}</p><div className="saved-actions"><button className="text-button" onClick={() => {
    setResult(s.generation);
    update("text", s.generation.input.slice(0, 2e3));
    update("format", s.generation.format === "lyrics" ? "lyrics" : "sentence");
    setTab("create");
    setEditMode(false);
  }}>이어 다듬기 <ArrowRight size={14} /></button><button className="icon-button" aria-label={`${s.title} 복사`} onClick={() => void copy(generationText(s.generation))}><Copy size={16} /></button><button className="icon-button" aria-label={`${s.title} 삭제`} onClick={() => setDeleteId(s.id)}><Trash2 size={16} /></button></div>{deleteId === s.id && <div className="delete-confirm"><span>이 문장을 삭제할까요?</span><button className="text-button" onClick={() => {
    setSaved((a) => a.filter((x) => x.id !== s.id));
    setDeleteId(null);
  }}>삭제</button><button className="text-button" onClick={() => setDeleteId(null)}>취소</button></div>}</article>)}</div>}</>}
 </main><footer className="site-footer"><div><span className="serif">Hymmnos</span><span>한 구절에 담는, 나의 마음.</span></div><div><span>사전 원본 · Hymmnoserver</span><button onClick={() => setModal("credits")}>출처와 이용 안내 <ArrowUp size={12} /></button></div></footer>{toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
 <dialog ref={dialogRef} className="modal" aria-label={modal === "settings" ? "작업실 안내" : modal === "credits" ? "출처와 이용 안내" : typeof modal === "object" && modal ? `${modal.word} 단어 설명` : "단어 설명"} onCancel={() => setModal(null)} onClick={(e) => {
    if (e.target === e.currentTarget) {
      const r = dialogRef.current?.getBoundingClientRect();
      if (r && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) setModal(null);
    }
  }}><div className="modal-header"><span className="tiny-label">{modal === "settings" ? "WORKSPACE" : modal === "credits" ? "ABOUT THIS ROOM" : "WORD NOTES"}</span><button className="icon-button" autoFocus aria-label="닫기" onClick={() => setModal(null)}><X size={20} /></button></div>
 {modal === "settings" && <div className="modal-content"><div className="modal-icon"><Leaf size={24} /></div><h2>내 기기에서 만드는 문장</h2><p className="muted">사전과 한국어 분석기를 브라우저에서 실행합니다. 문장을 만들 때 입력 내용을 서버로 보내지 않아요.</p><div className="connection-state"><span className={`status-dot ${analyzerReady ? "on" : ""}`} /><div><strong>{analyzerReady ? "분석기가 준비됐어요" : "분석기를 준비하고 있어요"}</strong><p>{analyzerError || "처음 접속할 때 분석기 파일을 내려받습니다."}</p></div></div>{analyzerError && <button className="small-button" onClick={() => {
    setAnalyzerError("");
    prepareEngine().then(() => setAnalyzerReady(true)).catch((e) => setAnalyzerError(e.message));
  }}>다시 불러오기</button>}<h3>오프라인에서도 이어 쓰기</h3><p>첫 접속과 파일 저장이 끝나면 연결이 끊겨도 문장 생성과 사전 검색을 이용할 수 있습니다. 브라우저가 저장된 파일을 지웠다면 다시 접속해야 해요.</p><h3>기존 작업실의 문장 가져오기</h3><p>기존 사이트의 ‘내 문장’에서 백업 파일을 내려받고, 이 작업실의 ‘내 문장 → 가져오기’에서 불러오세요. 다른 주소의 저장 내용은 자동으로 옮겨지지 않습니다.</p><h3>GPT로 더 자유롭게 다듬기</h3><p>기존 GPT 작업실은 별도로 이용할 수 있습니다. 이 버전은 API 키를 입력하거나 GPT를 호출하지 않습니다.</p><a className="small-button" href="https://hymmnos-writing-room.anj835275.chatgpt.site/" target="_blank" rel="noreferrer">기존 GPT 작업실 열기 ↗</a><div className="row-between"><span>화면 테마</span><button className="small-button" onClick={() => setTheme((t) => t === "light" ? "dark" : "light")}>{theme === "light" ? <Moon size={15} /> : <Sun size={15} />} {theme === "light" ? "어두운 화면" : "밝은 화면"}</button></div></div>}
 {modal === "credits" && <div className="modal-content"><h2>마음을 잇는 자료들</h2><p>알 토네리코의 휴므노스를 활용해 개인적인 대사와 가사를 만드는 비공식 팬 창작 도구입니다.</p><h3>사전과 문법</h3><p>Hymmnoserver · Neil Tallim 외 기여자. 2016-01-09 공개 데이터의 {dictionary.length}개 항목을 가져오고 현재 알파벳별 목록과 대조했습니다. 표준계열 {standardEntries.length}개 항목을 기본 생성에 사용합니다.</p><p><a href="https://hymmnoserver.uguu.ca/" target="_blank" rel="noreferrer">Hymmnoserver ↗</a><br /><a href="https://github.com/flan/hymmnoserver" target="_blank" rel="noreferrer">공개 저장소와 기여자 ↗</a><br /><a href="./data/source-notice.txt" target="_blank" rel="noreferrer">원본 라이선스와 예외 고지 ↗</a></p><h3>한국어 분석기</h3><p>Garu(garu-ko) · Yongjin Cho. 브라우저에서 실행되는 한국어 형태소 분석기를 이용합니다. 분석기의 보고된 정확도는 휴므노스 번역 정확도를 뜻하지 않습니다.</p><p><a href="https://github.com/ongjin/garu" target="_blank" rel="noreferrer">Garu 원본 ↗</a><br /><a href="./notices/garu/NOTICE" target="_blank" rel="noreferrer">분석기 출처와 고지 ↗</a><br /><a href="./notices/garu/models/NOTICE.md" target="_blank" rel="noreferrer">분석기 사전 자료 고지 ↗</a></p><h3>자료 변경과 이용 고지</h3><p>원본의 일본어·가나 인코딩을 복구하고, 한국어 뜻 초안과 검색용 설명을 추가했습니다. 한국어 뜻은 전문가 검수가 완료되지 않았으며 영어·일본어 원문을 함께 제공합니다.</p><p>저장소는 사전 콘텐츠를 CC BY-SA 3.0으로 안내하지만, 일부 현행 페이지에는 BY-NC-SA 3.0 링크가 있습니다. 원본 고지에는 GUST/Banpresto 저작물에 관한 예외도 있습니다. 이 도구는 원권리자의 공식 허가나 권리 관계를 보증하지 않습니다. 출처·고지와 변경 내역을 보존했습니다.</p><p><a href="./data/dictionary.json" download>정리된 사전 JSON 내려받기</a><br /><a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0 ↗</a></p><h3>창작 결과와 보관</h3><p>형태소와 주체·대상·바람의 관계를 분석해 생성하는 초안입니다. 지원하지 않는 절이나 시제·의지의 정밀도가 부족한 부분은 별도로 표시합니다. 문법과 관용 표현의 자연성에는 검토가 필요합니다. 내 문장은 현재 브라우저에 저장됩니다. 기기 간 자동 동기화는 제공하지 않으며 백업 파일로 옮길 수 있습니다.</p></div>}
 {modal && typeof modal === "object" && <div className="modal-content word-detail"><div className="row-between"><h2 className="word-detail-title">{modal.word}</h2><button className={`icon-button ${favorites.includes(modal.id) ? "favorited" : ""}`} aria-label="즐겨찾기" aria-pressed={favorites.includes(modal.id)} onClick={() => toggleFavorite(modal.id)}><Heart size={22} fill={favorites.includes(modal.id) ? "currentColor" : "none"} /></button></div><p className="detail-gloss">{meaningKo(modal)}</p><div className="detail-tags"><span className="word-tag">{classLabels[modal.classId]}</span><span className="word-tag">{dialectLabels[modal.dialectId] || modal.dialect}</span>{modal.unofficial && <span className="word-tag">비공식</span>}</div><dl><dt>영어 뜻</dt><dd>{modal.meaning}</dd><dt>일본어 뜻</dt><dd>{modal.japanese || "원본에 정보 없음"}</dd><dt>가나</dt><dd>{modal.kana && modal.kana !== "?" ? modal.kana : "원본에 정보 없음"}</dd><dt>로마자 발음</dt><dd>{modal.romaji && modal.romaji !== "?" ? modal.romaji : "원본에 정보 없음"}</dd><dt>음절 표기</dt><dd>{modal.syllables || "원본에 정보 없음"}</dd>{modal.description && <><dt>원문 설명</dt><dd>{modal.description}</dd></>}</dl>{modal.reviewNote && <p className="callout">{modal.reviewNote}</p>}<p className="detail-note">발음은 원본의 가나·로마자 보조 표기입니다. 실제 가창의 발음이나 길이를 보장하지 않습니다.</p><p className="detail-source">Hymmnoserver · {modal.sourceVersion}<br /><a href={modal.sourceUrl || "https://hymmnoserver.uguu.ca/"} target="_blank" rel="noreferrer">사전 원문 보기 ↗</a></p>{!modal.unofficial && modal.grammarFamily === "standard" ? <button className="primary-button" onClick={() => addWord(modal)}><Plus size={17} /> 조합할 단어에 추가</button> : <p className="callout">이 항목은 확장 사전에서 조회용으로 제공합니다. 기본 문장 생성에서는 사용하지 않습니다.</p>}</div>}
 </dialog></div>;
}
export {
  Studio as default
};
