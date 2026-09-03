import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, MapPin, Clock, Send, Users, ChevronLeft } from "lucide-react";
import { supabase } from "./supabaseClient";

// ---- design tokens ----
const C = {
  bg: "#14161A",
  panel: "#1F2320",
  panelAlt: "#262B27",
  line: "#333833",
  chalk: "#ECEAE2",
  mute: "#8B9088",
  accent: "#FF5A1F",
  turf: "#3E7C59",
  ball: "#E8560C",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
.op-head { font-family: 'Oswald', sans-serif; letter-spacing: 0.01em; }
.op-body { font-family: 'Inter', sans-serif; }
::selection { background: ${C.accent}; color: #14161A; }
`;

const SPORTS = [
  { id: "basketball", label: "Basketball", dot: C.ball },
  { id: "soccer", label: "Soccer", dot: C.turf },
];

function fmtTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today · ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow · ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
}

// row from supabase -> app shape
function fromRow(row) {
  return {
    id: row.id,
    sport: row.sport,
    title: row.title,
    location: row.location,
    time: row.start_time,
    spots: row.spots,
    skillLevel: row.skill_level,
    createdBy: row.created_by,
    joined: row.joined || [],
  };
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [games, setGames] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showPost, setShowPost] = useState(false);
  const [openGameId, setOpenGameId] = useState(null);
  const [error, setError] = useState("");

  // profile lives in localStorage — it's this device/browser's identity
  useEffect(() => {
    const stored = localStorage.getItem("pickup_profile");
    if (stored) setProfile(JSON.parse(stored));
    setProfileLoaded(true);
  }, []);

  const saveProfile = (p) => {
    setProfile(p);
    localStorage.setItem("pickup_profile", JSON.stringify(p));
  };

  // load games + subscribe to realtime changes
  const loadGames = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("games")
      .select("*")
      .order("start_time", { ascending: true });
    if (err) {
      setError("Couldn't load games.");
      return;
    }
    setGames((data || []).map(fromRow));
  }, []);

  useEffect(() => {
    loadGames();
    const channel = supabase
      .channel("games-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => {
        loadGames();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadGames]);

  const postGame = async (game) => {
    const { error: err } = await supabase.from("games").insert({
      sport: game.sport,
      title: game.title,
      location: game.location,
      start_time: game.time,
      spots: game.spots,
      skill_level: game.skillLevel,
      created_by: game.createdBy,
      joined: game.joined,
    });
    if (err) setError("Couldn't post — try again.");
    setShowPost(false);
  };

  const joinGame = async (gameId) => {
    if (!profile) return;
    const g = games.find((x) => x.id === gameId);
    if (!g || g.joined.includes(profile.name) || g.joined.length >= g.spots) return;
    const nextJoined = [...g.joined, profile.name];
    const { error: err } = await supabase.from("games").update({ joined: nextJoined }).eq("id", gameId);
    if (err) setError("Couldn't join — try again.");
  };

  const leaveGame = async (gameId) => {
    if (!profile) return;
    const g = games.find((x) => x.id === gameId);
    if (!g) return;
    const nextJoined = g.joined.filter((n) => n !== profile.name);
    const { error: err } = await supabase.from("games").update({ joined: nextJoined }).eq("id", gameId);
    if (err) setError("Couldn't leave — try again.");
  };

  const now = Date.now();
  const visible = games
    .filter((g) => new Date(g.time).getTime() > now - 60 * 60 * 1000)
    .filter((g) => filter === "all" || g.sport === filter);

  if (!profileLoaded) {
    return <div style={{ background: C.bg, minHeight: "100vh" }} className="op-body" />;
  }
  if (!profile) {
    return <Onboarding onDone={saveProfile} />;
  }

  const openGame = openGameId ? games.find((g) => g.id === openGameId) : null;
  if (openGameId && openGame) {
    return (
      <GameDetail
        game={openGame}
        profile={profile}
        onBack={() => setOpenGameId(null)}
        onJoin={() => joinGame(openGame.id)}
        onLeave={() => leaveGame(openGame.id)}
      />
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.chalk }} className="op-body">
      <style>{FONTS}</style>

      <div style={{ borderBottom: `1px solid ${C.line}` }} className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="op-head" style={{ fontSize: 22, fontWeight: 700, color: C.chalk }}>
            Pickup
          </h1>
          <div style={{ color: C.mute, fontSize: 13 }}>Hey, {profile.name.split(" ")[0]}</div>
        </div>

        <div className="flex gap-2 mt-4">
          <FilterTab label="All" active={filter === "all"} onClick={() => setFilter("all")} />
          {SPORTS.map((s) => (
            <FilterTab
              key={s.id}
              label={s.label}
              dot={s.dot}
              active={filter === s.id}
              onClick={() => setFilter(s.id)}
            />
          ))}
        </div>
      </div>

      <div className="px-4 py-4" style={{ paddingBottom: 96 }}>
        {visible.length === 0 ? (
          <EmptyState onPost={() => setShowPost(true)} />
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((g) => (
              <GameCard key={g.id} game={g} profile={profile} onOpen={() => setOpenGameId(g.id)} />
            ))}
          </div>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-4"
        style={{ background: `linear-gradient(to top, ${C.bg} 60%, transparent)` }}
      >
        <button
          onClick={() => setShowPost(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg op-head"
          style={{ background: C.accent, color: "#14161A", fontWeight: 700, fontSize: 15 }}
        >
          <Plus size={18} strokeWidth={3} />
          Post a game
        </button>
      </div>

      {showPost && (
        <PostGameSheet profile={profile} onClose={() => setShowPost(false)} onSubmit={postGame} />
      )}

      {error && (
        <div
          className="fixed bottom-24 left-4 right-4 px-4 py-3 rounded-lg text-center"
          style={{ background: C.panel, color: C.chalk, border: `1px solid ${C.line}` }}
          onClick={() => setError("")}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function FilterTab({ label, dot, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full flex items-center gap-1.5 op-body"
      style={{
        background: active ? C.chalk : "transparent",
        color: active ? "#14161A" : C.mute,
        border: `1px solid ${active ? C.chalk : C.line}`,
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: active ? "#14161A" : dot }} />}
      {label}
    </button>
  );
}

function GameCard({ game, profile, onOpen }) {
  const sport = SPORTS.find((s) => s.id === game.sport) || SPORTS[0];
  const full = game.joined.length >= game.spots;
  const joined = game.joined.includes(profile.name);
  return (
    <button
      onClick={onOpen}
      className="text-left p-4 rounded-xl"
      style={{ background: C.panel, border: `1px solid ${C.line}` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span style={{ width: 7, height: 7, borderRadius: 99, background: sport.dot }} />
            <span style={{ color: C.mute, fontSize: 12 }}>{sport.label}</span>
          </div>
          <div className="op-head mt-1" style={{ fontSize: 19, fontWeight: 600, color: C.chalk }}>
            {game.title}
          </div>
        </div>
        <div className="op-head text-right" style={{ fontSize: 15, fontWeight: 600, color: C.accent }}>
          {fmtTime(game.time)}
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2" style={{ color: C.mute, fontSize: 13 }}>
        <MapPin size={13} />
        {game.location}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1" style={{ color: C.mute, fontSize: 13 }}>
          <Users size={13} />
          {game.joined.length}/{game.spots} in
        </div>
        <span
          className="px-2.5 py-1 rounded-md op-body"
          style={{
            fontSize: 12,
            fontWeight: 600,
            background: joined ? C.turf : full ? "transparent" : C.chalk,
            color: joined ? C.chalk : full ? C.mute : "#14161A",
            border: full && !joined ? `1px solid ${C.line}` : "none",
          }}
        >
          {joined ? "You're in" : full ? "Full" : "Join"}
        </span>
      </div>
    </button>
  );
}

function EmptyState({ onPost }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ paddingTop: 80 }}>
      <div className="op-head" style={{ fontSize: 18, color: C.chalk, fontWeight: 600 }}>
        No games nearby yet
      </div>
      <div style={{ color: C.mute, fontSize: 14, marginTop: 6, maxWidth: 240 }}>
        Be the first to post one and get a game going tonight.
      </div>
      <button
        onClick={onPost}
        className="mt-5 px-4 py-2 rounded-lg op-head"
        style={{ background: C.accent, color: "#14161A", fontWeight: 700, fontSize: 14 }}
      >
        Post a game
      </button>
    </div>
  );
}

function Onboarding({ onDone }) {
  const [name, setName] = useState("");
  const [sport, setSport] = useState("basketball");
  const [skill, setSkill] = useState("casual");
  const canSubmit = name.trim().length > 0;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.chalk }} className="op-body flex flex-col justify-center px-6">
      <style>{FONTS}</style>
      <div className="op-head" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
        Pickup
      </div>
      <div style={{ color: C.mute, fontSize: 14, marginBottom: 28 }}>
        Find a game tonight. Tell us who you are first.
      </div>

      <label style={{ fontSize: 13, color: C.mute, marginBottom: 6 }}>Your name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="First name"
        className="op-body px-3 py-3 rounded-lg mb-5"
        style={{ background: C.panel, border: `1px solid ${C.line}`, color: C.chalk, fontSize: 15 }}
      />

      <label style={{ fontSize: 13, color: C.mute, marginBottom: 6 }}>Main sport</label>
      <div className="flex gap-2 mb-5">
        {SPORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSport(s.id)}
            className="flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2"
            style={{
              background: sport === s.id ? C.chalk : C.panel,
              color: sport === s.id ? "#14161A" : C.chalk,
              border: `1px solid ${C.line}`,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 99, background: sport === s.id ? "#14161A" : s.dot }} />
            {s.label}
          </button>
        ))}
      </div>

      <label style={{ fontSize: 13, color: C.mute, marginBottom: 6 }}>Skill level</label>
      <div className="flex gap-2 mb-8">
        {["casual", "intermediate", "competitive"].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setSkill(lvl)}
            className="flex-1 py-2 rounded-lg capitalize"
            style={{
              background: skill === lvl ? C.chalk : C.panel,
              color: skill === lvl ? "#14161A" : C.mute,
              border: `1px solid ${C.line}`,
              fontSize: 13,
            }}
          >
            {lvl}
          </button>
        ))}
      </div>

      <button
        disabled={!canSubmit}
        onClick={() => onDone({ name: name.trim(), sport, skill })}
        className="w-full py-3 rounded-lg op-head"
        style={{
          background: canSubmit ? C.accent : C.panel,
          color: canSubmit ? "#14161A" : C.mute,
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        Let's go
      </button>
    </div>
  );
}

function PostGameSheet({ profile, onClose, onSubmit }) {
  const [sport, setSport] = useState(profile.sport || "basketball");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [time, setTime] = useState("");
  const [spots, setSpots] = useState(10);
  const [posting, setPosting] = useState(false);
  const canSubmit = title.trim() && location.trim() && time && spots > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setPosting(true);
    await onSubmit({
      sport,
      title: title.trim(),
      location: location.trim(),
      time: new Date(time).toISOString(),
      spots: Number(spots),
      skillLevel: profile.skill,
      createdBy: profile.name,
      joined: [profile.name],
    });
    setPosting(false);
  };

  return (
    <div className="fixed inset-0 flex items-end z-50" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="op-body w-full px-5 pt-5 pb-8 rounded-t-2xl"
        style={{ background: C.panel, borderTop: `1px solid ${C.line}`, maxHeight: "88vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="op-head" style={{ fontSize: 18, fontWeight: 700, color: C.chalk }}>
            Post a game
          </div>
          <button onClick={onClose}>
            <X size={20} color={C.mute} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {SPORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSport(s.id)}
              className="flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2"
              style={{
                background: sport === s.id ? C.chalk : C.panelAlt,
                color: sport === s.id ? "#14161A" : C.chalk,
                border: `1px solid ${C.line}`,
                fontSize: 14,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 99, background: sport === s.id ? "#14161A" : s.dot }} />
              {s.label}
            </button>
          ))}
        </div>

        <Field label="Game title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 5v5 full court run" style={inputStyle} />
        </Field>

        <Field label="Location">
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Riverside Court" style={inputStyle} />
        </Field>

        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Start time">
              <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <div style={{ width: 96 }}>
            <Field label="Spots">
              <input type="number" min={1} value={spots} onChange={(e) => setSpots(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </div>

        <button
          disabled={!canSubmit || posting}
          onClick={submit}
          className="w-full py-3 rounded-lg op-head mt-2"
          style={{
            background: canSubmit ? C.accent : C.panelAlt,
            color: canSubmit ? "#14161A" : C.mute,
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {posting ? "Posting…" : "Post game"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label style={{ fontSize: 12, color: C.mute, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "#14161A",
  border: `1px solid ${C.line}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: C.chalk,
  fontSize: 14,
};

function GameDetail({ game, profile, onBack, onJoin, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef(null);
  const sport = SPORTS.find((s) => s.id === game.sport) || SPORTS[0];
  const joined = game.joined.includes(profile.name);
  const full = game.joined.length >= game.spots;

  const loadChat = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("game_id", game.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoaded(true);
  }, [game.id]);

  useEffect(() => {
    loadChat();
    const channel = supabase
      .channel(`messages-${game.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `game_id=eq.${game.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [game.id, loadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    const body = text.trim();
    setText("");
    await supabase.from("messages").insert({ game_id: game.id, name: profile.name, text: body });
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.chalk }} className="op-body flex flex-col">
      <style>{FONTS}</style>

      <div className="px-4 pt-6 pb-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${C.line}` }}>
        <button onClick={onBack}>
          <ChevronLeft size={22} color={C.mute} />
        </button>
        <div className="flex items-center gap-2">
          <span style={{ width: 7, height: 7, borderRadius: 99, background: sport.dot }} />
          <span style={{ color: C.mute, fontSize: 12 }}>{sport.label}</span>
        </div>
      </div>

      <div className="px-4 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
        <div className="op-head" style={{ fontSize: 22, fontWeight: 700 }}>
          {game.title}
        </div>
        <div className="flex items-center gap-1 mt-2" style={{ color: C.accent, fontSize: 14, fontWeight: 600 }}>
          <Clock size={14} /> {fmtTime(game.time)}
        </div>
        <div className="flex items-center gap-1 mt-1" style={{ color: C.mute, fontSize: 14 }}>
          <MapPin size={14} /> {game.location}
        </div>
        <div className="flex items-center gap-1 mt-1" style={{ color: C.mute, fontSize: 14 }}>
          <Users size={14} /> {game.joined.length}/{game.spots} in · {game.skillLevel}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={joined ? onLeave : onJoin}
            disabled={!joined && full}
            className="flex-1 py-2.5 rounded-lg op-head"
            style={{
              background: joined ? C.turf : full ? C.panelAlt : C.accent,
              color: joined || !full ? "#14161A" : C.mute,
              fontWeight: 700,
              fontSize: 14,
              cursor: !joined && full ? "not-allowed" : "pointer",
            }}
          >
            {joined ? "Leave" : full ? "Full" : "Join game"}
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 13, color: C.mute }}>
          In: {game.joined.join(", ")}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!loaded ? (
          <div style={{ color: C.mute, textAlign: "center", marginTop: 20 }}>Loading chat…</div>
        ) : messages.length === 0 ? (
          <div style={{ color: C.mute, textAlign: "center", marginTop: 20 }}>No messages yet. Start the conversation!</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="mb-3">
              <div style={{ color: C.mute, fontSize: 12 }}>
                <strong style={{ color: C.chalk }}>{m.name}</strong>
              </div>
              <div style={{ color: C.chalk, fontSize: 14, marginTop: 2 }}>{m.text}</div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-4" style={{ borderTop: `1px solid ${C.line}` }}>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && send()}
            placeholder="Say something…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            style={{
              padding: "10px 12px",
              background: text.trim() ? C.accent : C.panelAlt,
              color: text.trim() ? "#14161A" : C.mute,
              border: "none",
              borderRadius: 8,
              cursor: text.trim() ? "pointer" : "not-allowed",
            }}
          >
            <Send size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
