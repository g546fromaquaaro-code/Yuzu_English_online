"use client";

import { useEffect, useRef, useState } from "react";

type Lesson = {
  id: string; number: number; title: string; englishTitle: string; color: string; image: string; scene: string; goal: string;
  conversation: { side: "coach" | "learner"; text: string; jp: string }[];
  listening: { prompt: string; choices: string[]; answer: string };
  order: { words: string[]; answer: string }; speaking: string;
};

const lessons: Lesson[] = [
  {
    id: "name", number: 1, title: "名前は何ですか？", englishTitle: "What is your name?", color: "#ff9b45", image: "./lesson-art-name.jpg",
    scene: "はじめて会った友だちに名前を伝えよう", goal: "My name is ～. を使って自己紹介できる",
    conversation: [
      { side: "coach", text: "Hello! My name is Tom. What is your name?", jp: "こんにちは！ぼくはトム。あなたの名前は？" },
      { side: "learner", text: "My name is Yuzu.", jp: "私の名前はユズです。" },
      { side: "coach", text: "Nice to meet you, Yuzu.", jp: "はじめまして、ユズ。" },
      { side: "learner", text: "Nice to meet you, too.", jp: "こちらこそ、はじめまして。" },
    ],
    listening: { prompt: "What is your name?", choices: ["My name is Yuzu.", "I am ten years old.", "I like basketball."], answer: "My name is Yuzu." },
    order: { words: ["name", "Yuzu", "My", "is"], answer: "My name is Yuzu" }, speaking: "My name is Yuzu.",
  },
  {
    id: "age", number: 2, title: "何歳ですか？", englishTitle: "How old are you?", color: "#5cc8b0", image: "./lesson-art-age.jpg",
    scene: "新しい友だちとおたがいの年齢を聞こう", goal: "年齢をたずねて、I’m ～ years old. で答えられる",
    conversation: [
      { side: "coach", text: "How old are you?", jp: "何歳ですか？" },
      { side: "learner", text: "I'm ten years old.", jp: "私は10歳です。" },
      { side: "coach", text: "I'm eleven years old.", jp: "ぼくは11歳です。" },
      { side: "learner", text: "We're close in age!", jp: "年が近いね！" },
    ],
    listening: { prompt: "How old are you?", choices: ["I'm fine, thank you.", "I'm ten years old.", "It's ten o'clock."], answer: "I'm ten years old." },
    order: { words: ["ten", "old", "I'm", "years"], answer: "I'm ten years old" }, speaking: "I'm ten years old.",
  },
  {
    id: "favorite", number: 3, title: "何が好きですか？", englishTitle: "What do you like?", color: "#7774db", image: "./lesson-art-favorite.jpg",
    scene: "好きなことを話して友だちをもっと知ろう", goal: "I like ～. を使って好きなものを言える",
    conversation: [
      { side: "coach", text: "What do you like?", jp: "何が好き？" },
      { side: "learner", text: "I like basketball.", jp: "私はバスケットボールが好き。" },
      { side: "coach", text: "Me too! Let's play together.", jp: "ぼくも！いっしょにやろう。" },
      { side: "learner", text: "Sounds great!", jp: "いいね！" },
    ],
    listening: { prompt: "What do you like?", choices: ["I like basketball.", "It's a basketball.", "I can jump."], answer: "I like basketball." },
    order: { words: ["basketball", "like", "I"], answer: "I like basketball" }, speaking: "I like basketball.",
  },
];

type Stage = "listen" | "order" | "speak" | "talk";

type SfxName = "tap" | "correct" | "wrong" | "complete";
let audioContext: AudioContext | null = null;
let effectsEnabled = true;
let bgmTimer: number | null = null;
let bgmStep = 0;

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  audioContext = new AudioCtor();
  return audioContext;
}

function tone(frequency: number, delay = 0, duration = 0.11, volume = 0.055, type: OscillatorType = "sine") {
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume();
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(start); oscillator.stop(start + duration + 0.02);
}

function playSfx(name: SfxName) {
  if (!effectsEnabled) return;
  if (name === "tap") tone(720, 0, 0.06, 0.035, "sine");
  if (name === "correct") { tone(523, 0, 0.11, 0.05, "triangle"); tone(659, 0.09, 0.12, 0.05, "triangle"); tone(784, 0.18, 0.16, 0.055, "triangle"); }
  if (name === "wrong") { tone(330, 0, 0.13, 0.04, "sine"); tone(247, 0.12, 0.18, 0.04, "sine"); }
  if (name === "complete") [523,659,784,1047].forEach((f,i) => tone(f, i * 0.11, 0.22, 0.055, "triangle"));
}

const bgmMelody = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 880, 784, 659, 587];
function playBgmBeat() {
  tone(bgmMelody[bgmStep % bgmMelody.length], 0, 0.28, 0.018, "triangle");
  if (bgmStep % 2 === 0) tone([262,294,330,349][Math.floor(bgmStep / 4) % 4], 0, 0.4, 0.009, "sine");
  bgmStep += 1;
}
function startBgm() { if (bgmTimer !== null) return; playBgmBeat(); bgmTimer = window.setInterval(playBgmBeat, 420); }
function stopBgm() { if (bgmTimer !== null) window.clearInterval(bgmTimer); bgmTimer = null; }

function SpeakerButton({ text, label = "英語を聞く" }: { text: string; label?: string }) {
  const [playing, setPlaying] = useState(false);
  const speak = () => {
    playSfx("tap");
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US"; utterance.rate = 0.82; utterance.pitch = 1.05;
    utterance.onend = () => setPlaying(false); setPlaying(true); window.speechSynthesis.speak(utterance);
  };
  return <button className={`speaker ${playing ? "playing" : ""}`} onClick={speak} aria-label={label} title={label}>{playing ? "◼" : "♪"}</button>;
}

export default function Home() {
  const [activeLesson, setActiveLesson] = useState(lessons[0]);
  const [stage, setStage] = useState<Stage>("listen");
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [xp, setXp] = useState(0);
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(false);
  const [se, setSe] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("hanaseru-progress");
    if (saved) try { const parsed = JSON.parse(saved) as { completed?: string[]; xp?: number }; setCompleted(parsed.completed ?? []); setXp(parsed.xp ?? 0); } catch { /* start fresh */ }
  }, []);

  const saveProgress = (lessonId: string) => {
    const next = completed.includes(lessonId) ? completed : [...completed, lessonId];
    const nextXp = completed.includes(lessonId) ? xp : xp + 100;
    setCompleted(next); setXp(nextXp); localStorage.setItem("hanaseru-progress", JSON.stringify({ completed: next, xp: nextXp }));
  };
  const toggleMusic = () => { playSfx("tap"); const next = !music; setMusic(next); if (next) startBgm(); else stopBgm(); };
  const toggleSe = () => { const next = !se; setSe(next); effectsEnabled = next; if (next) playSfx("tap"); };
  const startLesson = (lesson: Lesson) => { playSfx("tap"); if (music) startBgm(); setActiveLesson(lesson); setStage("listen"); setStarted(true); };

  if (started) return <LessonPlayer lesson={activeLesson} stage={stage} setStage={setStage} sound={sound} music={music} se={se} onToggleMusic={toggleMusic} onToggleSe={toggleSe} onExit={() => setStarted(false)} onComplete={() => saveProgress(activeLesson.id)} />;

  const percent = Math.round((completed.length / lessons.length) * 100);
  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">H!</span><span>話せる！</span></div>
      <div className="top-actions"><div className="streak"><span>★</span>{xp} XP</div><button className={`audio-toggle ${music ? "on" : ""}`} onClick={toggleMusic} aria-label="BGMのオン・オフ">♫ BGM</button><button className={`audio-toggle ${se ? "on" : ""}`} onClick={toggleSe} aria-label="効果音のオン・オフ">♬ SE</button><button className="sound-toggle" onClick={() => { playSfx("tap"); setSound(!sound); }} aria-label="英語音声のオン・オフ">{sound ? "🔊 VOICE" : "🔈 VOICE"}</button><div className="profile">ゆ</div></div>
    </header>
    <div className="workspace">
      <aside className="sidebar">
        <button className="nav-item active"><span>⌂</span>ホーム</button>
        <button className="nav-item" onClick={() => startLesson(lessons[0])}><span>▶</span>れんしゅう</button>
        <button className="nav-item"><span>★</span>きろく</button>
        <div className="sidebar-tip"><b>今日の目標</b><span>1レッスン</span><div className="mini-bar"><i style={{ width: completed.length ? "100%" : "8%" }} /></div></div>
      </aside>
      <section className="dashboard">
        <div className="welcome-row"><div><p className="eyebrow">ENGLISH CONVERSATION</p><h1>今日も、ひとこと<br /><em>英語で話そう。</em></h1><p className="lead">聞いて、並べて、声に出す。1日5分の英会話。</p></div><div className="progress-orbit" style={{ "--progress": `${percent * 3.6}deg` } as React.CSSProperties}><div><b>{percent}%</b><span>コース進捗</span></div></div></div>
        <section className="continue-card">
          <div className="lesson-badge">LESSON {activeLesson.number}</div>
          <div className="continue-copy"><span>つづきから</span><h2>{activeLesson.title}</h2><p>{activeLesson.englishTitle}</p></div>
          <div className="hero-scene"><img src={activeLesson.image} alt={activeLesson.scene} /></div>
          <button className="primary-button" onClick={() => startLesson(activeLesson)}>レッスン開始 <span>→</span></button>
        </section>
        <div className="section-heading"><div><p>LEVEL 1</p><h2>初めての英会話</h2></div><span>{completed.length} / {lessons.length} 完了</span></div>
        <div className="lesson-grid">{lessons.map((lesson) => { const done = completed.includes(lesson.id); return <button key={lesson.id} className={`lesson-card ${activeLesson.id === lesson.id ? "selected" : ""}`} onClick={() => setActiveLesson(lesson)} style={{ "--lesson": lesson.color } as React.CSSProperties}><div className="lesson-thumb"><img src={lesson.image} alt="" /><span>{done ? "✓" : lesson.number}</span></div><div className="lesson-text"><span>LESSON {lesson.number}</span><h3>{lesson.title}</h3><p>{lesson.englishTitle}</p></div><div className="lesson-arrow">›</div></button>; })}</div>
      </section>
    </div>
  </main>;
}

function LessonPlayer({ lesson, stage, setStage, sound, music, se, onToggleMusic, onToggleSe, onExit, onComplete }: { lesson: Lesson; stage: Stage; setStage: (stage: Stage) => void; sound: boolean; music: boolean; se: boolean; onToggleMusic: () => void; onToggleSe: () => void; onExit: () => void; onComplete: () => void }) {
  const stages: Stage[] = ["listen", "order", "speak", "talk"]; const labels = ["聞く", "ならべる", "話す", "会話"]; const index = stages.indexOf(stage);
  const next = () => { if (index < stages.length - 1) setStage(stages[index + 1]); else { onComplete(); onExit(); } };
  return <main className="player-shell">
    <header className="player-header"><button className="close-button" onClick={() => { playSfx("tap"); onExit(); }} aria-label="レッスンを閉じる">×</button><div className="player-title"><span>LESSON {lesson.number}</span><b>{lesson.title}</b></div><div className="stage-progress">{stages.map((item, i) => <i key={item} className={i <= index ? "filled" : ""} />)}</div><div className="player-audio"><button className={music ? "on" : ""} onClick={onToggleMusic}>♫</button><button className={se ? "on" : ""} onClick={onToggleSe}>♬</button></div><span className="step-label">{index + 1} / 4</span></header>
    <div className="lesson-layout">
      <aside className="lesson-guide"><div className="guide-number">0{lesson.number}</div><p>今回のゴール</p><h1>{lesson.title}</h1><p className="guide-en">{lesson.englishTitle}</p><div className="goal-box"><span>✓</span>{lesson.goal}</div><div className="guide-scene"><img src={lesson.image} alt={lesson.scene} /><small>{lesson.scene}</small></div><div className="stage-list">{labels.map((label, i) => <button key={label} className={i === index ? "active" : i < index ? "done" : ""} onClick={() => i <= index && setStage(stages[i])}><span>{i < index ? "✓" : i + 1}</span>{label}</button>)}</div></aside>
      <section className="exercise-area">{stage === "listen" && <Listening lesson={lesson} sound={sound} onDone={next} />}{stage === "order" && <Ordering lesson={lesson} onDone={next} />}{stage === "speak" && <Speaking lesson={lesson} onDone={next} />}{stage === "talk" && <Conversation lesson={lesson} onDone={next} />}</section>
    </div>
  </main>;
}

function ExerciseHeader({ kicker, title, hint }: { kicker: string; title: string; hint: string }) { return <div className="exercise-header"><p>{kicker}</p><h2>{title}</h2><span>{hint}</span></div>; }

function Listening({ lesson, sound, onDone }: { lesson: Lesson; sound: boolean; onDone: () => void }) {
  const [choice, setChoice] = useState(""); const correct = choice === lesson.listening.answer;
  const play = () => { if (!sound || !("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(lesson.listening.prompt); u.lang = "en-US"; u.rate = 0.78; window.speechSynthesis.speak(u); };
  useEffect(() => { const t = setTimeout(play, 350); return () => clearTimeout(t); }, []);
  return <div className="exercise-card"><ExerciseHeader kicker="STEP 1 · LISTEN" title="英語を聞いて、答えよう" hint="何度聞いてもOK！" /><button className="big-listen" onClick={() => { playSfx("tap"); play(); }}><span>♪</span><b>タップして聞く</b><small>Listen again</small></button><p className="question-jp">いちばん自然な答えを選んでね</p><div className="choice-list">{lesson.listening.choices.map((item, i) => <button key={item} disabled={!!choice} className={choice === item ? (correct ? "correct" : "wrong") : ""} onClick={() => { playSfx(item === lesson.listening.answer ? "correct" : "wrong"); setChoice(item); }}><span>{String.fromCharCode(65 + i)}</span>{item}{choice === item && <b>{correct ? "✓" : "×"}</b>}</button>)}</div>{choice && <Feedback ok={correct} retry={() => setChoice("")} onNext={onDone} />}</div>;
}

function Ordering({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const [pool, setPool] = useState(() => [...lesson.order.words]); const [answer, setAnswer] = useState<string[]>([]); const [checked, setChecked] = useState(false); const sentence = answer.join(" "); const correct = sentence === lesson.order.answer;
  const add = (word: string, i: number) => { playSfx("tap"); setAnswer([...answer, word]); setPool(pool.filter((_, x) => x !== i)); setChecked(false); };
  const remove = (word: string, i: number) => { playSfx("tap"); setPool([...pool, word]); setAnswer(answer.filter((_, x) => x !== i)); setChecked(false); };
  const reset = () => { setPool([...lesson.order.words]); setAnswer([]); setChecked(false); };
  return <div className="exercise-card"><ExerciseHeader kicker="STEP 2 · WORD ORDER" title="英語を正しい順番にしよう" hint="単語をタップして並べよう" /><div className="prompt-bubble"><img src={lesson.image} alt="" /><div><small>この場面で使う文を作ろう</small><b>{lesson.speaking.replace("Yuzu", "〜")}</b></div></div><div className="answer-slots">{answer.length ? answer.map((w, i) => <button key={`${w}${i}`} onClick={() => remove(w, i)}>{w}</button>) : <span>ここに単語を並べてね</span>}</div><div className="word-pool">{pool.map((w, i) => <button key={`${w}${i}`} onClick={() => add(w, i)}>{w}</button>)}</div>{!checked ? <button className="check-button" disabled={pool.length > 0} onClick={() => { playSfx(correct ? "correct" : "wrong"); setChecked(true); }}>答え合わせ</button> : <Feedback ok={correct} retry={reset} onNext={onDone} />}</div>;
}

type SpeechRecognitionLike = { lang: string; interimResults: boolean; start: () => void; onresult: ((e: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };

function Speaking({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const [recording, setRecording] = useState(false); const [heard, setHeard] = useState(""); const recognition = useRef<SpeechRecognitionLike | null>(null);
  const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "").replace(/^i'm/, "iam");
  const score = heard ? Math.round((normalized(heard).split("").filter((c, i) => c === normalized(lesson.speaking)[i]).length / normalized(lesson.speaking).length) * 100) : 0;
  const listen = () => { playSfx("tap"); const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition; if (!SpeechRecognition) { setHeard(lesson.speaking); playSfx("correct"); return; } const r = new SpeechRecognition(); recognition.current = r; r.lang = "en-US"; r.interimResults = false; r.onresult = (e) => { setHeard(e.results[0][0].transcript); playSfx("correct"); }; r.onerror = () => setRecording(false); r.onend = () => setRecording(false); setRecording(true); r.start(); };
  return <div className="exercise-card speaking-card"><ExerciseHeader kicker="STEP 3 · SPEAK" title="お手本をまねして話そう" hint="大きな声でゆっくり話そう" /><div className="speak-visual"><img src={lesson.image} alt={lesson.scene} /><span>この場面を思いうかべて話そう</span></div><div className="model-sentence"><span>お手本</span><b>{lesson.speaking}</b><SpeakerButton text={lesson.speaking} /></div><div className={`mic-zone ${recording ? "recording" : ""}`}><button onClick={listen} aria-label="録音を開始"><span>●</span></button><b>{recording ? "聞いています…" : heard ? "もう一度話す" : "タップして話す"}</b><small>マイクの使用を許可してください</small></div>{heard && <div className="speech-result"><div><span>聞き取った英語</span><b>“{heard}”</b></div><strong>{score >= 55 ? "Good!" : "Nice try!"}<small>{Math.max(score, 72)}点</small></strong></div>}{heard && <button className="next-wide" onClick={onDone}>会話にチャレンジ →</button>}</div>;
}

function Conversation({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const [shown, setShown] = useState(1); const finished = shown >= lesson.conversation.length; const current = lesson.conversation[shown];
  return <div className="exercise-card conversation-card"><ExerciseHeader kicker="STEP 4 · CONVERSATION" title="会話を完成させよう" hint="あなたの番になったら声に出そう" /><div className="conversation-scene"><img src={lesson.image} alt={lesson.scene} /><div><span>SCENE</span><b>{lesson.scene}</b></div></div><div className="chat-window">{lesson.conversation.slice(0, shown).map((line, i) => <div key={i} className={`chat-line ${line.side}`}><div className="avatar">{line.side === "coach" ? "👦🏻" : "👧🏻"}</div><div className="bubble"><b>{line.text}</b><span>{line.jp}</span><SpeakerButton text={line.text} /></div></div>)}{!finished && current.side === "learner" && <div className="your-turn"><span>YOUR TURN</span><b>{current.text}</b><SpeakerButton text={current.text} /><button onClick={() => { playSfx("correct"); setShown(shown + 1); }}>声に出して言えた！</button></div>}{!finished && current.side === "coach" && <button className="continue-chat" onClick={() => { playSfx("tap"); setShown(shown + 1); }}>会話をつづける ↓</button>}</div>{finished && <div className="complete-panel"><div className="trophy">★</div><div><span>LESSON COMPLETE!</span><h3>会話が完成したよ！</h3><p>今日覚えた表現を、明日もう一度使ってみよう。</p></div><button onClick={() => { playSfx("complete"); onDone(); }}>100 XPをもらう</button></div>}</div>;
}

function Feedback({ ok, retry, onNext }: { ok: boolean; retry: () => void; onNext: () => void }) { return <div className={`feedback ${ok ? "ok" : "ng"}`}><div><span>{ok ? "✓" : "!"}</span><p><b>{ok ? "正解！ Great job!" : "おしい！もう一度"}</b><small>{ok ? "その調子で次へ進もう。" : "単語と語順をよく見てみよう。"}</small></p></div><button onClick={() => { playSfx("tap"); if (ok) onNext(); else retry(); }}>{ok ? "次へ →" : "やり直す"}</button></div>; }
