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
          <span className="flex items-center gap-1 text-[11px]" style={{ color: streak > 0 ? accent : COLORS.textMuted, fontFamily: "'IBM Plex Mono',monospace" }}>
