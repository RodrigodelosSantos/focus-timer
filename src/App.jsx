import { useState, useEffect, useRef, useCallback } from "react";

// ─── localStorage helpers ──────────────────────────────────────────────────────
const store = {
  get(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
};

// ─── Audio ─────────────────────────────────────────────────────────────────────
function playBeep(ctx, freq = 880, duration = 0.25, gain = 0.5) {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.start(); o.stop(ctx.currentTime + duration);
  } catch {}
}
function playFinish(ctx) {
  if (!ctx) return;
  [880, 1100, 1320].forEach((f, i) => setTimeout(() => playBeep(ctx, f, 0.4, 0.6), i * 200));
}
function playSubalarm(ctx) {
  if (!ctx) return;
  playBeep(ctx, 660, 0.3, 0.7);
  setTimeout(() => playBeep(ctx, 660, 0.3, 0.7), 350);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const fmtMin = (s) => { const m = Math.floor(s / 60), sec = s % 60; return sec ? `${m}m ${sec}s` : `${m}m`; };
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const todayKey = () => new Date().toISOString().split("T")[0];

// ─── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 22, color = "currentColor" }) => {
  const paths = {
    timer: <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/><line x1="12" y1="3" x2="12" y2="1"/><line x1="16.5" y1="4.5" x2="18" y2="3"/></>,
    templates: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>,
    stats: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></>,
    play: <polygon points="5 3 19 12 5 21 5 3"/>,
    pause: <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
    stop: <rect x="4" y="4" width="16" height="16" rx="2"/>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    expand: <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>,
    flame: <path d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0c0-5-5-10-5-10z"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// ─── Ring ──────────────────────────────────────────────────────────────────────
function Ring({ progress, size = 240, children }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2030" strokeWidth="10"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#rg)" strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 0.5s ease" }}/>
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316"/>
            <stop offset="100%" stopColor="#fb923c"/>
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        {children}
      </div>
    </div>
  );
}

// ─── PiP Widget ────────────────────────────────────────────────────────────────
function PipWidget({ remaining, duration, running, onPause, onStop, onExpand }) {
  const progress = duration > 0 ? remaining / duration : 1;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  return (
    <div style={{
      position:"fixed", bottom:90, right:16, zIndex:200,
      background:"#0a0c14", border:"1px solid #f97316", borderRadius:20,
      padding:"10px 14px", display:"flex", alignItems:"center", gap:10,
      boxShadow:"0 4px 24px rgba(249,115,22,0.3)", minWidth:160
    }}>
      {/* Mini ring */}
      <div style={{ position:"relative", width:52, height:52, flexShrink:0 }}>
        <svg width={52} height={52} style={{ transform:"rotate(-90deg)" }}>
          <circle cx={26} cy={26} r={r} fill="none" stroke="#1e2030" strokeWidth="4"/>
          <circle cx={26} cy={26} r={r} fill="none" stroke="#f97316" strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition:"stroke-dashoffset 0.5s ease" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#f1f5f9", fontWeight:700 }}>{fmt(remaining)}</span>
        </div>
      </div>
      {/* Controls */}
      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
        <button onClick={onPause} style={pipBtn}>
          <Icon name={running?"pause":"play"} size={14} color="#f97316"/>
        </button>
        <button onClick={onStop} style={pipBtn}>
          <Icon name="stop" size={14} color="#64748b"/>
        </button>
        <button onClick={onExpand} style={pipBtn}>
          <Icon name="expand" size={14} color="#64748b"/>
        </button>
      </div>
    </div>
  );
}
const pipBtn = { background:"#1e2030", border:"none", borderRadius:8, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" };

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: TIMER
// ═══════════════════════════════════════════════════════════════════════════════
function TimerTab({ audioCtxRef, onSessionComplete, timerState, setTimerState, showPip }) {
  const { duration, remaining, running, started, subalarms, firedAlarms } = timerState;
  const [editingDur, setEditingDur] = useState(false);
  const [durInput, setDurInput] = useState({ m:"5", s:"00" });
  const [saveModal, setSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [addAlarmMin, setAddAlarmMin] = useState("");

  const update = (patch) => setTimerState(s => ({ ...s, ...patch }));

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const handleStart = () => {
    ensureAudio();
    update({ started:true, running:true });
  };
  const handlePause = () => {
    ensureAudio();
    update({ running: !running });
  };
  const handleStop = () => update({ running:false, started:false, remaining:duration, firedAlarms:new Set() });

  const applyDuration = () => {
    const m = parseInt(durInput.m)||0, s = parseInt(durInput.s)||0;
    const d = m*60+s;
    if (d > 0) { update({ duration:d, remaining:d }); store.set("timer-settings", { duration:d, subalarms }); }
    setEditingDur(false);
  };

  const addSubalarm = () => {
    const secs = parseInt(addAlarmMin)*60;
    if (!secs || secs >= duration) return;
    const ns = [...subalarms, { id:Date.now(), at:secs, label:`${addAlarmMin}m mark` }];
    update({ subalarms:ns });
    store.set("timer-settings", { duration, subalarms:ns });
    setAddAlarmMin("");
  };

  const removeSubalarm = (id) => {
    const ns = subalarms.filter(s => s.id !== id);
    update({ subalarms:ns });
    store.set("timer-settings", { duration, subalarms:ns });
  };

  const saveTemplate = () => {
    if (!templateName.trim()) return;
    const existing = store.get("templates") || [];
    store.set("templates", [...existing, { id:Date.now(), name:templateName.trim(), duration, subalarms }]);
    setTemplateName(""); setSaveModal(false);
  };

  const progress = started ? remaining / duration : 1;
  const durM = Math.floor(duration/60), durS = duration%60;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, paddingBottom:24 }}>
      {/* Duration edit */}
      <div style={{ marginTop:8, minHeight:36, display:"flex", alignItems:"center" }}>
        {editingDur ? (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input value={durInput.m} onChange={e=>setDurInput(d=>({...d,m:e.target.value}))} style={inputStyle} placeholder="min" maxLength={3}/>
            <span style={{ color:"#f97316", fontSize:24, fontFamily:"'DM Mono',monospace" }}>:</span>
            <input value={durInput.s} onChange={e=>setDurInput(d=>({...d,s:e.target.value}))} style={inputStyle} placeholder="sec" maxLength={2}/>
            <button onClick={applyDuration} style={okBtn}><Icon name="check" size={18}/></button>
          </div>
        ) : (
          <button onClick={()=>{ if(!started){ setDurInput({m:String(durM),s:String(durS).padStart(2,"0")}); setEditingDur(true); }}}
            style={{ background:"none", border:"none", cursor:started?"default":"pointer", color:"#64748b", fontSize:12, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>
            {started ? `TOTAL: ${fmtMin(duration)}` : `DURATION: ${fmtMin(duration)}  ✎`}
          </button>
        )}
      </div>

      {/* Ring */}
      <Ring progress={progress} size={240}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:52, fontWeight:700, color: remaining===0 ? "#f97316":"#f1f5f9", letterSpacing:2 }}>
          {fmt(remaining)}
        </div>
        {subalarms.length > 0 && (
          <div style={{ display:"flex", gap:4, marginTop:4 }}>
            {subalarms.map(sa => (
              <div key={sa.id} style={{ width:6, height:6, borderRadius:"50%", background: firedAlarms.has(sa.id)?"#f97316":"#475569" }}/>
            ))}
          </div>
        )}
      </Ring>

      {/* Controls */}
      <div style={{ display:"flex", gap:16, alignItems:"center" }}>
        {!started ? (
          <button onClick={handleStart} style={mainBtn("#f97316")}>
            <Icon name="play" size={26} color="#fff"/>
          </button>
        ) : (
          <>
            <button onClick={handleStop} style={mainBtn("#1e2030")}>
              <Icon name="stop" size={22} color="#f97316"/>
            </button>
            <button onClick={handlePause} style={mainBtn("#f97316")}>
              <Icon name={running?"pause":"play"} size={26} color="#fff"/>
            </button>
          </>
        )}
      </div>

      {/* Subalarms */}
      {!started && (
        <div style={{ width:"100%", maxWidth:340 }}>
          <div style={{ color:"#64748b", fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:1, marginBottom:8 }}>SUBALARMS</div>
          {subalarms.map(sa => (
            <div key={sa.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#131620", borderRadius:10, padding:"10px 14px", marginBottom:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Icon name="bell" size={14} color="#f97316"/>
                <span style={{ color:"#cbd5e1", fontFamily:"'DM Mono',monospace", fontSize:13 }}>{sa.label}</span>
              </div>
              <button onClick={()=>removeSubalarm(sa.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#475569", padding:0 }}>
                <Icon name="trash" size={14}/>
              </button>
            </div>
          ))}
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <input value={addAlarmMin} onChange={e=>setAddAlarmMin(e.target.value)} type="number"
              placeholder={`Alert at min (1–${durM})`}
              style={{ ...inputStyle, flex:1, fontSize:13, width:"auto", textAlign:"left", padding:"10px 14px" }}/>
            <button onClick={addSubalarm} style={{ ...okBtn }}>
              <Icon name="bell" size={14}/> Add
            </button>
          </div>
        </div>
      )}

      {/* Save template */}
      {!started && (
        <button onClick={()=>setSaveModal(true)} style={{ display:"flex", alignItems:"center", gap:6, background:"#131620", border:"1px solid #1e2030", borderRadius:10, padding:"10px 18px", color:"#94a3b8", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:13 }}>
          <Icon name="save" size={15} color="#f97316"/> Save as Template
        </button>
      )}

      {saveModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#0f1117", border:"1px solid #1e2030", borderRadius:16, padding:28, minWidth:280 }}>
            <div style={{ color:"#f1f5f9", fontFamily:"'DM Mono',monospace", fontSize:15, marginBottom:16 }}>Template Name</div>
            <input value={templateName} onChange={e=>setTemplateName(e.target.value)} placeholder="e.g. Morning Focus"
              style={{ ...inputStyle, width:"100%", textAlign:"left", marginBottom:16 }} autoFocus/>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setSaveModal(false)} style={{ background:"#1e2030", border:"none", borderRadius:8, padding:"8px 16px", color:"#94a3b8", cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>Cancel</button>
              <button onClick={saveTemplate} style={okBtn}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════
function TemplatesTab({ onLoad }) {
  const [templates, setTemplates] = useState([]);
  useEffect(() => { setTemplates(store.get("templates") || []); }, []);

  const del = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    store.set("templates", updated);
  };

  if (!templates.length) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:320, gap:12 }}>
      <div style={{ opacity:0.25 }}><Icon name="templates" size={48} color="#f97316"/></div>
      <div style={{ color:"#475569", fontFamily:"'DM Mono',monospace", fontSize:13, textAlign:"center" }}>No templates yet.<br/>Save one from the Timer tab.</div>
    </div>
  );

  return (
    <div style={{ padding:"8px 0" }}>
      {templates.map(t => (
        <div key={t.id} style={{ background:"#0f1117", border:"1px solid #1e2030", borderRadius:14, padding:"16px 18px", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ color:"#f1f5f9", fontFamily:"'DM Mono',monospace", fontSize:15, fontWeight:600 }}>{t.name}</div>
              <div style={{ color:"#f97316", fontFamily:"'DM Mono',monospace", fontSize:12, marginTop:3 }}>{fmtMin(t.duration)}</div>
              {t.subalarms?.length > 0 && (
                <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                  {t.subalarms.map(sa => (
                    <span key={sa.id} style={{ background:"#1e2030", borderRadius:6, padding:"2px 8px", color:"#64748b", fontSize:11, fontFamily:"'DM Mono',monospace", display:"flex", alignItems:"center", gap:4 }}>
                      <Icon name="bell" size={10} color="#f97316"/> {sa.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>onLoad(t)} style={{ background:"#f97316", border:"none", borderRadius:8, padding:"8px 14px", color:"#fff", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:12 }}>Load</button>
              <button onClick={()=>del(t.id)} style={{ background:"#1e2030", border:"none", borderRadius:8, padding:"8px 10px", cursor:"pointer" }}>
                <Icon name="trash" size={14} color="#ef4444"/>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: STATS
// ═══════════════════════════════════════════════════════════════════════════════
function StatsTab() {
  const [sessions, setSessions] = useState([]);
  useEffect(() => { setSessions(store.get("sessions") || []); }, []);

  const today = todayKey();
  const todaySecs = sessions.filter(s=>s.date===today).reduce((a,s)=>a+s.duration,0);
  const totalSecs = sessions.reduce((a,s)=>a+s.duration,0);

  const dateCounts = {};
  sessions.forEach(s => { dateCounts[s.date]=(dateCounts[s.date]||0)+1; });
  let streak=0, d=new Date();
  while(true){ const k=d.toISOString().split("T")[0]; if(dateCounts[k]){streak++;d.setDate(d.getDate()-1);}else break; }

  // Calendar — 14 weeks
  const weeks=[];
  const now=new Date(), endDate=new Date(now);
  endDate.setDate(endDate.getDate()-now.getDay()+6);
  for(let w=13;w>=0;w--){
    const week=[];
    for(let dd=0;dd<7;dd++){
      const date=new Date(endDate); date.setDate(endDate.getDate()-w*7-(6-dd));
      const key=date.toISOString().split("T")[0];
      const mins=Math.floor((sessions.filter(s=>s.date===key).reduce((a,s)=>a+s.duration,0))/60);
      week.push({key,mins,label:date.toLocaleDateString("en-US",{month:"short",day:"numeric"})});
    }
    weeks.push(week);
  }
  const maxMins=Math.max(...weeks.flat().map(d=>d.mins),1);
  const cellColor=(mins)=>{
    if(!mins) return "#0f1117";
    const i=Math.min(1,mins/Math.max(maxMins,30));
    if(i<0.25) return "#431407";
    if(i<0.5) return "#7c2d12";
    if(i<0.75) return "#c2410c";
    return "#f97316";
  };

  const last7=[];
  for(let i=6;i>=0;i--){
    const date=new Date(); date.setDate(date.getDate()-i);
    const key=date.toISOString().split("T")[0];
    const mins=Math.floor(sessions.filter(s=>s.date===key).reduce((a,s)=>a+s.duration,0)/60);
    last7.push({day:DAYS[date.getDay()],mins});
  }
  const maxBar=Math.max(...last7.map(d=>d.mins),1);

  return (
    <div style={{ paddingBottom:32 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
        {[
          {label:"TODAY", value:Math.floor(todaySecs/60)+"m"},
          {label:"STREAK", value:streak, sub:"days", icon:"flame"},
          {label:"TOTAL", value:Math.floor(totalSecs/3600)+"h"},
        ].map(card=>(
          <div key={card.label} style={{ background:"#0f1117", border:"1px solid #1e2030", borderRadius:14, padding:"14px 10px", textAlign:"center" }}>
            {card.icon && <div style={{marginBottom:2}}><Icon name={card.icon} size={16} color="#f97316"/></div>}
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:22, fontWeight:700, color:"#f97316" }}>{card.value}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#475569", marginTop:2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background:"#0f1117", border:"1px solid #1e2030", borderRadius:14, padding:"16px 14px", marginBottom:16 }}>
        <div style={{ color:"#64748b", fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:1, marginBottom:12 }}>LAST 7 DAYS (min)</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:80 }}>
          {last7.map((d,i)=>(
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ width:"100%", background:d.mins>0?"#f97316":"#1e2030", borderRadius:"4px 4px 0 0", height:Math.max(3,(d.mins/maxBar)*68), transition:"height 0.5s ease" }}/>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:i===6?"#f97316":"#475569" }}>{d.day}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:"#0f1117", border:"1px solid #1e2030", borderRadius:14, padding:"16px 14px", marginBottom:16 }}>
        <div style={{ color:"#64748b", fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:1, marginBottom:10 }}>ACTIVITY</div>
        <div style={{ display:"flex", gap:3 }}>
          {weeks.map((week,wi)=>(
            <div key={wi} style={{ display:"flex", flexDirection:"column", gap:3 }}>
              {week.map((day,di)=>(
                <div key={di} title={`${day.label}: ${day.mins}m`}
                  style={{ width:14, height:14, borderRadius:3, background:cellColor(day.mins) }}/>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:4, marginTop:8, alignItems:"center" }}>
          <span style={{ color:"#334155", fontFamily:"'DM Mono',monospace", fontSize:9 }}>Less</span>
          {["#0f1117","#431407","#7c2d12","#c2410c","#f97316"].map(c=>(
            <div key={c} style={{ width:10, height:10, borderRadius:2, background:c }}/>
          ))}
          <span style={{ color:"#334155", fontFamily:"'DM Mono',monospace", fontSize:9 }}>More</span>
        </div>
      </div>
      <div style={{ textAlign:"center", color:"#334155", fontFamily:"'DM Mono',monospace", fontSize:12 }}>{sessions.length} total sessions</div>
    </div>
  );
}

// ─── Shared styles ──────────────────────────────────────────────────────────────
const inputStyle = { background:"#0d0f18", border:"1px solid #1e2030", borderRadius:10, color:"#f1f5f9", fontFamily:"'DM Mono',monospace", fontSize:22, padding:"10px 14px", outline:"none", width:72, textAlign:"center" };
const okBtn = { background:"#f97316", border:"none", borderRadius:10, color:"#fff", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:13, padding:"10px 16px", display:"flex", alignItems:"center", gap:6 };
const mainBtn = (bg) => ({ width:64, height:64, borderRadius:"50%", background:bg, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 24px ${bg}55` });

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState(0);
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);

  const savedSettings = store.get("timer-settings") || {};
  const [timerState, setTimerState] = useState({
    duration: savedSettings.duration || 300,
    remaining: savedSettings.duration || 300,
    running: false,
    started: false,
    subalarms: savedSettings.subalarms || [],
    firedAlarms: new Set(),
  });

  // Central tick
  useEffect(() => {
    if (timerState.running) {
      intervalRef.current = setInterval(() => {
        setTimerState(s => {
          const next = s.remaining - 1;
          // Check subalarms
          s.subalarms.forEach(sa => {
            if (next === sa.at && !s.firedAlarms.has(sa.id)) {
              playSubalarm(audioCtxRef.current);
              s.firedAlarms.add(sa.id);
            }
          });
          if (next <= 0) {
            clearInterval(intervalRef.current);
            playFinish(audioCtxRef.current);
            // Save session
            const sessions = store.get("sessions") || [];
            sessions.push({ date: todayKey(), duration: s.duration, ts: Date.now() });
            store.set("sessions", sessions);
            return { ...s, remaining:0, running:false, started:false, firedAlarms:new Set() };
          }
          return { ...s, remaining:next };
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerState.running]);

  const handleLoadTemplate = (t) => {
    setTimerState(s => ({ ...s, duration:t.duration, remaining:t.duration, subalarms:t.subalarms||[], running:false, started:false, firedAlarms:new Set() }));
    setTab(0);
  };

  const showPip = timerState.started && tab !== 0;

  const tabs = [
    { label:"Timer", icon:"timer" },
    { label:"Templates", icon:"templates" },
    { label:"Stats", icon:"stats" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#080a10; }
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0f1117}::-webkit-scrollbar-thumb{background:#1e2030;border-radius:4px}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      `}</style>
      <div style={{ background:"#080a10", minHeight:"100vh", display:"flex", flexDirection:"column", fontFamily:"'DM Mono',monospace", maxWidth:420, margin:"0 auto" }}>
        {/* Header */}
        <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ color:"#f97316", fontFamily:"'DM Mono',monospace", fontSize:18, fontWeight:600, letterSpacing:2 }}>FOCUS</div>
          {timerState.started && (
            <div style={{ display:"flex", alignItems:"center", gap:6, color:"#f97316", fontFamily:"'DM Mono',monospace", fontSize:12 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#f97316", animation:"pulse 1s infinite" }}/>
              {fmt(timerState.remaining)}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex:1, padding:"12px 20px 0", overflowY:"auto" }}>
          {tab===0 && <TimerTab audioCtxRef={audioCtxRef} onSessionComplete={()=>{}} timerState={timerState} setTimerState={setTimerState} showPip={showPip}/>}
          {tab===1 && <TemplatesTab onLoad={handleLoadTemplate}/>}
          {tab===2 && <StatsTab/>}
        </div>

        {/* PiP widget when timer running and not on timer tab */}
        {showPip && (
          <PipWidget
            remaining={timerState.remaining}
            duration={timerState.duration}
            running={timerState.running}
            onPause={()=>setTimerState(s=>({...s,running:!s.running}))}
            onStop={()=>setTimerState(s=>({...s,running:false,started:false,remaining:s.duration,firedAlarms:new Set()}))}
            onExpand={()=>setTab(0)}
          />
        )}

        {/* Bottom nav */}
        <div style={{ background:"#0a0c14", borderTop:"1px solid #12151f", padding:"8px 0 16px", display:"flex" }}>
          {tabs.map((t,i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", padding:"8px 0", color:tab===i?"#f97316":"#334155", transition:"color 0.2s" }}>
              <Icon name={t.icon} size={22} color={tab===i?"#f97316":"#334155"}/>
              <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>{t.label.toUpperCase()}</span>
              {tab===i && <div style={{ width:4, height:4, borderRadius:"50%", background:"#f97316", marginTop:2 }}/>}
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </>
  );
}
