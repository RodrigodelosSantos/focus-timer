import { useState, useEffect, useRef, useCallback } from "react";

// ─── localStorage ──────────────────────────────────────────────────────────────
const store = {
  get(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
};

// ─── Themes ────────────────────────────────────────────────────────────────────
const THEMES = [
  { id:"ember",   name:"Ember",   locked:false, bg:"#080a10", surface:"#0f1117", border:"#1e2030", nav:"#0a0c14", primary:"#f97316", accent:"#fb923c", text:"#f1f5f9", muted:"#64748b", dim:"#1e2030" },
  { id:"arctic",  name:"Arctic",  locked:false, bg:"#06080f", surface:"#0d1117", border:"#1a2332", nav:"#080d14", primary:"#38bdf8", accent:"#7dd3fc", text:"#e2f0ff", muted:"#4a6580", dim:"#1a2332" },
  { id:"forest",  name:"Forest",  locked:false, bg:"#060a08", surface:"#0b110d", border:"#1a2e1e", nav:"#080d0a", primary:"#4ade80", accent:"#86efac", text:"#ecfdf5", muted:"#4a6655", dim:"#1a2e1e" },
  { id:"violet",  name:"Violet",  locked:false, bg:"#08070f", surface:"#100f1a", border:"#1e1b30", nav:"#0a0912", primary:"#a78bfa", accent:"#c4b5fd", text:"#f5f3ff", muted:"#5a5278", dim:"#1e1b30" },
  { id:"rose",    name:"Rose",    locked:false, bg:"#0f0608", surface:"#170d10", border:"#2e1a1e", nav:"#110709", primary:"#fb7185", accent:"#fda4af", text:"#fff1f2", muted:"#664a50", dim:"#2e1a1e" },
  { id:"custom",  name:"Custom",  locked:true,  bg:"#080a10", surface:"#0f1117", border:"#1e2030", nav:"#0a0c14", primary:"#f97316", accent:"#fb923c", text:"#f1f5f9", muted:"#64748b", dim:"#1e2030" },
];

// ─── Audio ─────────────────────────────────────────────────────────────────────
function playBeep(ctx, freq=880, dur=0.25, gain=0.5) {
  if (!ctx) return;
  try {
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value=freq;
    g.gain.setValueAtTime(gain,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
    o.start(); o.stop(ctx.currentTime+dur);
  } catch {}
}
function playFinish(ctx) { if(!ctx)return; [880,1100,1320].forEach((f,i)=>setTimeout(()=>playBeep(ctx,f,0.4,0.6),i*200)); }
function playSubalarm(ctx) { if(!ctx)return; playBeep(ctx,660,0.3,0.7); setTimeout(()=>playBeep(ctx,660,0.3,0.7),350); }

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const fmtMin = s => { const m=Math.floor(s/60),sec=s%60; return sec?`${m}m ${sec}s`:`${m}m`; };
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const todayKey = () => new Date().toISOString().split("T")[0];

// ─── Ripple ────────────────────────────────────────────────────────────────────
function RippleButton({ onClick, style, children, rippleColor="#ffffff22" }) {
  const ref = useRef(null);
  const handlePointer = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? rect.left+rect.width/2;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? rect.top+rect.height/2;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2.4;
    const span = document.createElement("span");
    span.style.cssText = `position:absolute;border-radius:50%;background:${rippleColor};width:${size}px;height:${size}px;left:${x-size/2}px;top:${y-size/2}px;transform:scale(0);animation:ripple-anim 0.5s ease-out forwards;pointer-events:none;z-index:0;`;
    el.appendChild(span);
    span.addEventListener("animationend", ()=>span.remove());
  }, [rippleColor]);
  return (
    <button ref={ref} onPointerDown={handlePointer} onClick={onClick}
      style={{ ...style, position:"relative", overflow:"hidden", WebkitTapHighlightColor:"transparent" }}>
      {children}
    </button>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ name, size=22, color="currentColor" }) => {
  const p = {
    timer:     <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/><line x1="12" y1="3" x2="12" y2="1"/><line x1="16.5" y1="4.5" x2="18" y2="3"/></>,
    templates: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>,
    stats:     <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    gear:      <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    trash:     <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></>,
    play:      <polygon points="5 3 19 12 5 21 5 3"/>,
    pause:     <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
    stop:      <rect x="4" y="4" width="16" height="16" rx="2"/>,
    bell:      <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    save:      <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
    check:     <polyline points="20 6 9 17 4 12"/>,
    expand:    <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>,
    lock:      <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    flame:     <path d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0c0-5-5-10-5-10z"/>,
    close:     <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {p[name]}
    </svg>
  );
};

// ─── Ring ──────────────────────────────────────────────────────────────────────
function Ring({ progress, size=240, primary, children }) {
  const r=(size-16)/2, circ=2*Math.PI*r;
  const offset=circ*(1-Math.max(0,Math.min(1,progress)));
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e203044" strokeWidth="10"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={primary||"#f97316"} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 0.5s ease", filter:`drop-shadow(0 0 6px ${primary||"#f97316"}88)` }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        {children}
      </div>
    </div>
  );
}

// ─── PiP ───────────────────────────────────────────────────────────────────────
function PipWidget({ remaining, duration, running, onPause, onStop, onExpand, theme:T }) {
  const progress=duration>0?remaining/duration:1;
  const r=22, circ=2*Math.PI*r, offset=circ*(1-progress);
  return (
    <div style={{ position:"fixed", bottom:82, right:14, zIndex:200, background:T.surface, border:`1px solid ${T.primary}`, borderRadius:20, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, boxShadow:`0 4px 24px ${T.primary}33`, minWidth:160, animation:"slideUp 0.25s ease" }}>
      <div style={{ position:"relative", width:52, height:52, flexShrink:0 }}>
        <svg width={52} height={52} style={{ transform:"rotate(-90deg)" }}>
          <circle cx={26} cy={26} r={r} fill="none" stroke={T.dim} strokeWidth="4"/>
          <circle cx={26} cy={26} r={r} fill="none" stroke={T.primary} strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition:"stroke-dashoffset 0.5s ease" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:T.text, fontWeight:700 }}>{fmt(remaining)}</span>
        </div>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        {[
          {icon:running?"pause":"play", action:onPause, color:T.primary},
          {icon:"stop",   action:onStop,   color:T.muted},
          {icon:"expand", action:onExpand, color:T.muted},
        ].map(btn=>(
          <RippleButton key={btn.icon} onClick={btn.action} rippleColor={`${btn.color}33`}
            style={{ background:T.dim, border:"none", borderRadius:8, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <Icon name={btn.icon} size={14} color={btn.color}/>
          </RippleButton>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsSheet({ theme:T, onClose, onThemeChange, customColors, onCustomColors }) {
  const [activeId, setActiveId] = useState(T.id);
  const [cp, setCp] = useState(customColors);
  const [unlocked, setUnlocked] = useState(store.get("custom-unlocked")||false);
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockErr, setUnlockErr] = useState(false);

  const tryUnlock = () => {
    if (unlockInput.trim().length>0) { setUnlocked(true); store.set("custom-unlocked",true); setUnlockErr(false); }
    else setUnlockErr(true);
  };
  const select = (t) => {
    setActiveId(t.id);
    if (t.id!=="custom") onThemeChange(t);
    else onThemeChange({ ...t, primary:cp.primary, accent:cp.accent });
  };
  const applyCustom = () => {
    const t=THEMES.find(t=>t.id==="custom");
    onCustomColors(cp);
    onThemeChange({ ...t, primary:cp.primary, accent:cp.accent });
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative", background:T.surface, borderRadius:"24px 24px 0 0", padding:"0 20px 40px", maxHeight:"85vh", overflowY:"auto", animation:"slideUp 0.32s cubic-bezier(0.34,1.2,0.64,1)" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:T.dim }}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, paddingTop:8 }}>
          <span style={{ color:T.text, fontFamily:"'DM Mono',monospace", fontSize:16, fontWeight:600 }}>Settings</span>
          <RippleButton onClick={onClose} rippleColor="#ffffff11"
            style={{ background:T.dim, border:"none", borderRadius:10, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <Icon name="close" size={16} color={T.muted}/>
          </RippleButton>
        </div>

        <div style={{ color:T.muted, fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:1.5, marginBottom:12 }}>THEME</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:24 }}>
          {THEMES.map(t=>{
            const isActive=activeId===t.id;
            const dotPrimary=t.locked?cp.primary:t.primary;
            const dotAccent=t.locked?cp.accent:t.accent;
            return (
              <RippleButton key={t.id} onClick={()=>select(t)} rippleColor={`${dotPrimary}33`}
                style={{ background:isActive?`${dotPrimary}18`:T.bg, border:`1.5px solid ${isActive?dotPrimary:T.border}`, borderRadius:14, padding:"14px 10px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8, transition:"all 0.2s ease" }}>
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  <div style={{ width:14, height:14, borderRadius:"50%", background:dotPrimary }}/>
                  <div style={{ width:14, height:14, borderRadius:"50%", background:dotAccent }}/>
                  {t.locked && <Icon name="lock" size={10} color={T.muted}/>}
                </div>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:isActive?dotPrimary:T.muted }}>{t.name}</span>
                <div style={{ width:isActive?14:0, height:2, borderRadius:1, background:dotPrimary, transition:"width 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}/>
              </RippleButton>
            );
          })}
        </div>

        {activeId==="custom" && (
          <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:16, marginBottom:16, animation:"fadeIn 0.2s ease" }}>
            {!unlocked ? (
              <div>
                <div style={{ color:T.muted, fontFamily:"'DM Mono',monospace", fontSize:12, marginBottom:12 }}>Enter any name to unlock custom colors</div>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={unlockInput} onChange={e=>{setUnlockInput(e.target.value);setUnlockErr(false);}}
                    placeholder="anything works..."
                    style={{ flex:1, background:T.surface, border:`1px solid ${unlockErr?T.primary:T.border}`, borderRadius:10, color:T.text, fontFamily:"'DM Mono',monospace", fontSize:13, padding:"10px 14px", outline:"none" }}/>
                  <RippleButton onClick={tryUnlock} rippleColor={`${T.primary}44`}
                    style={{ background:T.primary, border:"none", borderRadius:10, color:"#fff", fontFamily:"'DM Mono',monospace", fontSize:13, padding:"10px 16px", cursor:"pointer" }}>
                    Unlock
                  </RippleButton>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ color:T.muted, fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:1, marginBottom:12 }}>CUSTOM COLORS</div>
                <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                  {[{label:"Primary",key:"primary"},{label:"Accent",key:"accent"}].map(({label,key})=>(
                    <div key={key} style={{ flex:1 }}>
                      <div style={{ color:T.muted, fontSize:10, fontFamily:"'DM Mono',monospace", marginBottom:6 }}>{label.toUpperCase()}</div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <input type="color" value={cp[key]} onChange={e=>setCp(c=>({...c,[key]:e.target.value}))}
                          style={{ width:36, height:36, borderRadius:8, border:`1px solid ${T.border}`, background:"none", cursor:"pointer", padding:2 }}/>
                        <span style={{ color:T.text, fontFamily:"'DM Mono',monospace", fontSize:12 }}>{cp[key]}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <RippleButton onClick={applyCustom} rippleColor={`${cp.primary}44`}
                  style={{ background:cp.primary, border:"none", borderRadius:10, color:"#fff", fontFamily:"'DM Mono',monospace", fontSize:13, padding:"11px 20px", cursor:"pointer", width:"100%", textAlign:"center" }}>
                  Apply Colors
                </RippleButton>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: TIMER
// ═══════════════════════════════════════════════════════════════════════════════
function TimerTab({ audioCtxRef, timerState, setTimerState, theme:T }) {
  const { duration, remaining, running, started, subalarms, firedAlarms } = timerState;
  const [editingDur, setEditingDur] = useState(false);
  const [durInput, setDurInput] = useState({ m:"5", s:"00" });
  const [saveModal, setSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [addAlarmMin, setAddAlarmMin] = useState("");
  const [visible, setVisible] = useState(false);
  useEffect(()=>{ requestAnimationFrame(()=>setVisible(true)); },[]);

  const update = p => setTimerState(s=>({...s,...p}));
  const ensureAudio = () => {
    if (!audioCtxRef.current) audioCtxRef.current=new (window.AudioContext||window.webkitAudioContext)();
    if (audioCtxRef.current.state==="suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };
  const handleStart = () => { ensureAudio(); update({ started:true, running:true }); };
  const handlePause = () => { ensureAudio(); update({ running:!running }); };
  const handleStop  = () => update({ running:false, started:false, remaining:duration, firedAlarms:new Set() });
  const applyDuration = () => {
    const m=parseInt(durInput.m)||0, s=parseInt(durInput.s)||0, d=m*60+s;
    if(d>0){ update({duration:d,remaining:d}); store.set("timer-settings",{duration:d,subalarms}); }
    setEditingDur(false);
  };
  const addSubalarm = () => {
    const secs=parseInt(addAlarmMin)*60;
    if(!secs||secs>=duration) return;
    const ns=[...subalarms,{id:Date.now(),at:secs,label:`${addAlarmMin}m mark`}];
    update({subalarms:ns}); store.set("timer-settings",{duration,subalarms:ns}); setAddAlarmMin("");
  };
  const removeSubalarm = id => {
    const ns=subalarms.filter(s=>s.id!==id);
    update({subalarms:ns}); store.set("timer-settings",{duration,subalarms:ns});
  };
  const saveTemplate = () => {
    if(!templateName.trim()) return;
    const ex=store.get("templates")||[];
    store.set("templates",[...ex,{id:Date.now(),name:templateName.trim(),duration,subalarms}]);
    setTemplateName(""); setSaveModal(false);
  };

  const progress=started?remaining/duration:1;
  const durM=Math.floor(duration/60), durS=duration%60;
  const iStyle={ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontFamily:"'DM Mono',monospace", fontSize:22, padding:"10px 14px", outline:"none", width:72, textAlign:"center" };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, paddingBottom:24, opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(12px)", transition:"opacity 0.3s ease, transform 0.3s ease" }}>
      <div style={{ minHeight:36, display:"flex", alignItems:"center" }}>
        {editingDur ? (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input value={durInput.m} onChange={e=>setDurInput(d=>({...d,m:e.target.value}))} style={iStyle} placeholder="min" maxLength={3}/>
            <span style={{ color:T.primary, fontSize:24, fontFamily:"'DM Mono',monospace" }}>:</span>
            <input value={durInput.s} onChange={e=>setDurInput(d=>({...d,s:e.target.value}))} style={iStyle} placeholder="sec" maxLength={2}/>
            <RippleButton onClick={applyDuration} rippleColor={`${T.primary}44`}
              style={{ background:T.primary, border:"none", borderRadius:10, color:"#fff", cursor:"pointer", padding:"10px 14px", display:"flex", alignItems:"center" }}>
              <Icon name="check" size={18} color="#fff"/>
            </RippleButton>
          </div>
        ) : (
          <button onClick={()=>{ if(!started){ setDurInput({m:String(durM),s:String(durS).padStart(2,"0")}); setEditingDur(true); }}}
            style={{ background:"none", border:"none", cursor:started?"default":"pointer", color:T.muted, fontSize:12, fontFamily:"'DM Mono',monospace", letterSpacing:1, WebkitTapHighlightColor:"transparent" }}>
            {started?`TOTAL: ${fmtMin(duration)}`:`DURATION: ${fmtMin(duration)}  ✎`}
          </button>
        )}
      </div>

      <Ring progress={progress} size={240} primary={T.primary}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:52, fontWeight:700, color:remaining===0?T.primary:T.text, letterSpacing:2, transition:"color 0.3s" }}>
          {fmt(remaining)}
        </div>
        {subalarms.length>0 && (
          <div style={{ display:"flex", gap:4, marginTop:4 }}>
            {subalarms.map(sa=>(
              <div key={sa.id} style={{ width:6, height:6, borderRadius:"50%", background:firedAlarms.has(sa.id)?T.primary:T.dim, transition:"background 0.3s" }}/>
            ))}
          </div>
        )}
      </Ring>

      <div style={{ display:"flex", gap:16, alignItems:"center" }}>
        {!started ? (
          <RippleButton onClick={handleStart} rippleColor={`${T.primary}55`}
            style={{ width:64, height:64, borderRadius:"50%", background:T.primary, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 28px ${T.primary}55` }}>
            <Icon name="play" size={26} color="#fff"/>
          </RippleButton>
        ) : (
          <>
            <RippleButton onClick={handleStop} rippleColor={`${T.muted}44`}
              style={{ width:52, height:52, borderRadius:"50%", background:T.dim, border:`1px solid ${T.border}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="stop" size={20} color={T.primary}/>
            </RippleButton>
            <RippleButton onClick={handlePause} rippleColor={`${T.primary}55`}
              style={{ width:64, height:64, borderRadius:"50%", background:T.primary, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 28px ${T.primary}55` }}>
              <Icon name={running?"pause":"play"} size={26} color="#fff"/>
            </RippleButton>
          </>
        )}
      </div>

      {!started && (
        <div style={{ width:"100%", maxWidth:340 }}>
          <div style={{ color:T.muted, fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:1, marginBottom:8 }}>SUBALARMS</div>
          {subalarms.map(sa=>(
            <div key={sa.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", marginBottom:6, animation:"fadeIn 0.2s ease" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Icon name="bell" size={14} color={T.primary}/>
                <span style={{ color:T.text, fontFamily:"'DM Mono',monospace", fontSize:13 }}>{sa.label}</span>
              </div>
              <RippleButton onClick={()=>removeSubalarm(sa.id)} rippleColor="#ef444433"
                style={{ background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6 }}>
                <Icon name="trash" size={14} color="#ef4444"/>
              </RippleButton>
            </div>
          ))}
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <input value={addAlarmMin} onChange={e=>setAddAlarmMin(e.target.value)} type="number"
              placeholder={`Alert at min (1–${durM})`}
              style={{ flex:1, background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontFamily:"'DM Mono',monospace", fontSize:13, padding:"10px 14px", outline:"none" }}/>
            <RippleButton onClick={addSubalarm} rippleColor={`${T.primary}44`}
              style={{ background:T.primary, border:"none", borderRadius:10, color:"#fff", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:13, padding:"10px 14px", display:"flex", alignItems:"center", gap:6 }}>
              <Icon name="bell" size={14} color="#fff"/> Add
            </RippleButton>
          </div>
        </div>
      )}

      {!started && (
        <RippleButton onClick={()=>setSaveModal(true)} rippleColor={`${T.primary}22`}
          style={{ display:"flex", alignItems:"center", gap:6, background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 18px", color:T.muted, cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:13 }}>
          <Icon name="save" size={15} color={T.primary}/> Save as Template
        </RippleButton>
      )}

      {saveModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"0 20px" }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:28, width:"100%", maxWidth:340, animation:"scaleIn 0.2s ease" }}>
            <div style={{ color:T.text, fontFamily:"'DM Mono',monospace", fontSize:15, marginBottom:16 }}>Template Name</div>
            <input value={templateName} onChange={e=>setTemplateName(e.target.value)} placeholder="e.g. Morning Focus"
              style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontFamily:"'DM Mono',monospace", fontSize:15, padding:"10px 14px", outline:"none", width:"100%", marginBottom:16 }} autoFocus/>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <RippleButton onClick={()=>setSaveModal(false)} rippleColor="#ffffff11"
                style={{ background:T.dim, border:"none", borderRadius:8, padding:"8px 16px", color:T.muted, cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>Cancel</RippleButton>
              <RippleButton onClick={saveTemplate} rippleColor={`${T.primary}55`}
                style={{ background:T.primary, border:"none", borderRadius:8, padding:"8px 16px", color:"#fff", cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>Save</RippleButton>
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
function TemplatesTab({ onLoad, theme:T }) {
  const [templates, setTemplates] = useState([]);
  const [visible, setVisible] = useState(false);
  useEffect(()=>{ setTemplates(store.get("templates")||[]); requestAnimationFrame(()=>setVisible(true)); },[]);

  const del = id => {
    const u=templates.filter(t=>t.id!==id);
    setTemplates(u); store.set("templates",u);
  };

  if (!templates.length) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:320, gap:12, opacity:visible?1:0, transition:"opacity 0.3s ease" }}>
      <div style={{ opacity:0.25 }}><Icon name="templates" size={48} color={T.primary}/></div>
      <div style={{ color:T.muted, fontFamily:"'DM Mono',monospace", fontSize:13, textAlign:"center" }}>No templates yet.<br/>Save one from the Timer tab.</div>
    </div>
  );

  return (
    <div style={{ padding:"8px 0", opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(10px)", transition:"opacity 0.3s ease, transform 0.3s ease" }}>
      {templates.map((t,i)=>(
        <div key={t.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, marginBottom:10, overflow:"hidden", animationDelay:`${i*0.05}s`, animation:"fadeIn 0.25s ease both" }}>
          <div style={{ height:3, background:`linear-gradient(90deg,${T.primary},${T.accent})` }}/>
          <div style={{ padding:"14px 16px" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:T.text, fontFamily:"'DM Mono',monospace", fontSize:15, fontWeight:600, marginBottom:2 }}>{t.name}</div>
                <div style={{ display:"inline-flex", alignItems:"center", background:T.bg, border:`1px solid ${T.border}`, borderRadius:20, padding:"2px 10px", gap:4 }}>
                  <Icon name="timer" size={11} color={T.primary}/>
                  <span style={{ color:T.primary, fontFamily:"'DM Mono',monospace", fontSize:12 }}>{fmtMin(t.duration)}</span>
                </div>
                {t.subalarms?.length>0 && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                    {t.subalarms.map(sa=>(
                      <span key={sa.id} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:20, padding:"2px 10px", color:T.muted, fontSize:11, fontFamily:"'DM Mono',monospace", display:"inline-flex", alignItems:"center", gap:4 }}>
                        <Icon name="bell" size={10} color={T.primary}/>{sa.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                <RippleButton onClick={()=>onLoad(t)} rippleColor={`${T.primary}55`}
                  style={{ background:T.primary, border:"none", borderRadius:8, padding:"8px 14px", color:"#fff", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:12 }}>
                  Load
                </RippleButton>
                <RippleButton onClick={()=>del(t.id)} rippleColor="#ef444433"
                  style={{ background:T.dim, border:"none", borderRadius:8, padding:"8px 10px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                  <Icon name="trash" size={14} color="#ef4444"/>
                </RippleButton>
              </div>
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
function StatsTab({ theme:T }) {
  const [sessions, setSessions] = useState([]);
  const [visible, setVisible] = useState(false);
  useEffect(()=>{ setSessions(store.get("sessions")||[]); requestAnimationFrame(()=>setVisible(true)); },[]);

  const today=todayKey();
  const todaySecs=sessions.filter(s=>s.date===today).reduce((a,s)=>a+s.duration,0);
  const totalSecs=sessions.reduce((a,s)=>a+s.duration,0);
  const dateCounts={};
  sessions.forEach(s=>{dateCounts[s.date]=(dateCounts[s.date]||0)+1;});
  let streak=0,d=new Date();
  while(true){const k=d.toISOString().split("T")[0];if(dateCounts[k]){streak++;d.setDate(d.getDate()-1);}else break;}

  const weeks=[];
  const now=new Date(),endDate=new Date(now);
  endDate.setDate(endDate.getDate()-now.getDay()+6);
  for(let w=13;w>=0;w--){
    const week=[];
    for(let dd=0;dd<7;dd++){
      const date=new Date(endDate);date.setDate(endDate.getDate()-w*7-(6-dd));
      const key=date.toISOString().split("T")[0];
      const mins=Math.floor((sessions.filter(s=>s.date===key).reduce((a,s)=>a+s.duration,0))/60);
      week.push({key,mins,label:date.toLocaleDateString("en-US",{month:"short",day:"numeric"})});
    }
    weeks.push(week);
  }
  const maxMins=Math.max(...weeks.flat().map(d=>d.mins),1);
  const hex=T.primary;
  const cellColor=mins=>{
    if(!mins) return T.bg;
    const i=Math.min(1,mins/Math.max(maxMins,30));
    if(i<0.25) return hex+"33";
    if(i<0.5)  return hex+"66";
    if(i<0.75) return hex+"aa";
    return hex;
  };

  const last7=[];
  for(let i=6;i>=0;i--){
    const date=new Date();date.setDate(date.getDate()-i);
    const key=date.toISOString().split("T")[0];
    const mins=Math.floor(sessions.filter(s=>s.date===key).reduce((a,s)=>a+s.duration,0)/60);
    last7.push({day:DAYS[date.getDay()],mins});
  }
  const maxBar=Math.max(...last7.map(d=>d.mins),1);

  return (
    <div style={{ paddingBottom:32, opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(10px)", transition:"opacity 0.3s ease, transform 0.3s ease" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
        {[
          {label:"TODAY",value:Math.floor(todaySecs/60)+"m"},
          {label:"STREAK",value:streak,icon:"flame"},
          {label:"TOTAL",value:Math.floor(totalSecs/3600)+"h"},
        ].map(card=>(
          <div key={card.label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:"14px 10px", textAlign:"center" }}>
            {card.icon&&<div style={{marginBottom:2}}><Icon name={card.icon} size={16} color={T.primary}/></div>}
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:22, fontWeight:700, color:T.primary }}>{card.value}</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:T.muted, marginTop:2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:"16px 14px", marginBottom:16 }}>
        <div style={{ color:T.muted, fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:1, marginBottom:12 }}>LAST 7 DAYS (min)</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:80 }}>
          {last7.map((d,i)=>(
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ width:"100%", background:d.mins>0?T.primary:T.dim, borderRadius:"4px 4px 0 0", height:Math.max(3,(d.mins/maxBar)*68), transition:"height 0.6s cubic-bezier(0.34,1.2,0.64,1)" }}/>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:i===6?T.primary:T.muted }}>{d.day}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:"16px 14px", marginBottom:16 }}>
        <div style={{ color:T.muted, fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:1, marginBottom:10 }}>ACTIVITY</div>
        <div style={{ display:"flex", gap:3 }}>
          {weeks.map((week,wi)=>(
            <div key={wi} style={{ display:"flex", flexDirection:"column", gap:3 }}>
              {week.map((day,di)=>(
                <div key={di} title={`${day.label}: ${day.mins}m`}
                  style={{ width:14, height:14, borderRadius:3, background:cellColor(day.mins), transition:"background 0.3s" }}/>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:4, marginTop:8, alignItems:"center" }}>
          <span style={{ color:T.muted, fontFamily:"'DM Mono',monospace", fontSize:9 }}>Less</span>
          {[T.bg,hex+"33",hex+"66",hex+"aa",hex].map((c,i)=>(
            <div key={i} style={{ width:10, height:10, borderRadius:2, background:c }}/>
          ))}
          <span style={{ color:T.muted, fontFamily:"'DM Mono',monospace", fontSize:9 }}>More</span>
        </div>
      </div>
      <div style={{ textAlign:"center", color:T.muted, fontFamily:"'DM Mono',monospace", fontSize:12 }}>{sessions.length} total sessions</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const savedThemeId = store.get("theme-id")||"ember";
  const savedCustomColors = store.get("custom-colors")||{ primary:"#f97316", accent:"#fb923c" };
  const buildTheme = (id, cp) => {
    const t=THEMES.find(t=>t.id===id)||THEMES[0];
    if(id==="custom") return {...t, primary:cp.primary, accent:cp.accent};
    return t;
  };
  const [theme, setTheme] = useState(()=>buildTheme(savedThemeId, savedCustomColors));
  const [customColors, setCustomColors] = useState(savedCustomColors);
  const [tab, setTab] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);

  const savedSettings = store.get("timer-settings")||{};
  const [timerState, setTimerState] = useState({
    duration: savedSettings.duration||300,
    remaining: savedSettings.duration||300,
    running: false, started: false,
    subalarms: savedSettings.subalarms||[],
    firedAlarms: new Set(),
  });

  useEffect(()=>{
    if(timerState.running){
      intervalRef.current=setInterval(()=>{
        setTimerState(s=>{
          const next=s.remaining-1;
          s.subalarms.forEach(sa=>{
            if(next===sa.at&&!s.firedAlarms.has(sa.id)){
              playSubalarm(audioCtxRef.current);
              s.firedAlarms.add(sa.id);
            }
          });
          if(next<=0){
            clearInterval(intervalRef.current);
            playFinish(audioCtxRef.current);
            const sessions=store.get("sessions")||[];
            sessions.push({date:todayKey(),duration:s.duration,ts:Date.now()});
            store.set("sessions",sessions);
            return{...s,remaining:0,running:false,started:false,firedAlarms:new Set()};
          }
          return{...s,remaining:next};
        });
      },1000);
    } else { clearInterval(intervalRef.current); }
    return()=>clearInterval(intervalRef.current);
  },[timerState.running]);

  const handleThemeChange = t => { setTheme(t); store.set("theme-id",t.id); };
  const handleCustomColors = cp => { setCustomColors(cp); store.set("custom-colors",cp); };
  const handleLoadTemplate = t => {
    setTimerState(s=>({...s,duration:t.duration,remaining:t.duration,subalarms:t.subalarms||[],running:false,started:false,firedAlarms:new Set()}));
    setTab(0);
  };

  const showPip = timerState.started && tab!==0;
  const T = theme;
  const tabs=[{label:"Timer",icon:"timer"},{label:"Templates",icon:"templates"},{label:"Stats",icon:"stats"}];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{height:100%;background:${T.bg};}
        #root{height:100%;}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:${T.surface}}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:4px}
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        button{-webkit-tap-highlight-color:transparent !important;outline:none !important;}
        button:focus{outline:none !important;box-shadow:none !important;}
        @keyframes ripple-anim{to{transform:scale(1);opacity:0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes scaleIn{from{transform:scale(0.92);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>

      {/* Full-height flex column — nav never shifts */}
      <div style={{ background:T.bg, height:"100vh", display:"flex", flexDirection:"column", fontFamily:"'DM Mono',monospace", maxWidth:420, margin:"0 auto", transition:"background 0.3s ease" }}>

        {/* Header — fixed height */}
        <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ color:T.primary, fontFamily:"'DM Mono',monospace", fontSize:18, fontWeight:600, letterSpacing:2, transition:"color 0.3s" }}>FOCUS</div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {timerState.started && (
              <div style={{ display:"flex", alignItems:"center", gap:6, color:T.primary, fontFamily:"'DM Mono',monospace", fontSize:12 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:T.primary, animation:"pulse 1s infinite" }}/>
                {fmt(timerState.remaining)}
              </div>
            )}
            <RippleButton onClick={()=>setShowSettings(true)} rippleColor={`${T.primary}33`}
              style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <Icon name="gear" size={18} color={T.muted}/>
            </RippleButton>
          </div>
        </div>

        {/* Scrollable content area — takes remaining space */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 20px 0", minHeight:0 }}>
          {tab===0 && <TimerTab key="timer" audioCtxRef={audioCtxRef} timerState={timerState} setTimerState={setTimerState} theme={T}/>}
          {tab===1 && <TemplatesTab key="templates" onLoad={handleLoadTemplate} theme={T}/>}
          {tab===2 && <StatsTab key="stats" theme={T}/>}
        </div>

        {/* PiP */}
        {showPip && (
          <PipWidget remaining={timerState.remaining} duration={timerState.duration} running={timerState.running}
            onPause={()=>setTimerState(s=>({...s,running:!s.running}))}
            onStop={()=>setTimerState(s=>({...s,running:false,started:false,remaining:s.duration,firedAlarms:new Set()}))}
            onExpand={()=>setTab(0)} theme={T}/>
        )}

        {/* Nav — fixed at bottom, never resizes */}
        <div style={{ background:T.nav, borderTop:`1px solid ${T.border}`, paddingBottom:"env(safe-area-inset-bottom,10px)", display:"flex", flexShrink:0, transition:"background 0.3s, border-color 0.3s" }}>
          {tabs.map((t,i)=>(
            <RippleButton key={i} onClick={()=>setTab(i)} rippleColor={`${T.primary}28`}
              style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", padding:"10px 0 6px", color:tab===i?T.primary:T.muted, transition:"color 0.2s" }}>
              <Icon name={t.icon} size={22} color={tab===i?T.primary:T.muted}/>
              <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>{t.label.toUpperCase()}</span>
              <div style={{ width:tab===i?16:0, height:2, borderRadius:1, background:T.primary, transition:"width 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}/>
            </RippleButton>
          ))}
        </div>
      </div>

      {showSettings && (
        <SettingsSheet theme={T} onClose={()=>setShowSettings(false)}
          onThemeChange={handleThemeChange} customColors={customColors} onCustomColors={handleCustomColors}/>
      )}
    </>
  );
}
