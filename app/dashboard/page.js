"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Check, X, Flame, Trophy, CalendarDays, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const MAX_RINGS = 22;
const VB = 200;
const CENTER = VB / 2;
const CORE_R = 20;
const RING_GAP = 3.2;
const FREE_HABIT_LIMIT = 3;

const COLORS = {
  bg: "#15120D",
  surface: "#211C15",
  surfaceHover: "#2A2419",
  border: "#372F22",
  textPrimary: "#EDE6D8",
  textMuted: "#A79C89",
  textFaint: "#6E6552",
  dim: "#4A4433",
  danger: "#B8623E",
};

const PALETTE = [
  { key: "moss", label: "Moss", hex: "#8FA663" },
  { key: "amber", label: "Amber", hex: "#E0A452" },
  { key: "clay", label: "Clay", hex: "#C97456" },
  { key: "dusk", label: "Dusk", hex: "#6B8CAA" },
  { key: "berry", label: "Berry", hex: "#A15C77" },
];
const SUGGESTIONS = ["Drink water", "Read", "Move my body", "Meditate", "Sleep by 11"];

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function lerpColor(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}
function toISO(d) { return d.toISOString().slice(0, 10); }
function todayISO() { return toISO(new Date()); }
function dateRange(startISO, endISO) {
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(toISO(d));
  return days;
}
function buildDaySeries(habit) {
  const days = dateRange(habit.created_at, todayISO());
  let running = 0;
  return days.map((date) => {
    const checked = habit.checkinSet.has(date);
    running = checked ? running + 1 : 0;
    return { date, checked, streakLen: running };
  });
}
function currentStreak(habit) {
  let cursor = new Date();
  if (!habit.checkinSet.has(toISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (habit.checkinSet.has(toISO(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
function longestStreak(habit) {
  const dates = [...habit.checkinSet].sort();
  let best = 0, run = 0, prev = null;
  for (const d of dates) {
    run = prev && (new Date(d) - new Date(prev)) / 86400000 === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
function accentFor(key) { return PALETTE.find((p) => p.key === key)?.hex || PALETTE[0].hex; }

function RingBox({ habit, onToggleToday }) {
  const accent = accentFor(habit.color);
  const full = useMemo(() => buildDaySeries(habit), [habit]);
  const shown = full.slice(-MAX_RINGS);
  const hasCore = full.length > shown.length;
  const todayChecked = habit.checkinSet.has(todayISO());

  return (
    <div className="relative shrink-0" style={{ width: 108, height: 108 }}>
      <svg viewBox={`0 0 ${VB} ${VB}`} width="108" height="108">
        {hasCore && (
          <circle cx={CENTER} cy={CENTER} r={CORE_R} fill={lerpColor(COLORS.dim, accent, 0.45)} fillOpacity="0.35"
            stroke={lerpColor(COLORS.dim, accent, 0.6)} strokeOpacity="0.5" strokeWidth="1.5" />
        )}
        {shown.map((day, i) => {
          const r = CORE_R + (i + 1) * RING_GAP;
          const isToday = day.date === todayISO();
          if (isToday && !day.checked) {
            return (
              <circle key={day.date} cx={CENTER} cy={CENTER} r={r} fill="none" stroke={accent}
                strokeOpacity="0.35" strokeWidth="2.4" strokeDasharray="4,4">
                <animate attributeName="stroke-opacity" values="0.15;0.5;0.15" dur="2.4s" repeatCount="indefinite" />
              </circle>
            );
          }
          if (!day.checked) {
            return (
              <circle key={day.date} cx={CENTER} cy={CENTER} r={r} fill="none" stroke={COLORS.border}
                strokeOpacity="0.6" strokeWidth="1.6" strokeDasharray="2.5,3" />
            );
          }
          const t = Math.min(day.streakLen / 8, 1);
          return (
            <circle key={day.date} cx={CENTER} cy={CENTER} r={r} fill="none"
              stroke={lerpColor(COLORS.dim, accent, t)} strokeWidth={2.2 + t * 2.6} strokeLinecap="round" />
          );
        })}
      </svg>
      <button
        onClick={() => onToggleToday(habit)}
        className="absolute rounded-full flex items-center justify-center transition-transform active:scale-90"
        style={{
          width: 38, height: 38, top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: todayChecked ? accent : COLORS.surface,
          border: `1.5px ${todayChecked ? "solid" : "dashed"} ${accent}`,
        }}
      >
        {todayChecked ? <Check size={17} color={COLORS.bg} strokeWidth={3} /> : <Plus size={17} color={accent} strokeWidth={2.5} />}
      </button>
    </div>
  );
}

function HabitCard({ habit, onToggleToday, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accent = accentFor(habit.color);
  const streak = currentStreak(habit);
  const longest = longestStreak(habit);
  const total = habit.checkinSet.size;

  return (
    <div className="rounded-2xl p-3.5 flex gap-3.5 items-center" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
      <RingBox habit={habit} onToggleToday={onToggleToday} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-[15px] font-medium" style={{ color: COLORS.textPrimary }}>{habit.name}</h3>
          {confirmDelete ? (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onDelete(habit.id)} className="text-[11px] px-2 py-1 rounded-lg" style={{ background: COLORS.danger, color: COLORS.bg }}>Remove</button>
              <button onClick={() => setConfirmDelete(false)} className="p-1 rounded-lg" style={{ color: COLORS.textFaint }}><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1 shrink-0 opacity-60" style={{ color: COLORS.textFaint }}><Trash2 size={14} /></button>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          <span className="flex items-center gap-1 text-[11px]" style={{ color: streak > 0 ? accent : COLORS.textMuted, fontFamily: "'IBM Plex Mono',monospace" }}><Flame size={12} /> {streak}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: COLORS.textMuted, fontFamily: "'IBM Plex Mono',monospace" }}><Trophy size={12} /> {longest}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: COLORS.textMuted, fontFamily: "'IBM Plex Mono',monospace" }}><CalendarDays size={12} /> {total}</span>
        </div>
      </div>
    </div>
  );
}

function AddHabitModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0].key);
  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4 z-50" style={{ background: "rgba(10,8,5,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg mb-3" style={{ color: COLORS.textPrimary, fontFamily: "'Fraunces',serif", fontWeight: 600 }}>Plant a habit</h2>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="What will you grow?"
          className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none mb-3"
          style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }} />
        <div className="flex flex-wrap gap-1.5 mb-4">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => setName(s)} className="text-[11px] px-2.5 py-1 rounded-full"
              style={{ background: COLORS.surfaceHover, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}>{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-5">
          {PALETTE.map((p) => (
            <button key={p.key} onClick={() => setColor(p.key)} className="rounded-full"
              style={{ width: 26, height: 26, background: p.hex, boxShadow: color === p.key ? `0 0 0 2px ${COLORS.surface}, 0 0 0 4px ${p.hex}` : "none" }} />
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm" style={{ color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}>Cancel</button>
          <button onClick={() => name.trim() && onAdd(name.trim(), color)} disabled={!name.trim()}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium disabled:opacity-40" style={{ background: accentFor(color), color: COLORS.bg }}>Plant it</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [habits, setHabits] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }
      setUser(session.user);

      const { data: profile } = await supabase.from("profiles").select("is_pro").eq("id", session.user.id).single();
      setIsPro(!!profile?.is_pro);

      const { data: habitRows } = await supabase.from("habits").select("*").eq("user_id", session.user.id).order("created_at");
      const { data: checkinRows } = await supabase.from("checkins").select("*").eq("user_id", session.user.id);

      const grouped = (habitRows || []).map((h) => ({
        ...h,
        checkinSet: new Set((checkinRows || []).filter((c) => c.habit_id === h.id).map((c) => c.date)),
      }));
      setHabits(grouped);
      setLoaded(true);
    })();
  }, []);

  const toggleToday = async (habit) => {
    const today = todayISO();
    const checked = habit.checkinSet.has(today);
    setHabits((prev) => prev.map((h) => {
      if (h.id !== habit.id) return h;
      const next = new Set(h.checkinSet);
      checked ? next.delete(today) : next.add(today);
      return { ...h, checkinSet: next };
    }));
    if (checked) {
      await supabase.from("checkins").delete().eq("habit_id", habit.id).eq("date", today);
    } else {
      await supabase.from("checkins").insert({ habit_id: habit.id, user_id: user.id, date: today });
    }
  };

  const addHabit = async (name, color) => {
    if (!isPro && habits.length >= FREE_HABIT_LIMIT) {
      setShowAdd(false);
      setShowUpgrade(true);
      return;
    }
    const { data, error } = await supabase.from("habits").insert({ user_id: user.id, name, color }).select().single();
    if (!error) setHabits((prev) => [...prev, { ...data, checkinSet: new Set() }]);
    setShowAdd(false);
  };

  const deleteHabit = async (id) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await supabase.from("habits").delete().eq("id", id);
  };

  const startCheckout = async () => {
    const res = await fetch("/api/checkout", { method: "POST", body: JSON.stringify({ userId: user.id }) });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-md px-4 pt-8 pb-24">
        <div className="flex items-end justify-between mb-1">
          <h1 style={{ color: COLORS.textPrimary, fontFamily: "'Fraunces',serif", fontWeight: 600 }} className="text-3xl">Grove</h1>
          <span className="text-[11px]" style={{ color: COLORS.textFaint, fontFamily: "'IBM Plex Mono',monospace" }}>{dateLabel}</span>
        </div>
        <p className="text-[13px] mb-5" style={{ color: COLORS.textMuted }}>
          Each day checked adds a ring. Momentum grows warmer the longer a streak holds.
        </p>

        <button onClick={() => setShowAdd(true)} className="w-full rounded-2xl py-3 mb-2 flex items-center justify-center gap-2 text-sm"
          style={{ border: `1.5px dashed ${COLORS.border}`, color: COLORS.textMuted }}>
          <Plus size={16} /> Plant a new habit
        </button>
        {!isPro && (
          <p className="text-center text-[11px] mb-5" style={{ color: COLORS.textFaint }}>
            {habits.length}/{FREE_HABIT_LIMIT} free habits used — <button onClick={() => setShowUpgrade(true)} className="underline">go Pro</button> for unlimited
          </p>
        )}

        {!loaded ? (
          <div className="text-center py-16 text-sm" style={{ color: COLORS.textFaint }}>Loading your grove…</div>
        ) : habits.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-4 rounded-full" style={{ width: 70, height: 70, border: `1.5px dashed ${COLORS.border}` }} />
            <p style={{ color: COLORS.textMuted }} className="text-sm">Nothing planted yet. Add your first habit above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {habits.map((h) => <HabitCard key={h.id} habit={h} onToggleToday={toggleToday} onDelete={deleteHabit} />)}
          </div>
        )}
      </div>

      {showAdd && <AddHabitModal onClose={() => setShowAdd(false)} onAdd={addHabit} />}
      {showUpgrade && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(10,8,5,0.7)" }} onClick={() => setShowUpgrade(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5 text-center" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg mb-2" style={{ color: COLORS.textPrimary, fontFamily: "'Fraunces',serif", fontWeight: 600 }}>Go Pro</h2>
            <p className="text-sm mb-5" style={{ color: COLORS.textMuted }}>Unlimited habits, one-time payment.</p>
            <button onClick={startCheckout} className="w-full rounded-xl py-2.5 text-sm font-medium" style={{ background: "#E0A452", color: COLORS.bg }}>Upgrade — $9</button>
          </div>
        </div>
      )}
    </div>
  );
                  }
