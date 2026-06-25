import { useState, useEffect, useRef } from "react";

/* ── 유틸 ─────────────────────────────────────────── */
const pad = n => { const s = String(n); return s.length < 2 ? "0" + s : s; };
const fmt = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
const toM = s => { const p = (s || "00:00").split(":"); return Number(p[0]) * 60 + Number(p[1]); };
const uid = () => { let r = ""; const c = "abcdefghijklmnopqrstuvwxyz0123456789"; for (let i = 0; i < 8; i++) r += c[Math.floor(Math.random() * c.length)]; return r; };
const getNow = () => new Date();
const dstr = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const addD = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const monStart = d => { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); return r; };
const weekDays = d => { const m = monStart(d); const a = []; for (let i = 0; i < 7; i++) a.push(addD(m, i)); return a; };
const fmtS = d => (d.getMonth() + 1) + "/" + d.getDate();
const fmtF = d => { const w = ["일","월","화","수","목","금","토"]; return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + w[d.getDay()] + ")"; };
const fmtMo = d => d.getFullYear() + "년 " + (d.getMonth() + 1) + "월";
const dleft = s => { if (!s) return 999; return Math.ceil((new Date(s + "T00:00:00") - new Date(new Date().toDateString())) / 86400000); };
const isToday = d => dstr(d) === dstr(getNow());
const isPast = d => d < new Date(new Date().setHours(0, 0, 0, 0));
const safeArr = v => Array.isArray(v) ? v : [];
const merge = (a, b) => Object.assign({}, a, b);
const WMAP = { 0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토" };
const WDK = ["월", "화", "수", "목", "금", "토", "일"];
const PRIOS = ["최상", "상", "중", "하"];
const URGS = ["높음", "보통", "낮음"];
const REPS = ["없음", "매일", "매주", "매월", "평일", "주말"];
const TABS = ["스케줄", "태스크", "분석", "⚙️ 설정"];

const TY = {
  check:  { lb: "체크",  color: "#6b7280", bg: "#f9fafb", icon: "✅", desc: "짬날 때 처리" },
  event:  { lb: "일정",  color: "#8b5cf6", bg: "#f5f3ff", icon: "📅", desc: "1회성 · 자동배치" },
  fixed:  { lb: "고정",  color: "#ef4444", bg: "#fef2f2", icon: "🔴", desc: "정규 반복 업무" },
  flex:   { lb: "유연",  color: "#f59e0b", bg: "#fffbeb", icon: "🟡", desc: "긴급 시 압축 가능" },
  urgent: { lb: "긴급",  color: "#10b981", bg: "#f0fdf4", icon: "🟢", desc: "갑자기 생긴 급한 일" },
  wish:   { lb: "위시",  color: "#3b82f6", bg: "#eff6ff", icon: "🔵", desc: "언젠가 하고 싶은 일" },
};

const DPOMO = { focus: 25, shortBreak: 5, longBreak: 20, sessionsBeforeLong: 4 };
const DSLOTS = [
  { id: "s1", lb: "아침", start: "06:00", end: "08:00", hasMeal: true,  mealDur: 20, mealName: "아침 식사", afterMeal: 1 },
  { id: "s2", lb: "오전", start: "09:00", end: "12:00", hasMeal: false, mealDur: 0,  mealName: "",          afterMeal: 0 },
  { id: "s3", lb: "오후", start: "13:00", end: "18:00", hasMeal: true,  mealDur: 40, mealName: "점심 식사", afterMeal: 2 },
  { id: "s4", lb: "저녁", start: "20:00", end: "22:00", hasMeal: true,  mealDur: 30, mealName: "저녁 식사", afterMeal: 1 },
];
const DCATS = { "업무": ["기획","개발","미팅","보고서"], "학습": ["영어","독서","강의","자격증"], "건강": ["운동","명상","식단"], "개인": ["가족","취미","정리"], "기타": [] };

const D0 = dstr(getNow()), D1 = dstr(addD(getNow(), 1)), D3 = dstr(addD(getNow(), 3));
const STASKS = [
  { id:"t1", title:"주간 보고서", type:"fixed", priority:"상", urgency:"보통", duration:60, flexMin:30, dueDate:D1, allowedSlots:["오전"], category1:"업무", category2:"보고서", goalId:"g1", repeat:"없음", repeatDays:[], done:false, cancelled:false, createdAt:Date.now() },
  { id:"t2", title:"영어 단어 암기", type:"flex", priority:"중", urgency:"보통", duration:40, flexMin:15, dueDate:"", allowedSlots:["아침","저녁"], category1:"학습", category2:"영어", goalId:"g2", repeat:"매주", repeatDays:["월","수","금"], done:false, cancelled:false, createdAt:Date.now() },
  { id:"t3", title:"팀 미팅 준비", type:"event", priority:"최상", urgency:"높음", duration:45, flexMin:20, dueDate:D0, allowedSlots:["오전"], category1:"업무", category2:"미팅", goalId:"g1", repeat:"없음", repeatDays:[], done:false, cancelled:false, createdAt:Date.now() },
  { id:"t4", title:"아침 운동", type:"fixed", priority:"상", urgency:"보통", duration:30, flexMin:15, dueDate:"", allowedSlots:["아침"], category1:"건강", category2:"운동", goalId:"g3", repeat:"평일", repeatDays:[], done:false, cancelled:false, createdAt:Date.now() },
  { id:"t5", title:"독서", type:"flex", priority:"중", urgency:"보통", duration:30, flexMin:10, dueDate:"", allowedSlots:["저녁"], category1:"학습", category2:"독서", goalId:"g2", repeat:"매일", repeatDays:[], done:false, cancelled:false, createdAt:Date.now() },
  { id:"t6", title:"거래처 전화", type:"check", priority:"상", urgency:"보통", duration:0, flexMin:0, dueDate:D0, allowedSlots:[], category1:"업무", category2:"미팅", goalId:"", repeat:"없음", repeatDays:[], done:false, cancelled:false, createdAt:Date.now() },
  { id:"t7", title:"영수증 정리", type:"check", priority:"하", urgency:"보통", duration:0, flexMin:0, dueDate:D3, allowedSlots:[], category1:"개인", category2:"정리", goalId:"", repeat:"없음", repeatDays:[], done:false, cancelled:false, createdAt:Date.now() },
  { id:"t8", title:"기타 배우기", type:"wish", priority:"중", urgency:"보통", duration:60, flexMin:0, dueDate:"", allowedSlots:[], category1:"개인", category2:"취미", goalId:"g4", repeat:"없음", repeatDays:[], wishRank:1, done:false, cancelled:false, createdAt:Date.now() },
  { id:"t9", title:"제주도 여행 계획", type:"wish", priority:"중", urgency:"보통", duration:120, flexMin:0, dueDate:"", allowedSlots:[], category1:"개인", category2:"가족", goalId:"g4", repeat:"없음", repeatDays:[], wishRank:2, done:false, cancelled:false, createdAt:Date.now() },
  { id:"t10", title:"어머니께 전화", type:"check", priority:"상", urgency:"보통", duration:0, flexMin:0, dueDate:"", allowedSlots:[], category1:"개인", category2:"가족", goalId:"g4", repeat:"매주", repeatDays:["일"], done:false, cancelled:false, createdAt:Date.now() },
  { id:"t11", title:"혈압약 복용 확인", type:"check", priority:"최상", urgency:"보통", duration:0, flexMin:0, dueDate:"", allowedSlots:[], category1:"건강", category2:"식단", goalId:"g3", repeat:"매일", repeatDays:[], done:false, cancelled:false, createdAt:Date.now() },
];
const SSETS = {
  mission: "나는 끊임없이 성장하며, 가족과 함께 건강하고 의미 있는 삶을 살아간다.",
  goals: [
    { id:"g1", title:"커리어 성장",     period:"중기", priority:"최상", category:"업무" },
    { id:"g2", title:"자기계발 습관화", period:"단기", priority:"상",   category:"학습" },
    { id:"g3", title:"건강한 몸",        period:"장기", priority:"상",   category:"건강" },
    { id:"g4", title:"삶의 여유",        period:"장기", priority:"중",   category:"개인" },
  ],
  pomo: DPOMO, cats: DCATS, slots: DSLOTS,
};

const SK_T = "lp_t7", SK_S = "lp_s7", SK_L = "lp_log7";
const loadT = () => { try { const r = localStorage.getItem(SK_T); if (r) return JSON.parse(r); } catch(e) {} return STASKS; };
const loadS = () => { try { const r = localStorage.getItem(SK_S); if (r) return JSON.parse(r); } catch(e) {} return SSETS; };
const loadL = () => { try { const r = localStorage.getItem(SK_L); if (r) return JSON.parse(r); } catch(e) {} return []; };
const saveT = t => { try { localStorage.setItem(SK_T, JSON.stringify(t)); } catch(e) {} };
const saveS = s => { try { localStorage.setItem(SK_S, JSON.stringify(s)); } catch(e) {} };
const saveL = l => { try { localStorage.setItem(SK_L, JSON.stringify(l)); } catch(e) {} };

/* ── 로직 ─────────────────────────────────────────── */
function checkActive(task, date) {
  if (task.type !== "check" || task.cancelled) return false;
  if (safeArr(task.skipDates).indexOf(dstr(date)) >= 0) return false;
  const r = task.repeat || "없음", dow = WMAP[date.getDay()], dn = date.getDay();
  if (r === "없음") return true;
  if (r === "매일") return true;
  if (r === "매주") return safeArr(task.repeatDays).indexOf(dow) >= 0;
  if (r === "평일") return dn >= 1 && dn <= 5;
  if (r === "주말") return dn === 0 || dn === 6;
  if (r === "매월") { if (!task.createdAt) return false; return new Date(task.createdAt).getDate() === date.getDate(); }
  return true;
}

function taskActive(task, date) {
  if (task.cancelled) return false;
  if (task.type === "check" || task.type === "wish") return false;
  if (safeArr(task.skipDates).indexOf(dstr(date)) >= 0) return false;
  if (task.type === "event") {
    if (!task.dueDate) return false;
    const d = dleft(task.dueDate);
    const urg = task.urgency || "보통";
    const off = urg === "높음" ? 1 : urg === "보통" ? 2 : 3;
    const tgt = d <= off ? dstr(getNow()) : dstr(addD(getNow(), Math.max(0, d - off)));
    return tgt === dstr(date);
  }
  const r = task.repeat || "없음", dow = WMAP[date.getDay()], dn = date.getDay();
  if (r === "없음") { if (!task.createdAt) return true; return dstr(new Date(task.createdAt)) === dstr(date); }
  if (r === "매일") return true;
  if (r === "매주") return safeArr(task.repeatDays).indexOf(dow) >= 0;
  if (r === "평일") return dn >= 1 && dn <= 5;
  if (r === "주말") return dn === 0 || dn === 6;
  if (r === "매월") { if (!task.createdAt) return false; return new Date(task.createdAt).getDate() === date.getDate(); }
  return false;
}

const isDoneOn = (task, dk) => (task.repeat && task.repeat !== "없음") ? safeArr(task.doneDates).indexOf(dk) >= 0 : !!task.done;

function repeatActiveOn(task, date) {
  const r = task.repeat || "없음", dow = WMAP[date.getDay()], dn = date.getDay();
  if (r === "매일") return true;
  if (r === "매주") return safeArr(task.repeatDays).indexOf(dow) >= 0;
  if (r === "평일") return dn >= 1 && dn <= 5;
  if (r === "주말") return dn === 0 || dn === 6;
  if (r === "매월") return task.createdAt ? new Date(task.createdAt).getDate() === date.getDate() : false;
  return false;
}

function calcStreak(task) {
  const dates = safeArr(task.doneDates);
  let cur = getNow();
  if (repeatActiveOn(task, cur) && dates.indexOf(dstr(cur)) < 0) cur = addD(cur, -1);
  let streak = 0;
  for (let i = 0; i < 366; i++) {
    if (repeatActiveOn(task, cur)) {
      if (dates.indexOf(dstr(cur)) >= 0) { streak++; cur = addD(cur, -1); }
      else break;
    } else cur = addD(cur, -1);
  }
  return streak;
}

function buildBlocks(tasks, settings, date) {
  const p = settings.pomo || DPOMO;
  const slots = safeArr(settings.slots || DSLOTS).slice().sort((a, b) => toM(a.start) - toM(b.start));
  const nowAnchor = isToday(date) ? (getNow().getHours() * 60 + getNow().getMinutes()) : null;
  const active = tasks.filter(t => taskActive(t, date));
  const ord = { urgent: 0, event: 1, fixed: 2, flex: 3 };
  const sorted = active.slice().sort((a, b) => {
    const oa = ord[a.type] !== undefined ? ord[a.type] : 9;
    const ob = ord[b.type] !== undefined ? ord[b.type] : 9;
    if (oa !== ob) return oa - ob;
    if (a.type === "event" && b.type === "event") return URGS.indexOf(a.urgency || "보통") - URGS.indexOf(b.urgency || "보통");
    return PRIOS.indexOf(a.priority) - PRIOS.indexOf(b.priority);
  });
  const blocks = [];
  sorted.filter(t => t.fixedTime).forEach(task => {
    const startM = toM(task.fixedTime);
    blocks.push({ id: uid(), taskId: task.id, type: "focus", start: startM, dur: task.duration || 30, label: task.title, taskType: task.type, goalId: task.goalId, slotId: null, isFixedTime: true });
  });
  const queue = sorted.filter(t => !t.fixedTime);
  for (let si = 0; si < slots.length; si++) {
    const slot = slots[si];
    let cur = toM(slot.start);
    const end = toM(slot.end);
    if (slot.hasMeal && slot.mealDur > 0) { blocks.push({ id: uid(), type: "meal", start: cur, dur: slot.mealDur, label: "🍽️ " + slot.mealName, slotId: slot.id }); cur += slot.mealDur; }
    let sess = 0, placed = 0;
    const max = slot.hasMeal ? (slot.afterMeal || 99) : 99;
    const snap = queue.slice();
    let qi = 0;
    while (qi < snap.length && cur < end && placed < max) {
      const task = snap[qi];
      const allowed = safeArr(task.allowedSlots);
      if (allowed.length > 0 && allowed.indexOf(slot.lb) < 0) { qi++; continue; }
      if (task.type === "urgent" && nowAnchor !== null) {
        if (nowAnchor >= end) { qi++; continue; }
        if (cur < nowAnchor) cur = nowAnchor;
      }
      const dur = task.type === "flex" ? (task.flexMin || task.duration) : task.duration;
      let rem = dur;
      while (rem > 0 && cur < end) {
        const chunk = Math.min(rem, p.focus, end - cur);
        blocks.push({ id: uid(), taskId: task.id, type: "focus", start: cur, dur: chunk, label: task.title, taskType: task.type, goalId: task.goalId, slotId: slot.id });
        cur += chunk; rem -= chunk; sess++;
        if (rem > 0 && cur < end) {
          const lng = sess % p.sessionsBeforeLong === 0;
          const bd = Math.min(lng ? p.longBreak : p.shortBreak, end - cur);
          if (bd > 0) { blocks.push({ id: uid(), type: lng ? "longBreak" : "shortBreak", start: cur, dur: bd, label: lng ? "긴 휴식 🛋️" : "짧은 휴식 ☕", slotId: slot.id }); cur += bd; }
        }
      }
      const idx = queue.indexOf(task); if (idx > -1) queue.splice(idx, 1);
      placed++;
      if (rem <= 0 && cur < end) {
        const lng2 = sess % p.sessionsBeforeLong === 0;
        const bd2 = Math.min(lng2 ? p.longBreak : p.shortBreak, end - cur);
        if (bd2 > 0) { blocks.push({ id: uid(), type: lng2 ? "longBreak" : "shortBreak", start: cur, dur: bd2, label: lng2 ? "긴 휴식 🛋️" : "짧은 휴식 ☕", slotId: slot.id }); cur += bd2; }
      }
      qi++;
    }
  }
  const dk = dstr(date);
  const byTask = {};
  blocks.forEach(b => { if (b.taskId) (byTask[b.taskId] = byTask[b.taskId] || []).push(b); });
  Object.keys(byTask).forEach(tid => {
    const list = byTask[tid];
    if (list.length !== 1) return;
    const task = tasks.find(t => t.id === tid);
    const st = task && task.actStarts && task.actStarts[dk];
    if (!st) return;
    const b = list[0];
    b.start = toM(st);
    const en = task.actEnds && task.actEnds[dk];
    if (en) b.dur = Math.max(5, toM(en) - toM(st));
    b.actualPlacement = true;
  });
  return blocks;
}

/* ── 스타일 ───────────────────────────────────────── */
const IS = { borderRadius: 8, border: "1.5px solid #e2e8f0", padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" };
const LS = { fontSize: 12, color: "#64748b", display: "flex", flexDirection: "column", gap: 4 };
const NB = { background: "#f1f5f9", border: "none", borderRadius: 8, padding: "5px 11px", cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 500 };
const BS = c => ({ background: c, color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 });
const mx = (a, b) => Object.assign({}, a, b);

/* ── 공통 컴포넌트 ────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "#1e293b" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
      </div>
    </div>
  );
}
function Sec({ title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: "#1e293b" }}>{title}</div>
      {children}
    </div>
  );
}
function Empty({ text }) { return <div style={{ textAlign: "center", color: "#94a3b8", padding: "16px 0", fontSize: 13 }}>{text}</div>; }

function ActionTimeModal({ title, onConfirm, onClose }) {
  const nowM = getNow().getHours() * 60 + getNow().getMinutes();
  const [sel, setSel] = useState(fmt(nowM));
  const offsets = [-30, -15, -10, -5, 0, 5, 10, 15, 30];
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ textAlign: "center", fontSize: 30, fontWeight: 700, color: "#6366f1", padding: "6px 0" }}>{sel}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {offsets.map(o => { const v = fmt(Math.max(0, Math.min(1439, nowM + o))); const on = sel === v; return (
          <button type="button" key={o} onClick={() => setSel(v)} style={{ padding: "5px 10px", border: "1.5px solid " + (on ? "#6366f1" : "#e2e8f0"), borderRadius: 20, background: on ? "#6366f1" : "#fff", color: on ? "#fff" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: on ? 700 : 500 }}>
            {o === 0 ? "지금" : o < 0 ? (-o) + "분전" : o + "분후"}
          </button>
        ); })}
      </div>
      <label style={LS}>직접 입력<input type="time" value={sel} onChange={e => setSel(e.target.value)} style={IS} /></label>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={() => onConfirm(sel)} style={{ flex: 1, background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 600 }}>확인</button>
        <button onClick={onClose} style={{ flex: 1, background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, padding: 10, cursor: "pointer" }}>취소</button>
      </div>
    </Modal>
  );
}

/* ── 뽀모도로 ─────────────────────────────────────── */
function PomoWidget({ pomo, setPomo, cfg }) {
  const ml = { focus: "🍅 집중", shortBreak: "☕ 짧은 휴식", longBreak: "🛋️ 긴 휴식" };
  return (
    <div style={{ textAlign: "center", background: "rgba(255,255,255,.15)", borderRadius: 12, padding: "7px 14px", minWidth: 110 }}>
      <div style={{ fontSize: 10, opacity: .9 }}>{ml[pomo.mode]}</div>
      <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: 2 }}>{fmt(pomo.remaining)}</div>
      <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 3 }}>
        <button onClick={() => setPomo(p => merge(p, { running: !p.running }))} style={{ background: "rgba(255,255,255,.3)", border: "none", borderRadius: 6, padding: "2px 9px", color: "#fff", cursor: "pointer", fontSize: 11 }}>{pomo.running ? "⏸" : "▶"}</button>
        <button onClick={() => setPomo(p => merge(p, { running: false, remaining: cfg.focus * 60, mode: "focus" }))} style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: 6, padding: "2px 7px", color: "#fff", cursor: "pointer", fontSize: 11 }}>↺</button>
      </div>
    </div>
  );
}

/* ── 일간 타임라인 ────────────────────────────────── */
function DayTimeline({ date, tasks, settings, onStart, onFinish, onCancel, onReschedule }) {
  const [blocks, setBlocks] = useState([]);
  const [drag, setDrag] = useState(null);
  const [resz, setResz] = useState(null);
  const [tip, setTip] = useState(null);
  const [now, setNow] = useState(getNow());
  const [actionModal, setActionModal] = useState(null);
  const gridRef = useRef(null);
  const slots = settings.slots || DSLOTS;
  let allS = 99999, allE = 0;
  for (let i = 0; i < slots.length; i++) { const sm = toM(slots[i].start), em = toM(slots[i].end); if (sm < allS) allS = sm; if (em > allE) allE = em; }
  const PX = 2.2, totalH = (allE - allS) * PX, TW = 44;
  const isTod = isToday(date), isp = isPast(date);
  const nowM = now.getHours() * 60 + now.getMinutes();
  const dk = dstr(date);
  useEffect(() => setBlocks(buildBlocks(tasks, settings, date)), [tasks, settings, date]);
  useEffect(() => { const id = setInterval(() => setNow(getNow()), 30000); return () => clearInterval(id); }, []);
  const tl = []; for (let m = allS; m <= allE; m += 30) tl.push(m);
  const getTask = id => tasks.find(t => t.id === id) || null;
  const getGoal = id => (settings.goals || []).find(g => g.id === id) || null;
  const bc = b => {
    if (b.type === "meal") return { bg: "#fff7ed", border: "#fb923c", text: "#92400e" };
    if (b.type === "shortBreak") return { bg: "#f0fdf4", border: "#4ade80", text: "#166634" };
    if (b.type === "longBreak") return { bg: "#eff6ff", border: "#60a5fa", text: "#1e40af" };
    const c = TY[b.taskType]; return { bg: c ? c.bg : "#f1f5f9", border: c ? c.color : "#94a3b8", text: "#1e293b" };
  };
  const onMD = (ev, id) => { if (isp) return; const br = ev.currentTarget.getBoundingClientRect(); setDrag({ id, oy: ev.clientY - br.top }); ev.preventDefault(); };
  const onRD = (ev, id) => { setBlocks(p => p.map(b => b.id === id ? merge(b, { _od: b.dur }) : b)); setResz({ id, sy: ev.clientY }); ev.preventDefault(); ev.stopPropagation(); };
  const onMM = ev => {
    if ((drag || resz) && gridRef.current) {
      const r = gridRef.current.getBoundingClientRect(), edge = 36;
      if (ev.clientY - r.top < edge) gridRef.current.scrollTop -= 14;
      else if (r.bottom - ev.clientY < edge) gridRef.current.scrollTop += 14;
    }
    if (drag && gridRef.current) { const rect = gridRef.current.getBoundingClientRect(); const ns = Math.round((ev.clientY - rect.top - drag.oy) / PX / 5) * 5 + allS; setBlocks(p => p.map(b => b.id === drag.id ? merge(b, { start: Math.max(allS, Math.min(allE - 5, ns)) }) : b)); }
    if (resz && gridRef.current) { const dm = Math.round((ev.clientY - resz.sy) / PX / 5) * 5; setBlocks(p => p.map(b => b.id === resz.id ? merge(b, { dur: Math.max(5, (b._od || b.dur) + dm) }) : b)); }
  };
  const onUp = () => {
    if (drag) { const b = blocks.find(x => x.id === drag.id); if (b && b.taskId) onReschedule(b.taskId, b.start, null); }
    else if (resz) { const b = blocks.find(x => x.id === resz.id); if (b && b.taskId) onReschedule(b.taskId, b.start, b.dur); }
    setDrag(null); setResz(null); setBlocks(p => p.map(b => { const nb = merge(b, {}); delete nb._od; return nb; }));
  };
  return (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.07)", overflow: "hidden", userSelect: "none" }} onMouseMove={onMM} onMouseUp={onUp} onMouseLeave={onUp}>
      <div style={{ display: "flex", gap: 7, padding: "7px 12px", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", alignItems: "center" }}>
        {Object.keys(TY).filter(k => k !== "check" && k !== "wish").map(k => { const v = TY[k]; return <div key={k} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#64748b" }}><div style={{ width: 8, height: 8, borderRadius: 2, background: v.bg, border: "1.5px solid " + v.color }} />{v.lb}</div>; })}
        {!isp && <span style={{ marginLeft: "auto", fontSize: 10, color: "#a5b4fc" }}>✦ 블록 드래그로 시간 조정</span>}
      </div>
      <div style={{ display: "flex", overflowY: "auto", maxHeight: 560 }} ref={gridRef}>
        <div style={{ width: TW, flexShrink: 0, position: "relative", height: totalH, borderRight: "1px solid #f1f5f9" }}>
          {tl.map(m => <div key={m} style={{ position: "absolute", top: (m - allS) * PX - 7, right: 5, fontSize: 9, color: m % 60 === 0 ? "#64748b" : "#d1d5db", fontWeight: m % 60 === 0 ? 600 : 400, whiteSpace: "nowrap" }}>{m % 60 === 0 ? fmt(m) : "·" + pad(m % 60)}</div>)}
          {isTod && nowM >= allS && nowM <= allE && <div style={{ position: "absolute", top: (nowM - allS) * PX - 5, right: -1, width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "7px solid #ef4444", zIndex: 11 }} />}
        </div>
        <div style={{ flex: 1, position: "relative", height: totalH }}>
          {tl.map(m => <div key={m} style={{ position: "absolute", top: (m - allS) * PX, left: 0, right: 0, borderTop: m % 60 === 0 ? "1px solid #e2e8f0" : "1px dashed #f1f5f9", pointerEvents: "none" }} />)}
          {slots.map(slot => { const top = (toM(slot.start) - allS) * PX, h = (toM(slot.end) - toM(slot.start)) * PX; return <div key={slot.id} style={{ position: "absolute", top, left: 0, right: 0, height: h, background: "rgba(99,102,241,.025)", borderTop: "1.5px solid #e0e7ff", pointerEvents: "none" }}><span style={{ position: "absolute", top: 3, left: 6, fontSize: 9, color: "#c7d2fe", fontWeight: 700 }}>{slot.lb} {slot.start}–{slot.end}</span></div>; })}
          {isTod && nowM >= allS && nowM <= allE && <div style={{ position: "absolute", top: (nowM - allS) * PX, left: 0, right: 0, zIndex: 10, pointerEvents: "none" }}><div style={{ borderTop: "2px solid #ef4444", position: "relative" }}><span style={{ position: "absolute", left: 8, top: -9, fontSize: 9, color: "#ef4444", fontWeight: 700, background: "#fff", padding: "0 2px" }}>지금 {fmt(nowM)}</span></div></div>}
          {blocks.map(b => {
            const top = (b.start - allS) * PX, bh = Math.max(b.dur * PX, 18), c = bc(b);
            const task = b.taskId ? getTask(b.taskId) : null;
            const goal = task && task.goalId ? getGoal(task.goalId) : null;
            const done = task ? isDoneOn(task, dk) : false;
            const started = !!(task && task.actStarts && task.actStarts[dk]);
            const passed = (isTod && nowM > b.start + b.dur) || isp;
            const notStarted = !!(task && b.type === "focus" && !done && !task.cancelled && !started && passed);
            const canDrag = b.type === "focus" && !isp && !done && !started;
            const active = (drag && drag.id === b.id) || (resz && resz.id === b.id);
            const sh = bh < 32;
            const opacity = (done || (task && task.cancelled)) || isp ? 0.6 : 1;
            const borderColor = notStarted ? "#f59e0b" : c.border;
            return (
              <div key={b.id} onMouseDown={canDrag ? ev => onMD(ev, b.id) : undefined} onMouseEnter={ev => setTip({ b, task, goal, x: ev.clientX, y: ev.clientY })} onMouseLeave={() => setTip(null)}
                style={{ position: "absolute", top, left: 6, right: 6, height: bh, background: c.bg, border: "1.5px " + (notStarted ? "dashed" : "solid") + " " + borderColor, borderRadius: 6, padding: sh ? "2px 6px" : "4px 8px", cursor: canDrag ? (active ? "grabbing" : "grab") : "default", boxShadow: active ? "0 4px 12px rgba(0,0,0,.18)" : "0 1px 3px rgba(0,0,0,.06)", zIndex: active ? 50 : 1, boxSizing: "border-box", overflow: "hidden", opacity }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 4, height: "100%" }}>
                  <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
                    <div style={{ fontSize: sh ? 9.5 : 11, fontWeight: 700, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>{b.label}</div>
                    {!sh && <div style={{ fontSize: 9, color: notStarted ? "#b45309" : "#94a3b8", fontWeight: notStarted ? 700 : 400 }}>{fmt(b.start)}–{fmt(b.start + b.dur)}{goal ? " · 🎯" + goal.title : ""}{task && task.compressed ? " · ⚡" : ""}{b.isFixedTime && !b.actualPlacement ? " · ⏰고정" : ""}{b.actualPlacement ? " · 🕐실제시간" : ""}{notStarted ? " · ⚠️미착수" : ""}</div>}
                  </div>
                  {isTod && b.type === "focus" && task && !done && !task.cancelled && !sh && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                      {!started ? (
                        <button onMouseDown={ev => ev.stopPropagation()} onClick={() => setActionModal({ taskId: b.taskId, mode: "start" })} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 4, width: 18, height: 18, fontSize: 9, cursor: "pointer", padding: 0 }} title="시작">▶</button>
                      ) : (
                        <button onMouseDown={ev => ev.stopPropagation()} onClick={() => setActionModal({ taskId: b.taskId, mode: "finish" })} style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 4, width: 18, height: 18, fontSize: 9, cursor: "pointer", padding: 0 }} title="종료">⏹</button>
                      )}
                      <button onMouseDown={ev => ev.stopPropagation()} onClick={() => onCancel(b.taskId)} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, width: 18, height: 18, fontSize: 9, cursor: "pointer", padding: 0 }}>🗑</button>
                    </div>
                  )}
                  {done && <span style={{ fontSize: 8, color: "#10b981", fontWeight: 700, whiteSpace: "nowrap" }}>✓{task.actStarts && task.actStarts[dk] && task.actEnds && task.actEnds[dk] ? " " + task.actStarts[dk] + "~" + task.actEnds[dk] : ""}</span>}
                </div>
                {canDrag && <div onMouseDown={ev => onRD(ev, b.id)} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, cursor: "ns-resize", background: "rgba(99,102,241,.15)", borderRadius: "0 0 5px 5px" }} />}
              </div>
            );
          })}
        </div>
      </div>
      {tip && (
        <div style={{ position: "fixed", left: tip.x + 12, top: tip.y - 8, zIndex: 200, background: "#1e293b", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 11, pointerEvents: "none", maxWidth: 200, boxShadow: "0 4px 16px rgba(0,0,0,.25)" }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>{tip.b.label}</div>
          <div style={{ color: "#94a3b8" }}>{fmt(tip.b.start)}–{fmt(tip.b.start + tip.b.dur)} ({tip.b.dur}분)</div>
          {tip.goal && <div style={{ color: "#a5b4fc", marginTop: 2 }}>🎯 {tip.goal.title}</div>}
          {tip.task && tip.task.compressed && <div style={{ color: "#fcd34d", marginTop: 2 }}>⚡ 압축됨</div>}
          {tip.task && tip.task.memo && <div style={{ color: "#fde68a", marginTop: 2 }}>📝 {tip.task.memo}</div>}
        </div>
      )}
      {actionModal && (
        <ActionTimeModal
          title={actionModal.mode === "start" ? "▶ 시작 시간 기록" : "⏹ 종료(완료) 시간 기록"}
          onConfirm={t => { if (actionModal.mode === "start") onStart(actionModal.taskId, dk, t); else onFinish(actionModal.taskId, dk, t); setActionModal(null); }}
          onClose={() => setActionModal(null)}
        />
      )}
    </div>
  );
}

/* ── 주간 그리드 ──────────────────────────────────── */
function WeekGrid({ wdays, tasks, settings }) {
  const slots = settings.slots || DSLOTS;
  let allS = 99999, allE = 0;
  for (let i = 0; i < slots.length; i++) { const sm = toM(slots[i].start), em = toM(slots[i].end); if (sm < allS) allS = sm; if (em > allE) allE = em; }
  const PX = 1.35, totalH = (allE - allS) * PX, TC = 36;
  const scheds = wdays.map(d => buildBlocks(tasks, settings, d));
  const tl = []; for (let m = allS; m <= allE; m += 60) tl.push(m);
  const bc = b => {
    if (b.type === "meal") return { bg: "#fff7ed", border: "#fdba74" };
    if (b.type === "shortBreak") return { bg: "#f0fdf4", border: "#86efac" };
    if (b.type === "longBreak") return { bg: "#eff6ff", border: "#93c5fd" };
    const c = TY[b.taskType]; return { bg: c ? c.bg : "#f1f5f9", border: c ? c.color : "#94a3b8" };
  };
  return (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.07)", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: TC + "px repeat(7,1fr)", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
        <div style={{ padding: "8px 0" }} />
        {wdays.map((d, i) => { const tod = isToday(d), past = isPast(d), cnt = scheds[i].filter(b => b.type === "focus").length; return (
          <div key={i} style={{ textAlign: "center", padding: "7px 2px", borderLeft: "1px solid #e2e8f0", background: tod ? "#ede9fe" : "transparent" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: tod ? "#6366f1" : past ? "#94a3b8" : "#475569" }}>{WDK[i]}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: tod ? "#6366f1" : past ? "#94a3b8" : "#1e293b" }}>{d.getDate()}</div>
            {tod && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", margin: "2px auto 0" }} />}
            <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>{cnt > 0 ? cnt + "건" : ""}</div>
          </div>
        ); })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: TC + "px repeat(7,1fr)", overflowY: "auto", maxHeight: 500 }}>
        <div style={{ position: "relative", height: totalH }}>
          {tl.map(m => <div key={m} style={{ position: "absolute", top: (m - allS) * PX - 8, left: 0, width: "100%", fontSize: 9, color: "#94a3b8", textAlign: "right", paddingRight: 4, lineHeight: 1 }}>{fmt(m)}</div>)}
        </div>
        {wdays.map((d, di) => { const sc = scheds[di], past = isPast(d), tod = isToday(d); return (
          <div key={di} style={{ position: "relative", height: totalH, borderLeft: "1px solid #e2e8f0", background: tod ? "rgba(99,102,241,.03)" : past ? "rgba(0,0,0,.015)" : "transparent" }}>
            {tl.map(m => <div key={m} style={{ position: "absolute", top: (m - allS) * PX, left: 0, right: 0, borderTop: "1px solid #f1f5f9", pointerEvents: "none" }} />)}
            {slots.map(slot => { const st = (toM(slot.start) - allS) * PX, sh = (toM(slot.end) - toM(slot.start)) * PX; return <div key={slot.id} style={{ position: "absolute", top: st, left: 1, right: 1, height: sh, background: "rgba(99,102,241,.03)", borderRadius: 4, borderTop: "1px dashed #e0e7ff", pointerEvents: "none" }}>{di === 0 && <span style={{ position: "absolute", top: 2, left: 3, fontSize: 8, color: "#c7d2fe", fontWeight: 600 }}>{slot.lb}</span>}</div>; })}
            {sc.map(b => { const top = (b.start - allS) * PX, bh = Math.max(b.dur * PX, 14), c = bc(b), sh = bh < 22; return <div key={b.id} style={{ position: "absolute", top, left: 2, right: 2, height: bh, background: c.bg, border: "1px solid " + c.border, borderRadius: 4, overflow: "hidden", padding: sh ? "1px 3px" : "2px 4px", opacity: past ? 0.7 : 1, boxSizing: "border-box" }}><div style={{ fontSize: sh ? 7.5 : 8.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2, color: "#1e293b" }}>{sh ? "" : b.label}</div></div>; })}
            {sc.length === 0 && <div style={{ position: "absolute", top: "50%", left: 0, right: 0, textAlign: "center", fontSize: 9, color: "#d1d5db", transform: "translateY(-50%)" }}>비어있음</div>}
          </div>
        ); })}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "7px 12px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap" }}>
        {Object.keys(TY).filter(k => k !== "check").map(k => { const v = TY[k]; return <div key={k} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#64748b" }}><div style={{ width: 9, height: 9, borderRadius: 2, background: v.bg, border: "1.5px solid " + v.color }} />{v.lb}</div>; })}
      </div>
    </div>
  );
}

/* ── 스케줄 탭 ────────────────────────────────────── */
function ScheduleTab({ tasks, settings, onStart, onFinish, onCancel, onToggle, onReschedule, logs, onAddLog, onDeleteLog }) {
  const [view, setView] = useState("day");
  const [cur, setCur] = useState(() => getNow());
  const wds = weekDays(cur);
  const nd = getNow(), dk = dstr(nd);
  const todayChecks = tasks.filter(t => {
    if (t.type !== "check" || t.cancelled) return false;
    if (!checkActive(t, nd)) return false;
    if (!t.repeat || t.repeat === "없음") return !t.done || (t.dueDate && dleft(t.dueDate) <= 0);
    return true;
  });
  const doneCount = todayChecks.filter(t => (t.repeat && t.repeat !== "없음") ? safeArr(t.doneDates).indexOf(dk) >= 0 : t.done).length;
  return (
    <div>
      {todayChecks.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#6b7280", marginBottom: 8 }}>✅ 오늘 체크 항목 ({todayChecks.length - doneCount}개 남음)</div>
          {todayChecks.slice(0, 6).map(t => {
            const isDone = (t.repeat && t.repeat !== "없음") ? safeArr(t.doneDates).indexOf(dk) >= 0 : t.done;
            const streak = t.repeat && t.repeat !== "없음" ? calcStreak(t) : 0;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "4px 0" }}>
                <input type="checkbox" checked={!!isDone} onChange={() => onToggle(t.id)} style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#6366f1" }} />
                <span style={{ flex: 1, textDecoration: isDone ? "line-through" : "none", color: isDone ? "#94a3b8" : "#1e293b" }}>{t.title}</span>
                {t.repeat && t.repeat !== "없음" && <span style={{ fontSize: 10, color: "#8b5cf6", background: "#ede9fe", borderRadius: 4, padding: "1px 5px" }}>🔄{t.repeat}{t.repeat === "매주" && safeArr(t.repeatDays).length ? " " + t.repeatDays.join("·") : ""}</span>}
                {t.dueDate && (!t.repeat || t.repeat === "없음") && <span style={{ fontSize: 11, color: dleft(t.dueDate) <= 0 ? "#ef4444" : "#94a3b8" }}>~{t.dueDate}</span>}
                {streak > 0 && <span style={{ fontSize: 10, color: "#f59e0b" }}>🔥{streak}일</span>}
              </div>
            );
          })}
          {todayChecks.length > 6 && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>+{todayChecks.length - 6}개 더</div>}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
          <button onClick={() => setView("day")} style={{ padding: "5px 16px", border: "none", borderRadius: 8, background: view === "day" ? "#6366f1" : "transparent", color: view === "day" ? "#fff" : "#64748b", cursor: "pointer", fontWeight: view === "day" ? 700 : 400, fontSize: 13 }}>일간</button>
          <button onClick={() => setView("week")} style={{ padding: "5px 16px", border: "none", borderRadius: 8, background: view === "week" ? "#6366f1" : "transparent", color: view === "week" ? "#fff" : "#64748b", cursor: "pointer", fontWeight: view === "week" ? 700 : 400, fontSize: 13 }}>주간</button>
        </div>
        <button onClick={() => setCur(getNow())} style={{ background: "#ede9fe", color: "#6366f1", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>오늘</button>
      </div>
      {view === "day" ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 12, padding: "9px 14px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
            <button onClick={() => setCur(d => addD(d, -1))} style={NB}>‹ 전날</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtF(cur)}</div>
              {isToday(cur) && <span style={{ fontSize: 10, background: "#6366f1", color: "#fff", borderRadius: 10, padding: "1px 7px" }}>오늘</span>}
            </div>
            <button onClick={() => setCur(d => addD(d, 1))} style={NB}>다음날 ›</button>
          </div>
          <DayTimeline date={cur} tasks={tasks} settings={settings} onStart={onStart} onFinish={onFinish} onCancel={onCancel} onReschedule={onReschedule} />
          <ActivityLog date={cur} logs={logs} onAdd={onAddLog} onDelete={onDeleteLog} />
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 12, padding: "9px 14px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
            <button onClick={() => setCur(d => addD(d, -7))} style={NB}>‹ 이전 주</button>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{fmtS(wds[0])} ~ {fmtS(wds[6])} ({fmtMo(wds[0])})</div>
            <button onClick={() => setCur(d => addD(d, 7))} style={NB}>다음 주 ›</button>
          </div>
          <WeekGrid wdays={wds} tasks={tasks} settings={settings} />
        </div>
      )}
    </div>
  );
}

/* ── 활동 로그 ────────────────────────────────────── */
function ActivityLog({ date, logs, onAdd, onDelete }) {
  const dk = dstr(date);
  const [text, setText] = useState("");
  const [time, setTime] = useState(() => fmt(getNow().getHours() * 60 + getNow().getMinutes()));
  const items = safeArr(logs).filter(l => l.date === dk).sort((a, b) => toM(a.time) - toM(b.time));
  const submit = () => { if (!text.trim()) return; onAdd(dk, text.trim(), time); setText(""); };
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 14, marginTop: 12, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", marginBottom: 10 }}>📝 실제 활동 로그</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={mx(IS, { width: 92, flexShrink: 0 })} />
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="실제로 한 일을 기록해보세요" style={IS} />
        <button onClick={submit} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>추가</button>
      </div>
      {items.length === 0 && <Empty text="아직 기록된 활동이 없습니다" />}
      {items.map(l => (
        <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: 11, color: "#94a3b8", width: 38, flexShrink: 0 }}>{l.time}</span>
          <span style={{ flex: 1, fontSize: 13, color: "#1e293b" }}>{l.text}</span>
          <button onClick={() => onDelete(l.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

/* ── 태스크 카드 ──────────────────────────────────── */
function TaskCard({ task, settings, onEdit, onComplete, onCancel }) {
  const tt = TY[task.type];
  const goal = (settings.goals || []).find(g => g.id === task.goalId) || null;
  const dl = task.dueDate ? dleft(task.dueDate) : null;
  const badge = dl !== null ? (dl < 0 ? "기한초과" : dl === 0 ? "오늘마감" : dl <= 3 ? "D-" + dl : null) : null;
  const streak = task.repeat && task.repeat !== "없음" ? calcStreak(task) : 0;
  const doneN = safeArr(task.doneDates).length;
  return (
    <div style={{ background: tt.bg, border: "1.5px solid " + tt.color, borderRadius: 10, padding: "10px 14px", opacity: task.done || task.cancelled ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 15, marginTop: 1 }}>{tt.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            {task.title}
            {task.compressed && <span style={{ fontSize: 11, color: "#f59e0b", background: "#fef3c7", borderRadius: 4, padding: "1px 5px" }}>⚡압축</span>}
            {task.done && <span style={{ fontSize: 11, color: "#10b981" }}>✓완료</span>}
            {task.cancelled && <span style={{ fontSize: 11, color: "#ef4444" }}>✕취소</span>}
            {task.repeat && task.repeat !== "없음" && <span style={{ fontSize: 11, color: "#8b5cf6", background: "#ede9fe", borderRadius: 4, padding: "1px 5px" }}>🔄{task.repeat}{task.repeat === "매주" && safeArr(task.repeatDays).length ? " (" + task.repeatDays.join("·") + ")" : ""}</span>}
            {badge && <span style={{ fontSize: 11, color: dl <= 0 ? "#ef4444" : "#f59e0b", background: dl <= 0 ? "#fef2f2" : "#fffbeb", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>{badge}</span>}
            {task.type === "event" && task.urgency && <span style={{ fontSize: 11, color: "#8b5cf6", background: "#f5f3ff", borderRadius: 4, padding: "1px 5px" }}>긴급도:{task.urgency}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {task.category1}{task.category2 ? " > " + task.category2 : ""}{task.duration ? " · " + task.duration + "분" : ""}
            {task.type === "flex" && task.flexMin ? " (최소 " + task.flexMin + "분)" : ""}
            {task.fixedTime ? " · ⏰ " + task.fixedTime + " 고정" : ""}
            {task.dueDate ? " · 마감 " + task.dueDate : ""}
          </div>
          {goal && <div style={{ fontSize: 11, color: "#6366f1" }}>🎯 {goal.title}</div>}
          {doneN > 0 && <div style={{ fontSize: 11, color: "#8b5cf6" }}>누적 완료 {doneN}회{streak > 0 ? " · 🔥" + streak + "일 연속" : ""}</div>}
          {task.memo && <div style={{ fontSize: 11, color: "#92400e", background: "#fffbeb", borderRadius: 4, padding: "2px 6px", marginTop: 3 }}>📝 {task.memo}</div>}
        </div>
        {!task.done && !task.cancelled && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => onEdit(task)} style={BS("#6366f1")}>✏️</button>
            <button onClick={() => onComplete(task.id)} style={BS("#10b981")}>✓</button>
            <button onClick={() => onCancel(task.id)} style={BS("#ef4444")}>🗑</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 태스크 탭 ────────────────────────────────────── */
function TaskTab({ tasks, settings, onAdd, onEdit, onComplete, onCancel, onUrgent, onToggle }) {
  const [filter, setFilter] = useState("전체");
  const [showUF, setShowUF] = useState(false);
  const FLS = ["전체","체크","일정","고정","유연","긴급","위시","반복","완료","취소"];
  const filtered = tasks.filter(t => {
    if (filter === "완료") return t.done;
    if (filter === "취소") return t.cancelled;
    if (filter === "반복") return t.repeat && t.repeat !== "없음" && !t.cancelled;
    if (filter === "전체") return !t.cancelled && !t.done;
    const k = Object.keys(TY).find(k => TY[k].lb === filter);
    return t.type === k && !t.cancelled && !t.done;
  });
  const checkItems = filtered.filter(t => t.type === "check");
  const otherItems = filtered.filter(t => t.type !== "check");
  const wishItems = tasks.filter(t => t.type === "wish" && !t.cancelled && !t.done).sort((a, b) => (a.wishRank || 0) - (b.wishRank || 0));
  const dk = dstr(getNow());
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: "#1e293b" }}>📋 태스크 목록</h3>
        <div style={{ display: "flex", gap: 7 }}>
          <button onClick={() => setShowUF(true)} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>⚡ 긴급</button>
          <button onClick={onAdd} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ 추가</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {FLS.map(f => <button key={f} onClick={() => setFilter(f)} style={{ padding: "4px 9px", border: "1.5px solid " + (filter === f ? "#6366f1" : "#e2e8f0"), borderRadius: 20, background: filter === f ? "#6366f1" : "#fff", color: filter === f ? "#fff" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: filter === f ? 600 : 400 }}>{f}</button>)}
      </div>
      {checkItems.length > 0 && (
        <div style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#6b7280", marginBottom: 8 }}>✅ 체크 리스트</div>
          {checkItems.map(t => {
            const isDone = (t.repeat && t.repeat !== "없음") ? safeArr(t.doneDates).indexOf(dk) >= 0 : t.done;
            const streak = t.repeat && t.repeat !== "없음" ? calcStreak(t) : 0;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <input type="checkbox" checked={!!isDone} onChange={() => onToggle(t.id)} style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#6366f1" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, textDecoration: isDone ? "line-through" : "none", color: isDone ? "#94a3b8" : "#1e293b" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {t.category1}{t.category2 ? " > " + t.category2 : ""}
                    {t.repeat && t.repeat !== "없음" ? " · 🔄" + t.repeat + (t.repeat === "매주" && safeArr(t.repeatDays).length ? " (" + t.repeatDays.join("·") + ")" : "") : ""}
                    {t.dueDate && (!t.repeat || t.repeat === "없음") ? " · ~" + t.dueDate : ""}
                    {safeArr(t.doneDates).length > 0 ? " · " + safeArr(t.doneDates).length + "회 완료" : ""}
                    {streak > 0 ? " · 🔥" + streak + "일 연속" : ""}
                  </div>
                  {t.memo && <div style={{ fontSize: 11, color: "#92400e", background: "#fffbeb", borderRadius: 4, padding: "2px 6px", marginTop: 2, display: "inline-block" }}>📝 {t.memo}</div>}
                </div>
                <button onClick={() => onEdit(t)} style={BS("#6366f1")}>✏️</button>
                <button onClick={() => onCancel(t.id)} style={BS("#ef4444")}>🗑</button>
              </div>
            );
          })}
        </div>
      )}
      {otherItems.length === 0 && filter !== "체크" && <Empty text="해당 태스크가 없습니다" />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {otherItems.map(t => <TaskCard key={t.id} task={t} settings={settings} onEdit={onEdit} onComplete={onComplete} onCancel={onCancel} />)}
      </div>
      {wishItems.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h4 style={{ color: "#3b82f6", margin: "0 0 8px", fontSize: 14 }}>🔵 위시 리스트</h4>
          {wishItems.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 9, background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: 10, padding: "8px 12px", marginBottom: 6 }}>
              <span style={{ background: "#3b82f6", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div><div style={{ fontSize: 11, color: "#64748b" }}>{t.duration}분 · {t.category1}</div>{t.memo && <div style={{ fontSize: 11, color: "#92400e" }}>📝 {t.memo}</div>}</div>
              <button onClick={() => onEdit(t)} style={BS("#6366f1")}>✏️</button>
              <button onClick={() => onComplete(t.id)} style={BS("#10b981")}>✓</button>
              <button onClick={() => onCancel(t.id)} style={BS("#ef4444")}>🗑</button>
            </div>
          ))}
        </div>
      )}
      {showUF && <UrgentForm settings={settings} onSave={t => { onUrgent(t); setShowUF(false); }} onClose={() => setShowUF(false)} />}
    </div>
  );
}

/* ── 분석 탭 ──────────────────────────────────────── */
function HabitStrip({ task }) {
  const days = []; for (let i = 13; i >= 0; i--) days.push(addD(getNow(), -i));
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {days.map(d => {
        const dk = dstr(d), sched = repeatActiveOn(task, d), done = safeArr(task.doneDates).indexOf(dk) >= 0;
        const bg = !sched ? "#f1f5f9" : done ? "#10b981" : d < todayStart ? "#fecaca" : "#fde68a";
        return <div key={dk} title={dk + (sched ? (done ? " 완료" : " 미완료") : " 해당없음")} style={{ width: 12, height: 12, borderRadius: 3, background: bg, flexShrink: 0 }} />;
      })}
    </div>
  );
}

function AnalysisTab({ tasks, settings }) {
  const done = tasks.filter(t => t.done);
  const total = done.reduce((s, t) => s + (t.duration || 0), 0);
  const catMap = {}; done.forEach(t => { catMap[t.category1] = (catMap[t.category1] || 0) + (t.duration || 0); });
  const catKeys = Object.keys(catMap);
  let barMax = 0; catKeys.forEach(k => { if (catMap[k] > barMax) barMax = catMap[k]; }); if (barMax === 0) barMax = 1;
  const goalMap = {}; done.forEach(t => { if (t.goalId) { const g = (settings.goals || []).find(x => x.id === t.goalId); if (g) goalMap[g.title] = (goalMap[g.title] || 0) + (t.duration || 0); } });
  const wishDone = done.filter(t => t.type === "wish").length, wishTotal = tasks.filter(t => t.type === "wish").length;
  const balance = wishTotal > 0 ? Math.round(wishDone / wishTotal * 100) : 0;
  const checkDone = tasks.filter(t => t.type === "check" && t.done).length, checkTotal = tasks.filter(t => t.type === "check").length;
  const habitTasks = tasks.filter(t => t.repeat && t.repeat !== "없음" && !t.cancelled);
  return (
    <div>
      <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#1e293b" }}>📊 생산성 분석</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[{ l: "완료", v: done.length + "/" + tasks.length, i: "✅" }, { l: "집중시간", v: Math.floor(total / 60) + "h " + total % 60 + "m", i: "⏱️" }, { l: "삶의 균형", v: balance + "점", i: "🌱" }].map(c => (
          <div key={c.l} style={{ background: "#fff", borderRadius: 12, padding: 14, textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
            <div style={{ fontSize: 22 }}>{c.i}</div><div style={{ fontWeight: 700, fontSize: 17, color: "#6366f1" }}>{c.v}</div><div style={{ fontSize: 11, color: "#64748b" }}>{c.l}</div>
          </div>
        ))}
      </div>
      {checkTotal > 0 && <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>✅ 체크리스트 {checkDone}/{checkTotal}</div>
        <div style={{ background: "#e2e8f0", borderRadius: 4, height: 8 }}><div style={{ width: (checkTotal > 0 ? checkDone / checkTotal * 100 : 0) + "%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 4, height: 8 }} /></div>
      </div>}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>대분류별 시간</div>
        {catKeys.length === 0 && <Empty text="완료된 태스크가 없습니다" />}
        {catKeys.map(cat => { const mins = catMap[cat]; return (
          <div key={cat} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span>{cat}</span><span style={{ color: "#6366f1", fontWeight: 600 }}>{mins}분</span></div>
            <div style={{ background: "#e2e8f0", borderRadius: 4, height: 8 }}><div style={{ width: (mins / barMax * 100) + "%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 4, height: 8 }} /></div>
          </div>
        ); })}
      </div>
      {habitTasks.length > 0 && <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>🔥 습관 트래커 (최근 14일)</div>
        {habitTasks.map(t => (
          <div key={t.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 5 }}>
              <span>{t.title}</span>
              <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 12 }}>{calcStreak(t) > 0 ? "🔥" + calcStreak(t) + "일 연속" : "-"}</span>
            </div>
            <HabitStrip task={t} />
          </div>
        ))}
      </div>}
      {(settings.goals || []).length > 0 && <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>🎯 목표별 투자 시간</div>
        {(settings.goals || []).map(g => <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13 }}><span style={{ flex: 1 }}>{g.title}</span><span style={{ color: "#6366f1", fontWeight: 600 }}>{goalMap[g.title] || 0}분</span><span style={{ fontSize: 11, color: "#94a3b8", background: "#f1f5f9", borderRadius: 4, padding: "1px 6px" }}>{g.period}</span></div>)}
      </div>}
      {settings.mission && <div style={{ background: "linear-gradient(135deg,#ede9fe,#dbeafe)", borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>📜 사명서</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>"{settings.mission}"</div>
      </div>}
    </div>
  );
}

/* ── 설정 탭 ──────────────────────────────────────── */
function SettingsTab({ settings, onChange }) {
  const [mission, setMission] = useState(settings.mission || "");
  const [goals, setGoals] = useState(settings.goals || []);
  const [pomo, setPomo] = useState(settings.pomo || DPOMO);
  const [slots, setSlots] = useState(settings.slots || DSLOTS);
  const [ng, setNg] = useState({ title: "", period: "단기", priority: "중", category: "" });
  const save = () => { onChange(merge(settings, { mission, goals, pomo, slots })); alert("저장 완료 ✓"); };
  const updSlot = (id, k, v) => setSlots(ss => ss.map(s => { if (s.id !== id) return s; const ns = merge(s, {}); ns[k] = v; return ns; }));
  const mk3 = () => [{ id: uid(), lb: "오전", start: "09:00", end: "12:00", hasMeal: false, mealDur: 0, mealName: "", afterMeal: 0 }, { id: uid(), lb: "오후", start: "13:00", end: "18:00", hasMeal: true, mealDur: 40, mealName: "점심", afterMeal: 2 }, { id: uid(), lb: "저녁", start: "19:00", end: "22:00", hasMeal: true, mealDur: 30, mealName: "저녁", afterMeal: 1 }];
  const mk5 = () => [{ id: uid(), lb: "아침", start: "06:00", end: "08:00", hasMeal: true, mealDur: 20, mealName: "아침", afterMeal: 1 }, { id: uid(), lb: "오전", start: "09:00", end: "12:00", hasMeal: false, mealDur: 0, mealName: "", afterMeal: 0 }, { id: uid(), lb: "오후", start: "13:00", end: "18:00", hasMeal: true, mealDur: 40, mealName: "점심", afterMeal: 2 }, { id: uid(), lb: "저녁", start: "19:00", end: "21:00", hasMeal: true, mealDur: 30, mealName: "저녁", afterMeal: 1 }, { id: uid(), lb: "야간", start: "22:00", end: "24:00", hasMeal: false, mealDur: 0, mealName: "", afterMeal: 0 }];
  const sorted = slots.slice().sort((a, b) => toM(a.start) - toM(b.start));
  return (
    <div>
      <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#1e293b" }}>⚙️ 설정</h3>
      <Sec title="📜 사명서">
        <textarea value={mission} onChange={e => setMission(e.target.value)} placeholder="예) 나는 가족과 함께 건강하고 의미있는 삶을 살아간다." style={{ width: "100%", minHeight: 75, borderRadius: 8, border: "1.5px solid #e2e8f0", padding: 10, fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
      </Sec>
      <Sec title="🎯 인생 목표">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 55px 70px 32px", gap: 5, marginBottom: 8, alignItems: "end" }}>
          <input value={ng.title} onChange={e => setNg(merge(ng, { title: e.target.value }))} placeholder="목표" style={IS} />
          <select value={ng.period} onChange={e => setNg(merge(ng, { period: e.target.value }))} style={IS}>{["단기","중기","장기"].map(p => <option key={p}>{p}</option>)}</select>
          <select value={ng.priority} onChange={e => setNg(merge(ng, { priority: e.target.value }))} style={IS}>{PRIOS.map(p => <option key={p}>{p}</option>)}</select>
          <input value={ng.category} onChange={e => setNg(merge(ng, { category: e.target.value }))} placeholder="분류" style={IS} />
          <button onClick={() => { if (!ng.title) return; setGoals(g => g.concat([merge(ng, { id: uid() })])); setNg({ title: "", period: "단기", priority: "중", category: "" }); }} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: 7, cursor: "pointer", fontSize: 14, height: 34 }}>+</button>
        </div>
        {goals.length === 0 && <Empty text="인생 목표를 추가해보세요" />}
        {goals.map((g, i) => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", marginBottom: 5 }}>
            <span style={{ background: "#6366f1", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{g.title}</span>
            <span style={{ fontSize: 11, color: "#6366f1", background: "#ede9fe", borderRadius: 4, padding: "1px 6px" }}>{g.period}</span>
            <button onClick={() => setGoals(gs => gs.filter(x => x.id !== g.id))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        ))}
      </Sec>
      <Sec title="🕐 시간대 설정">
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>시간대를 자유롭게 추가하거나 삭제할 수 있어요.</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button onClick={() => { if (window.confirm("3블록?")) setSlots(mk3()); }} style={{ background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#475569", cursor: "pointer" }}>3블록</button>
          <button onClick={() => { if (window.confirm("5블록?")) setSlots(mk5()); }} style={{ background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#475569", cursor: "pointer" }}>5블록</button>
        </div>
        {sorted.map((slot, idx) => (
          <div key={slot.id} style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ background: "#6366f1", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
              <input value={slot.lb} onChange={e => updSlot(slot.id, "lb", e.target.value)} style={mx(IS, { width: 70, fontWeight: 700, color: "#6366f1" })} />
              <span style={{ fontSize: 12, color: "#64748b" }}>시작</span>
              <input type="time" value={slot.start} onChange={e => updSlot(slot.id, "start", e.target.value)} style={mx(IS, { width: 108 })} />
              <span style={{ fontSize: 12, color: "#64748b" }}>종료</span>
              <input type="time" value={slot.end} onChange={e => updSlot(slot.id, "end", e.target.value)} style={mx(IS, { width: 108 })} />
              <button onClick={() => { if (slots.length <= 1) { alert("최소 1개"); return; } setSlots(ss => ss.filter(s => s.id !== slot.id)); }} style={{ marginLeft: "auto", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8, padding: "4px 10px", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>삭제</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b", cursor: "pointer" }}><input type="checkbox" checked={slot.hasMeal} onChange={e => updSlot(slot.id, "hasMeal", e.target.checked)} />식사 포함</label>
              {slot.hasMeal && <>
                <input value={slot.mealName} onChange={e => updSlot(slot.id, "mealName", e.target.value)} style={mx(IS, { width: 90, fontSize: 12 })} placeholder="식사명" />
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>식사<input type="number" value={slot.mealDur} onChange={e => updSlot(slot.id, "mealDur", +e.target.value)} min={0} style={mx(IS, { width: 50 })} />분</label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>후<input type="number" value={slot.afterMeal} onChange={e => updSlot(slot.id, "afterMeal", +e.target.value)} min={0} max={10} style={mx(IS, { width: 40 })} />개</label>
              </>}
            </div>
          </div>
        ))}
        <button onClick={() => { const s2 = slots.slice().sort((a, b) => toM(a.end) - toM(b.end)); const last = s2[s2.length - 1]; const ns = last ? last.end : "09:00"; const pt = ns.split(":"); const h = +pt[0]; const ne = pad(h + 2 < 24 ? h + 2 : 23) + ":" + pt[1]; setSlots(ss => ss.concat([{ id: uid(), lb: "새 시간대", start: ns, end: ne, hasMeal: false, mealDur: 0, mealName: "", afterMeal: 0 }])); }} style={{ width: "100%", background: "#ede9fe", border: "1.5px dashed #a5b4fc", borderRadius: 10, padding: 10, fontSize: 13, color: "#6366f1", cursor: "pointer", fontWeight: 600 }}>+ 시간대 추가</button>
      </Sec>
      <Sec title="🍅 뽀모도로 설정">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[{ l: "집중(분)", k: "focus" }, { l: "짧은 휴식(분)", k: "shortBreak" }, { l: "긴 휴식(분)", k: "longBreak" }, { l: "긴 휴식 주기", k: "sessionsBeforeLong" }].map(f => (
            <label key={f.k} style={{ fontSize: 12, color: "#64748b" }}>{f.l}<input type="number" value={pomo[f.k]} onChange={e => { const np = merge(pomo, {}); np[f.k] = +e.target.value; setPomo(np); }} min={1} style={mx(IS, { display: "block", width: "100%", marginTop: 4 })} /></label>
          ))}
        </div>
      </Sec>
      <button onClick={save} style={{ width: "100%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>💾 설정 저장</button>
    </div>
  );
}

/* ── 태스크 폼 ────────────────────────────────────── */
function TaskForm({ task, settings, occurrenceDate, onSave, onClose }) {
  const cats = Object.keys(settings.cats || DCATS);
  const allSlots = settings.slots || DSLOTS;
  const def = { title: "", type: "check", priority: "중", urgency: "보통", duration: 25, flexMin: 10, dueDate: "", allowedSlots: [], category1: cats[0] || "", category2: "", goalId: "", wishRank: 1, repeat: "없음", repeatDays: [], memo: "" };
  const [f, setF] = useState(task || def);
  const set = (k, v) => setF(x => { const n = merge(x, {}); n[k] = v; return n; });
  const subCats = (settings.cats || DCATS)[f.category1] || [];
  const toggleSlot = label => { const p = safeArr(f.allowedSlots), idx = p.indexOf(label), np = p.slice(); if (idx >= 0) np.splice(idx, 1); else np.push(label); set("allowedSlots", np); };
  const toggleDay = d => { const p = safeArr(f.repeatDays), idx = p.indexOf(d), np = p.slice(); if (idx >= 0) np.splice(idx, 1); else np.push(d); set("repeatDays", np); };
  const isOcc = !!occurrenceDate;
  const needsDur = f.type !== "check";
  const needsSched = f.type !== "check" && f.type !== "wish";
  const needsRep = (f.type === "fixed" || f.type === "flex" || f.type === "check") && !isOcc;
  return (
    <Modal title={task ? (isOcc ? "태스크 수정 (이번 회차만)" : "태스크 수정") : "태스크 추가"} onClose={onClose}>
      {isOcc && (
        <div style={{ background: "#ede9fe", border: "1.5px solid #c4b5fd", borderRadius: 8, padding: 10, fontSize: 12, color: "#5b21b6" }}>
          🔄 {f.repeat}{f.repeat === "매주" && safeArr(f.repeatDays).length ? " (" + f.repeatDays.join("·") + ")" : ""} 반복 중 — {occurrenceDate} 회차만 수정되고, 원본 반복 일정은 그대로 유지됩니다.
        </div>
      )}
      <label style={LS}>타입
        <div style={{ position: "relative" }}>
          <select value={f.type} onChange={e => set("type", e.target.value)} style={mx(IS, { paddingLeft: 32, background: TY[f.type].bg, color: TY[f.type].color, fontWeight: 700, border: "2px solid " + TY[f.type].color })}>
            {Object.keys(TY).map(k => { const v = TY[k]; return <option key={k} value={k}>{v.icon} {v.lb} — {v.desc}</option>; })}
          </select>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>{TY[f.type].icon}</span>
        </div>
      </label>
      <label style={LS}>제목<input value={f.title} onChange={e => set("title", e.target.value)} style={IS} placeholder="태스크 제목" /></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={LS}>우선순위<select value={f.priority} onChange={e => set("priority", e.target.value)} style={IS}>{PRIOS.map(p => <option key={p}>{p}</option>)}</select></label>
        {f.type === "event" && <label style={LS}>긴급도<select value={f.urgency || "보통"} onChange={e => set("urgency", e.target.value)} style={IS}>{URGS.map(u => <option key={u}>{u}</option>)}</select></label>}
        {needsDur && <label style={LS}>예상 시간(분)<input type="number" value={f.duration} onChange={e => set("duration", +e.target.value)} min={5} style={IS} /></label>}
        {f.type === "flex" && <label style={LS}>최소 시간(분)<input type="number" value={f.flexMin} onChange={e => set("flexMin", +e.target.value)} min={5} style={IS} /></label>}
        {needsRep && <label style={LS}>반복<select value={f.repeat || "없음"} onChange={e => set("repeat", e.target.value)} style={IS}>{REPS.map(r => <option key={r}>{r}</option>)}</select></label>}
        <label style={LS}>마감일<input type="date" value={f.dueDate} onChange={e => set("dueDate", e.target.value)} style={IS} /></label>
        <label style={LS}>대분류<select value={f.category1} onChange={e => { set("category1", e.target.value); set("category2", ""); }} style={IS}>{cats.map(c => <option key={c}>{c}</option>)}</select></label>
        <label style={LS}>소분류<select value={f.category2} onChange={e => set("category2", e.target.value)} style={IS}><option value="">선택 안 함</option>{subCats.map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      {needsSched && (
        <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 8 }}>허용 시간대 {!f.fixedTime && safeArr(f.allowedSlots).length === 0 && <span style={{ fontWeight: 400, color: "#94a3b8" }}>(모든 시간대)</span>}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, opacity: f.fixedTime ? 0.35 : 1, pointerEvents: f.fixedTime ? "none" : "auto" }}>
            {allSlots.slice().sort((a, b) => toM(a.start) - toM(b.start)).map(slot => { const on = safeArr(f.allowedSlots).indexOf(slot.lb) >= 0; return <button type="button" key={slot.id} onClick={() => toggleSlot(slot.lb)} style={{ padding: "5px 11px", border: "2px solid " + (on ? "#6366f1" : "#e2e8f0"), borderRadius: 20, background: on ? "#6366f1" : "#fff", color: on ? "#fff" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: on ? 700 : 400 }}>{slot.lb} <span style={{ fontSize: 10, opacity: .75 }}>{slot.start}</span></button>; })}
          </div>
          {!f.fixedTime && safeArr(f.allowedSlots).length === 0 && <div style={{ marginTop: 6, fontSize: 11, color: "#a5b4fc" }}>💡 선택 없으면 모든 시간대에 배정될 수 있어요.</div>}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => set("fixedTime", f.fixedTime ? "" : "09:00")} style={{ padding: "5px 12px", border: "2px solid " + (f.fixedTime ? "#ef4444" : "#e2e8f0"), borderRadius: 20, background: f.fixedTime ? "#fef2f2" : "#fff", color: f.fixedTime ? "#ef4444" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: f.fixedTime ? 700 : 400 }}>⏰ 고정 시간</button>
            {f.fixedTime && <input type="time" value={f.fixedTime} onChange={e => set("fixedTime", e.target.value)} style={{ borderRadius: 8, border: "2px solid #ef4444", padding: "5px 10px", fontSize: 13, outline: "none" }} />}
            {f.fixedTime && <span style={{ fontSize: 11, color: "#ef4444" }}>정확히 이 시간에 배치됩니다</span>}
          </div>
        </div>
      )}
      {f.repeat === "매주" && !isOcc && (
        <label style={LS}>반복 요일
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
            {WDK.map(d => { const on = safeArr(f.repeatDays).indexOf(d) >= 0; return <button type="button" key={d} onClick={() => toggleDay(d)} style={{ width: 35, height: 35, borderRadius: "50%", border: "2px solid " + (on ? "#6366f1" : "#e2e8f0"), background: on ? "#6366f1" : "#fff", color: on ? "#fff" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: on ? 700 : 400 }}>{d}</button>; })}
          </div>
        </label>
      )}
      {(settings.goals || []).length > 0 && <label style={LS}>연결 목표<select value={f.goalId} onChange={e => set("goalId", e.target.value)} style={IS}><option value="">연결 안 함</option>{(settings.goals || []).map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>}
      {f.type === "wish" && <label style={LS}>위시 순위<input type="number" value={f.wishRank} onChange={e => set("wishRank", +e.target.value)} min={1} style={IS} /></label>}
      <label style={LS}>메모<textarea value={f.memo || ""} onChange={e => set("memo", e.target.value)} placeholder="나중에 기억할 내용을 적어두세요" style={mx(IS, { minHeight: 54, resize: "vertical" })} /></label>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={() => f.title && onSave(f)} style={{ flex: 1, background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 600 }}>저장</button>
        <button onClick={onClose} style={{ flex: 1, background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, padding: 10, cursor: "pointer" }}>취소</button>
      </div>
    </Modal>
  );
}

function ScopeChoice({ task, onPick, onClose }) {
  return (
    <Modal title="🔄 반복 태스크 수정" onClose={onClose}>
      <div style={{ fontSize: 13, color: "#64748b" }}>"{task.title}"은 반복 일정입니다. 어느 범위를 수정할까요?</div>
      <button type="button" onClick={() => onPick("occurrence")} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: 12, cursor: "pointer", fontWeight: 700, textAlign: "left" }}>
        📌 이번 회차만 수정
        <div style={{ fontSize: 11, fontWeight: 400, opacity: .85, marginTop: 2 }}>오늘 날짜의 내용만 바뀌고, 반복 일정 자체는 그대로 유지됩니다.</div>
      </button>
      <button type="button" onClick={() => onPick("series")} style={{ background: "#f8fafc", color: "#1e293b", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: 12, cursor: "pointer", fontWeight: 700, textAlign: "left" }}>
        🗂️ 전체 반복 일정 수정
        <div style={{ fontSize: 11, fontWeight: 400, color: "#64748b", marginTop: 2 }}>반복 옵션을 포함해 원본 일정 자체를 수정합니다.</div>
      </button>
      <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12, marginTop: 4 }}>취소</button>
    </Modal>
  );
}

function UrgentForm({ settings, onSave, onClose }) {
  const cats = Object.keys(settings.cats || DCATS);
  const allSlots = settings.slots || DSLOTS;
  const [f, setF] = useState({ title: "", duration: 30, priority: "최상", type: "urgent", category1: cats[0] || "", category2: "", allowedSlots: [], dueDate: "", flexMin: 10, wishRank: 1, repeat: "없음", repeatDays: [], goalId: "", urgency: "높음" });
  const set = (k, v) => setF(x => { const n = merge(x, {}); n[k] = v; return n; });
  const toggleSlot = label => { const p = safeArr(f.allowedSlots), idx = p.indexOf(label), np = p.slice(); if (idx >= 0) np.splice(idx, 1); else np.push(label); set("allowedSlots", np); };
  return (
    <Modal title="⚡ 긴급 태스크 삽입" onClose={onClose}>
      <div style={{ background: "#fef3c7", border: "1.5px solid #f59e0b", borderRadius: 8, padding: 10, fontSize: 13, color: "#92400e" }}>긴급 삽입 시 유연 태스크 시간이 자동 압축됩니다.</div>
      <label style={LS}>제목<input value={f.title} onChange={e => set("title", e.target.value)} style={IS} placeholder="긴급 태스크 제목" /></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={LS}>필요 시간(분)<input type="number" value={f.duration} onChange={e => set("duration", +e.target.value)} min={5} style={IS} /></label>
        <label style={LS}>대분류<select value={f.category1} onChange={e => set("category1", e.target.value)} style={IS}>{cats.map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 7 }}>허용 시간대</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {allSlots.slice().sort((a, b) => toM(a.start) - toM(b.start)).map(slot => { const on = safeArr(f.allowedSlots).indexOf(slot.lb) >= 0; return <button type="button" key={slot.id} onClick={() => toggleSlot(slot.lb)} style={{ padding: "5px 11px", border: "2px solid " + (on ? "#6366f1" : "#e2e8f0"), borderRadius: 20, background: on ? "#6366f1" : "#fff", color: on ? "#fff" : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: on ? 700 : 400 }}>{slot.lb} <span style={{ fontSize: 10, opacity: .75 }}>{slot.start}</span></button>; })}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={() => f.title && onSave(f)} style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 600 }}>⚡ 긴급 삽입</button>
        <button onClick={onClose} style={{ flex: 1, background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, padding: 10, cursor: "pointer" }}>취소</button>
      </div>
    </Modal>
  );
}

/* ── 메인 앱 ──────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState(() => loadS());
  const [tasks, setTasks] = useState(() => loadT());
  const [logs, setLogs] = useState(() => loadL());
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [editOccDate, setEditOccDate] = useState(null);
  const [scopeTask, setScopeTask] = useState(null);
  const [pomo, setPomo] = useState(() => { const cfg = loadS().pomo || DPOMO; return { running: false, mode: "focus", remaining: cfg.focus * 60, session: 0 }; });
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => saveT(tasks), [tasks]);
  useEffect(() => saveS(settings), [settings]);
  useEffect(() => saveL(logs), [logs]);

  const notify = (msg, kind) => { setToast({ msg, kind: kind || "info" }); setTimeout(() => setToast(null), 4000); };
  useEffect(() => { if ("Notification" in window) Notification.requestPermission(); }, []);
  const pushN = (t, b) => { try { if (Notification.permission === "granted") new Notification(t, { body: b }); } catch(e) {} };

  useEffect(() => {
    if (pomo.running) {
      timerRef.current = setInterval(() => {
        setPomo(t => {
          if (t.remaining <= 1) {
            clearInterval(timerRef.current);
            const c = settings.pomo || DPOMO;
            let nm, ns, nss;
            if (t.mode === "focus") { nss = t.session + 1; if (nss % c.sessionsBeforeLong === 0) { nm = "longBreak"; ns = c.longBreak * 60; pushN("🛋️ 긴 휴식!", "푹 쉬세요."); } else { nm = "shortBreak"; ns = c.shortBreak * 60; pushN("☕ 짧은 휴식", "스트레칭!"); } }
            else { nm = "focus"; ns = c.focus * 60; nss = t.session; pushN("🍅 집중!", "다시 시작!"); }
            return merge(t, { running: false, mode: nm, remaining: ns, session: nss });
          }
          return merge(t, { remaining: t.remaining - 1 });
        });
      }, 1000);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [pomo.running, settings.pomo]);

  const saveTask = task => {
    let next;
    if (task.id) { next = tasks.map(x => x.id === task.id ? task : x); }
    else { task.id = uid(); task.createdAt = Date.now(); task.done = false; task.cancelled = false; next = tasks.concat([task]); }
    setTasks(next); setShowForm(false); setEditTask(null);
    notify('"' + task.title + '" 저장됨', "success");
  };
  const forkOccurrence = (form, occDate) => {
    const orig = tasks.find(x => x.id === form.id);
    if (!orig) { saveTask(form); return; }
    const skip = safeArr(orig.skipDates).indexOf(occDate) >= 0 ? orig.skipDates : safeArr(orig.skipDates).concat([occDate]);
    const forked = merge(form, {
      id: uid(), createdAt: Date.now(), done: false, cancelled: false, compressed: false,
      repeat: "없음", repeatDays: [], skipDates: [], doneDates: [], actStarts: {}, actEnds: {},
      parentId: orig.id, occurrenceDate: occDate, dueDate: form.dueDate || occDate,
    });
    setTasks(tasks.map(x => x.id === orig.id ? merge(x, { skipDates: skip }) : x).concat([forked]));
    setShowForm(false); setEditTask(null); setEditOccDate(null);
    notify('"' + form.title + '" 이번 회차만 수정됨 (' + occDate + ')', "success");
  };
  const saveTaskForm = form => { if (editOccDate && form.id) forkOccurrence(form, editOccDate); else { saveTask(form); setEditOccDate(null); } };
  const startEdit = task => {
    if (task.repeat && task.repeat !== "없음") setScopeTask(task);
    else { setEditTask(task); setEditOccDate(null); setShowForm(true); }
  };
  const pickScope = scope => {
    setEditTask(scopeTask); setEditOccDate(scope === "occurrence" ? dstr(getNow()) : null);
    setShowForm(true); setScopeTask(null);
  };
  const doCancel = id => { const t = tasks.find(x => x.id === id); setTasks(tasks.map(x => x.id === id ? merge(x, { cancelled: true }) : x)); notify('"' + (t ? t.title : "") + '" 삭제됨', "info"); };
  const doComplete = id => {
    const t = tasks.find(x => x.id === id);
    const dk = dstr(getNow());
    const next = (t && t.repeat && t.repeat !== "없음")
      ? tasks.map(x => x.id === id ? merge(x, { doneDates: safeArr(x.doneDates).indexOf(dk) >= 0 ? x.doneDates : safeArr(x.doneDates).concat([dk]) }) : x)
      : tasks.map(x => x.id === id ? merge(x, { done: true }) : x);
    setTasks(next); notify("완료! 🎉", "success");
  };
  const doStart = (id, dk, time) => {
    setTasks(tasks.map(x => x.id === id ? merge(x, { actStarts: merge(x.actStarts || {}, { [dk]: time }) }) : x));
    notify("▶ 시작 기록: " + time, "info");
  };
  const doFinish = (id, dk, time) => {
    const t = tasks.find(x => x.id === id);
    const isRep = t && t.repeat && t.repeat !== "없음";
    setTasks(tasks.map(x => {
      if (x.id !== id) return x;
      const withEnd = merge(x, { actEnds: merge(x.actEnds || {}, { [dk]: time }) });
      return isRep ? merge(withEnd, { doneDates: safeArr(x.doneDates).indexOf(dk) >= 0 ? x.doneDates : safeArr(x.doneDates).concat([dk]) }) : merge(withEnd, { done: true });
    }));
    notify("완료! 🎉 (" + time + ")", "success");
  };
  const doToggle = id => {
    const t = tasks.find(x => x.id === id); if (!t) return;
    if (t.repeat && t.repeat !== "없음") {
      const dk = dstr(getNow()), has = safeArr(t.doneDates).indexOf(dk) >= 0;
      setTasks(tasks.map(x => x.id === id ? merge(x, { doneDates: has ? safeArr(x.doneDates).filter(d => d !== dk) : safeArr(x.doneDates).concat([dk]) }) : x));
    } else setTasks(tasks.map(x => x.id === id ? merge(x, { done: !x.done }) : x));
  };
  const addLog = (date, text, time) => setLogs(ls => ls.concat([{ id: uid(), date, time: time || fmt(getNow().getHours() * 60 + getNow().getMinutes()), text, createdAt: Date.now() }]));
  const delLog = id => setLogs(ls => ls.filter(l => l.id !== id));
  const doReschedule = (taskId, startM, dur) => {
    setTasks(tasks.map(t => t.id === taskId ? merge(t, dur != null ? { fixedTime: fmt(startM), duration: dur } : { fixedTime: fmt(startM) }) : t));
    notify("⏰ " + fmt(startM) + "로 시간 조정됨", "info");
  };
  const doUrgent = ut => {
    let needed = ut.duration;
    const next = tasks.map(t => { if (t.type === "flex" && !t.cancelled && !t.done && needed > 0) { const mn = t.flexMin || Math.floor(t.duration * 0.3), saved = t.duration - mn; if (saved > 0) { needed -= saved; return merge(t, { duration: mn, compressed: true }); } } return t; });
    ut.id = uid(); ut.createdAt = Date.now(); ut.done = false; ut.cancelled = false; ut.repeat = "없음";
    setTasks(next.concat([ut])); notify("긴급 삽입! ⚡", "warn");
  };

  const TC = { success: "#d1fae5", warn: "#fef3c7", info: "#dbeafe" };
  const BC = { success: "#10b981", warn: "#f59e0b", info: "#3b82f6" };

  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", background: "#f8fafc", minHeight: "100vh", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: 19, fontWeight: 700 }}>🗓️ 스마트 플래너 <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, background: "rgba(255,255,255,.2)", borderRadius: 6, padding: "2px 7px" }}>v1.3.1</span></div><div style={{ fontSize: 12, opacity: .8 }}>사명 기반 스마트 스케줄러</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => { if (window.confirm("예제 데이터로 초기화할까요?")) { setTasks(STASKS); setSettings(SSETS); } }} style={{ background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.35)", borderRadius: 8, padding: "5px 10px", color: "#fff", cursor: "pointer", fontSize: 11 }}>🔄 예제 초기화</button>
          <PomoWidget pomo={pomo} setPomo={setPomo} cfg={settings.pomo || DPOMO} />
        </div>
      </div>
      {toast && <div style={{ background: TC[toast.kind], borderLeft: "4px solid " + BC[toast.kind], padding: "10px 16px", fontSize: 13, fontWeight: 500 }}>{toast.msg}</div>}
      <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #e2e8f0" }}>
        {TABS.map((t, i) => <button key={i} onClick={() => setTab(i)} style={{ flex: 1, padding: "11px 4px", border: "none", background: "none", fontWeight: tab === i ? 700 : 400, color: tab === i ? "#6366f1" : "#64748b", borderBottom: tab === i ? "3px solid #6366f1" : "3px solid transparent", cursor: "pointer", fontSize: 13 }}>{t}</button>)}
      </div>
      <div style={{ padding: 14 }}>
        {tab === 0 && <ScheduleTab tasks={tasks} settings={settings} onStart={doStart} onFinish={doFinish} onCancel={doCancel} onToggle={doToggle} onReschedule={doReschedule} logs={logs} onAddLog={addLog} onDeleteLog={delLog} />}
        {tab === 1 && <TaskTab tasks={tasks} settings={settings} onAdd={() => { setEditTask(null); setEditOccDate(null); setShowForm(true); }} onEdit={startEdit} onComplete={doComplete} onCancel={doCancel} onUrgent={doUrgent} onToggle={doToggle} />}
        {tab === 2 && <AnalysisTab tasks={tasks} settings={settings} />}
        {tab === 3 && <SettingsTab settings={settings} onChange={setSettings} />}
      </div>
      {showForm && <TaskForm task={editTask} settings={settings} occurrenceDate={editOccDate} onSave={saveTaskForm} onClose={() => { setShowForm(false); setEditTask(null); setEditOccDate(null); }} />}
      {scopeTask && <ScopeChoice task={scopeTask} onPick={pickScope} onClose={() => setScopeTask(null)} />}
    </div>
  );
}
