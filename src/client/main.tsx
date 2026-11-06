import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DESKS,
  DEPLOY,
  type Snapshot,
  type ServerMessage,
  type ClientMessage,
} from "../shared/game.js";
import type { createOffice, Point } from "./scene.js";
import "./style.css";
const pathCode = () =>
  location.pathname.match(/^\/room\/([a-f0-9]{6})\/?$/i)?.[1].toUpperCase() ||
  "";
const music = new Audio("/audio/friday-release.mp3");
music.loop = true;
music.volume = 0.23;
let fx: AudioContext | null = null;
function tone(success = false) {
  try {
    fx ??= new AudioContext();
    if (fx.state === "suspended") void fx.resume();
    [0, ...(success ? [0.1, 0.2] : [])].forEach((offset, i) => {
      const o = fx!.createOscillator(),
        g = fx!.createGain();
      o.type = "sine";
      o.frequency.value = [587.33, 739.99, 880][i];
      g.gain.setValueAtTime(0, fx!.currentTime + offset);
      g.gain.linearRampToValueAtTime(0.055, fx!.currentTime + offset + 0.01);
      g.gain.exponentialRampToValueAtTime(
        0.001,
        fx!.currentTime + offset + 0.17,
      );
      o.connect(g);
      g.connect(fx!.destination);
      o.start(fx!.currentTime + offset);
      o.stop(fx!.currentTime + offset + 0.2);
    });
  } catch {
    /* Audio is optional. */
  }
}
function App() {
  const [code, setCode] = useState(pathCode()),
    [name, setName] = useState(localStorage.getItem("tgif-name") || ""),
    [joinCode, setJoinCode] = useState(""),
    [joined, setJoined] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [state, setState] = useState<Snapshot | null>(null),
    [desk, setDesk] = useState<number | null>(null),
    [connected, setConnected] = useState(false),
    [sound, setSound] = useState(false),
    [copied, setCopied] = useState(false),
    [help, setHelp] = useState(true),
    [points, setPoints] = useState<Point[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null),
    office = useRef<ReturnType<typeof createOffice> | null>(null),
    socket = useRef<WebSocket | null>(null),
    deskRef = useRef<number | null>(null),
    stateRef = useRef<Snapshot | null>(null),
    soundRef = useRef(false),
    lastEvent = useRef(0),
    lastFire = useRef(0);
  const send = (m: ClientMessage) => {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify(m));
  };
  const pass = (p: Point) => {
    if (Date.now() - lastFire.current < 180) return;
    lastFire.current = Date.now();
    send({ type: "pass", x: p.x, y: p.y });
  };
  async function enter(existing?: string) {
    setError("");
    setBusy(true);
    try {
      let room = existing?.trim().toUpperCase();
      if (!room) {
        const r = await fetch("/api/rooms", { method: "POST" });
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        room = data.code;
      } else {
        if (!/^[A-F0-9]{6}$/.test(room))
          throw Error("Use the six-character room code.");
        const r = await fetch("/api/rooms/" + room);
        if (!r.ok) throw Error("That room has closed. Start a new Friday.");
      }
      const playerName = name.trim() || "Colleague";
      localStorage.setItem("tgif-name", playerName);
      setName(playerName);
      setCode(room!);
      history.pushState({}, "", `/room/${room}`);
      setJoined(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not open the office. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const pop = () => {
      setCode(pathCode());
      setJoined(false);
      setState(null);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    soundRef.current = sound;
    if (sound) {
      music.play().catch(() => {
        setSound(false);
        setError("Audio could not start. Tap Music to try again.");
      });
    } else music.pause();
    return () => {};
  }, [sound]);
  useEffect(() => {
    if (!joined || !code) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    let retries = 0;
    const key = "tgif-client-" + code;
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
      );
      socket.current = ws;
      ws.onopen = () => {
        retries = 0;
        ws.send(JSON.stringify({ type: "join", code, name, clientId: id }));
      };
      ws.onmessage = (e) => {
        let m: ServerMessage;
        try {
          m = JSON.parse(e.data);
        } catch {
          return;
        }
        if (m.type === "welcome") {
          deskRef.current = m.desk;
          setDesk(m.desk);
          setConnected(true);
          setError("");
        }
        if (m.type === "state") {
          stateRef.current = m.state;
          setState(m.state);
          office.current?.update(m.state, deskRef.current);
          const newest = m.state.events.at(-1);
          if (newest && newest.id > lastEvent.current) {
            if (
              lastEvent.current &&
              soundRef.current &&
              (newest.kind === "stamp" || newest.kind === "ship")
            )
              tone(newest.kind === "ship");
            lastEvent.current = newest.id;
          }
        }
        if (m.type === "error") {
          setError(m.message);
          stopped = true;
          setConnected(false);
          ws.close();
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!stopped) {
          timer = setTimeout(connect, Math.min(5000, 700 + retries++ * 500));
        }
      };
      ws.onerror = () => {};
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket.current?.close();
      socket.current = null;
    };
  }, [joined, code, name]);
  useEffect(() => {
    if (!joined || !canvas.current) return;
    let cancelled = false;
    void import("./scene.js")
      .then(({ createOffice }) => {
        if (cancelled || !canvas.current) return;
        office.current = createOffice(
          canvas.current,
          (p, fire) => {
            if (fire) pass(p);
          },
          setPoints,
        );
        if (stateRef.current)
          office.current.update(stateRef.current, deskRef.current);
      })
      .catch(() => {
        setError(
          "The 3D scene could not start. Use the desk buttons below to keep playing, or enable WebGL.",
        );
      });
    return () => {
      cancelled = true;
      office.current?.dispose();
      office.current = null;
    };
  }, [joined]);
  useEffect(() => {
    if (!joined) return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea") || e.repeat)
        return;
      const n = Number(e.key);
      if (n >= 1 && n <= 8) {
        e.preventDefault();
        pass(DESKS[n - 1]);
      }
      if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        pass(DEPLOY);
      }
      if (e.key === "Escape") setHelp(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [joined]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/room/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy this room link from the address bar.");
    }
  }
  function exit() {
    setJoined(false);
    setState(null);
    stateRef.current = null;
    deskRef.current = null;
    lastEvent.current = 0;
    setCode("");
    setConnected(false);
    setError("");
    history.pushState({}, "", "/");
  }
  const held =
    desk === null ? undefined : state?.builds.find((b) => b.held === desk);
  const elapsed = state ? 180 - state.remaining : 0;
  const virtual = 16 * 3600 + 57 * 60 + elapsed;
  const clock = `${String(Math.floor(virtual / 3600)).padStart(2, "0")}:${String(Math.floor(virtual / 60) % 60).padStart(2, "0")}:${String(Math.floor(virtual) % 60).padStart(2, "0")}`;
  return (
    <div className={joined ? "app in-game" : "app"}>
      <header className="site-header">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            exit();
          }}
        >
          <img src="/favicon.svg" alt="" />
          <span>
            Bonfire<span className="brand-games">Games</span>
          </span>
        </a>
        <div className="header-right">
          <span className="friday-note">Made for the Friday people.</span>
          <button
            className="quiet"
            onClick={() => setSound((s) => !s)}
            aria-pressed={sound}
          >
            {sound ? "♫ Music on" : "♪ Music off"}
          </button>
          {joined && (
            <button className="quiet" onClick={() => setHelp((h) => !h)}>
              How to play
            </button>
          )}
        </div>
      </header>
      {!joined ? (
        <main className="landing">
          <div className="poster">
            <img
              src="/images/friday-cover.png"
              alt="Retro Bonfire game cover: coworkers celebrating an office release at 16:59"
            />
            <span className="poster-sticker">
              The office is open.
              <br />
              Yes, even if it’s just you.
            </span>
          </div>
          <section className="welcome">
            <div className="edition">The Friday fika arcade</div>
            <h1>
              Thank God
              <br />
              it’s <em>Friday.</em>
            </h1>
            <p className="tagline">
              Three approvals. One deployment slot.
              <br />
              Everyone wants fika.
            </p>
            <div className="game-title">Pass the Build</div>
            <p className="intro">
              Slide builds between desks, collect three stamps, and ship before
              17:00. Start solo. Let the office pile in.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void enter(code || undefined);
              }}
            >
              <label htmlFor="name">What should we call you?</label>
              <input
                id="name"
                name="name"
                autoComplete="nickname"
                maxLength={18}
                placeholder="Your office alter ego"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button className="primary start" disabled={busy}>
                {busy
                  ? "Opening the office…"
                  : code
                    ? `Join room ${code}`
                    : "Clock in & play"}
                <span aria-hidden="true">↗</span>
              </button>
            </form>
            {code ? (
              <button
                className="text-button"
                onClick={() => {
                  setCode("");
                  history.pushState({}, "", "/");
                }}
              >
                Start a fresh room instead
              </button>
            ) : (
              <form
                className="join-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void enter(joinCode);
                }}
              >
                <label htmlFor="room-code">Joining the gang?</label>
                <div>
                  <input
                    id="room-code"
                    maxLength={6}
                    placeholder="Room code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  />
                  <button
                    className="secondary"
                    disabled={busy || joinCode.length !== 6}
                  >
                    Join room
                  </button>
                </div>
              </form>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="details">
              <span>1–8 players</span>
              <span>3-minute rounds</span>
              <span>Join whenever</span>
            </div>
          </section>
          <footer className="landing-footer">
            <span>A tiny celebration of shipping things together.</span>
            <span>Built with coffee. Powered by Bonfire. 🔥</span>
          </footer>
        </main>
      ) : (
        <main className="game-layout">
          <div className="game-top">
            <div>
              <div className="edition">Bonfire’s office survival game</div>
              <h1 className="game-logo">
                TGIF<span>Pass the Build</span>
              </h1>
            </div>
            <div className="scoreboard">
              <div className="clock" aria-label="Office clock">
                {clock}
              </div>
              <div className="shipping">
                <strong>{state?.shipped || 0}</strong>
                <span>
                  shipped <small>/ {state?.target || 8} for Friday</small>
                </span>
              </div>
            </div>
            <div className="room-tools">
              <button className="secondary" onClick={copy}>
                {copied ? "Link copied ✓" : `Invite · ${code}`}
              </button>
              <span>
                <i className={connected ? "live-dot" : "live-dot offline"} />
                {connected
                  ? `${state?.players.length || 1}/8 at their desks`
                  : "Connecting to the office…"}
              </span>
            </div>
          </div>
          <div className="play-area">
            <section className="arena" aria-label="Shared office table">
              <canvas
                ref={canvas}
                aria-label="Aim on the table and click to pass your build. Keyboard: desks 1 to 8; D to deploy."
              />
              <div className="table-caption">
                {state?.players.length === 1
                  ? "Your desk. Seven very helpful machines."
                  : "Everyone is part of the pipeline."}
              </div>
              {points.map((p, i) => {
                const person = state?.players.find((v) => v.desk === i),
                  full = state?.builds.some((b) => b.held === i),
                  own = i === desk;
                return (
                  <button
                    key={i}
                    className={`desk-label ${own ? "own" : ""} ${full ? "occupied" : ""}`}
                    style={{ left: p.x + "%", top: p.y + "%" }}
                    onClick={() => pass(DESKS[i])}
                    disabled={!held || own || state?.phase === "finished"}
                    aria-label={`Pass to desk ${i + 1}, ${person?.name || "Auto-LGTM"}, ${full ? "hands full" : "available"}`}
                  >
                    <b>{i + 1}</b>
                    <span>
                      {own ? "You" : person?.name || "Auto-LGTM"}
                      <small>
                        {own
                          ? "Your desk"
                          : full
                            ? "Hands full"
                            : person
                              ? "Ready to catch"
                              : "Review & return"}
                      </small>
                    </span>
                    <i />
                  </button>
                );
              })}
              {!connected && (
                <div className="connection-banner" role="status">
                  {error || "Connecting… Your desk will be ready in a moment."}
                </div>
              )}
              {state?.phase === "finished" && (
                <div className="results">
                  <div className="edition">17:00. We made it.</div>
                  <h2>
                    {state.shipped >= state.target
                      ? "Friday secured!"
                      : "One more hotfix?"}
                  </h2>
                  <p>
                    <strong>{state.shipped}</strong> releases shipped together.
                  </p>
                  <p className="results-detail">
                    {state.banks} bank shots · {state.rollbacks} recovered
                    builds
                  </p>
                  <button
                    className="primary"
                    onClick={() => send({ type: "rematch" })}
                  >
                    Fresh coffee. Another round.
                  </button>
                  <span>Trevlig helg! 🔥</span>
                </div>
              )}
            </section>
            <aside className="dispatch">
              <div className="dispatch-title">
                Your outbox{" "}
                <span>{desk === null ? "Spectating" : `Desk ${desk + 1}`}</span>
              </div>
              {held ? (
                <div
                  className={`build-card ${held.stamps.length >= 3 ? "approved" : ""}`}
                >
                  <div className="disk-art">
                    <span />
                    <b>{held.stamps.length >= 3 ? "✓" : "↗"}</b>
                  </div>
                  <span className="build-number">Build #{held.id}</span>
                  <h2>
                    {held.stamps.length >= 3
                      ? "Ready to ship."
                      : "Needs a little love."}
                  </h2>
                  <div
                    className="stamps"
                    aria-label={`${held.stamps.length} approval stamps`}
                  >
                    {[0, 1, 2].map((_, i) => (
                      <span
                        className={
                          held.stamps[i] !== undefined ? "stamped" : ""
                        }
                        key={i}
                      >
                        {held.stamps[i] !== undefined
                          ? `Desk ${held.stamps[i] + 1} ✓`
                          : "Awaiting"}
                      </span>
                    ))}
                  </div>
                  <p>
                    {held.stamps.length >= 3
                      ? "Aim for the centre slot, or press D."
                      : "Send it to a different desk. Machines stamp it and send it back."}
                  </p>
                  <button
                    className="primary deploy-button"
                    disabled={
                      held.stamps.length < 3 || state?.phase === "finished"
                    }
                    onClick={() => pass(DEPLOY)}
                  >
                    Deploy build <kbd>D</kbd>
                  </button>
                </div>
              ) : (
                <div className="empty-outbox">
                  <div className="empty-tray">⌑</div>
                  <h2>
                    {desk === null ? "The gang’s all here." : "Hands free."}
                  </h2>
                  <p>
                    {desk === null
                      ? "Watch the release. Grab a desk when someone heads for fika."
                      : "Your next build is on its way. Keep a desk free for incoming reviews."}
                  </p>
                  {desk === null && state && state.players.length < 8 && (
                    <button
                      className="primary"
                      onClick={() => send({ type: "claim" })}
                    >
                      Take an open desk
                    </button>
                  )}
                </div>
              )}
              <div className="signals">
                <button
                  className="secondary"
                  disabled={desk === null}
                  onClick={() => send({ type: "ping", signal: "ready" })}
                >
                  Send it here!
                </button>
                <button
                  className="secondary"
                  disabled={desk === null}
                  onClick={() => send({ type: "ping", signal: "full" })}
                >
                  Hands full!
                </button>
              </div>
              <div className="activity" role="log" aria-label="Office activity">
                {state?.events
                  .slice(-3)
                  .reverse()
                  .map((e) => (
                    <p key={e.id} className={e.kind}>
                      {e.text}
                    </p>
                  ))}
              </div>
            </aside>
          </div>
          <div className="desk-controls">
            <span>
              Pass to a desk <small>or use keys 1–8</small>
            </span>
            <div>
              {DESKS.map((d) => (
                <button
                  key={d.id}
                  className={d.id === desk ? "you-key" : ""}
                  disabled={
                    !held || d.id === desk || state?.phase === "finished"
                  }
                  onClick={() => pass(d)}
                  aria-label={`Pass to desk ${d.id + 1}`}
                >
                  <kbd>{d.id + 1}</kbd>
                  <span>
                    {d.id === desk
                      ? "You"
                      : state?.players.find((p) => p.desk === d.id)?.name ||
                        d.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {help && (
            <div className="howto">
              <div>
                <strong>Catch. Stamp. Pass. Ship.</strong>
                <p>
                  Aim and click, or choose a desk below. Three different desk
                  stamps unlock Deploy. Busy desks bounce. Auto-LGTM stamps and
                  returns.
                </p>
              </div>
              <button className="secondary" onClick={() => setHelp(false)}>
                Got it
              </button>
            </div>
          )}
          {error && connected && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </main>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
