import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  STATIONS,
  AVATAR_COLORS,
  type Snapshot,
  type ServerMessage,
  type ClientMessage,
} from "../shared/game.js";
import type { createOffice, Overlay } from "./scene.js";
import { ControllerInput } from "./controller.js";
import { chipAudio } from "./audio.js";
import "./style.css";
const pathCode = () =>
  location.pathname.match(/^\/room\/([a-f0-9]{6})\/?$/i)?.[1].toUpperCase() ||
  "";
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
    [overlay, setOverlay] = useState<Overlay>({
      stations: [],
      players: {},
      meetings: [],
    }),
    [sprinting, setSprinting] = useState(false),
    [controllerConnected, setControllerConnected] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    office = useRef<ReturnType<typeof createOffice> | null>(null),
    socket = useRef<WebSocket | null>(null),
    deskRef = useRef<number | null>(null),
    stateRef = useRef<Snapshot | null>(null),
    soundRef = useRef(false),
    lastEvent = useRef(0),
    keys = useRef(new Set<string>()),
    sprintRef = useRef(false);
  const send = (m: ClientMessage) => {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify(m));
  };
  async function enter(existing?: string) {
    setBusy(true);
    setError("");
    try {
      let room = existing?.trim().toUpperCase();
      if (!room) {
        const r = await fetch("/api/rooms", { method: "POST" }),
          data = await r.json();
        if (!r.ok) throw Error(data.error);
        room = data.code;
      } else {
        if (!/^[A-F0-9]{6}$/.test(room))
          throw Error("Use the six-character room code.");
        if (!(await fetch("/api/rooms/" + room)).ok)
          throw Error("That room has closed. Start a new Friday.");
      }
      const n = name.trim() || "Colleague";
      localStorage.setItem("tgif-name", n);
      setName(n);
      setCode(room!);
      lastEvent.current = 0;
      history.pushState({}, "", `/room/${room}`);
      setJoined(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The office could not open. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
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
    if (!joined || !code) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    let retry = 0;
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
        retry = 0;
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
          if (lastEvent.current) {
            for (const e of m.state.events)
              if (
                e.id > lastEvent.current &&
                soundRef.current &&
                ["stamp", "ship", "meeting", "throw"].includes(e.kind)
              )
                chipAudio.effect(
                  e.kind === "ship" && m.state.phase === "finished"
                    ? "retro"
                    : e.kind,
                );
          }
          lastEvent.current = m.state.events.at(-1)?.id || 0;
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
        keys.current.clear();
        if (!stopped)
          timer = setTimeout(connect, Math.min(5000, 700 + retry++ * 500));
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
      .then(async ({ createOffice }) => {
        await document.fonts.load('8px "Press Start 2P"').catch(() => []);
        if (cancelled || !canvas.current) return;
        office.current = createOffice(
          canvas.current,
          (p) => send({ type: "goto", ...p, sprint: sprintRef.current }),
          setOverlay,
        );
        if (stateRef.current)
          office.current.update(stateRef.current, deskRef.current);
      })
      .catch(() =>
        setError(
          "Enable WebGL to see the office. Movement and station controls remain available.",
        ),
      );
    return () => {
      cancelled = true;
      office.current?.dispose();
      office.current = null;
    };
  }, [joined]);
  useEffect(() => {
    if (!joined) return;
    const controller = new ControllerInput();
    let focused = document.hasFocus() && !document.hidden;
    const moves = [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowleft",
      "arrowdown",
      "arrowright",
      "shift",
    ];
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea")) return;
      const k = e.key.toLowerCase();
      if (moves.includes(k)) {
        e.preventDefault();
        keys.current.add(k);
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) send({ type: "throw" });
      }
      if (e.key === "Escape") setHelp(false);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => {
      focused = false;
      wasMoving = false;
      keys.current.clear();
      controller.reset();
      send({ type: "move", x: 0, y: 0 });
    };
    const focus = () => {
      focused = !document.hidden;
      controller.reset();
    };
    const visibility = () =>
      document.hidden ? blur() : document.hasFocus() && focus();
    const disconnect = () => {
      controller.reset();
      setControllerConnected(false);
      send({ type: "move", x: 0, y: 0 });
    };
    let wasMoving = false;
    const interval = setInterval(() => {
      if (!focused) return;
      let pads: (Gamepad | null)[] = [];
      try {
        pads = Array.from(navigator.getGamepads?.() || []);
      } catch {
        /* Keyboard remains available if gamepads are blocked. */
      }
      const pad = controller.poll(pads);
      setControllerConnected(pad.connected);
      const k = keys.current,
        keyboardX =
          Number(k.has("d") || k.has("arrowright")) -
          Number(k.has("a") || k.has("arrowleft")),
        keyboardY =
          Number(k.has("w") || k.has("arrowup")) -
          Number(k.has("s") || k.has("arrowdown")),
        usingKeyboard = !!(keyboardX || keyboardY),
        x = usingKeyboard ? keyboardX : pad.x,
        y = usingKeyboard ? keyboardY : pad.y;
      if (x || y || wasMoving)
        send({
          type: "move",
          x,
          y,
          sprint:
            k.has("shift") ||
            sprintRef.current ||
            (!usingKeyboard && pad.sprint),
        });
      if (pad.toss) send({ type: "throw" });
      if (
        pad.menu &&
        stateRef.current?.phase === "finished" &&
        deskRef.current !== null
      )
        send({ type: "rematch" });
      wasMoving = !!(x || y);
    }, 50);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    window.addEventListener("gamepaddisconnected", disconnect);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(interval);
      keys.current.clear();
      controller.reset();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      window.removeEventListener("gamepaddisconnected", disconnect);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [joined]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/room/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copy the room link from the address bar.");
    }
  }
  function exit() {
    setJoined(false);
    setState(null);
    stateRef.current = null;
    deskRef.current = null;
    lastEvent.current = 0;
    setCode("");
    setError("");
    setConnected(false);
    history.pushState({}, "", "/");
  }
  const me = state?.players.find((p) => p.desk === desk),
    ticket =
      desk === null ? undefined : state?.builds.find((b) => b.held === desk),
    next = ticket ? STATIONS[ticket.route[ticket.stamps.length]] : STATIONS[0],
    elapsed = state ? 180 - state.remaining : 0,
    clock = `${String(16 + Math.floor((57 * 60 + elapsed) / 3600)).padStart(2, "0")}:${String(Math.floor((57 * 60 + elapsed) / 60) % 60).padStart(2, "0")}:${String(Math.floor(elapsed) % 60).padStart(2, "0")}`;
  const latest = state?.events.at(-1);
  return (
    <div className={joined ? "app in-game runner-game" : "app"}>
      <header className="site-header">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            exit();
          }}
        >
          <img src="/favicon.svg?v=8bit" alt="" />
          <span>
            Bonfire<span className="brand-games">Games</span>
          </span>
        </a>
        <div className="header-right">
          <span className="friday-note">Less process. More running.</span>
          <button
            className="quiet"
            onClick={() => {
              const enabled = !sound;
              soundRef.current = enabled;
              setSound(enabled);
              void chipAudio.setEnabled(enabled).catch(() => {
                soundRef.current = false;
                setSound(false);
              });
            }}
            aria-pressed={sound}
          >
            {sound ? "♫ CHIP ON" : "♪ CHIP OFF"}
          </button>
          {joined && (
            <button className="quiet" onClick={() => setHelp((v) => !v)}>
              Controls
            </button>
          )}
        </div>
      </header>
      {!joined ? (
        <main className="landing">
          <div className="poster">
            <img
              src="/images/friday-cover.png"
              alt="Bonfire’s retro office survival game cover"
            />
            <span className="poster-sticker">
              Now with actual running.
              <br />
              And unavoidable meetings.
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
              Grab a ticket. Run the office.
              <br />
              Survive the retro.
            </p>
            <div className="game-title">Run the Release</div>
            <p className="intro">
              Sprint between stations, dodge “quick” meetings, and throw tickets
              to your colleagues. Ship before 17:00. Start solo. Join whenever.
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
                value={name}
                maxLength={18}
                autoComplete="nickname"
                placeholder="Your office alter ego"
                onChange={(e) => setName(e.target.value)}
              />
              <button className="primary start" disabled={busy}>
                {busy
                  ? "Opening the office…"
                  : code
                    ? `Join room ${code}`
                    : "Clock in & RUN"}
                <span>↗</span>
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
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="Room code"
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
              <span>1–8 runners</span>
              <span>3-minute sprints</span>
              <span>One very honest retro</span>
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
              <div className="edition">The ultimate office survival game</div>
              <h1 className="game-logo">
                TGIF<span>Run the Release</span>
              </h1>
            </div>
            <div className="scoreboard">
              <div className="clock">{clock}</div>
              <div className="shipping">
                <strong>{state?.shipped || 0}</strong>
                <span>
                  shipped<small>/ {state?.target || 5} for Friday</small>
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
                  ? `${state?.players.length || 1}/8 runners in the office`
                  : "Connecting…"}
              </span>
            </div>
          </div>
          <div className="play-area">
            <section
              className={`arena runner-arena ${me?.stun ? "meeting-hit" : ""}`}
              aria-label="Multiplayer office floor"
            >
              <canvas
                ref={canvas}
                aria-label="Office runner. Move with WASD, arrows or controller left stick. Shift or RT/R2 sprints. Space or A/Cross throws. Tap the floor to move."
              />
              <div className="table-caption">
                {controllerConnected
                  ? "Controller connected · Left stick to run · RT/R2 sprint · A/Cross throw"
                  : "WASD / arrows to run · Shift to sprint · Space to throw · Controllers supported"}
              </div>
              {overlay.stations.map((p, i) => (
                <button
                  key={i}
                  className={`station-label ${i === next.id && desk !== null ? "next-station" : ""}`}
                  style={
                    {
                      left: p.x + "%",
                      top: p.y + "%",
                      "--station-color": STATIONS[i].color,
                    } as React.CSSProperties
                  }
                  onClick={() =>
                    send({
                      type: "goto",
                      x: STATIONS[i].x,
                      y: STATIONS[i].y,
                      sprint: sprintRef.current,
                    })
                  }
                  disabled={desk === null || state?.phase === "finished"}
                  aria-label={`Run to ${STATIONS[i].label}`}
                >
                  <span>{STATIONS[i].label}</span>
                  {i === next.id && desk !== null && <small>↓ Next stop</small>}
                </button>
              ))}
              {state?.players.map((p) => {
                const point = overlay.players[p.desk];
                return point ? (
                  <div
                    key={p.id}
                    className={`runner-label ${p.desk === desk ? "own-runner" : ""}`}
                    style={
                      {
                        left: point.x + "%",
                        top: point.y + "%",
                        "--runner-color": AVATAR_COLORS[p.desk],
                      } as React.CSSProperties
                    }
                  >
                    {p.stun > 0 ? <b>“Quick question…”</b> : null}
                    <span>{p.desk === desk ? "YOU" : p.name}</span>
                  </div>
                ) : null;
              })}
              {overlay.meetings.map((p, i) => (
                <span
                  key={i}
                  className={`meeting-label ${state?.hazards[i]?.chasing ? "chasing" : ""}`}
                  style={{ left: p.x + "%", top: p.y + "%" }}
                >
                  [!] {state?.hazards[i]?.label}
                </span>
              ))}
              {latest && (
                <div
                  key={latest.id}
                  className={`office-pop ${latest.kind}`}
                  aria-live="polite"
                >
                  {latest.kind === "ship"
                    ? ">> "
                    : latest.kind === "meeting"
                      ? "[!] "
                      : latest.kind === "stamp"
                        ? "+ "
                        : ""}
                  {latest.text}
                </div>
              )}
              {!connected && (
                <div className="connection-banner">
                  {error || "Getting your lanyard ready…"}
                </div>
              )}
              {state?.phase === "finished" && (
                <div className="results retro">
                  <div className="edition">17:00 · The mandatory Friday</div>
                  <h2>
                    Retro<span>spective.</span>
                  </h2>
                  <p className="retro-tag">
                    {state.shipped >= state.target
                      ? "We shipped it. We survived it."
                      : "Good learning. Questionable estimates."}
                  </p>
                  <div className="retro-columns">
                    <div>
                      <h3>Went well +</h3>
                      <strong>{state.shipped}</strong>
                      <p>things actually shipped</p>
                      <p>{state.handoffs} clean hand-offs</p>
                    </div>
                    <div>
                      <h3>Surprised us ?</h3>
                      <strong>{state.meetings}</strong>
                      <p>“quick” meetings</p>
                      <p>{Math.round(state.walked)} office metres sprinted</p>
                    </div>
                  </div>
                  <div className="retro-action">
                    <b>Action item for next Friday</b>
                    <span>
                      {state.meetings > 4
                        ? "Could this meeting have been a Slack message?"
                        : "Keep the tickets moving. Refill the coffee."}
                    </span>
                  </div>
                  <button
                    className="primary"
                    onClick={() => send({ type: "rematch" })}
                  >
                    Less talking. Another sprint.
                  </button>
                  <span>Trevlig helg! 🔥</span>
                </div>
              )}
            </section>
            <aside className="dispatch runner-dispatch">
              <div className="dispatch-title">
                {desk === null ? "Watching the chaos" : "Your mission"}
                <span>{me?.name || "Spectator"}</span>
              </div>
              {!connected ? (
                <div className="empty-outbox">
                  <h2>Finding your lanyard…</h2>
                </div>
              ) : desk === null ? (
                <div className="empty-outbox">
                  <h2>The office is full.</h2>
                  <p>Watch the chaos. Grab a lanyard when someone leaves.</p>
                  {state && state.players.length < 8 && (
                    <button
                      className="primary"
                      onClick={() => send({ type: "claim" })}
                    >
                      Join the sprint
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mission">
                    <div className={`mission-icon ${ticket ? "carrying" : ""}`}>
                      {ticket ? "▣" : "↗"}
                    </div>
                    <span className="build-number">
                      {ticket ? `Ticket #${ticket.id}` : "Your hands are free"}
                    </span>
                    <h2>{ticket?.title || "Grab the next ticket."}</h2>
                    <p>
                      {ticket
                        ? "You’re carrying it. Keep moving!"
                        : "Run to PO to pick up work. Walk over a dropped ticket to help a colleague."}
                    </p>
                    <div
                      className="next-destination"
                      style={{ borderColor: next.color }}
                    >
                      <span>Next stop</span>
                      <strong style={{ color: next.color }}>
                        {next.label}
                      </strong>
                      <small>{next.verb}</small>
                    </div>
                    {ticket && (
                      <div className="route">
                        {ticket.route.map((id, i) => (
                          <span
                            key={i}
                            className={
                              i < ticket.stamps.length
                                ? "done"
                                : i === ticket.stamps.length
                                  ? "current"
                                  : ""
                            }
                          >
                            {i < ticket.stamps.length ? "✓ " : ""}
                            {STATIONS[id].label}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="station-progress">
                      <div
                        style={{
                          width: `${Math.min(100, ((ticket?.progress || 0) / 0.72) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="runner-actions">
                    <button
                      className="primary"
                      disabled={!ticket || state?.phase === "finished"}
                      onClick={() => send({ type: "throw" })}
                    >
                      Throw ticket{" "}
                      <kbd>{controllerConnected ? "A / Cross" : "Space"}</kbd>
                    </button>
                    <button
                      className="secondary"
                      aria-pressed={sprinting}
                      onClick={() => {
                        sprintRef.current = !sprinting;
                        setSprinting(!sprinting);
                        if (me?.target)
                          send({
                            type: "goto",
                            ...me.target,
                            sprint: !sprinting,
                          });
                      }}
                    >
                      {sprinting
                        ? "⚡ Sprint on"
                        : controllerConnected
                          ? "⚡ Sprint / RT"
                          : "⚡ Sprint / Shift"}
                    </button>
                  </div>
                </>
              )}
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
          <div className="runner-footer">
            <div className="keyboard">
              <kbd>{controllerConnected ? "LS" : "W"}</kbd>
              <span>
                {controllerConnected ? (
                  <>
                    <kbd>A / Cross</kbd>
                    <kbd>RT / R2</kbd>
                  </>
                ) : (
                  <>
                    <kbd>A</kbd>
                    <kbd>S</kbd>
                    <kbd>D</kbd>
                  </>
                )}
              </span>
            </div>
            <p>
              <strong>You’re the little person with the YOU label.</strong>
              <span>
                {controllerConnected
                  ? "Left stick moves. RT/R2 sprints. A/Cross throws. Menu/Options starts the next round."
                  : "Run into glowing stations. Controllers: press a button to connect, then use the left stick."}
              </span>
            </p>
            <button className="secondary" onClick={() => setHelp((v) => !v)}>
              How it works
            </button>
          </div>
          {help && (
            <div className="howto">
              <div>
                <strong>This is a sprint. Literally.</strong>
                <p>
                  Follow your ticket’s route. Stations work automatically when
                  you reach them. Throw a ticket toward a colleague for a
                  hand-off. Solo works too: every station is always open.{" "}
                  Controllers: left stick moves, RT/R2 sprints, A/Cross throws,
                  and Menu/Options starts another round after the Retro.
                </p>
              </div>
              <button className="secondary" onClick={() => setHelp(false)}>
                Let’s run!
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
