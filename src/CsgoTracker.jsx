import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  loadFromRTDB,
  subscribeToRTDB,
  saveToRTDB,
  deleteFromRTDB,
  signInWithGoogle,
  signOut,
  onAuthReady,
  addPlayerToRTDB,
  claimPlayerToRTDB,
  getStorageProviderName,
} from './rtdbStorage';
import { getGeminiCoachingTip, isGeminiConfigured } from './geminiUtils';

// ═══════════════════════════════════════════════════════════════
//  CS:GO RANKED TRACKER — COMPETITIVE FITNESS SCOREBOARD
// ═══════════════════════════════════════════════════════════════

const ACTIVITIES = [
  { id:"steps",    label:"STEPS",     unit:"steps",    target:10000, weekTarget:70000 },
  { id:"workouts", label:"WORKOUTS", unit:"sessions", target:1,     weekTarget:5 },
  { id:"sleep",    label:"SLEEP",     unit:"hours",    target:8,     weekTarget:56 },
  { id:"hydration",label:"WATER",     unit:"liters",   target:3,     weekTarget:21 },
  { id:"streak",   label:"STREAK",    unit:"days",     target:1,     weekTarget:7 },
];

const RANKS = [
  { name:"SILVER I",        abbr:"S1",  color:"#8c8c8c", min:0 },
  { name:"SILVER II",       abbr:"S2",  color:"#9a9a9a", min:10 },
  { name:"SILVER III",      abbr:"S3",  color:"#a8a8a8", min:20 },
  { name:"SILVER IV",       abbr:"S4",  color:"#b0b0b0", min:30 },
  { name:"SILVER ELITE",    abbr:"SE",  color:"#c0c0c0", min:40 },
  { name:"SILVER ELITE M",  abbr:"SEM", color:"#d0c8a0", min:50 },
  { name:"GOLD NOVA I",     abbr:"GN1", color:"#d4a843", min:55 },
  { name:"GOLD NOVA II",     abbr:"GN2", color:"#dab34e", min:60 },
  { name:"GOLD NOVA III",    abbr:"GN3", color:"#e0be59", min:65 },
  { name:"GOLD NOVA MASTER",abbr:"GNM", color:"#e6c964", min:70 },
  { name:"MASTER GUARDIAN",  abbr:"MG1", color:"#6eb8e0", min:75 },
  { name:"MASTER GUARDIAN II",abbr:"MG2",color:"#7ec4e8", min:80 },
  { name:"MG ELITE",        abbr:"MGE", color:"#5aadd4", min:85 },
  { name:"DMG",             abbr:"DMG", color:"#d4a030", min:88 },
  { name:"LEGENDARY EAGLE", abbr:"LE",  color:"#c8a848", min:91 },
  { name:"LEGENDARY EAGLE M",abbr:"LEM",color:"#d4b450", min:94 },
  { name:"SUPREME",         abbr:"SMFC",color:"#e8c85c", min:97 },
  { name:"GLOBAL ELITE",    abbr:"GE",  color:"#ffd700", min:99 },
];

// Warroom style (default) — military command centre / Bloomberg Terminal / RTS UI
// Matte black, phosphor green, amber warnings, ice blue secondary, red threats
const WARROOM = {
  bg:"#0D0D0D", bgLight:"#151515", bgLighter:"#1a1a1a",
  panel:"#0f0f0f", panelBorder:"#00FF4130", panelGlow:"#00FF4115",
  ctBlue:"#00FF41", ctBlueDim:"#00FF4160", ctBlueBg:"#00FF4108",  // phosphor green primary
  tGold:"#FFB000", tGoldDim:"#FFB00040", tGoldBg:"#FFB00008",      // amber
  orange:"#FFB000", orangeDim:"#FFB00040",                         // amber warnings
  red:"#FF6B6B", redDim:"#FF6B6B40", redBg:"#FF6B6B12",           // threats/declining
  green:"#00FF41", greenDim:"#00FF4140", greenBg:"#00FF4108",     // phosphor green
  iceBlue:"#00D4FF", iceBlueDim:"#00D4FF60",                      // secondary data
  textPrimary:"#00FF41", textSecondary:"#00D4FF", textMuted:"#00FF4150",
  white:"#ffffff",
  metalTexture:false, scanlines:true,
  fontFamily:"'JetBrains Mono','IBM Plex Mono',Courier,monospace",
  numberGlow:"0 0 8px rgba(0,255,65,0.5), 0 0 16px rgba(0,255,65,0.2)",
  letterSpacing:"0.15em",
};

// CSGO style — gaming dark theme
const CSGO = {
  bg:"#1B1B1E", bgLight:"#242429", bgLighter:"#2d2d33",
  panel:"#1e2025", panelBorder:"#3a3a42", panelGlow:"#4a4a55",
  ctBlue:"#A2C4E0", ctBlueDim:"#5a7a90", ctBlueBg:"#1a2a38",
  tGold:"#D4A843", tGoldDim:"#8a7030", tGoldBg:"#2a2418",
  orange:"#DE9B35", orangeDim:"#8a6020",
  red:"#C93A3A", redDim:"#6a2020", redBg:"#2a1515",
  green:"#5CB85C", greenDim:"#2a5a2a", greenBg:"#152a15",
  iceBlue:"#A2C4E0", iceBlueDim:"#5a7a90",
  textPrimary:"#e8e8ec", textSecondary:"#9a9aa0", textMuted:"#5a5a62",
  white:"#ffffff",
  metalTexture:true, scanlines:true,
  fontFamily:"'Rajdhani','Share Tech Mono',sans-serif",
  numberGlow:"none", letterSpacing:"0.05em",
};

const toDateStr=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const getWeekDates=(off=0)=>{const n=new Date(),dy=n.getDay(),m=new Date(n);m.setDate(n.getDate()-((dy===0?7:dy)-1)+off*7);return Array.from({length:7},(_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i);return toDateStr(d);});};
const sk=(d,p,a)=>`${d}::${p}::${a}`;
const DAY_LABELS=["MON","TUE","WED","THU","FRI","SAT","SUN"];
const WEEKLY_WINNER_METRICS = [
  { id: "weight", label: "WEIGHT", candidateIds: ["weight", "steps"] },
  { id: "exerciseQuantity", label: "EXERCISE QUANTITY", candidateIds: ["exerciseQuantity", "exercise", "workouts"] },
];

function parseScoreKey(scoreKey) {
  const parts = String(scoreKey || "").split("::");
  if (parts.length !== 3) return null;
  const [date, person, activityId] = parts;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !person || !activityId) return null;
  return { date, person, activityId };
}

function getWeekStartFromDateStr(dateStr) {
  const [y, m, d] = String(dateStr || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return toDateStr(date);
}

function formatWeekRangeLabel(weekStartStr) {
  const [y, m, d] = String(weekStartStr || "").split("-").map(Number);
  if (!y || !m || !d) return weekStartStr;
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  const now = new Date();
  const includeYear = start.getFullYear() !== now.getFullYear() || end.getFullYear() !== now.getFullYear();
  const dateOpts = includeYear ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", dateOpts)} - ${end.toLocaleDateString("en-US", dateOpts)}`;
}

// Activity-specific max bounds (security: reject absurd values)
const SCORE_BOUNDS = { steps: 200000, workouts: 100, sleep: 24, hydration: 30, streak: 7 };
const OPERATIVE_NAME_REGEX = /^[A-Za-z0-9]+$/;
// Firebase RTDB invalid key chars: / . $ # [ ] — reject in operative names
const FIREBASE_KEY_SAFE_REGEX = /^[^/$.\[\]#]+$/;

/** Sanitise operative name for Firebase key safety. Returns null if invalid. */
function sanitiseOperativeName(name) {
  const trimmed = String(name || "").trim().toUpperCase();
  if (!trimmed || trimmed.length > 12) return null;
  if (!OPERATIVE_NAME_REGEX.test(trimmed)) return null;
  if (!FIREBASE_KEY_SAFE_REGEX.test(trimmed)) return null;
  return trimmed;
}

/** Parse and validate score input. Returns valid number or null. */
function parseAndValidateScore(raw, activityId) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const num = parseFloat(s);
  if (!Number.isFinite(num) || num < 0 || num !== num) return null;
  const max = SCORE_BOUNDS[activityId] ?? 200000;
  if (num > max) return null;
  return num;
}

function useWindowWidth(){const[w,s]=useState(window.innerWidth);useEffect(()=>{const h=()=>s(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return w;}

// ─── AUDIO ───
const actx={current:null};
function initAudio(){if(!actx.current)actx.current=new(window.AudioContext||window.webkitAudioContext)();}
function playClick(){try{initAudio();const c=actx.current,o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=600;o.type="square";g.gain.setValueAtTime(0.04,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.03);o.start(c.currentTime);o.stop(c.currentTime+0.03);}catch(e){}}
function playHeadshot(){try{initAudio();const c=actx.current;[1200,800,1600].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=f;o.type=i===2?"sawtooth":"square";g.gain.setValueAtTime(0.06,c.currentTime+i*0.05);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+i*0.05+0.08);o.start(c.currentTime+i*0.05);o.stop(c.currentTime+i*0.05+0.08);});}catch(e){}}
function playBombTick(){try{initAudio();const c=actx.current,o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;o.type="sine";g.gain.setValueAtTime(0.05,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.06);o.start(c.currentTime);o.stop(c.currentTime+0.06);}catch(e){}}

// ─── RANK BADGE ───
function RankBadge({score,size=32,C}){
  const rank=RANKS.slice().reverse().find(r=>score>=r.min)||RANKS[0];
  const isElite=score>=99;const isLegendary=score>=91;
  return(
    <div style={{
      width:size,height:size,borderRadius:2,position:"relative",
      background:isElite?`linear-gradient(135deg,#ffd700,#b8860b,#ffd700)`
        :isLegendary?`linear-gradient(135deg,${rank.color}40,${rank.color}20)`
        :`linear-gradient(135deg,${rank.color}30,${rank.color}15)`,
      border:`1px solid ${rank.color}${isElite?"aa":"55"}`,
      display:"flex",alignItems:"center",justifyContent:"center",
      boxShadow:isElite?`0 0 12px ${rank.color}50,inset 0 0 8px ${rank.color}30`
        :`inset 0 1px 0 ${rank.color}20,0 1px 3px #00000040`,
      flexShrink:0,
    }}>
      <span style={{
        fontSize:size*0.32,fontWeight:800,color:isElite?"#1B1B1E":rank.color,
        letterSpacing:0.5,textShadow:isElite?"none":`0 0 4px ${rank.color}40`,
        lineHeight:1,
      }}>{rank.abbr}</span>
      {isElite&&<div style={{position:"absolute",inset:0,borderRadius:2,
        background:"linear-gradient(135deg,transparent 30%,#ffffff30 50%,transparent 70%)",
        animation:"sheen 3s ease-in-out infinite",
      }}/>}
    </div>
  );
}

// ─── ROUND HISTORY BAR ───
function RoundHistoryBar({person,scores:sc,weekDates,today,C}){
  return(
    <div style={{display:"flex",gap:2,alignItems:"center"}}>
      {weekDates.map((d,i)=>{
        const isPast=d<=today;
        const dayTotal=ACTIVITIES.reduce((s,a)=>{const v=sc[sk(d,person,a.id)];return s+(v?Math.min(100,Math.round(v/a.target*100)):0);},0);
        const avg=isPast?dayTotal/ACTIVITIES.length:0;
        const isWin=avg>=60;const isToday=d===today;
        return(
          <div key={d} style={{
            width:14,height:14,borderRadius:1,fontSize:7,fontWeight:700,
            display:"flex",alignItems:"center",justifyContent:"center",
            background:!isPast?C.bgLight:isWin?C.greenDim:avg>0?C.redDim:C.bgLight,
            color:!isPast?C.textMuted:isWin?C.green:avg>0?C.red:C.textMuted,
            border:isToday?`1px solid ${C.ctBlue}`:`1px solid transparent`,
            transition:"all 0.2s",
          }}>{isPast&&avg>0?(isWin?"W":"L"):DAY_LABELS[i][0]}</div>
        );
      })}
    </div>
  );
}

// ═══ MAIN APP ═══
export default function App(){
  const[players,setPlayers]=useState([]);
  const[scores,setScores]=useState({});
  const[userBindings,setUserBindings]=useState({});
  const[activeUser,setActiveUser]=useState(null);
  const[loaded,setLoaded]=useState(false);
  const[newName,setNewName]=useState("");
  const[view,setView]=useState("scoreboard");
  const[editCell,setEditCell]=useState(null);
  const[editVal,setEditVal]=useState("");
  const[killfeed,setKillfeed]=useState([]);
  const[showMVP,setShowMVP]=useState(false);
  const[mvpAnim,setMvpAnim]=useState(0);
  const killfeedTimer=useRef(null);
  const[theme,setTheme]=useState("warroom"); // "warroom" (default) | "csgo"
  const[isAdminLoggedIn,setIsAdminLoggedIn]=useState(()=>{
    if(!import.meta.env.VITE_ADMIN_PASSWORD)return false;
    return sessionStorage.getItem("fitness-admin")==="1";
  });
  const[adminPassword,setAdminPassword]=useState("");
  const[adminError,setAdminError]=useState("");
  const[authUser,setAuthUser]=useState(null);
  const[signInError,setSignInError]=useState("");
  const[geminiTip,setGeminiTip]=useState("");
  const[geminiError,setGeminiError]=useState("");
  const[geminiLoading,setGeminiLoading]=useState(false);

  const C=theme==="warroom"?WARROOM:CSGO;
  const adminEnabled=!!import.meta.env.VITE_ADMIN_PASSWORD;
  const storageProviderName=getStorageProviderName();
  const geminiReady=isGeminiConfigured();
  const width=useWindowWidth();
  const isMobile=width<640;
  const today=toDateStr(new Date());
  const weekDates=getWeekDates(0);
  const dayOfWeek=new Date().getDay();
  const daysLeft=dayOfWeek===0?0:7-dayOfWeek;
  const authUserId=authUser?.uid||authUser?.id||null;
  const boundPlayer=authUserId?(userBindings[authUserId]||null):null;
  const claimedByPlayer=useMemo(()=>{
    const claimed={};
    Object.entries(userBindings).forEach(([uid,name])=>{
      if(typeof name==="string"&&name)claimed[name]=uid;
    });
    return claimed;
  },[userBindings]);

  // ─── Auth state ───
  useEffect(() => {
    return onAuthReady((user) => {
      setAuthUser(user);
      if (!user) {
        setLoaded(false);
        setPlayers([]);
        setScores({});
        setUserBindings({});
        setActiveUser(null);
        setGeminiTip("");
        setGeminiError("");
      }
    });
  }, []);

  // ─── Persistence (Firebase RTDB) — only when signed in ───
  useEffect(()=>{
    if (!authUser) return;
    let unsub;
    (async()=>{
      try {
        const data = await loadFromRTDB();
        setPlayers(data.players || []);
        setScores(data.scores || {});
        setUserBindings(data.userBindings || {});
        unsub = subscribeToRTDB((data) => {
          setPlayers(data.players || []);
          setScores(data.scores || {});
          setUserBindings(data.userBindings || {});
        });
      } catch (e) {
        console.error('RTDB load error:', e);
      }
      try {
        const tr = await window.storage.get("csgo-tracker-style-v1");
        if (tr?.value && (tr.value === "warroom" || tr.value === "csgo")) setTheme(tr.value);
      } catch (e) {}
      setLoaded(true);
    })();
    return () => { if (unsub) unsub(); };
  }, [authUser]);
  useEffect(()=>{
    if(!boundPlayer)return;
    if(activeUser!==boundPlayer)setActiveUser(boundPlayer);
  },[boundPlayer,activeUser]);
  useEffect(()=>{
    setGeminiTip("");
    setGeminiError("");
  },[activeUser]);
  const save = useCallback(async (p, s, bindings) => {
    try { await saveToRTDB(p, s, bindings); } catch (e) { console.error('RTDB save error:', e); }
  }, []);
  const saveTheme=useCallback(async(t)=>{try{await window.storage.set("csgo-tracker-style-v1",t);}catch(e){}},[]);

  // ─── Computations ───
  const getWeekTotal=useCallback((p,aId)=>weekDates.reduce((s,d)=>s+(scores[sk(d,p,aId)]||0),0),[weekDates,scores]);
  const getPct=useCallback((p,a)=>Math.min(100,Math.round(getWeekTotal(p,a.id)/a.weekTarget*100)),[getWeekTotal]);
  const getDayVal=useCallback((d,p,aId)=>scores[sk(d,p,aId)]||0,[scores]);
  const overallPct=useCallback(p=>Math.round(ACTIVITIES.reduce((s,a)=>s+getPct(p,a),0)/ACTIVITIES.length),[getPct]);

  const rankings=useMemo(()=>[...players].sort((a,b)=>overallPct(b)-overallPct(a)),[players,overallPct]);
  const mvpPlayer=rankings[0];
  const mvpStat=useMemo(()=>{
    if(!mvpPlayer)return null;
    let best=null;
    ACTIVITIES.forEach(a=>{const pct=getPct(mvpPlayer,a);if(!best||pct>best.pct)best={act:a,pct,total:getWeekTotal(mvpPlayer,a.id)};});
    return best;
  },[mvpPlayer,getPct,getWeekTotal]);
  const weeklyWinnerHistory=useMemo(()=>{
    const weekMap = new Map();

    Object.entries(scores).forEach(([scoreKey, rawValue]) => {
      const parsed = parseScoreKey(scoreKey);
      if (!parsed) return;
      const value = Number(rawValue);
      if (!Number.isFinite(value) || value <= 0) return;

      const weekStart = getWeekStartFromDateStr(parsed.date);
      if (!weekStart) return;

      if (!weekMap.has(weekStart)) {
        weekMap.set(weekStart, {
          metricTotals: new Map(),
          metricSourceTotals: new Map(),
        });
      }

      const weekData = weekMap.get(weekStart);
      WEEKLY_WINNER_METRICS.forEach((metric) => {
        if (!metric.candidateIds.includes(parsed.activityId)) return;

        if (!weekData.metricTotals.has(metric.id)) {
          weekData.metricTotals.set(metric.id, new Map());
        }
        const totalsByPlayer = weekData.metricTotals.get(metric.id);
        totalsByPlayer.set(parsed.person, (totalsByPlayer.get(parsed.person) || 0) + value);

        if (!weekData.metricSourceTotals.has(metric.id)) {
          weekData.metricSourceTotals.set(metric.id, new Map());
        }
        const sourceTotals = weekData.metricSourceTotals.get(metric.id);
        sourceTotals.set(parsed.activityId, (sourceTotals.get(parsed.activityId) || 0) + value);
      });
    });

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekStart, weekData]) => {
        const metrics = WEEKLY_WINNER_METRICS.map((metric) => {
          const totalsByPlayer = weekData.metricTotals.get(metric.id) || new Map();
          const topValue = Array.from(totalsByPlayer.values()).reduce((max, val) => Math.max(max, val), 0);
          const winners = topValue > 0
            ? Array.from(totalsByPlayer.entries())
                .filter(([, val]) => val === topValue)
                .map(([person]) => person)
                .sort((a, b) => a.localeCompare(b))
            : [];
          const sourceTotals = weekData.metricSourceTotals.get(metric.id) || new Map();
          const sourceId = metric.candidateIds.find((candidateId) => sourceTotals.has(candidateId)) || null;

          return { ...metric, winners, topValue, sourceId };
        });

        return {
          weekStart,
          weekLabel: formatWeekRangeLabel(weekStart),
          metrics,
        };
      });
  },[scores]);

  // Kill feed generator
  const generateKillfeed=useCallback(()=>{
    const feeds=[];
    ACTIVITIES.forEach(a=>{
      const sorted=[...players].sort((x,y)=>getWeekTotal(y,a.id)-getWeekTotal(x,a.id));
      if(sorted.length>=2){
        const top=sorted[0],second=sorted[1];
        const topVal=getWeekTotal(top,a.id),secVal=getWeekTotal(second,a.id);
        if(topVal>0&&topVal>secVal){
          feeds.push({killer:top,victim:second,weapon:a.label,diff:topVal-secVal});
        }
      }
    });
    return feeds.slice(0,5);
  },[players,getWeekTotal]);

  useEffect(()=>{if(loaded&&players.length>=2)setKillfeed(generateKillfeed());},[loaded,players,scores,generateKillfeed]);

  // ─── Mutations ───
  const addPlayer=async()=>{
    const n=sanitiseOperativeName(newName);
    if(!n)return;
    if(!players.includes(n)&&players.length>=10)return;
    try {
      if(players.includes(n)){
        await claimPlayerToRTDB(n);
        setActiveUser(n);
      }else{
        await addPlayerToRTDB(n);
      }
      setNewName("");
      playClick();
    } catch (e) {
      console.error('Add player error:', e);
      alert(e?.message||'Unable to add or claim that profile');
    }
  };
  const claimExistingPlayer=async(name)=>{
    try{
      await claimPlayerToRTDB(name);
      setActiveUser(name);
      playClick();
    }catch(e){
      console.error('Claim player error:',e);
      alert(e?.message||'Unable to claim this profile');
    }
  };
  const deletePlayer=(p)=>{
    if(!confirm(`Remove player "${p}"? Their data will be lost.`))return;
    const np=players.filter(x=>x!==p);
    const ns={};Object.keys(scores).forEach(k=>{const[,person]=k.split("::");if(person!==p)ns[k]=scores[k];});
    const nb={...userBindings};Object.keys(nb).forEach(uid=>{if(nb[uid]===p)delete nb[uid];});
    setPlayers(np);setScores(ns);setUserBindings(nb);save(np,ns,nb);
    if(activeUser===p)setActiveUser(null);
    playClick();
  };
  const setThemeAndSave=(t)=>{setTheme(t);saveTheme(t);playClick();};
  const adminLogin=()=>{
    const expected=import.meta.env.VITE_ADMIN_PASSWORD;
    if(expected&&adminPassword===expected){
      setIsAdminLoggedIn(true);setAdminPassword("");setAdminError("");
      sessionStorage.setItem("fitness-admin","1");playClick();
    }else{setAdminError("Invalid password");setAdminPassword("");}
  };
  const adminLogout=()=>{setIsAdminLoggedIn(false);sessionStorage.removeItem("fitness-admin");playClick();};
  const shareApp=async()=>{
    const url=window.location.origin+window.location.pathname;
    const text=theme==="warroom"
      ?"Join our fitness ops! Track weekly steps, workouts, sleep & hydration. Who will dominate? 👇"
      :"Join our fitness competition! Track weekly steps, workouts, sleep & hydration with me 👇";
    try{
      if(navigator.share){
        await navigator.share({title:"Fitness Competition Tracker",text,url});
        playClick();
      }else{
        await navigator.clipboard.writeText(`${text}\n${url}`);
        alert("Link copied! Paste in WhatsApp to share.");
        playClick();
      }
    }catch(e){if(e.name!=="AbortError"){navigator.clipboard?.writeText(`${text}\n${url}`).then(()=>alert("Link copied! Paste in WhatsApp to share."));}}
  };
  const startEdit=(d,p,aId)=>{
    if(p!==activeUser)return;playClick();
    const k=sk(d,p,aId);setEditCell(k);setEditVal(scores[k]?.toString()||"");
  };
  const saveEdit=(d,p,aId)=>{
    const v=parseAndValidateScore(editVal,aId),ns={...scores};
    const k=sk(d,p,aId),oldVal=ns[k]||0;
    if(v!==null)ns[k]=v;else delete ns[k];
    setScores(ns);save(players,ns,userBindings);setEditCell(null);setEditVal("");
    // Check for personal best → headshot sound
    const act=ACTIVITIES.find(a=>a.id===aId);
    if(act&&v>oldVal){
      const weekT=weekDates.reduce((s,dd)=>s+(dd===d?v:(ns[sk(dd,p,aId)]||0)),0);
      if(weekT>=act.weekTarget)playHeadshot();else playClick();
    }
  };
  const askGeminiCoach=async()=>{
    if(!activeUser)return;
    setGeminiLoading(true);setGeminiError("");
    try{
      const activityLines=ACTIVITIES.map((a)=>{
        const total=getWeekTotal(activeUser,a.id);
        const pct=getPct(activeUser,a);
        return `- ${a.label}: ${total}/${a.weekTarget} (${pct}%)`;
      });
      const leaderboardLines=rankings.map((p,i)=>`${i+1}. ${p}: ${overallPct(p)}%`);
      const tip=await getGeminiCoachingTip({
        playerName:activeUser,
        weekRange:`${weekDates[0]} to ${weekDates[6]}`,
        activityLines,
        leaderboardLines,
      });
      setGeminiTip(tip);
      playClick();
    }catch(e){
      setGeminiError(e?.message||'Gemini request failed');
    }finally{
      setGeminiLoading(false);
    }
  };
  const resetAll=async()=>{
    if(!confirm("⚠ RESET ALL DATA? Cannot be undone."))return;
    if(!confirm("This will permanently delete all players and scores. Confirm again?"))return;
    setPlayers([]);setScores({});setUserBindings({});setActiveUser(null);
    try { await deleteFromRTDB(); } catch (e) { console.error('RTDB delete error:', e); }
  };

  // MVP animation
  const triggerMVP=()=>{
    setShowMVP(true);setMvpAnim(0);playHeadshot();
    let step=0;
    const iv=setInterval(()=>{step++;setMvpAnim(step);if(step>=4){clearInterval(iv);}},400);
    setTimeout(()=>setShowMVP(false),4000);
  };

  // ─── Styles ───
  const panelStyle={
    background:`linear-gradient(180deg,${C.panel} 0%,${C.bgLight} 100%)`,
    border:`1px solid ${C.panelBorder}`,
    borderRadius:theme==="warroom"?2:3,
    boxShadow:theme==="warroom"?`0 0 0 1px ${C.panelBorder}`:`inset 0 1px 0 ${C.panelGlow}30, 0 2px 8px #00000060`,
    overflow:"hidden",marginBottom:isMobile?10:12,
  };
  const panelHead={
    padding:isMobile?"8px 12px":"8px 16px",
    background:`linear-gradient(180deg,${C.bgLight} 0%,${C.panel} 100%)`,
    borderBottom:`1px solid ${C.panelBorder}`,
    display:"flex",alignItems:"center",justifyContent:"space-between",
  };
  const headText={fontSize:10,fontWeight:700,letterSpacing:2,color:C.textSecondary,textTransform:"uppercase"};
  const btnStyle=(active,color=C.ctBlue)=>({
    background:active?`${color}20`:C.bgLight,
    border:`1px solid ${active?color+"60":C.panelBorder}`,
    borderRadius:2,padding:"7px 14px",
    color:active?color:C.textSecondary,
    fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",
    minHeight:34,transition:"all 0.15s",cursor:"pointer",
  });
  const telemetryStyle=C.numberGlow!=="none"?{textShadow:C.numberGlow}:{};

  // ═══ CSS ═══
  const css=`
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');
    @keyframes sheen{0%,100%{background-position:-200% 0}50%{background-position:200% 0}}
    @keyframes slideInRight{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes scaleIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes mvpGlow{0%,100%{box-shadow:0 0 30px #D4A84340}50%{box-shadow:0 0 60px #D4A84380}}
    @keyframes pulseOrange{0%,100%{color:#DE9B35}50%{color:#DE9B35cc}}
    @keyframes bombTick{0%,49%{opacity:1}50%,100%{opacity:0.5}}
    @keyframes barFill{from{width:0}to{width:var(--fill)}}
    @keyframes sonarPing{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.5)}}
    *{box-sizing:border-box;margin:0;padding:0}
    html,body,#root{min-height:100dvh}
    html{overflow-x:hidden}
    body{
      padding-left:env(safe-area-inset-left);
      padding-right:env(safe-area-inset-right);
      padding-bottom:env(safe-area-inset-bottom);
      padding-top:env(safe-area-inset-top);
      background:${C.bg};color:${C.textPrimary};
      font-family:${C.fontFamily};
      -webkit-font-smoothing:antialiased;
      letter-spacing:${C.letterSpacing};
    }
    button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
    @media (max-width:640px){button{min-height:44px}}
    input{font-family:inherit;-webkit-tap-highlight-color:transparent}
    input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
    input[type=number]{-moz-appearance:textfield}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:${C.bg}}
    ::-webkit-scrollbar-thumb{background:${C.panelBorder};border-radius:2px}
  `;

  // ─── Overlays ───
  const metalTexture={
    position:"fixed",inset:0,pointerEvents:"none",zIndex:9998,opacity:0.03,
    backgroundImage:`url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
  };
  const scanlineOverlay=theme==="warroom"?{
    position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,opacity:0.04,
    background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 3px)",
  }:{
    position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,
    background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 4px)",
  };

  // ═══ SIGN-IN SCREEN (auth gate) ═══
  if(!authUser)return(
    <><style>{css}</style>{C.metalTexture&&<div style={metalTexture}/>}{C.scanlines&&<div style={scanlineOverlay}/>}
    <div style={{minHeight:"100dvh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:isMobile?24:32,fontWeight:700,letterSpacing:3,color:C.textPrimary,lineHeight:1}}>
          {theme==="warroom"?"FITNESS OPS":"FITNESS COMPETITION"}
        </div>
        <div style={{fontSize:12,letterSpacing:2,color:C.textMuted,marginTop:8}}>
          Sign in to join the competition
        </div>
        <div style={{fontSize:9,letterSpacing:1,color:C.textMuted,marginTop:6}}>
          Backend: {storageProviderName.toUpperCase()}
        </div>
      </div>
      <button onClick={async()=>{setSignInError("");try{await signInWithGoogle();}catch(e){setSignInError(e?.message||"Sign-in failed");}}}
        style={{
          display:"flex",alignItems:"center",gap:12,padding:"14px 28px",
          background:"#fff",color:"#333",border:"1px solid #ddd",borderRadius:4,
          fontSize:16,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.15)",
        }}>
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Sign in with Google
      </button>
      {signInError&&<div style={{marginTop:16,fontSize:12,color:C.red}}>{signInError}</div>}
    </div></>
  );

  if(!loaded)return(<><style>{css}</style>{C.metalTexture&&<div style={metalTexture}/>}<div style={{minHeight:"100dvh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:14,letterSpacing:3,color:C.textSecondary,fontWeight:600}}>CONNECTING TO SERVER...</div></div></>);

  // ═══ SETUP SCREEN ═══
  if(players.length<2)return(
    <><style>{css}</style>{C.metalTexture&&<div style={metalTexture}/>}{C.scanlines&&<div style={scanlineOverlay}/>}
    <div style={{minHeight:"100dvh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",width:"100%"}}>
        <div style={{...panelStyle,maxWidth:420,width:"100%",marginBottom:0}}>
          <div style={panelHead}>
            <span style={headText}>{theme==="warroom"?"RECRUITMENT":"MATCHMAKING"}</span>
            <span style={{fontSize:9,color:C.textMuted,letterSpacing:1}}>{players.length}/2+ {theme==="warroom"?"ASSETS":"PLAYERS"}</span>
          </div>
          <div style={{padding:isMobile?16:20}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:isMobile?28:36,fontWeight:700,letterSpacing:3,color:C.textPrimary,lineHeight:1}}>
                {theme==="warroom"?"OPERATIONS":"COMPETITIVE"}
              </div>
              <div style={{fontSize:12,letterSpacing:4,color:C.orange,fontWeight:600,marginTop:4}}>
                {theme==="warroom"?"WEEKLY INTELLIGENCE":"RANKED MATCH"}
              </div>
            </div>

            {players.length>0&&(
              <div style={{padding:"8px 12px",background:C.ctBlueBg,border:`1px solid ${C.ctBlue}30`,borderRadius:2,marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
                <RankBadge score={0} size={28} C={C}/>
                <span style={{fontSize:14,fontWeight:700,letterSpacing:2,color:C.ctBlue}}>{players[0]}</span>
                <span style={{fontSize:9,color:C.textMuted,marginLeft:"auto",letterSpacing:1}}>READY</span>
              </div>
            )}

            <div style={{display:"flex",gap:8}}>
              <input autoFocus value={newName} onChange={e=>setNewName(e.target.value.replace(/[^A-Za-z0-9]/gi,"").toUpperCase().slice(0,12))}
                onKeyDown={e=>{if(e.key==="Enter")addPlayer();}}
                placeholder={theme==="warroom"?"ENTER CODENAME":"ENTER ALIAS"} maxLength={12}
                style={{
                  flex:1,background:C.bgLight,border:`1px solid ${C.panelBorder}`,borderRadius:2,
                  color:C.textPrimary,fontSize:15,fontWeight:600,padding:"12px 14px",
                  letterSpacing:2,textTransform:"uppercase",outline:"none",
                }}/>
              <button onClick={addPlayer} style={{
                background:`linear-gradient(180deg,${C.orange},#c08020)`,border:"none",borderRadius:2,
                padding:"12px 18px",color:"#1B1B1E",fontWeight:800,fontSize:12,letterSpacing:2,
                minHeight:46,minWidth:44,boxShadow:`0 2px 8px ${C.orange}40`,
              }}>{players.length===0?"NEXT ▸":"ACCEPT"}</button>
            </div>
            <button onClick={shareApp} style={{
              width:"100%",marginTop:12,padding:"12px 16px",minHeight:44,
              background:C.bgLight,border:`1px solid ${C.ctBlue}60`,borderRadius:2,
              color:C.ctBlue,fontSize:12,fontWeight:700,letterSpacing:2,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              cursor:"pointer",
            }}>
              <span>📤</span> {theme==="warroom"?"SHARE VIA WHATSAPP":"SHARE WITH FRIEND"}
            </button>
            <div style={{fontSize:10,color:C.textMuted,letterSpacing:1,marginTop:10,textAlign:"center"}}>
              Each person signs in and adds themselves. You'll log your own scores.
            </div>
            <div style={{fontSize:9,color:C.textMuted,letterSpacing:1,marginTop:4,textAlign:"center"}}>
              {theme==="warroom"?"MIN 2 OPERATIVES TO INITIATE":"MIN 2 PLAYERS TO START MATCH"}
            </div>
            <button onClick={async()=>{try{await signOut();}catch(e){}}} style={{
              marginTop:16,background:"none",border:"none",color:C.textMuted,fontSize:9,letterSpacing:1,cursor:"pointer",textDecoration:"underline",
            }}>Sign out</button>
          </div>
        </div>
      </div>

      {/* Administrator bar — bottom row (only when VITE_ADMIN_PASSWORD is set) */}
      {adminEnabled&&(
      <div style={{
        width:"100%",maxWidth:420,marginTop:"auto",
        display:"flex",flexDirection:"column",gap:10,
        borderTop:`1px solid ${C.panelBorder}`,paddingTop:16,
      }}>
        <div style={{fontSize:9,color:C.textMuted,letterSpacing:2,fontWeight:700}}>ADMINISTRATOR</div>
        {isAdminLoggedIn?(
          <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
            {players.map(p=>(
              <div key={p} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:C.bgLight,borderRadius:2,border:`1px solid ${C.panelBorder}`}}>
                <span style={{fontSize:11,fontWeight:600,color:C.textPrimary}}>{p}</span>
                <button onClick={()=>deletePlayer(p)} style={{
                  background:C.redDim,border:`1px solid ${C.red}60`,borderRadius:2,
                  color:C.red,fontSize:9,fontWeight:700,padding:"4px 8px",cursor:"pointer",
                }} title="Delete player">✕</button>
              </div>
            ))}
            <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:players.length>0?"auto":0}}>
              <span style={{fontSize:9,color:C.textMuted,letterSpacing:1}}>STYLE:</span>
              <button onClick={()=>setThemeAndSave("warroom")} style={{
                ...btnStyle(theme==="warroom",C.ctBlue),padding:"6px 12px",fontSize:9,
              }}>WARROOM</button>
              <button onClick={()=>setThemeAndSave("csgo")} style={{
                ...btnStyle(theme==="csgo",C.orange),padding:"6px 12px",fontSize:9,
              }}>CSGO</button>
            </div>
            <button onClick={adminLogout} style={{
              ...btnStyle(false),padding:"6px 10px",fontSize:8,marginLeft:"auto",
            }}>LOGOUT</button>
          </div>
        ):(
          <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
            <input type="password" value={adminPassword} onChange={e=>{setAdminPassword(e.target.value);setAdminError("");}}
              onKeyDown={e=>e.key==="Enter"&&adminLogin()}
              placeholder="Password" maxLength={32}
              style={{
                flex:1,minWidth:120,background:C.bgLight,border:`1px solid ${adminError?C.red:C.panelBorder}`,borderRadius:2,
                color:C.textPrimary,fontSize:11,padding:"8px 12px",letterSpacing:1,outline:"none",
              }}/>
            <button onClick={adminLogin} style={{
              ...btnStyle(true,C.ctBlue),padding:"8px 14px",fontSize:9,
            }}>LOGIN</button>
            {adminError&&<span style={{fontSize:9,color:C.red,letterSpacing:1}}>{adminError}</span>}
          </div>
        )}
      </div>
      )}
    </div></>
  );

  // ═══ AUTH SCREEN ═══
  if(!activeUser||!players.includes(activeUser))return(
    <><style>{css}</style>{C.metalTexture&&<div style={metalTexture}/>}{C.scanlines&&<div style={scanlineOverlay}/>}
    <div style={{minHeight:"100dvh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",width:"100%"}}>
        <div style={{...panelStyle,maxWidth:420,width:"100%",marginBottom:0}}>
          <div style={panelHead}>
            <span style={headText}>{theme==="warroom"?"SELECT OPERATIVE":"SELECT PLAYER"}</span>
          </div>
          <div style={{padding:isMobile?12:16}}>
            <div style={{fontSize:10,color:C.textMuted,letterSpacing:1,marginBottom:12,textAlign:"center"}}>
              {boundPlayer
                ? `Signed in as ${boundPlayer}. Your friend logs in with their own account.`
                : "Claim your own player profile. Claimed profiles are locked to each login."}
            </div>
            {players.map((p,i)=>{
              const pct=overallPct(p);
              const ownerUid=claimedByPlayer[p];
              const claimedByMe=!!ownerUid&&ownerUid===authUserId;
              const claimedByOther=!!ownerUid&&!claimedByMe;
              return(
                <button key={p} onClick={()=>{if(!claimedByOther)claimExistingPlayer(p);}} disabled={claimedByOther} style={{
                  width:"100%",background:i%2===0?C.bgLight:"#20202a",
                  border:`1px solid ${C.panelBorder}`,borderRadius:2,
                  padding:"12px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:12,
                  color:C.textPrimary,textAlign:"left",minHeight:54,
                  transition:"all 0.15s",opacity:claimedByOther?0.55:1,cursor:claimedByOther?"not-allowed":"pointer",
                }}
                  onMouseEnter={e=>{if(!claimedByOther)e.currentTarget.style.borderColor=C.ctBlue+"60";}}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=C.panelBorder}
                >
                  <RankBadge score={pct} size={36} C={C}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:700,letterSpacing:2}}>{p}</div>
                    <div style={{fontSize:10,color:C.textSecondary,letterSpacing:1}}>
                      {RANKS.slice().reverse().find(r=>pct>=r.min)?.name||"UNRANKED"}
                    </div>
                  </div>
                  <div style={{fontSize:18,fontWeight:700,color:C.ctBlue,letterSpacing:1,...telemetryStyle}}>{pct}%</div>
                  <div style={{fontSize:10,color:claimedByOther?C.red:claimedByMe?C.green:C.textMuted,letterSpacing:1,fontWeight:700,minWidth:62,textAlign:"right"}}>
                    {claimedByOther?"LOCKED":claimedByMe?"MY PROFILE":"CLAIM ▸"}
                  </div>
                </button>
              );
            })}
            {!boundPlayer&&players.length>0&&players.every((p)=>{
              const ownerUid=claimedByPlayer[p];
              return !!ownerUid&&ownerUid!==authUserId;
            })&&(
              <div style={{fontSize:9,color:C.textMuted,letterSpacing:1,marginTop:6,textAlign:"center"}}>
                All listed profiles are already claimed. Ask an admin to add another profile.
              </div>
            )}
          </div>
          <button onClick={shareApp} style={{
            width:"100%",marginTop:8,padding:"10px 14px",minHeight:44,
            background:C.bgLight,border:`1px solid ${C.ctBlue}60`,borderRadius:2,
            color:C.ctBlue,fontSize:11,fontWeight:700,letterSpacing:2,display:"flex",alignItems:"center",justifyContent:"center",gap:6,
            cursor:"pointer",
          }}>
            <span>📤</span> {theme==="warroom"?"SHARE VIA WHATSAPP":"SHARE WITH FRIEND"}
          </button>
          <button onClick={async()=>{try{await signOut();setActiveUser(null);}catch(e){}}} style={{
            marginTop:8,background:"none",border:"none",color:C.textMuted,fontSize:9,letterSpacing:1,cursor:"pointer",textDecoration:"underline",
          }}>Sign out</button>
        </div>
      </div>
      {/* Administrator bar — bottom row */}
      {adminEnabled&&(
      <div style={{width:"100%",maxWidth:420,marginTop:"auto",borderTop:`1px solid ${C.panelBorder}`,paddingTop:16,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{fontSize:9,color:C.textMuted,letterSpacing:2,fontWeight:700}}>ADMINISTRATOR</div>
        {isAdminLoggedIn?(
          <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
            {players.map(p=>(
              <div key={p} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:C.bgLight,borderRadius:2,border:`1px solid ${C.panelBorder}`}}>
                <span style={{fontSize:11,fontWeight:600,color:C.textPrimary}}>{p}</span>
                <button onClick={()=>deletePlayer(p)} style={{
                  background:C.redDim,border:`1px solid ${C.red}60`,borderRadius:2,
                  color:C.red,fontSize:9,fontWeight:700,padding:"4px 8px",cursor:"pointer",
                }} title="Delete player">✕</button>
              </div>
            ))}
            <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:players.length>0?"auto":0}}>
              <span style={{fontSize:9,color:C.textMuted,letterSpacing:1}}>STYLE:</span>
              <button onClick={()=>setThemeAndSave("warroom")} style={{...btnStyle(theme==="warroom",C.ctBlue),padding:"6px 12px",fontSize:9}}>WARROOM</button>
              <button onClick={()=>setThemeAndSave("csgo")} style={{...btnStyle(theme==="csgo",C.orange),padding:"6px 12px",fontSize:9}}>CSGO</button>
            </div>
            <button onClick={adminLogout} style={{...btnStyle(false),padding:"6px 10px",fontSize:8,marginLeft:"auto"}}>LOGOUT</button>
          </div>
        ):(
          <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
            <input type="password" value={adminPassword} onChange={e=>{setAdminPassword(e.target.value);setAdminError("");}}
              onKeyDown={e=>e.key==="Enter"&&adminLogin()}
              placeholder="Password" maxLength={32}
              style={{
                flex:1,minWidth:120,background:C.bgLight,border:`1px solid ${adminError?C.red:C.panelBorder}`,borderRadius:2,
                color:C.textPrimary,fontSize:11,padding:"8px 12px",letterSpacing:1,outline:"none",
              }}/>
            <button onClick={adminLogin} style={{...btnStyle(true,C.ctBlue),padding:"8px 14px",fontSize:9}}>LOGIN</button>
            {adminError&&<span style={{fontSize:9,color:C.red,letterSpacing:1}}>{adminError}</span>}
          </div>
        )}
      </div>
      )}
    </div></>
  );

  // ═══════════════════════════════════════════════════════════════
  //  MAIN DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  return(
    <><style>{css}</style>{C.metalTexture&&<div style={metalTexture}/>}{C.scanlines&&<div style={scanlineOverlay}/>}

    {/* MVP OVERLAY */}
    {showMVP&&mvpPlayer&&mvpStat&&(
      <div style={{
        position:"fixed",inset:0,zIndex:10000,
        background:"radial-gradient(ellipse at center,#1B1B1Eee 0%,#0a0a0cff 100%)",
        display:"flex",alignItems:"center",justifyContent:"center",
        animation:"fadeIn 0.3s ease",flexDirection:"column",padding:20,
      }} onClick={()=>setShowMVP(false)}>
        <div style={{
          fontSize:12,letterSpacing:6,color:C.orange,fontWeight:700,marginBottom:16,
          animation:mvpAnim>=1?"fadeIn 0.3s ease both":"",opacity:mvpAnim>=1?1:0,
        }}>★ MATCH MVP ★</div>
        <div style={{
          width:120,height:120,borderRadius:4,
          background:`linear-gradient(135deg,${C.tGold}30,${C.tGold}10)`,
          border:`2px solid ${C.tGold}60`,
          display:"flex",alignItems:"center",justifyContent:"center",
          animation:mvpAnim>=2?"scaleIn 0.4s ease both":"",opacity:mvpAnim>=2?1:0,
          boxShadow:`0 0 40px ${C.tGold}30`,marginBottom:16,
        }}>
          <div style={{fontSize:48,fontWeight:800,color:C.tGold}}>{mvpPlayer[0]}</div>
        </div>
        <div style={{
          fontSize:isMobile?32:42,fontWeight:700,letterSpacing:4,color:C.textPrimary,
          animation:mvpAnim>=2?"scaleIn 0.4s ease both":"",opacity:mvpAnim>=2?1:0,
          textShadow:`0 0 20px ${C.tGold}40`,
        }}>{mvpPlayer}</div>
        <div style={{
          fontSize:14,letterSpacing:3,color:C.tGold,fontWeight:600,marginTop:8,
          animation:mvpAnim>=3?"fadeIn 0.4s ease both":"",opacity:mvpAnim>=3?1:0,
        }}>{RANKS.slice().reverse().find(r=>overallPct(mvpPlayer)>=r.min)?.name}</div>
        <div style={{
          marginTop:20,display:"flex",gap:24,
          animation:mvpAnim>=4?"fadeIn 0.4s ease both":"",opacity:mvpAnim>=4?1:0,
        }}>
          {ACTIVITIES.map(a=>(
            <div key={a.id} style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:getPct(mvpPlayer,a)>=75?C.green:getPct(mvpPlayer,a)>=40?C.orange:C.red,...telemetryStyle}}>
                {getWeekTotal(mvpPlayer,a.id)}
              </div>
              <div style={{fontSize:9,letterSpacing:1,color:C.textMuted,marginTop:2}}>{a.label}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:10,color:C.textMuted,marginTop:24,letterSpacing:2,animation:"pulseOrange 2s infinite"}}>
          TAP TO DISMISS
        </div>
      </div>
    )}

    <div style={{minHeight:"100dvh",background:C.bg,padding:isMobile?"8px 6px 80px":"12px 16px 40px"}}>
      <div style={{maxWidth:900,margin:"0 auto"}}>

        {/* ─── TOP BAR ─── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"0 2px"}}>
          <div>
            <div style={{fontSize:isMobile?18:22,fontWeight:700,letterSpacing:isMobile?2:4,color:C.textPrimary,lineHeight:1}}>
              {theme==="warroom"?"SITUATION ROOM":"COMPETITIVE"}
            </div>
            <div style={{fontSize:9,letterSpacing:2,color:C.textMuted,marginTop:2}}>
              {theme==="warroom"?"INTEL PERIOD":"WEEK OF"} {weekDates[0].slice(5)} — {weekDates[6].slice(5)}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {boundPlayer?(
              <div style={{...btnStyle(true,C.ctBlue),padding:"5px 10px",fontSize:9,cursor:"default"}}>
                {boundPlayer}
              </div>
            ):(
              <button onClick={()=>{setActiveUser(null);playClick();}} style={{...btnStyle(false),padding:"5px 10px",fontSize:9}}>
                {activeUser}  ✕
              </button>
            )}
            <button onClick={async()=>{try{await signOut();setActiveUser(null);}catch(e){}}} style={{...btnStyle(false),padding:"5px 10px",fontSize:9}}>
              Sign out
            </button>
          </div>
        </div>

        {/* ─── KILL FEED (top corner) ─── */}
        {killfeed.length>0&&(
          <div style={{marginBottom:8}}>
            {killfeed.slice(0,isMobile?3:4).map((kf,i)=>(
              <div key={i} style={{
                display:"flex",alignItems:"center",gap:6,padding:"3px 8px",marginBottom:2,
                background:"#00000050",borderRadius:2,
                animation:`slideInRight 0.3s ease ${i*0.08}s both`,
                fontSize:10,fontWeight:600,
              }}>
                <span style={{color:C.ctBlue,letterSpacing:1}}>{kf.killer}</span>
                <span style={{color:C.orange,fontSize:8}}>◆</span>
                <span style={{color:C.textMuted,fontSize:9,letterSpacing:0.5}}>eliminated</span>
                <span style={{color:C.red,letterSpacing:1}}>{kf.victim}</span>
                <span style={{color:C.textMuted,fontSize:8,marginLeft:"auto",letterSpacing:1}}>
                  {kf.weapon} +{kf.diff}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ─── BOMB TIMER (weekly deadline) ─── */}
        <div style={{
          ...panelStyle,marginBottom:10,
          borderLeft:`3px solid ${daysLeft<=2?C.red:daysLeft<=4?C.orange:C.ctBlue}`,
        }}>
          <div style={{display:"flex",alignItems:"center",padding:"8px 12px",gap:10}}>
            <div style={{
              fontSize:10,fontWeight:700,letterSpacing:2,
              color:daysLeft<=2?C.red:daysLeft<=4?C.orange:C.ctBlue,
              animation:daysLeft<=2?"bombTick 1s step-end infinite":"none",
              cursor:daysLeft<=2?"pointer":"default",
            }} onClick={daysLeft<=2?playBombTick:undefined}>
              {daysLeft<=2?"⦿":"◉"} {daysLeft===0?"MATCH ENDS TODAY":daysLeft===1?"1 DAY LEFT":`${daysLeft} DAYS LEFT`}
            </div>
            <div style={{flex:1,height:3,background:C.bgLight,borderRadius:2,overflow:"hidden",marginLeft:8}}>
              <div style={{
                height:"100%",borderRadius:2,transition:"width 0.5s",
                width:`${Math.round(((7-daysLeft)/7)*100)}%`,
                background:daysLeft<=2?C.red:daysLeft<=4?C.orange:C.ctBlue,
              }}/>
            </div>
            <div style={{fontSize:10,color:C.textMuted,letterSpacing:1,fontWeight:600}}>
              {Math.round(((7-daysLeft)/7)*100)}%
            </div>
          </div>
        </div>

        {/* ─── VIEW TABS ─── */}
        <div style={{display:"flex",gap:3,marginBottom:10}}>
          {[
            {id:"scoreboard",label:"SCOREBOARD",icon:"☰"},
            {id:"buymenu",label:"LOG DATA",icon:"$"},
            {id:"stats",label:"MATCH STATS",icon:"◊"},
            {id:"weeklywinners",label:"WEEKLY WINNERS",icon:"★"},
          ].map(t=>(
            <button key={t.id} onClick={()=>{setView(t.id);playClick();}} style={{
              ...btnStyle(view===t.id),flex:1,
              borderTop:view===t.id?`2px solid ${C.ctBlue}`:"2px solid transparent",
              paddingTop:5,
            }}>
              <span style={{marginRight:4,fontSize:9}}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ═══ SCOREBOARD VIEW ═══ */}
        {view==="scoreboard"&&(
          <>
            {/* Scoreboard table */}
            <div style={panelStyle}>
              <div style={panelHead}>
                <span style={headText}>{theme==="warroom"?"STATUS BOARD":"SCOREBOARD"}</span>
                <button onClick={triggerMVP} style={{
                  background:`${C.tGold}20`,border:`1px solid ${C.tGold}40`,borderRadius:2,
                  padding:"4px 10px",color:C.tGold,fontSize:9,fontWeight:700,letterSpacing:1,
                  cursor:"pointer",
                }}>★ MVP</button>
              </div>
              {/* Column headers */}
              <div style={{
                display:"grid",
                gridTemplateColumns:isMobile?"1fr 42px 42px 42px 42px 42px":"60px 1fr 60px 60px 60px 60px 60px 50px",
                padding:"6px 12px",background:"#16161a",borderBottom:`1px solid ${C.panelBorder}`,
                alignItems:"center",
              }}>
                {!isMobile&&<div style={{fontSize:9,color:C.textMuted,letterSpacing:1,fontWeight:600}}>#</div>}
                <div style={{fontSize:9,color:C.textMuted,letterSpacing:1,fontWeight:600}}>{theme==="warroom"?"OPERATIVE":"PLAYER"}</div>
                {ACTIVITIES.map(a=>(
                  <div key={a.id} style={{fontSize:9,color:C.textMuted,letterSpacing:1,fontWeight:600,textAlign:"center"}}>{a.label}</div>
                ))}
                {!isMobile&&<div style={{fontSize:9,color:C.textMuted,letterSpacing:1,fontWeight:600,textAlign:"center"}}>SCR</div>}
              </div>

              {/* Player rows */}
              {rankings.map((p,i)=>{
                const pct=overallPct(p);const isMe=p===activeUser;
                const rank=RANKS.slice().reverse().find(r=>pct>=r.min)||RANKS[0];
                return(
                  <div key={p} style={{
                    display:"grid",
                    gridTemplateColumns:isMobile?"1fr 42px 42px 42px 42px 42px":"60px 1fr 60px 60px 60px 60px 60px 50px",
                    padding:isMobile?"8px 10px":"8px 12px",
                    background:isMe?C.ctBlueBg:i%2===0?C.bgLight:"#1f1f24",
                    borderBottom:`1px solid ${C.panelBorder}40`,
                    borderLeft:isMe?`2px solid ${C.ctBlue}`:"2px solid transparent",
                    alignItems:"center",transition:"background 0.15s",
                  }}>
                    {/* Rank # (desktop) */}
                    {!isMobile&&(
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:14,fontWeight:700,color:i===0?C.tGold:i===1?C.textSecondary:i===2?C.orange:C.textMuted}}>{i+1}</span>
                        <RankBadge score={pct} size={24} C={C}/>
                      </div>
                    )}
                    {/* Player name */}
                    <div style={{display:"flex",alignItems:"center",gap:isMobile?6:10,minWidth:0}}>
                      {isMobile&&<RankBadge score={pct} size={24} C={C}/>}
                      <div style={{minWidth:0}}>
                        <div style={{
                          fontSize:isMobile?12:14,fontWeight:700,letterSpacing:1.5,
                          color:isMe?C.ctBlue:C.textPrimary,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                        }}>{p}{isMe?" ◄":""}</div>
                        {isMobile&&(
                          <div style={{fontSize:8,color:C.textMuted,letterSpacing:0.5}}>{rank.abbr} · {pct}%</div>
                        )}
                      </div>
                    </div>
                    {/* Activity stats */}
                    {ACTIVITIES.map(a=>{
                      const val=getWeekTotal(p,a.id);
                      const apct=getPct(p,a);
                      const isTop=players.every(pp=>getWeekTotal(pp,a.id)<=val)&&val>0;
                      return(
                        <div key={a.id} style={{
                          textAlign:"center",fontSize:isMobile?11:13,fontWeight:700,
                          color:isTop?C.green:apct>=60?C.textPrimary:apct>0?C.orange:C.textMuted,
                          letterSpacing:0.5,
                          textShadow:isTop?`0 0 6px ${C.green}40`:(telemetryStyle.textShadow||"none"),
                        }}>
                          {val||"–"}
                        </div>
                      );
                    })}
                    {/* Score (desktop) */}
                    {!isMobile&&(
                      <div style={{textAlign:"center",fontSize:14,fontWeight:800,color:C.ctBlue,letterSpacing:1,...telemetryStyle}}>
                        {pct}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Round history */}
            <div style={panelStyle}>
              <div style={panelHead}>
                <span style={headText}>{theme==="warroom"?"DAILY BRIEF":"ROUND HISTORY"}</span>
                <span style={{fontSize:9,color:C.textMuted,letterSpacing:1}}>DAILY W/L</span>
              </div>
              <div style={{padding:"10px 12px"}}>
                {/* Day labels header */}
                <div style={{display:"flex",alignItems:"center",marginBottom:8}}>
                  <div style={{width:isMobile?80:120}}/>
                  <div style={{display:"flex",gap:2}}>
                    {DAY_LABELS.map(d=>(
                      <div key={d} style={{width:14,textAlign:"center",fontSize:7,color:C.textMuted,fontWeight:700,letterSpacing:0.5}}>{d[0]}</div>
                    ))}
                  </div>
                </div>
                {rankings.map(p=>(
                  <div key={p} style={{display:"flex",alignItems:"center",marginBottom:6}}>
                    <div style={{
                      width:isMobile?80:120,fontSize:10,fontWeight:700,letterSpacing:1.5,
                      color:p===activeUser?C.ctBlue:C.textSecondary,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                    }}>{p}</div>
                    <RoundHistoryBar person={p} scores={scores} weekDates={weekDates} today={today} C={C}/>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══ BUY MENU (LOG DATA) VIEW ═══ */}
        {view==="buymenu"&&(
          <div style={panelStyle}>
            <div style={panelHead}>
              <span style={headText}>{theme==="warroom"?"INTEL LOG":"BUY MENU"} — {today}</span>
              <span style={{fontSize:9,color:C.ctBlue,fontWeight:700,letterSpacing:1}}>{activeUser}</span>
            </div>
            <div style={{padding:isMobile?10:14}}>
              <div style={{fontSize:9,letterSpacing:2,color:C.textMuted,marginBottom:10,fontWeight:600}}>
                You're logging your own activity · LOG TODAY'S DATA
              </div>

              {ACTIVITIES.map(act=>{
                const k=sk(today,activeUser,act.id);
                const val=scores[k];
                const isEditing=editCell===k;
                const wkTotal=getWeekTotal(activeUser,act.id);
                const wkPct=getPct(activeUser,act);
                const dayPct=val?Math.min(100,Math.round(val/act.target*100)):0;

                return(
                  <div key={act.id} style={{
                    padding:"12px 14px",marginBottom:8,
                    background:C.bgLight,border:`1px solid ${C.panelBorder}`,
                    borderRadius:3,borderLeft:`3px solid ${wkPct>=75?C.green:wkPct>=40?C.orange:C.red}`,
                    transition:"all 0.2s",
                    boxShadow:`inset 0 1px 0 ${C.panelGlow}20`,
                  }}>
                    {/* Header row */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <div>
                        <span style={{fontSize:13,fontWeight:700,letterSpacing:2,color:C.textPrimary}}>{act.label}</span>
                        <span style={{fontSize:9,color:C.textMuted,marginLeft:8,letterSpacing:1}}>{act.unit.toUpperCase()}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:9,color:C.textMuted,letterSpacing:1}}>
                          WEEK: <span style={{color:wkPct>=75?C.green:wkPct>=40?C.orange:C.red,fontWeight:700}}>{wkTotal}</span>/{act.weekTarget}
                        </span>
                        <span style={{
                          fontSize:8,fontWeight:700,letterSpacing:1,padding:"2px 6px",borderRadius:1,
                          background:wkPct>=75?C.greenDim:wkPct>=40?C.orangeDim+"40":C.redDim,
                          color:wkPct>=75?C.green:wkPct>=40?C.orange:C.red,
                          border:`1px solid ${wkPct>=75?C.green:wkPct>=40?C.orange:C.red}30`,
                        }}>{wkPct}%</span>
                      </div>
                    </div>

                    {/* Input row */}
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{fontSize:9,color:C.textMuted,letterSpacing:1,fontWeight:600,whiteSpace:"nowrap"}}>TODAY</div>
                      {isEditing?(
                        <input autoFocus type="number" inputMode="decimal" min="0" step="any"
                          value={editVal} onChange={e=>setEditVal(e.target.value)}
                          onBlur={()=>saveEdit(today,activeUser,act.id)}
                          onKeyDown={e=>{if(e.key==="Enter")saveEdit(today,activeUser,act.id);if(e.key==="Escape")setEditCell(null);}}
                          style={{
                            flex:1,background:C.bg,border:`1px solid ${C.ctBlue}60`,borderRadius:2,
                            color:C.ctBlue,fontSize:18,fontWeight:700,padding:"8px 12px",
                            letterSpacing:2,outline:"none",textAlign:"center",
                          }}/>
                      ):(
                        <button onClick={()=>startEdit(today,activeUser,act.id)} style={{
                          flex:1,background:C.bg,border:`1px solid ${C.panelBorder}`,borderRadius:2,
                          padding:"8px 12px",textAlign:"center",minHeight:42,
                          color:val!=null?C.textPrimary:C.textMuted,
                          fontSize:18,fontWeight:700,letterSpacing:2,cursor:"pointer",
                          transition:"border-color 0.15s",
                        }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=C.ctBlue+"60"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor=C.panelBorder}
                        >
                          {val!=null?val:"—"}
                        </button>
                      )}
                      {val!=null&&(
                        <div style={{
                          width:36,height:36,borderRadius:2,
                          background:dayPct>=100?C.greenDim:dayPct>=50?C.orangeDim+"40":C.redDim,
                          border:`1px solid ${dayPct>=100?C.green:dayPct>=50?C.orange:C.red}30`,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:10,fontWeight:700,color:dayPct>=100?C.green:dayPct>=50?C.orange:C.red,
                        }}>{dayPct>=100?"✓":dayPct+"%"}</div>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div style={{height:3,background:C.bg,borderRadius:2,overflow:"hidden",marginTop:8}}>
                      <div style={{
                        height:"100%",borderRadius:2,transition:"width 0.4s ease",
                        width:`${wkPct}%`,
                        background:`linear-gradient(90deg,${wkPct>=75?C.green:wkPct>=40?C.orange:C.red}80,${wkPct>=75?C.green:wkPct>=40?C.orange:C.red})`,
                      }}/>
                    </div>
                  </div>
                );
              })}

              {/* Other players today */}
              <div style={{marginTop:14}}>
                <div style={{fontSize:9,letterSpacing:2,color:C.textMuted,marginBottom:8,fontWeight:600}}>{theme==="warroom"?"RIVAL ASSETS — TODAY":"ENEMY TEAM — TODAY"}</div>
                {players.filter(p=>p!==activeUser).map(p=>(
                  <div key={p} style={{
                    padding:"8px 12px",background:"#1a1a20",border:`1px solid ${C.panelBorder}`,
                    borderRadius:2,marginBottom:6,borderLeft:`2px solid ${C.tGold}40`,
                  }}>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:C.tGold,marginBottom:5}}>{p}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:isMobile?8:12}}>
                      {ACTIVITIES.map(a=>{
                        const v=getDayVal(today,p,a.id);
                        return(
                          <div key={a.id} style={{fontSize:9,letterSpacing:1,color:C.textMuted}}>
                            {a.label}: <span style={{fontWeight:700,color:v?C.textSecondary:C.textMuted}}>{v||"–"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ MATCH STATS VIEW ═══ */}
        {view==="stats"&&(
          <>
            {/* Personal rank card */}
            <div style={{
              ...panelStyle,borderTop:`3px solid ${C.ctBlue}`,
              animation:"mvpGlow 3s ease-in-out infinite",
            }}>
              <div style={{padding:isMobile?14:18,display:"flex",alignItems:"center",gap:16}}>
                <RankBadge score={overallPct(activeUser)} size={56} C={C}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:isMobile?20:24,fontWeight:700,letterSpacing:3,color:C.textPrimary}}>{activeUser}</div>
                  <div style={{fontSize:12,letterSpacing:2,color:C.ctBlue,fontWeight:600}}>
                    {RANKS.slice().reverse().find(r=>overallPct(activeUser)>=r.min)?.name}
                  </div>
                  <div style={{fontSize:10,color:C.textMuted,letterSpacing:1,marginTop:2}}>
                    RANK #{rankings.indexOf(activeUser)+1} OF {players.length}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:32,fontWeight:800,color:C.ctBlue,letterSpacing:2,lineHeight:1,...telemetryStyle}}>
                    {overallPct(activeUser)}
                  </div>
                  <div style={{fontSize:9,color:C.textMuted,letterSpacing:2}}>COMPOSITE</div>
                </div>
              </div>
            </div>

            {/* Gemini coach */}
            <div style={panelStyle}>
              <div style={panelHead}>
                <span style={headText}>GEMINI COACH</span>
                <span style={{fontSize:9,color:geminiReady?C.green:C.textMuted,letterSpacing:1,fontWeight:700}}>
                  {geminiReady?"READY":"API KEY NEEDED"}
                </span>
              </div>
              <div style={{padding:isMobile?10:14}}>
                <button onClick={askGeminiCoach} disabled={!geminiReady||geminiLoading} style={{
                  ...btnStyle(geminiReady&&!geminiLoading,C.ctBlue),
                  width:"100%",padding:"10px 12px",fontSize:10,letterSpacing:1.5,
                  opacity:geminiReady?1:0.65,cursor:geminiReady&&!geminiLoading?"pointer":"not-allowed",
                }}>
                  {geminiLoading?"ANALYZING THIS WEEK...":"GET WEEKLY COACHING TIP"}
                </button>
                {!geminiReady&&(
                  <div style={{marginTop:8,fontSize:9,color:C.textMuted,letterSpacing:1}}>
                    Set VITE_GEMINI_API_KEY to enable Gemini suggestions.
                  </div>
                )}
                {geminiError&&(
                  <div style={{marginTop:8,fontSize:9,color:C.red,letterSpacing:1}}>
                    {geminiError}
                  </div>
                )}
                {geminiTip&&(
                  <div style={{
                    marginTop:10,padding:"10px 12px",background:C.bgLight,border:`1px solid ${C.panelBorder}`,
                    borderRadius:2,fontSize:11,color:C.textPrimary,letterSpacing:0.5,whiteSpace:"pre-wrap",lineHeight:1.45,
                  }}>
                    {geminiTip}
                  </div>
                )}
              </div>
            </div>

            {/* Detailed stats per activity */}
            <div style={panelStyle}>
              <div style={panelHead}>
                <span style={headText}>{theme==="warroom"?"METRICS BREAKDOWN":"PERFORMANCE BREAKDOWN"}</span>
              </div>
              <div style={{padding:isMobile?10:14}}>
                {ACTIVITIES.map(act=>{
                  const pct=getPct(activeUser,act);
                  const total=getWeekTotal(activeUser,act.id);
                  const isLeader=players.every(p=>getWeekTotal(p,act.id)<=total)&&total>0;
                  const bestOther=players.filter(p=>p!==activeUser).reduce((b,p)=>Math.max(b,getWeekTotal(p,act.id)),0);
                  const diff=total-bestOther;
                  return(
                    <div key={act.id} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:12,fontWeight:700,letterSpacing:2,color:C.textPrimary}}>{act.label}</span>
                          {isLeader&&<span style={{fontSize:8,padding:"1px 5px",background:C.greenDim,color:C.green,borderRadius:1,fontWeight:700,letterSpacing:1,border:`1px solid ${C.green}30`}}>★ LEAD</span>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{
                            fontSize:14,fontWeight:800,letterSpacing:1,
                            color:pct>=75?C.green:pct>=40?C.orange:C.red,
                          }}>{total}</span>
                          <span style={{fontSize:9,color:C.textMuted}}>/ {act.weekTarget}</span>
                          {diff!==0&&(
                            <span style={{
                              fontSize:9,fontWeight:700,letterSpacing:0.5,
                              color:diff>0?C.green:C.red,
                            }}>{diff>0?"+":""}{diff}</span>
                          )}
                        </div>
                      </div>
                      <div style={{height:5,background:C.bgLight,borderRadius:2,overflow:"hidden"}}>
                        <div style={{
                          height:"100%",borderRadius:2,transition:"width 0.5s ease",width:`${pct}%`,
                          background:`linear-gradient(90deg,${pct>=75?C.green:pct>=40?C.orange:C.red}90,${pct>=75?C.green:pct>=40?C.orange:C.red})`,
                          boxShadow:`0 0 6px ${pct>=75?C.green:pct>=40?C.orange:C.red}30`,
                        }}/>
                      </div>
                      {/* Daily breakdown */}
                      <div style={{display:"flex",gap:3,marginTop:6}}>
                        {weekDates.map((d,di)=>{
                          const v=getDayVal(d,activeUser,act.id);
                          const dp=v?Math.min(100,Math.round(v/act.target*100)):0;
                          return(
                            <div key={d} style={{flex:1,textAlign:"center"}}>
                              <div style={{fontSize:7,color:C.textMuted,letterSpacing:0.5,marginBottom:2}}>{DAY_LABELS[di][0]}</div>
                              <div style={{
                                height:18,borderRadius:1,
                                background:C.bgLight,border:`1px solid ${d===today?C.ctBlue+"40":C.panelBorder}40`,
                                display:"flex",alignItems:"center",justifyContent:"center",
                                fontSize:8,fontWeight:700,
                                color:dp>=100?C.green:dp>0?C.textSecondary:C.textMuted,
                              }}>{v||"·"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Head-to-head */}
            <div style={panelStyle}>
              <div style={panelHead}>
                <span style={headText}>{theme==="warroom"?"RIVAL INTEL":"HEAD TO HEAD"}</span>
              </div>
              <div style={{padding:isMobile?10:14}}>
                {players.filter(p=>p!==activeUser).map(rival=>{
                  const myPct=overallPct(activeUser);const rivalPct=overallPct(rival);
                  const winning=myPct>=rivalPct;
                  const actWins=ACTIVITIES.filter(a=>getWeekTotal(activeUser,a.id)>getWeekTotal(rival,a.id)).length;
                  return(
                    <div key={rival} style={{
                      padding:"10px 12px",background:C.bgLight,border:`1px solid ${C.panelBorder}`,
                      borderRadius:3,marginBottom:8,
                    }}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:13,fontWeight:700,letterSpacing:2,color:C.ctBlue}}>{activeUser}</span>
                          <span style={{fontSize:10,color:C.textMuted}}>VS</span>
                          <span style={{fontSize:13,fontWeight:700,letterSpacing:2,color:C.tGold}}>{rival}</span>
                        </div>
                        <span style={{
                          fontSize:10,fontWeight:700,letterSpacing:1,
                          color:winning?C.green:C.red,
                        }}>{winning?"WINNING":"LOSING"} {actWins}-{ACTIVITIES.length-actWins}</span>
                      </div>
                      {/* Stat comparison bars */}
                      {ACTIVITIES.map(a=>{
                        const myVal=getWeekTotal(activeUser,a.id);
                        const rivVal=getWeekTotal(rival,a.id);
                        const maxV=Math.max(myVal,rivVal,1);
                        return(
                          <div key={a.id} style={{marginBottom:5}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:2}}>
                              <span style={{color:myVal>=rivVal?C.ctBlue:C.textMuted,fontWeight:700}}>{myVal}</span>
                              <span style={{color:C.textMuted,letterSpacing:1}}>{a.label}</span>
                              <span style={{color:rivVal>myVal?C.tGold:C.textMuted,fontWeight:700}}>{rivVal}</span>
                            </div>
                            <div style={{display:"flex",height:3,gap:2}}>
                              <div style={{flex:1,background:C.bg,borderRadius:1,overflow:"hidden",display:"flex",justifyContent:"flex-end"}}>
                                <div style={{height:"100%",width:`${(myVal/maxV)*100}%`,background:C.ctBlue,borderRadius:1,transition:"width 0.3s"}}/>
                              </div>
                              <div style={{flex:1,background:C.bg,borderRadius:1,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${(rivVal/maxV)*100}%`,background:C.tGold,borderRadius:1,transition:"width 0.3s"}}/>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ═══ WEEKLY WINNERS VIEW ═══ */}
        {view==="weeklywinners"&&(
          <div style={panelStyle}>
            <div style={panelHead}>
              <span style={headText}>{theme==="warroom"?"WEEKLY TOP OPERATIVES":"WEEKLY WINNERS"}</span>
              <span style={{fontSize:9,color:C.textMuted,letterSpacing:1}}>WEIGHT + EXERCISE QUANTITY</span>
            </div>
            <div style={{padding:isMobile?10:14}}>
              {weeklyWinnerHistory.length===0?(
                <div style={{
                  padding:"14px 12px",
                  background:C.bgLight,
                  border:`1px solid ${C.panelBorder}`,
                  borderRadius:3,
                  color:C.textMuted,
                  fontSize:11,
                  letterSpacing:1,
                }}>
                  No weekly winner history yet. Start logging scores to populate this page.
                </div>
              ):(
                weeklyWinnerHistory.map((week) => {
                  const isCurrentWeek = week.weekStart === weekDates[0];
                  return (
                    <div key={week.weekStart} style={{
                      padding:"10px 12px",
                      background:C.bgLight,
                      border:`1px solid ${C.panelBorder}`,
                      borderRadius:3,
                      marginBottom:8,
                    }}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:10}}>
                        <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:C.textPrimary}}>
                          {week.weekLabel}
                        </div>
                        <div style={{
                          fontSize:8,
                          fontWeight:700,
                          letterSpacing:1.2,
                          color:isCurrentWeek?C.orange:C.green,
                          border:`1px solid ${isCurrentWeek?C.orange:C.green}30`,
                          background:isCurrentWeek?C.orangeDim+"40":C.greenDim,
                          borderRadius:2,
                          padding:"2px 6px",
                          whiteSpace:"nowrap",
                        }}>
                          {isCurrentWeek ? "IN PROGRESS" : "FINAL"}
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
                        {week.metrics.map((metric) => {
                          const hasWinner = metric.topValue > 0;
                          const isTie = metric.winners.length > 1;
                          const topValueLabel = metric.topValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
                          return (
                            <div key={metric.id} style={{
                              padding:"8px 10px",
                              background:C.bg,
                              border:`1px solid ${C.panelBorder}70`,
                              borderRadius:2,
                            }}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,gap:8}}>
                                <span style={{fontSize:9,fontWeight:700,letterSpacing:1.2,color:C.textSecondary}}>
                                  {metric.label}
                                </span>
                                {metric.sourceId && metric.sourceId !== metric.id && (
                                  <span style={{fontSize:7,color:C.textMuted,letterSpacing:1}}>
                                    via {metric.sourceId.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              {hasWinner?(
                                <>
                                  <div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:C.textPrimary}}>
                                    {metric.winners.join(", ")}
                                  </div>
                                  <div style={{fontSize:9,color:C.ctBlue,fontWeight:700,letterSpacing:1,marginTop:4}}>
                                    {isTie?"TIED AT":"TOP TOTAL"}: {topValueLabel}
                                  </div>
                                </>
                              ):(
                                <div style={{fontSize:9,color:C.textMuted,letterSpacing:1}}>
                                  No entries this week
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── FOOTER (Administrator bar — bottom row) ─── */}
        <div style={{
          display:"flex",flexDirection:"column",gap:10,padding:"12px 2px",marginTop:6,
          borderTop:`1px solid ${C.panelBorder}`,
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:12,fontSize:8,color:C.textMuted,letterSpacing:2,fontWeight:600}}>
              <span>CS:GO TRACKER v2.0 · {players.length} PLAYERS</span>
              <button onClick={shareApp} style={{
                background:"none",border:"none",color:C.ctBlue,fontSize:8,letterSpacing:1,cursor:"pointer",padding:"4px 0",fontWeight:700,
              }}>📤 SHARE</button>
            </div>
            {adminEnabled&&isAdminLoggedIn&&(
              <button onClick={resetAll} style={{
                background:"none",border:"none",color:C.textMuted,fontSize:8,letterSpacing:2,cursor:"pointer",padding:"4px 8px",fontWeight:600,
              }}
                onMouseEnter={e=>e.currentTarget.style.color=C.red}
                onMouseLeave={e=>e.currentTarget.style.color=C.textMuted}
              >RESET MATCH</button>
            )}
          </div>
          {adminEnabled&&(
          <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <span style={{fontSize:8,color:C.textMuted,letterSpacing:2,fontWeight:700}}>ADMIN:</span>
            {isAdminLoggedIn?(
              <>
                {players.map(p=>(
                  <div key={p} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",background:C.bgLight,borderRadius:2,border:`1px solid ${C.panelBorder}`}}>
                    <span style={{fontSize:9,fontWeight:600,color:C.textPrimary}}>{p}</span>
                    <button onClick={()=>deletePlayer(p)} style={{
                      background:C.redDim,border:`1px solid ${C.red}60`,borderRadius:2,
                      color:C.red,fontSize:8,fontWeight:700,padding:"2px 6px",cursor:"pointer",
                    }} title="Delete player">✕</button>
                  </div>
                ))}
                <div style={{display:"flex",gap:4,alignItems:"center",marginLeft:"auto"}}>
                  <span style={{fontSize:8,color:C.textMuted,letterSpacing:1}}>STYLE:</span>
                  <button onClick={()=>setThemeAndSave("warroom")} style={{...btnStyle(theme==="warroom",C.ctBlue),padding:"4px 10px",fontSize:8}}>WARROOM</button>
                  <button onClick={()=>setThemeAndSave("csgo")} style={{...btnStyle(theme==="csgo",C.orange),padding:"4px 10px",fontSize:8}}>CSGO</button>
                </div>
                <button onClick={adminLogout} style={{...btnStyle(false),padding:"4px 8px",fontSize:8}}>LOGOUT</button>
              </>
            ):(
              <>
                <input type="password" value={adminPassword} onChange={e=>{setAdminPassword(e.target.value);setAdminError("");}}
                  onKeyDown={e=>e.key==="Enter"&&adminLogin()}
                  placeholder="Password" maxLength={32}
                  style={{
                    flex:1,minWidth:100,maxWidth:140,background:C.bgLight,border:`1px solid ${adminError?C.red:C.panelBorder}`,borderRadius:2,
                    color:C.textPrimary,fontSize:9,padding:"6px 10px",letterSpacing:1,outline:"none",
                  }}/>
                <button onClick={adminLogin} style={{...btnStyle(true,C.ctBlue),padding:"6px 12px",fontSize:8}}>LOGIN</button>
                {adminError&&<span style={{fontSize:8,color:C.red,letterSpacing:1}}>{adminError}</span>}
              </>
            )}
          </div>
          )}
        </div>
      </div>
    </div></>
  );
}
