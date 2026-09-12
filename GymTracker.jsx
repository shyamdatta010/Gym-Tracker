import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Home as HomeIcon, Dumbbell, TrendingUp, Play, Check, X, Plus, Minus,
  ChevronLeft, ChevronRight, Settings as SettingsIcon, Download,
  Upload, Trash2, Clock, Trophy, ChevronUp, ChevronDown, Edit2,
  ArrowLeft, CircleCheck,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Theme                                                                   */
/* Plain hex values applied via inline `style`, never Tailwind's `[...]`   */
/* arbitrary-value syntax — this sandbox has no JIT compiler, so bracket   */
/* classes like bg-[#1E2126] silently do nothing. Inline style always     */
/* renders regardless of what's precompiled.                              */
/* ---------------------------------------------------------------------- */

const C = {
  bg: "#15171B",
  sheet: "#1A1C20",
  surface: "#1E2126",
  surface2: "#262A31",
  border: "#2E323A",
  text: "#ECEEF1",
  dim: "#8B919B",
  accent: "#FF5A36",
  accentDark: "#151719",
  accent2: "#C9FF3D",
  danger: "#FF6B6B",
  dangerBorder: "#7A2A2A",
  setDone: "#22301F",
};
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const HEAD_FONT = "Oswald, sans-serif";

const KG_PER_LB = 0.45359237;
const toKg = (v, unit) => (unit === "lb" ? v * KG_PER_LB : v);
const fromKg = (v, unit) => (unit === "lb" ? v / KG_PER_LB : v);
const round1 = (v) => Math.round(v * 10) / 10;
const fmtWeight = (kg, unit) => {
  if (kg == null || Number.isNaN(kg)) return "-";
  return round1(fromKg(kg, unit)).toString();
};
const epley1RM = (weightKg, reps) => (reps <= 1 ? weightKg : weightKg * (1 + reps / 30));
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfWeek = (d) => {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7; // Monday=0
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() - day);
  return dt;
};
const sameDay = (a, b) => a.toDateString() === b.toDateString();

// Counts, per exercise, the first time a session's best set beats every prior session's
// best for that exercise. Only PR events landing inside `weekStart..now` are counted.
function computeWeeklyPRs(sessions, weekStart) {
  const sorted = [...sessions].sort((a, b) => new Date(a.endedAt) - new Date(b.endedAt));
  const bestSoFar = new Map();
  let count = 0;
  for (const s of sorted) {
    const inWeek = new Date(s.endedAt) >= weekStart;
    for (const e of s.exercises) {
      const completed = e.sets.filter((x) => x.completed);
      if (!completed.length) continue;
      const maxW = Math.max(...completed.map((x) => x.weight));
      const prevBest = bestSoFar.get(e.exerciseId) || 0;
      if (maxW > prevBest) {
        if (inWeek) count += 1;
        bestSoFar.set(e.exerciseId, maxW);
      }
    }
  }
  return count;
}

const MUSCLE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body", "Cardio"];

// Generic, widely-known exercise names grouped by muscle group — not sourced from
// any single site, just common gym vocabulary.
const DEFAULT_EXERCISES = [
  // Chest
  ["Barbell Bench Press", "Chest"], ["Incline Barbell Bench Press", "Chest"],
  ["Incline Dumbbell Press", "Chest"], ["Flat Dumbbell Press", "Chest"],
  ["Decline Bench Press", "Chest"], ["Push-up", "Chest"], ["Dumbbell Fly", "Chest"],
  ["Cable Fly", "Chest"], ["Chest Dip", "Chest"], ["Machine Chest Press", "Chest"],
  ["Pec Deck Machine", "Chest"], ["Incline Cable Fly", "Chest"], ["Smith Machine Bench Press", "Chest"],
  ["Landmine Press", "Chest"], ["Svend Press", "Chest"], ["Wide Push-up", "Chest"],
  // Back
  ["Deadlift", "Back"], ["Sumo Deadlift", "Back"], ["Pull-up", "Back"], ["Chin-up", "Back"],
  ["Lat Pulldown", "Back"], ["Barbell Row", "Back"], ["Pendlay Row", "Back"],
  ["Seated Cable Row", "Back"], ["T-Bar Row", "Back"], ["Single-Arm Dumbbell Row", "Back"],
  ["Face Pull", "Back"], ["Back Extension", "Back"], ["Wide-Grip Pulldown", "Back"],
  ["Straight-Arm Pulldown", "Back"], ["Meadows Row", "Back"], ["Renegade Row", "Back"],
  ["Good Morning", "Back"], ["Rack Pull", "Back"], ["Inverted Row", "Back"],
  // Legs
  ["Back Squat", "Legs"], ["Front Squat", "Legs"], ["Goblet Squat", "Legs"],
  ["Romanian Deadlift", "Legs"], ["Leg Press", "Legs"], ["Leg Extension", "Legs"],
  ["Leg Curl", "Legs"], ["Walking Lunge", "Legs"], ["Bulgarian Split Squat", "Legs"],
  ["Hip Thrust", "Legs"], ["Calf Raise", "Legs"], ["Hack Squat", "Legs"], ["Sumo Squat", "Legs"],
  // Shoulders
  ["Overhead Press", "Shoulders"], ["Arnold Press", "Shoulders"],
  ["Dumbbell Shoulder Press", "Shoulders"], ["Lateral Raise", "Shoulders"],
  ["Front Raise", "Shoulders"], ["Rear Delt Fly", "Shoulders"], ["Upright Row", "Shoulders"],
  ["Barbell Shrug", "Shoulders"], ["Cable Lateral Raise", "Shoulders"], ["Seated Dumbbell Press", "Shoulders"],
  ["Cuban Press", "Shoulders"], ["Push Press", "Shoulders"], ["Machine Shoulder Press", "Shoulders"],
  ["Reverse Pec Deck Fly", "Shoulders"],
  // Arms
  ["Barbell Curl", "Arms"], ["Dumbbell Curl", "Arms"], ["Hammer Curl", "Arms"],
  ["Preacher Curl", "Arms"], ["Cable Curl", "Arms"], ["Tricep Pushdown", "Arms"],
  ["Skull Crusher", "Arms"], ["Close-Grip Bench Press", "Arms"],
  ["Overhead Tricep Extension", "Arms"], ["Tricep Dip", "Arms"], ["Concentration Curl", "Arms"],
  ["Zottman Curl", "Arms"], ["EZ-Bar Curl", "Arms"], ["Reverse Curl", "Arms"],
  ["Cable Overhead Tricep Extension", "Arms"], ["Diamond Push-up", "Arms"],
  // Core
  ["Plank", "Core"], ["Hanging Leg Raise", "Core"], ["Cable Crunch", "Core"],
  ["Russian Twist", "Core"], ["Sit-up", "Core"], ["Bicycle Crunch", "Core"],
  ["Ab Wheel Rollout", "Core"], ["Mountain Climbers", "Core"], ["Side Plank", "Core"],
  ["V-Up", "Core"], ["Dead Bug", "Core"], ["Flutter Kicks", "Core"], ["Woodchopper", "Core"],
  ["Toe Touch", "Core"],
  // Full Body
  ["Clean and Press", "Full Body"], ["Kettlebell Swing", "Full Body"],
  ["Burpee", "Full Body"], ["Thruster", "Full Body"], ["Farmer's Carry", "Full Body"],
  ["Turkish Get-Up", "Full Body"],
  // Cardio
  ["Treadmill Run", "Cardio"], ["Rowing Machine", "Cardio"], ["Jump Rope", "Cardio"],
  ["Stationary Bike", "Cardio"], ["Elliptical", "Cardio"], ["Stair Climber", "Cardio"],
  ["Box Jump", "Cardio"], ["Assault Bike", "Cardio"], ["Sled Push", "Cardio"],
  ["Battle Ropes", "Cardio"], ["Swimming", "Cardio"], ["Outdoor Cycling", "Cardio"],
  ["Incline Treadmill Walk", "Cardio"],
];

const REST_PRESETS = [30, 60, 90, 120, 180];

const STORAGE_KEYS = {
  settings: "gym_settings",
  exercises: "gym_exercises",
  routines: "gym_routines",
  sessions: "gym_sessions",
  active: "gym_active_session",
  rotation: "gym_rotation_index",
};

async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    if (!res || res.value == null) return fallback;
    return JSON.parse(res.value);
  } catch (e) {
    return fallback;
  }
}
async function saveKey(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
  } catch (e) {
    console.error("save failed", key, e);
  }
}
async function deleteKey(key) {
  try { await window.storage.delete(key, false); } catch (e) { /* noop */ }
}

/* ---------------------------------------------------------------------- */
/* Global (non-Tailwind) CSS — font import, placeholder color, number      */
/* input spinner removal. Plain <style> tags always work.                 */
/* ---------------------------------------------------------------------- */

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
    .gt-root input::placeholder { color: ${C.dim}; opacity: 1; }
    .gt-root input[type=number]::-webkit-outer-spin-button,
    .gt-root input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .gt-root input[type=number] { -moz-appearance: textfield; }
  `}</style>
);

/* ---------------------------------------------------------------------- */
/* Small shared UI atoms                                                  */
/* ---------------------------------------------------------------------- */

const Screen = ({ children }) => (
  <div className="min-h-full" style={{ padding: "24px 20px 112px" }}>{children}</div>
);

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 11, letterSpacing: "0.04em", color: C.dim, marginBottom: 8 }}>{children}</div>
);

const Card = ({ children, className = "", onClick, style }) => (
  <div
    onClick={onClick}
    className={`rounded-2xl ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""} ${className}`}
    style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 16, ...style }}
  >
    {children}
  </div>
);

const BTN_VARIANTS = {
  primary: { backgroundColor: C.accent, color: C.accentDark, fontWeight: 600, border: "none" },
  ghost: { backgroundColor: "transparent", color: C.text, border: `1px solid ${C.border}` },
  subtle: { backgroundColor: C.surface2, color: C.text, border: "none" },
  lime: { backgroundColor: C.accent2, color: C.accentDark, fontWeight: 600, border: "none" },
  danger: { backgroundColor: "transparent", color: C.danger, border: `1px solid ${C.dangerBorder}` },
};

const Btn = ({ children, onClick, variant = "primary", className = "", disabled, type = "button", style }) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={`rounded-xl active:scale-[0.97] transition-transform ${className}`}
    style={{
      ...BTN_VARIANTS[variant],
      padding: "12px 16px",
      fontSize: 15,
      lineHeight: 1,
      opacity: disabled ? 0.4 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      ...style,
    }}
  >
    {children}
  </button>
);

const Stepper = ({ value, onChange, step = 1, min = 0, max = 999, suffix, label }) => {
  const val = value === "" || value == null ? 0 : value;
  const clamp = (n) => Math.min(max, Math.max(min, round1(n)));
  const dec = () => onChange(clamp(val - step));
  const inc = () => onChange(clamp(val + step));
  return (
    <div style={{ width: 108 }}>
      {label && <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>{label}</div>}
      <div
        className="flex items-center overflow-hidden rounded-lg"
        style={{ backgroundColor: C.surface2, border: `1px solid ${C.border}` }}
      >
        <button
          type="button"
          onClick={dec}
          className="flex items-center justify-center shrink-0 active:scale-90 transition-transform"
          style={{ width: 32, height: 36, color: C.text, background: "none", border: "none" }}
        >
          <Minus size={13} />
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={val}
          onChange={(e) => onChange(e.target.value === "" ? 0 : clamp(Number(e.target.value)))}
          className="w-full min-w-0 outline-none"
          style={{ background: "transparent", color: C.text, fontSize: 14, border: "none", textAlign: "center" }}
        />
        <button
          type="button"
          onClick={inc}
          className="flex items-center justify-center shrink-0 active:scale-90 transition-transform"
          style={{ width: 32, height: 36, color: C.text, background: "none", border: "none" }}
        >
          <Plus size={13} />
        </button>
      </div>
      {suffix && <div style={{ fontSize: 9, color: C.dim, textAlign: "center", marginTop: 4 }}>{suffix}</div>}
    </div>
  );
};

const Empty = ({ icon: Icon, title, sub }) => (
  <div className="flex flex-col items-center text-center" style={{ padding: "56px 0", color: C.dim }}>
    <Icon size={30} style={{ marginBottom: 12, opacity: 0.6 }} />
    <div style={{ color: C.text, fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{title}</div>
    {sub && <div style={{ fontSize: 13, maxWidth: 240 }}>{sub}</div>}
  </div>
);

const TextInput = (props) => (
  <input
    {...props}
    className={`w-full rounded-xl outline-none ${props.className || ""}`}
    style={{
      backgroundColor: C.surface,
      border: `1px solid ${C.border}`,
      color: C.text,
      fontSize: 15,
      padding: "12px 16px",
      ...props.style,
    }}
  />
);

const Select = (props) => (
  <select
    {...props}
    className={`w-full rounded-xl outline-none ${props.className || ""}`}
    style={{
      backgroundColor: C.surface,
      border: `1px solid ${C.border}`,
      color: C.text,
      fontSize: 15,
      padding: "12px 16px",
      ...props.style,
    }}
  />
);

/* ---------------------------------------------------------------------- */
/* Home                                                                    */
/* ---------------------------------------------------------------------- */

function Home({ routines, sessions, exercises, rotationIndex, activeSession, unit, name, onStartRoutine, onResume, onGoWorkouts }) {
  const nextRoutine = routines.length ? routines[rotationIndex % routines.length] : null;
  const afterRoutine = routines.length > 1 ? routines[(rotationIndex + 1) % routines.length] : null;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "GOOD MORNING";
    if (h < 18) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  }, []);
  const greetingLine = name ? `${greeting}, ${name.toUpperCase()}` : greeting;

  const muscleGroupsFor = (routine) => {
    if (!routine) return [];
    if (routine.targetMuscleGroups?.length) return routine.targetMuscleGroups;
    const groups = [];
    routine.exercises.forEach((it) => {
      const ex = exercises.find((e) => e.id === it.exerciseId);
      if (ex && !groups.includes(ex.muscleGroup)) groups.push(ex.muscleGroup);
    });
    return groups;
  };

  const weekStats = useMemo(() => {
    const wkStart = startOfWeek(new Date());
    const weekSessions = sessions.filter((s) => new Date(s.endedAt) >= wkStart);
    const volumeKg = weekSessions.reduce(
      (a, s) => a + s.exercises.reduce(
        (b, e) => b + e.sets.filter((x) => x.completed).reduce((c, x) => c + x.weight * x.reps, 0), 0
      ), 0
    );
    return {
      count: weekSessions.length,
      volume: Math.round(fromKg(volumeKg, unit)),
      prs: computeWeeklyPRs(sessions, wkStart),
    };
  }, [sessions, unit]);

  return (
    <Screen>
      <div style={{ fontSize: 12, letterSpacing: "0.15em", color: C.dim, marginBottom: 20 }}>{greetingLine}</div>

      {activeSession ? (
        <Card style={{ marginBottom: 20, borderColor: rgba(C.accent, 0.5) }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 12, color: C.accent, fontWeight: 500, marginBottom: 4 }}>IN PROGRESS</div>
              <div style={{ fontSize: 17, color: C.text, fontWeight: 500 }}>{activeSession.routineName}</div>
            </div>
            <Btn variant="primary" onClick={onResume}>Resume</Btn>
          </div>
        </Card>
      ) : (
        <Card style={{ marginBottom: 20 }}>
          <SectionLabel>Today's Workout</SectionLabel>
          {nextRoutine ? (
            <>
              <div
                style={{ fontSize: 26, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em", color: C.text, lineHeight: 1.2, marginBottom: 6, fontFamily: HEAD_FONT }}
              >
                {nextRoutine.name}
              </div>
              {muscleGroupsFor(nextRoutine).length > 0 && (
                <div style={{ fontSize: 13, color: C.dim, marginBottom: 2 }}>{muscleGroupsFor(nextRoutine).join(" • ")}</div>
              )}
              <div style={{ fontSize: 13, color: C.dim, marginBottom: 16 }}>
                {nextRoutine.exercises.length} Exercise{nextRoutine.exercises.length !== 1 ? "s" : ""}
              </div>
              <Btn
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
                style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
                onClick={() => onStartRoutine(nextRoutine)}
              >
                <Play size={16} /> Start Workout
              </Btn>
            </>
          ) : (
            <div>
              <div style={{ fontSize: 15, color: C.text, marginBottom: 12 }}>No routines yet</div>
              <Btn variant="subtle" className="w-full" onClick={onGoWorkouts}>Create a routine</Btn>
            </div>
          )}
        </Card>
      )}

      <SectionLabel>This Week</SectionLabel>
      <Card style={{ marginBottom: 20 }}>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div style={{ fontSize: 22, color: C.text, fontWeight: 600 }}>{weekStats.count}</div>
            <div style={{ fontSize: 11, color: C.dim }}>Workout{weekStats.count !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 22, color: C.text, fontWeight: 600 }}>{weekStats.volume.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: C.dim }}>{unit} Volume</div>
          </div>
          <div>
            <div style={{ fontSize: 22, color: C.text, fontWeight: 600 }}>{weekStats.prs}</div>
            <div style={{ fontSize: 11, color: C.dim }}>PR{weekStats.prs !== 1 ? "s" : ""}</div>
          </div>
        </div>
      </Card>

      {afterRoutine && (
        <div className="flex items-center justify-between" style={{ padding: "0 4px" }}>
          <span style={{ fontSize: 12, color: C.dim }}>Next Planned</span>
          <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{afterRoutine.name}</span>
        </div>
      )}
    </Screen>
  );
}

/* ---------------------------------------------------------------------- */
/* Workouts (routines list + editor)                                      */
/* ---------------------------------------------------------------------- */

function WorkoutsList({ routines, exercises, onCreate, onEdit, onDelete, onStart }) {
  const exById = (id) => exercises.find((e) => e.id === id);
  return (
    <Screen>
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: C.text, fontFamily: HEAD_FONT }}>Routines</h1>
        <Btn variant="lime" onClick={onCreate} className="flex items-center gap-1" style={{ padding: "8px 14px" }}>
          <Plus size={16} /> New
        </Btn>
      </div>
      {routines.length === 0 && (
        <Empty icon={Dumbbell} title="No routines yet" sub="Build a routine with your exercises, sets and target weights." />
      )}
      <div className="flex flex-col gap-3">
        {routines.map((r) => {
          const groups = r.targetMuscleGroups?.length
            ? r.targetMuscleGroups
            : [...new Set(r.exercises.map((it) => exById(it.exerciseId)?.muscleGroup).filter(Boolean))];
          return (
            <Card key={r.id}>
              <div className="flex items-start justify-between" style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em", color: C.text, fontFamily: HEAD_FONT }}>
                  {r.name}
                </div>
                <div className="flex gap-2 shrink-0" style={{ marginLeft: 8 }}>
                  <button onClick={() => onEdit(r)} className="rounded-lg" style={{ padding: 8, backgroundColor: C.surface2, color: C.text, border: "none" }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => onDelete(r)} className="rounded-lg" style={{ padding: 8, backgroundColor: C.surface2, color: C.danger, border: "none" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {groups.length > 0 && <div style={{ fontSize: 12, color: C.dim, marginBottom: 12 }}>{groups.join(" • ")}</div>}

              <div className="flex flex-col" style={{ marginBottom: 12 }}>
                {r.exercises.map((it, i) => {
                  const ex = exById(it.exerciseId);
                  return (
                    <div
                      key={it.id}
                      className="flex items-center justify-between"
                      style={{ padding: "6px 0", borderTop: i > 0 ? `1px solid ${C.border}` : "none" }}
                    >
                      <span style={{ fontSize: 14, color: C.text }}>{ex?.name || "Unknown"}</span>
                      <span className="shrink-0" style={{ fontSize: 13, color: C.dim, marginLeft: 12 }}>
                        {it.targetSets} × {it.targetReps}
                        {it.targetWeight ? ` @ ${it.targetWeight}` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Btn variant="ghost" className="w-full flex items-center justify-center gap-2" onClick={() => onStart(r)}>
                <Play size={14} /> Start
              </Btn>
            </Card>
          );
        })}
      </div>
    </Screen>
  );
}

function RoutineEditor({ routine, exercises, unit, onSave, onCancel, onAddCustomExercise }) {
  const [name, setName] = useState(routine?.name || "");
  const [targetGroups, setTargetGroups] = useState(routine?.targetMuscleGroups || []);
  const [items, setItems] = useState(routine?.exercises ? [...routine.exercises] : []);
  const [picking, setPicking] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState(MUSCLE_GROUPS[0]);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const toggleGroup = (g) => {
    setTargetGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const move = (idx, dir) => {
    const next = [...items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
  };
  const update = (idx, patch) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };
  const remove = (idx) => setItems(items.filter((_, i) => i !== idx));
  const addExercise = (ex) => {
    setItems([...items, { id: uid(), exerciseId: ex.id, targetSets: 3, targetReps: 10, targetWeight: null, restSec: 90 }]);
    setPicking(false);
  };
  const exById = (id) => exercises.find((e) => e.id === id);

  return (
    <Screen>
      <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
        <button onClick={onCancel} style={{ padding: 8, marginLeft: -8, color: C.text, background: "none", border: "none" }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: C.text, fontFamily: HEAD_FONT }}>
          {routine ? "Edit Routine" : "New Routine"}
        </h1>
      </div>

      <TextInput
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Routine name (e.g. Push Day)"
        style={{ marginBottom: 16 }}
      />

      <SectionLabel>Target muscle groups</SectionLabel>
      <div className="flex gap-2 flex-wrap" style={{ marginBottom: 24 }}>
        {MUSCLE_GROUPS.map((g) => {
          const active = targetGroups.includes(g);
          return (
            <button
              key={g}
              onClick={() => toggleGroup(g)}
              className="rounded-full"
              style={{
                padding: "6px 12px",
                fontSize: 12,
                border: `1px solid ${active ? C.accent : C.border}`,
                backgroundColor: active ? C.accent : "transparent",
                color: active ? C.accentDark : C.dim,
              }}
            >
              {g}
            </button>
          );
        })}
      </div>

      <SectionLabel>Exercises</SectionLabel>
      <div className="flex flex-col gap-3" style={{ marginBottom: 16 }}>
        {items.map((it, idx) => {
          const ex = exById(it.exerciseId);
          return (
            <Card key={it.id}>
              <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>{ex?.name || "Unknown"}</div>
                  <div style={{ fontSize: 11, color: C.dim }}>{ex?.muscleGroup}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => move(idx, -1)} disabled={idx === 0}
                    className="rounded-lg"
                    style={{ padding: 6, backgroundColor: C.surface2, color: C.text, border: "none", opacity: idx === 0 ? 0.3 : 1 }}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => move(idx, 1)} disabled={idx === items.length - 1}
                    className="rounded-lg"
                    style={{ padding: 6, backgroundColor: C.surface2, color: C.text, border: "none", opacity: idx === items.length - 1 ? 0.3 : 1 }}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={() => remove(idx)} className="rounded-lg" style={{ padding: 6, backgroundColor: C.surface2, color: C.danger, border: "none" }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Stepper label="Sets" value={it.targetSets} min={1} max={20} onChange={(v) => update(idx, { targetSets: v })} />
                <Stepper label="Reps" value={it.targetReps} min={1} max={100} onChange={(v) => update(idx, { targetReps: v })} />
                <Stepper
                  label="Weight (optional)"
                  value={it.targetWeight ?? 0}
                  step={unit === "lb" ? 5 : 2.5}
                  max={2000}
                  suffix={unit}
                  onChange={(v) => update(idx, { targetWeight: v === 0 ? null : v })}
                />
                <div style={{ width: 110 }}>
                  <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Rest</div>
                  <Select
                    value={it.restSec}
                    onChange={(e) => update(idx, { restSec: Number(e.target.value) })}
                    style={{ padding: "9px 8px", fontSize: 13 }}
                  >
                    {REST_PRESETS.map((s) => <option key={s} value={s}>{s}s</option>)}
                  </Select>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Btn
        variant="subtle"
        className="w-full flex items-center justify-center gap-2"
        style={{ marginBottom: 32 }}
        onClick={() => setPicking(true)}
      >
        <Plus size={16} /> Add Exercise
      </Btn>

      <div className="flex gap-3">
        <Btn variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Btn>
        <Btn
          variant="primary"
          className="flex-1"
          disabled={!name.trim() || items.length === 0}
          onClick={() => onSave({ id: routine?.id || uid(), name: name.trim(), targetMuscleGroups: targetGroups, exercises: items })}
        >
          Save Routine
        </Btn>
      </div>

      {picking && (
        <div
          className="fixed inset-0 flex items-end"
          style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 30 }}
          onClick={() => setPicking(false)}
        >
          <div
            className="w-full overflow-y-auto"
            style={{
              backgroundColor: C.sheet,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: "75vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 999, margin: "0 auto 16px" }} />
            <div style={{ fontSize: 16, color: C.text, fontWeight: 500, marginBottom: 16 }}>Add Exercise</div>
            {!showCustomForm ? (
              <>
                <Btn
                  variant="subtle"
                  className="w-full flex items-center justify-center gap-2"
                  style={{ marginBottom: 12 }}
                  onClick={() => setShowCustomForm(true)}
                >
                  <Plus size={14} /> Create custom exercise
                </Btn>
                {MUSCLE_GROUPS.map((g) => {
                  const inGroup = exercises.filter((e) => e.muscleGroup === g);
                  if (!inGroup.length) return null;
                  return (
                    <div key={g} style={{ marginBottom: 16 }}>
                      <SectionLabel>{g}</SectionLabel>
                      <div className="flex flex-col gap-1">
                        {inGroup.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => addExercise(e)}
                            className="text-left rounded-lg"
                            style={{ padding: "10px 12px", backgroundColor: C.surface, color: C.text, fontSize: 14, border: "none" }}
                          >
                            {e.name}
                            {e.isCustom && <span style={{ color: C.dim, fontSize: 11 }}> · custom</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <TextInput
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Exercise name"
                />
                <Select value={customGroup} onChange={(e) => setCustomGroup(e.target.value)}>
                  {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
                <div className="flex gap-3">
                  <Btn variant="ghost" className="flex-1" onClick={() => setShowCustomForm(false)}>Back</Btn>
                  <Btn
                    variant="primary"
                    className="flex-1"
                    disabled={!customName.trim()}
                    onClick={() => {
                      const ex = onAddCustomExercise(customName.trim(), customGroup);
                      setCustomName("");
                      setShowCustomForm(false);
                      addExercise(ex);
                    }}
                  >
                    Add
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Screen>
  );
}

/* ---------------------------------------------------------------------- */
/* Rest Timer overlay                                                     */
/* ---------------------------------------------------------------------- */

function RestTimer({ initialSec, onClose }) {
  const [total, setTotal] = useState(initialSec);
  const [remaining, setRemaining] = useState(initialSec);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, running]);

  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: rgba("#0F1114", 0.97), zIndex: 40, padding: "0 24px" }}
    >
      <div style={{ fontSize: 13, color: C.dim, letterSpacing: "0.04em", marginBottom: 24 }}>REST</div>
      <div className="relative" style={{ width: 224, height: 224, marginBottom: 32 }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke={C.surface2} strokeWidth="6" />
          <circle
            cx="50" cy="50" r="44" fill="none" stroke={C.accent} strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: 44, fontWeight: 600, color: C.text, fontFamily: HEAD_FONT }}>
            {mm}:{ss}
          </span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap justify-center" style={{ marginBottom: 32 }}>
        {REST_PRESETS.map((s) => {
          const active = s === total;
          return (
            <button
              key={s}
              onClick={() => { setTotal(s); setRemaining(s); setRunning(true); }}
              className="rounded-lg"
              style={{
                padding: "8px 12px",
                fontSize: 13,
                border: `1px solid ${active ? C.accent : C.border}`,
                backgroundColor: active ? C.accent : "transparent",
                color: active ? C.accentDark : C.text,
              }}
            >
              {s}s
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 w-full" style={{ maxWidth: 320 }}>
        <Btn variant="ghost" className="flex-1" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Resume"}
        </Btn>
        <Btn variant="primary" className="flex-1" onClick={onClose}>Skip Rest</Btn>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Active Workout                                                         */
/* ---------------------------------------------------------------------- */

function ActiveWorkout({ session, setSession, exercises, sessions, unit, onFinish, onExitToBackground }) {
  const [idx, setIdx] = useState(0);
  const [restSec, setRestSec] = useState(null);
  const exList = session.exercises;
  const cur = exList[idx];
  const exMeta = exercises.find((e) => e.id === cur.exerciseId);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [session.startedAt]);

  const prevPerformance = useMemo(() => {
    for (let i = sessions.length - 1; i >= 0; i--) {
      const found = sessions[i].exercises.find((e) => e.exerciseId === cur.exerciseId);
      if (found && found.sets.some((s) => s.completed)) return found;
    }
    return null;
  }, [sessions, cur.exerciseId]);

  const suggestion = useMemo(() => {
    if (!prevPerformance) return null;
    const completed = prevPerformance.sets.filter((s) => s.completed);
    if (!completed.length) return null;
    const target = cur.targetReps;
    const hitAll = completed.length >= (cur.targetSets || 1) && completed.every((s) => s.reps >= target);
    const bestW = Math.max(...completed.map((s) => s.weight));
    const inc = unit === "lb" ? 2.5 * KG_PER_LB : 2.5; // display-unit increment
    if (hitAll) {
      return { text: `Try ${fmtWeight(bestW, unit)} + ${round1(inc)}${unit} today — you hit all sets last time.` };
    }
    return { text: `Repeat ${fmtWeight(bestW, unit)}${unit} and aim for ${target} reps.` };
  }, [prevPerformance, cur, unit]);

  const updateSets = (sets) => {
    const nextExercises = exList.map((e, i) => (i === idx ? { ...e, sets } : e));
    setSession({ ...session, exercises: nextExercises });
  };

  const setRow = (si, patch) => {
    const sets = [...cur.sets];
    sets[si] = { ...sets[si], ...patch };
    updateSets(sets);
  };
  const completeSet = (si) => {
    const wasCompleted = cur.sets[si].completed;
    setRow(si, { completed: !wasCompleted });
    if (!wasCompleted) setRestSec(cur.restSec || 90);
  };
  const addSet = () => {
    const last = cur.sets[cur.sets.length - 1];
    updateSets([...cur.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? cur.targetReps, completed: false }]);
  };
  const removeSet = (si) => updateSets(cur.sets.filter((_, i) => i !== si));

  const totalSets = exList.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = exList.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: C.bg, zIndex: 20 }}>
      <div className="flex items-center justify-between" style={{ padding: "24px 20px 12px" }}>
        <button onClick={onExitToBackground} style={{ padding: 8, marginLeft: -8, color: C.text, background: "none", border: "none" }}>
          <ChevronDown size={22} />
        </button>
        <div className="text-center">
          <div style={{ fontSize: 13, color: C.dim }}>{session.routineName}</div>
          <div style={{ fontSize: 15, color: C.text, fontWeight: 500, fontFamily: HEAD_FONT }}>
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </div>
        </div>
        <button onClick={() => onFinish(session)} style={{ fontSize: 13, color: C.accent, fontWeight: 500, padding: "0 8px", background: "none", border: "none" }}>
          Finish
        </button>
      </div>

      <div className="rounded-full overflow-hidden" style={{ height: 4, backgroundColor: C.surface2, margin: "0 20px 8px" }}>
        <div style={{ height: "100%", backgroundColor: C.accent2, width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
      </div>

      <div className="flex items-center justify-between" style={{ padding: "8px 20px" }}>
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
          style={{ padding: 8, color: C.text, background: "none", border: "none", opacity: idx === 0 ? 0.3 : 1 }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontSize: 12, color: C.dim }}>{idx + 1} / {exList.length}</div>
        <button
          onClick={() => setIdx((i) => Math.min(exList.length - 1, i + 1))} disabled={idx === exList.length - 1}
          style={{ padding: 8, color: C.text, background: "none", border: "none", opacity: idx === exList.length - 1 ? 0.3 : 1 }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: "0 20px 24px" }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 24, color: C.text, fontWeight: 600, fontFamily: HEAD_FONT }}>{exMeta?.name}</h2>
          <div style={{ fontSize: 12, color: C.dim }}>{exMeta?.muscleGroup} · Target {cur.targetSets}×{cur.targetReps} · Rest {cur.restSec}s</div>
        </div>

        {prevPerformance && (
          <Card style={{ marginBottom: 12 }}>
            <SectionLabel>Previous performance</SectionLabel>
            <div className="flex gap-2 flex-wrap">
              {prevPerformance.sets.filter((s) => s.completed).map((s, i) => (
                <span key={i} className="rounded-md" style={{ fontSize: 12, padding: "4px 8px", backgroundColor: C.surface2, color: C.text }}>
                  {fmtWeight(s.weight, unit)}{unit} × {s.reps}
                </span>
              ))}
            </div>
          </Card>
        )}

        {suggestion && (
          <Card style={{ marginBottom: 16, borderColor: rgba(C.accent2, 0.4) }}>
            <div className="flex items-start gap-2">
              <TrendingUp size={15} className="shrink-0" style={{ color: C.accent2, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: C.text }}>{suggestion.text}</div>
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2" style={{ fontSize: 11, color: C.dim, padding: "0 8px" }}>
            <div style={{ width: 32 }}>Set</div>
            <div className="flex-1 text-center">Weight ({unit})</div>
            <div className="flex-1 text-center">Reps</div>
            <div style={{ width: 36 }} />
          </div>
          {cur.sets.map((s, si) => (
            <div
              key={si}
              className="flex items-center gap-2 rounded-xl"
              style={{ padding: "8px 8px", backgroundColor: s.completed ? C.setDone : C.surface, border: `1px solid ${C.border}` }}
            >
              <div style={{ width: 32, textAlign: "center", fontSize: 13, color: C.dim }}>{si + 1}</div>
              <input
                type="number" inputMode="decimal"
                value={round1(fromKg(s.weight, unit))}
                onChange={(e) => setRow(si, { weight: toKg(Number(e.target.value || 0), unit) })}
                className="flex-1 rounded-lg outline-none"
                style={{ padding: "8px 0", textAlign: "center", fontSize: 15, backgroundColor: C.surface2, color: C.text, border: "none" }}
              />
              <input
                type="number" inputMode="numeric"
                value={s.reps}
                onChange={(e) => setRow(si, { reps: Number(e.target.value || 0) })}
                className="flex-1 rounded-lg outline-none"
                style={{ padding: "8px 0", textAlign: "center", fontSize: 15, backgroundColor: C.surface2, color: C.text, border: "none" }}
              />
              <button
                onClick={() => completeSet(si)}
                className="rounded-lg flex items-center justify-center"
                style={{ width: 36, height: 36, backgroundColor: s.completed ? C.accent2 : C.surface2, color: s.completed ? C.accentDark : C.dim, border: "none" }}
              >
                <Check size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3" style={{ marginTop: 12 }}>
          <Btn variant="subtle" className="flex-1 flex items-center justify-center gap-1" onClick={addSet}>
            <Plus size={14} /> Add Set
          </Btn>
          {cur.sets.length > 1 && (
            <Btn variant="ghost" className="flex-1" onClick={() => removeSet(cur.sets.length - 1)}>Remove Set</Btn>
          )}
        </div>

        <button
          onClick={() => setRestSec(cur.restSec || 90)}
          className="w-full flex items-center justify-center gap-1"
          style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: C.dim, padding: "8px 0", background: "none", border: "none" }}
        >
          <Clock size={13} /> Start rest timer manually
        </button>
      </div>

      {restSec != null && <RestTimer initialSec={restSec} onClose={() => setRestSec(null)} />}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Progress                                                                */
/* ---------------------------------------------------------------------- */

function Progress({ sessions, exercises, unit }) {
  const exerciseIdsWithHistory = useMemo(() => {
    const ids = new Set();
    sessions.forEach((s) => s.exercises.forEach((e) => { if (e.sets.some((x) => x.completed)) ids.add(e.exerciseId); }));
    return [...ids];
  }, [sessions]);

  const [selectedId, setSelectedId] = useState(exerciseIdsWithHistory[0] || null);
  useEffect(() => {
    if (!selectedId && exerciseIdsWithHistory.length) setSelectedId(exerciseIdsWithHistory[0]);
  }, [exerciseIdsWithHistory, selectedId]);

  const [metric, setMetric] = useState("weight"); // weight | volume | reps
  const [monthOffset, setMonthOffset] = useState(0);

  const exName = (id) => exercises.find((e) => e.id === id)?.name || "Exercise";

  const chartData = useMemo(() => {
    if (!selectedId) return [];
    const rows = [];
    sessions.forEach((s) => {
      const found = s.exercises.find((e) => e.exerciseId === selectedId);
      if (!found) return;
      const completed = found.sets.filter((x) => x.completed);
      if (!completed.length) return;
      const maxWeight = Math.max(...completed.map((x) => x.weight));
      const volume = completed.reduce((a, x) => a + x.weight * x.reps, 0);
      const maxReps = Math.max(...completed.map((x) => x.reps));
      rows.push({
        date: new Date(s.endedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        weight: round1(fromKg(maxWeight, unit)),
        volume: round1(fromKg(volume, unit)),
        reps: maxReps,
      });
    });
    return rows;
  }, [sessions, selectedId, unit]);

  const prs = useMemo(() => {
    if (!selectedId) return { bestWeight: 0, bestVolume: 0, bestReps: 0, best1rm: 0 };
    let bestWeight = 0, bestVolume = 0, bestReps = 0, best1rm = 0;
    sessions.forEach((s) => {
      const found = s.exercises.find((e) => e.exerciseId === selectedId);
      if (!found) return;
      const completed = found.sets.filter((x) => x.completed);
      if (!completed.length) return;
      const vol = completed.reduce((a, x) => a + x.weight * x.reps, 0);
      if (vol > bestVolume) bestVolume = vol;
      completed.forEach((x) => {
        if (x.weight > bestWeight) bestWeight = x.weight;
        if (x.reps > bestReps) bestReps = x.reps;
        const e1 = epley1RM(x.weight, x.reps);
        if (e1 > best1rm) best1rm = e1;
      });
    });
    return { bestWeight, bestVolume, bestReps, best1rm };
  }, [sessions, selectedId]);

  const stats = useMemo(() => {
    const total = sessions.length;
    // streak: consecutive weeks with >=1 session, counting back from current week
    let streak = 0;
    let cursor = startOfWeek(new Date());
    while (true) {
      const weekEnd = new Date(cursor); weekEnd.setDate(weekEnd.getDate() + 7);
      const hasSession = sessions.some((s) => { const d = new Date(s.endedAt); return d >= cursor && d < weekEnd; });
      if (!hasSession) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 7);
    }
    const last4wkStart = new Date(); last4wkStart.setDate(last4wkStart.getDate() - 28);
    const last4 = sessions.filter((s) => new Date(s.endedAt) >= last4wkStart).length;
    return { total, streak, avgPerWeek: round1(last4 / 4) };
  }, [sessions]);

  const calMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const calDays = useMemo(() => {
    const year = calMonth.getFullYear(), month = calMonth.getMonth();
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [calMonth]);

  const sessionsByDay = useMemo(() => {
    const map = new Map();
    sessions.forEach((s) => {
      const d = new Date(s.endedAt);
      const key = d.toDateString();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [sessions]);

  return (
    <Screen>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: C.text, fontFamily: HEAD_FONT, marginBottom: 24 }}>Progress</h1>

      <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 24 }}>
        <Card className="text-center" style={{ padding: 12 }}>
          <div style={{ fontSize: 20, color: C.text, fontWeight: 600 }}>{stats.total}</div>
          <div style={{ fontSize: 10, color: C.dim }}>workouts</div>
        </Card>
        <Card className="text-center" style={{ padding: 12 }}>
          <div style={{ fontSize: 20, color: C.text, fontWeight: 600 }}>{stats.streak}</div>
          <div style={{ fontSize: 10, color: C.dim }}>week streak</div>
        </Card>
        <Card className="text-center" style={{ padding: 12 }}>
          <div style={{ fontSize: 20, color: C.text, fontWeight: 600 }}>{stats.avgPerWeek}</div>
          <div style={{ fontSize: 10, color: C.dim }}>avg / week</div>
        </Card>
      </div>

      {exerciseIdsWithHistory.length === 0 ? (
        <Empty icon={TrendingUp} title="No history yet" sub="Finish a workout to start seeing progress, PRs and charts here." />
      ) : (
        <>
          <SectionLabel>Exercise</SectionLabel>
          <Select
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ marginBottom: 16 }}
          >
            {exerciseIdsWithHistory.map((id) => <option key={id} value={id}>{exName(id)}</option>)}
          </Select>

          <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 16 }}>
            <Card style={{ padding: 12 }}>
              <div className="flex items-center gap-1" style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>
                <Trophy size={11} /> Best weight
              </div>
              <div style={{ fontSize: 16, color: C.text, fontWeight: 600 }}>{fmtWeight(prs.bestWeight, unit)} {unit}</div>
            </Card>
            <Card style={{ padding: 12 }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Est. 1RM</div>
              <div style={{ fontSize: 16, color: C.text, fontWeight: 600 }}>{fmtWeight(prs.best1rm, unit)} {unit}</div>
            </Card>
            <Card style={{ padding: 12 }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Best reps</div>
              <div style={{ fontSize: 16, color: C.text, fontWeight: 600 }}>{prs.bestReps}</div>
            </Card>
          </div>

          <div className="flex gap-2" style={{ marginBottom: 12 }}>
            {[["weight", "Weight"], ["volume", "Volume"], ["reps", "Reps"]].map(([k, label]) => {
              const active = metric === k;
              return (
                <button
                  key={k}
                  onClick={() => setMetric(k)}
                  className="rounded-lg"
                  style={{
                    padding: "6px 12px", fontSize: 12, border: "none",
                    backgroundColor: active ? C.accent : C.surface2,
                    color: active ? C.accentDark : C.dim,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <Card style={{ marginBottom: 24, padding: 12 }}>
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="date" stroke={C.dim} fontSize={11} />
                  <YAxis stroke={C.dim} fontSize={11} />
                  <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: C.text }} />
                  <Line type="monotone" dataKey={metric} stroke={C.accent} strokeWidth={2} dot={{ r: 3, fill: C.accent }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <SectionLabel>Calendar</SectionLabel>
        <div className="flex items-center gap-3">
          <button onClick={() => setMonthOffset((m) => m - 1)} style={{ color: C.dim, background: "none", border: "none" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 12, color: C.text, width: 96, textAlign: "center" }}>
            {calMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => setMonthOffset((m) => m + 1)} disabled={monthOffset >= 0}
            style={{ color: C.dim, background: "none", border: "none", opacity: monthOffset >= 0 ? 0.3 : 1 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <Card>
        <div className="grid grid-cols-7 gap-1 text-center" style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calDays.map((d, i) => {
            const has = d && sessionsByDay.get(d.toDateString());
            const isToday = d && sameDay(d, new Date());
            return (
              <div key={i} className="aspect-square flex items-center justify-center">
                {d && (
                  <div
                    className="w-full h-full rounded-lg flex items-center justify-center"
                    style={{
                      fontSize: 11,
                      backgroundColor: has ? C.accent2 : "transparent",
                      color: has ? C.accentDark : C.dim,
                      fontWeight: has ? 500 : 400,
                      border: isToday && !has ? `1px solid ${C.accent}` : "none",
                    }}
                  >
                    {d.getDate()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </Screen>
  );
}

/* ---------------------------------------------------------------------- */
/* Settings / backup modal                                                */
/* ---------------------------------------------------------------------- */

function SettingsModal({ settings, onChangeUnit, onChangeName, onExport, onImport, onReset, onClose }) {
  const fileRef = useRef(null);
  const [nameDraft, setNameDraft] = useState(settings.name || "");
  return (
    <div
      className="fixed inset-0 flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 30 }}
      onClick={onClose}
    >
      <div
        className="w-full overflow-y-auto"
        style={{ backgroundColor: C.sheet, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 999, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 18, color: C.text, fontWeight: 500, marginBottom: 20 }}>Settings</div>

        <SectionLabel>Your name</SectionLabel>
        <div style={{ marginBottom: 24 }}>
          <TextInput
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => onChangeName(nameDraft.trim())}
            placeholder="e.g. Alex"
          />
        </div>

        <SectionLabel>Units</SectionLabel>
        <div className="flex gap-2" style={{ marginBottom: 24 }}>
          {["kg", "lb"].map((u) => {
            const active = settings.unit === u;
            return (
              <button
                key={u}
                onClick={() => onChangeUnit(u)}
                className="flex-1 rounded-xl"
                style={{
                  padding: "10px 0", fontSize: 14, border: "none",
                  backgroundColor: active ? C.accent : C.surface2,
                  color: active ? C.accentDark : C.text,
                  fontWeight: active ? 500 : 400,
                }}
              >
                {u === "kg" ? "Kilograms" : "Pounds"}
              </button>
            );
          })}
        </div>

        <SectionLabel>Backup</SectionLabel>
        <div className="flex flex-col gap-3" style={{ marginBottom: 24 }}>
          <Btn variant="subtle" className="w-full flex items-center justify-center gap-2" onClick={onExport}>
            <Download size={15} /> Export data (JSON)
          </Btn>
          <Btn variant="subtle" className="w-full flex items-center justify-center gap-2" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import data
          </Btn>
          <input
            ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }}
          />
        </div>

        <SectionLabel>Danger zone</SectionLabel>
        <Btn variant="danger" className="w-full flex items-center justify-center gap-2" onClick={onReset}>
          <Trash2 size={15} /> Reset all data
        </Btn>

        <div className="text-center" style={{ fontSize: 11, color: C.dim, marginTop: 24 }}>
          All data stays on this device. No account, no sync.
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Root App                                                                */
/* ---------------------------------------------------------------------- */

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("home");
  const [settings, setSettings] = useState({ unit: "kg", name: "" });
  const [exercises, setExercises] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [activeSession, setActiveSession] = useState(null);
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(undefined); // undefined=not editing, null=new
  const [confirmDeleteRoutine, setConfirmDeleteRoutine] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      const [s, ex, rt, ss, act, rot] = await Promise.all([
        loadKey(STORAGE_KEYS.settings, { unit: "kg", name: "" }),
        loadKey(STORAGE_KEYS.exercises, null),
        loadKey(STORAGE_KEYS.routines, []),
        loadKey(STORAGE_KEYS.sessions, []),
        loadKey(STORAGE_KEYS.active, null),
        loadKey(STORAGE_KEYS.rotation, 0),
      ]);
      setSettings(s);
      const defaultsList = DEFAULT_EXERCISES.map(([name, muscleGroup]) => ({ id: uid(), name, muscleGroup, isCustom: false }));
      let exList;
      if (!ex || !ex.length) {
        exList = defaultsList;
      } else {
        // Merge in any new default exercises (matched by name) that this saved
        // library predates, without touching existing entries or custom exercises.
        const existingNames = new Set(ex.map((e) => e.name.trim().toLowerCase()));
        const missing = defaultsList.filter((d) => !existingNames.has(d.name.trim().toLowerCase()));
        exList = missing.length ? [...ex, ...missing] : ex;
      }
      setExercises(exList);
      if (exList !== ex) saveKey(STORAGE_KEYS.exercises, exList);
      setRoutines(rt);
      setSessions(ss);
      setActiveSession(act);
      setRotationIndex(rot);
      setLoaded(true);
    })();
  }, []);

  const flashToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  /* --- exercises --- */
  const addCustomExercise = (name, muscleGroup) => {
    const ex = { id: uid(), name, muscleGroup, isCustom: true };
    const next = [...exercises, ex];
    setExercises(next);
    saveKey(STORAGE_KEYS.exercises, next);
    return ex;
  };

  /* --- routines --- */
  const saveRoutine = (routine) => {
    const exists = routines.some((r) => r.id === routine.id);
    const next = exists ? routines.map((r) => (r.id === routine.id ? routine : r)) : [...routines, routine];
    setRoutines(next);
    saveKey(STORAGE_KEYS.routines, next);
    setEditingRoutine(undefined);
    flashToast("Routine saved");
  };
  const deleteRoutine = (routine) => {
    const idxOfDeleted = routines.findIndex((r) => r.id === routine.id);
    const next = routines.filter((r) => r.id !== routine.id);
    setRoutines(next);
    saveKey(STORAGE_KEYS.routines, next);
    let newRot = rotationIndex;
    if (next.length === 0) newRot = 0;
    else if (idxOfDeleted <= rotationIndex) newRot = ((rotationIndex - 1) % next.length + next.length) % next.length;
    setRotationIndex(newRot);
    saveKey(STORAGE_KEYS.rotation, newRot);
    setConfirmDeleteRoutine(null);
  };

  /* --- active workout --- */
  const startRoutine = (routine) => {
    const session = {
      id: uid(),
      routineId: routine.id,
      routineName: routine.name,
      startedAt: new Date().toISOString(),
      endedAt: null,
      exercises: routine.exercises.map((it) => ({
        exerciseId: it.exerciseId,
        targetSets: it.targetSets,
        targetReps: it.targetReps,
        restSec: it.restSec,
        sets: Array.from({ length: Math.max(1, it.targetSets || 1) }, () => ({ weight: toKg(it.targetWeight || 0, settings.unit), reps: it.targetReps || 0, completed: false })),
      })),
    };
    setActiveSession(session);
    saveKey(STORAGE_KEYS.active, session);
    setShowActiveWorkout(true);
  };

  const persistActiveSession = useCallback((s) => {
    setActiveSession(s);
    saveKey(STORAGE_KEYS.active, s);
  }, []);

  const finishWorkout = (session) => {
    const finished = { ...session, endedAt: new Date().toISOString() };
    const nextSessions = [...sessions, finished];
    setSessions(nextSessions);
    saveKey(STORAGE_KEYS.sessions, nextSessions);
    setActiveSession(null);
    deleteKey(STORAGE_KEYS.active);
    setShowActiveWorkout(false);

    if (routines.length) {
      const finishedIdx = routines.findIndex((r) => r.id === session.routineId);
      const newRot = finishedIdx >= 0 ? (finishedIdx + 1) % routines.length : rotationIndex;
      setRotationIndex(newRot);
      saveKey(STORAGE_KEYS.rotation, newRot);
    }
    flashToast("Workout saved");
  };

  /* --- settings / backup --- */
  const changeUnit = (unit) => {
    const next = { ...settings, unit };
    setSettings(next);
    saveKey(STORAGE_KEYS.settings, next);
  };
  const changeName = (name) => {
    const next = { ...settings, name };
    setSettings(next);
    saveKey(STORAGE_KEYS.settings, next);
  };

  const exportData = async () => {
    const payload = { exportedAt: new Date().toISOString(), settings, exercises, routines, sessions, rotationIndex };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iron-log-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flashToast("Exported");
  };

  const importData = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.settings) { setSettings(data.settings); await saveKey(STORAGE_KEYS.settings, data.settings); }
      if (data.exercises) { setExercises(data.exercises); await saveKey(STORAGE_KEYS.exercises, data.exercises); }
      if (data.routines) { setRoutines(data.routines); await saveKey(STORAGE_KEYS.routines, data.routines); }
      if (data.sessions) { setSessions(data.sessions); await saveKey(STORAGE_KEYS.sessions, data.sessions); }
      if (typeof data.rotationIndex === "number") { setRotationIndex(data.rotationIndex); await saveKey(STORAGE_KEYS.rotation, data.rotationIndex); }
      flashToast("Import complete");
      setShowSettings(false);
    } catch (e) {
      flashToast("Import failed — invalid file");
    }
  };

  const resetAll = async () => {
    await Promise.all(Object.values(STORAGE_KEYS).map((k) => deleteKey(k)));
    setSettings({ unit: "kg", name: "" });
    const exList = DEFAULT_EXERCISES.map(([name, muscleGroup]) => ({ id: uid(), name, muscleGroup, isCustom: false }));
    setExercises(exList);
    saveKey(STORAGE_KEYS.exercises, exList);
    setRoutines([]);
    setSessions([]);
    setActiveSession(null);
    setRotationIndex(0);
    setShowSettings(false);
    flashToast("All data reset");
  };

  if (!loaded) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ minHeight: 600, backgroundColor: C.bg }}>
        <Dumbbell style={{ color: C.accent }} size={28} />
      </div>
    );
  }

  return (
    <div className="gt-root w-full relative" style={{ minHeight: 640, backgroundColor: C.bg, fontFamily: "Inter, sans-serif" }}>
      <GlobalStyle />

      {tab === "home" && (
        <Home
          routines={routines}
          sessions={sessions}
          exercises={exercises}
          rotationIndex={rotationIndex}
          activeSession={activeSession}
          unit={settings.unit}
          name={settings.name}
          onStartRoutine={startRoutine}
          onResume={() => setShowActiveWorkout(true)}
          onGoWorkouts={() => setTab("workouts")}
        />
      )}

      {tab === "workouts" && editingRoutine === undefined && (
        <WorkoutsList
          routines={routines}
          exercises={exercises}
          onCreate={() => setEditingRoutine(null)}
          onEdit={(r) => setEditingRoutine(r)}
          onDelete={(r) => setConfirmDeleteRoutine(r)}
          onStart={startRoutine}
        />
      )}

      {tab === "workouts" && editingRoutine !== undefined && (
        <RoutineEditor
          routine={editingRoutine}
          exercises={exercises}
          unit={settings.unit}
          onSave={saveRoutine}
          onCancel={() => setEditingRoutine(undefined)}
          onAddCustomExercise={addCustomExercise}
        />
      )}

      {tab === "progress" && <Progress sessions={sessions} exercises={exercises} unit={settings.unit} />}

      {/* top-right settings button */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed rounded-full"
        style={{ top: 24, right: 20, zIndex: 10, padding: 8, backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text }}
      >
        <SettingsIcon size={16} />
      </button>

      {/* bottom nav */}
      <div
        className="fixed bottom-0 left-0 right-0 flex justify-around"
        style={{ backgroundColor: C.sheet, borderTop: `1px solid ${C.border}`, padding: "12px 0", zIndex: 10 }}
      >
        {[
          ["home", HomeIcon, "Home"],
          ["workouts", Dumbbell, "Workouts"],
          ["progress", TrendingUp, "Progress"],
        ].map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setEditingRoutine(undefined); }}
            className="flex flex-col items-center gap-1"
            style={{ padding: "0 16px", color: tab === key ? C.accent : C.dim, background: "none", border: "none" }}
          >
            <Icon size={20} />
            <span style={{ fontSize: 11 }}>{label}</span>
          </button>
        ))}
      </div>

      {showActiveWorkout && activeSession && (
        <ActiveWorkout
          session={activeSession}
          setSession={persistActiveSession}
          exercises={exercises}
          sessions={sessions}
          unit={settings.unit}
          onFinish={finishWorkout}
          onExitToBackground={() => setShowActiveWorkout(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onChangeUnit={changeUnit}
          onChangeName={changeName}
          onExport={exportData}
          onImport={importData}
          onReset={() => { setShowSettings(false); setConfirmDeleteRoutine({ __reset: true }); }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {confirmDeleteRoutine && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 40, padding: "0 24px" }}
          onClick={() => setConfirmDeleteRoutine(null)}
        >
          <div
            className="w-full rounded-2xl"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 20, maxWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, color: C.text, fontWeight: 500, marginBottom: 8 }}>
              {confirmDeleteRoutine.__reset ? "Reset all data?" : "Delete routine?"}
            </div>
            <div style={{ fontSize: 13, color: C.dim, marginBottom: 20 }}>
              {confirmDeleteRoutine.__reset
                ? "This permanently erases every routine, session, PR and setting on this device. This can't be undone."
                : `"${confirmDeleteRoutine.name}" and its exercise plan will be removed. Past sessions stay in your history.`}
            </div>
            <div className="flex gap-3">
              <Btn variant="ghost" className="flex-1" onClick={() => setConfirmDeleteRoutine(null)}>Cancel</Btn>
              <Btn
                variant="danger"
                className="flex-1"
                style={{ borderColor: C.accent }}
                onClick={() => (confirmDeleteRoutine.__reset ? resetAll() : deleteRoutine(confirmDeleteRoutine))}
              >
                {confirmDeleteRoutine.__reset ? "Reset" : "Delete"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed flex items-center gap-2 rounded-full"
          style={{
            bottom: 96, left: "50%", transform: "translateX(-50%)",
            backgroundColor: C.surface2, color: C.text, fontSize: 13,
            padding: "8px 16px", zIndex: 50, border: `1px solid ${C.border}`,
          }}
        >
          <CircleCheck size={14} style={{ color: C.accent2 }} /> {toast}
        </div>
      )}
    </div>
  );
}
