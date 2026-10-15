"use client";

import { useEffect, useRef, useState } from "react";
import { floodFill } from "@/lib/floodFill";
import { clearRoom, loadStrokes, saveStroke } from "@/lib/strokes";
import { supabase } from "@/lib/supabase";
import { roomChannel } from "@/lib/types";
import { loadName, pickColor, randomId, readPeers, saveName } from "@/lib/users";
import Cursors from "./Cursors";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";

/** @typedef {import("@/lib/types").Seg} Seg */
/** @typedef {import("@/lib/types").Fill} Fill */
/** @typedef {import("@/lib/types").Peer} Peer */
/** @typedef {import("@/lib/types").ChatMessage} ChatMessage */

// Fikseeritud suurus, et koordinaadid oleksid kõigil samad. Skaleerimine käib CSS-iga.
const WIDTH = 1000;
const HEIGHT = 600;
const BACKGROUND = "#ffffff";
// eventsPerSecond: 60 → saadame kuni ühe lõigu ~16 ms kohta.
const MIN_SEG_INTERVAL_MS = 16;
// Kursor ~20 korda sekundis. Joonistamise ajal kursorit eraldi ei saadeta (asukoht tuleb seg-ist),
// nii et koos jääme alla eventsPerSecond piiri.
const CURSOR_INTERVAL_MS = 50;
const MAX_MESSAGES = 200;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Seg} seg
 */
function drawSeg(ctx, seg) {
  ctx.strokeStyle = seg.color;
  ctx.lineWidth = seg.size;
  ctx.beginPath();
  ctx.moveTo(seg.x0, seg.y0);
  ctx.lineTo(seg.x1, seg.y1);
  ctx.stroke();
}

/**
 * Joonistab lõigu või täitmise, olenevalt kujust.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Seg | Fill} item
 */
function drawItem(ctx, item) {
  if (item.type === "fill") floodFill(ctx, item.x, item.y, item.color);
  else drawSeg(ctx, item);
}

/** @param {CanvasRenderingContext2D} ctx */
function clearCanvas(ctx) {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

export default function Canvas({ roomId }) {
  const canvasRef = useRef(null);
  const channelRef = useRef(null);
  const joinedRef = useRef(false);
  const lastRef = useRef(null); // viimane saadetud punkt, null kui ei joonista
  const lastSentAtRef = useRef(0);
  const bufRef = useRef(/** @type {Seg[]} */ ([]));
  // DB kirjutused käivad järjest: täitmine sõltub eelnevast pildist,
  // seega peab ridade id järjekord vastama tegevuste järjekorrale.
  const writeQueueRef = useRef(Promise.resolve());
  const meRef = useRef(/** @type {Peer | null} */ (null));
  const trackRef = useRef(null);
  const lastCursorAtRef = useRef(0);
  const cursorTimerRef = useRef(null);
  const pendingCursorRef = useRef(null);
  // Kursorite asukohad liiguvad selle kaudu otse Cursors komponenti.
  const [cursorBus] = useState(() => new EventTarget());

  const [color, setColor] = useState("#111111");
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState("brush"); // "brush" | "eraser" | "fill"
  const [status, setStatus] = useState("CONNECTING");
  const [me, setMe] = useState(/** @type {Peer | null} */ (null));
  const [peers, setPeers] = useState(/** @type {Peer[]} */ ([]));
  const [messages, setMessages] = useState(/** @type {ChatMessage[]} */ ([]));

  useEffect(() => {
    // Täitmine loeb piksleid, seega willReadFrequently.
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    clearCanvas(ctx);

    // Kanaliga liitume enne DB laadimist ja puhverdame vahepeal tulnud lõigud,
    // et laadimise ajal joonistatu kaotsi ei läheks.
    let active = true;
    let loaded = false;
    let pending = [];
    let clearedWhileLoading = false;

    // Igal toa külastusel uus id; nimi püsib localStorage'is.
    const self = { id: randomId(), name: loadName(), color: null, onlineAt: Date.now() };
    saveName(self.name);
    meRef.current = self;

    const emitCursor = (c) => cursorBus.dispatchEvent(new CustomEvent("cursor", { detail: c }));

    function track() {
      if (!active || !self.color) return;
      setMe({ ...self });
      channel.track({ name: self.name, color: self.color, onlineAt: self.onlineAt });
    }
    trackRef.current = track;

    const channel = supabase
      .channel(roomChannel(roomId), { config: { presence: { key: self.id } } })
      .on("broadcast", { event: "seg" }, ({ payload }) => {
        if (payload.uid) emitCursor({ uid: payload.uid, x: payload.x1, y: payload.y1 });
        if (loaded) drawSeg(ctx, payload);
        else pending.push(payload);
      })
      .on("broadcast", { event: "cursor" }, ({ payload }) => emitCursor(payload))
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setMessages((prev) => [...prev, payload].slice(-MAX_MESSAGES));
      })
      .on("presence", { event: "sync" }, () => {
        const list = readPeers(channel.presenceState());
        setPeers(list);
        if (!self.color) return;
        // Kui varem liitunul on sama värv (nt liitusime korraga), vahetame enda oma.
        const others = list.filter((p) => p.id !== self.id);
        const clash = others.some(
          (p) =>
            p.color === self.color &&
            (p.onlineAt < self.onlineAt || (p.onlineAt === self.onlineAt && p.id < self.id)),
        );
        if (clash) {
          const next = pickColor(others, self.id);
          if (next !== self.color) {
            self.color = next;
            track();
          }
        }
      })
      .on("broadcast", { event: "fill" }, ({ payload }) => {
        if (loaded) drawItem(ctx, payload);
        else pending.push(payload);
      })
      .on("broadcast", { event: "clear" }, () => {
        if (loaded) {
          clearCanvas(ctx);
        } else {
          pending = [];
          clearedWhileLoading = true;
        }
      })
      .subscribe((s) => {
        if (!active) return;
        joinedRef.current = s === "SUBSCRIBED";
        setStatus(s);
        if (s === "SUBSCRIBED") {
          if (!self.color) {
            const others = readPeers(channel.presenceState()).filter((p) => p.id !== self.id);
            self.color = pickColor(others, self.id);
          }
          track();
        }
      });
    channelRef.current = channel;

    loadStrokes(roomId)
      .then((rows) => {
        if (!active || clearedWhileLoading) return;
        for (const row of rows) {
          for (const item of row.data) drawItem(ctx, item);
        }
      })
      .catch((err) => console.error("Joonte laadimine ebaõnnestus:", err.message))
      .finally(() => {
        if (!active) return;
        for (const item of pending) drawItem(ctx, item);
        pending = [];
        loaded = true;
      });

    return () => {
      active = false;
      joinedRef.current = false;
      channelRef.current = null;
      trackRef.current = null;
      meRef.current = null;
      clearTimeout(cursorTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [roomId, cursorBus]);

  function toCanvasPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) * WIDTH) / rect.width),
      y: Math.round(((e.clientY - rect.top) * HEIGHT) / rect.height),
    };
  }

  function addSeg(from, to) {
    /** @type {Seg} */
    const seg = {
      x0: from.x,
      y0: from.y,
      x1: to.x,
      y1: to.y,
      color: tool === "eraser" ? BACKGROUND : color,
      size,
    };
    drawSeg(canvasRef.current.getContext("2d"), seg);
    bufRef.current.push(seg);
    lastRef.current = to;
    lastSentAtRef.current = performance.now();
    if (joinedRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "seg",
        payload: { ...seg, uid: meRef.current?.id },
      });
    }
  }

  function enqueueWrite(label, write) {
    writeQueueRef.current = writeQueueRef.current.then(async () => {
      try {
        await write();
      } catch (err) {
        // Ära lase ühel veal järjekorda lukustada.
        console.error(`${label} ebaõnnestus:`, err.message ?? err);
      }
    });
  }

  function fillAt(p) {
    /** @type {Fill} */
    const fill = { type: "fill", x: p.x, y: p.y, color };
    drawItem(canvasRef.current.getContext("2d"), fill);
    if (joinedRef.current) {
      channelRef.current.send({ type: "broadcast", event: "fill", payload: fill });
    }
    enqueueWrite("Täitmise salvestamine", () => saveStroke(roomId, [fill]));
  }

  function handlePointerDown(e) {
    if (e.button !== 0) return;
    if (tool === "fill") {
      fillAt(toCanvasPoint(e));
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    bufRef.current = [];
    const p = toCanvasPoint(e);
    addSeg(p, p); // punkt ka lihtsa kliki korral
  }

  function sendCursor(payload) {
    if (joinedRef.current && meRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "cursor",
        payload: { uid: meRef.current.id, ...payload },
      });
    }
  }

  // Saadab kursori asukoha kuni CURSOR_INTERVAL_MS tagant; viimane asukoht saadetakse alati.
  function queueCursor(p) {
    pendingCursorRef.current = p;
    if (cursorTimerRef.current) return;
    const wait = Math.max(0, CURSOR_INTERVAL_MS - (performance.now() - lastCursorAtRef.current));
    cursorTimerRef.current = setTimeout(() => {
      cursorTimerRef.current = null;
      lastCursorAtRef.current = performance.now();
      sendCursor(pendingCursorRef.current);
    }, wait);
  }

  function handlePointerLeave() {
    if (lastRef.current) return;
    clearTimeout(cursorTimerRef.current);
    cursorTimerRef.current = null;
    sendCursor({ x: null, y: null });
  }

  function handlePointerMove(e) {
    if (!lastRef.current) {
      queueCursor(toCanvasPoint(e));
      return;
    }
    if (performance.now() - lastSentAtRef.current < MIN_SEG_INTERVAL_MS) return;
    const p = toCanvasPoint(e);
    if (p.x === lastRef.current.x && p.y === lastRef.current.y) return;
    addSeg(lastRef.current, p);
  }

  function handlePointerUp(e) {
    if (!lastRef.current) return;
    const p = toCanvasPoint(e);
    if (p.x !== lastRef.current.x || p.y !== lastRef.current.y) {
      addSeg(lastRef.current, p);
    }
    lastRef.current = null;

    const data = bufRef.current;
    bufRef.current = [];
    enqueueWrite("Joone salvestamine", () => saveStroke(roomId, data));
  }

  function handleClear() {
    clearCanvas(canvasRef.current.getContext("2d"));
    if (joinedRef.current) {
      channelRef.current.send({ type: "broadcast", event: "clear", payload: {} });
    }
    // Kustutame ka DB-st, muidu hiljem liituja näeks tühjendatud pilti uuesti.
    enqueueWrite("Lõuendi tühjendamine", () => clearRoom(roomId));
  }

  function handleRename(name) {
    if (!meRef.current) return;
    meRef.current.name = name;
    saveName(name);
    trackRef.current?.();
  }

  function handleSend(text) {
    const self = meRef.current;
    if (!self?.color) return;
    /** @type {ChatMessage} */
    const msg = {
      id: randomId(),
      uid: self.id,
      name: self.name,
      color: self.color,
      text,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, msg].slice(-MAX_MESSAGES));
    if (joinedRef.current) {
      channelRef.current.send({ type: "broadcast", event: "chat", payload: msg });
    }
  }

  return (
    <div className="flex w-full max-w-[1320px] flex-col gap-3 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Toolbar
          roomId={roomId}
          status={status}
          color={color}
          onColorChange={(c) => {
            setColor(c);
            if (tool === "eraser") setTool("brush");
          }}
          size={size}
          onSizeChange={setSize}
          tool={tool}
          onToolChange={setTool}
          onClear={handleClear}
        />
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            className="block aspect-[5/3] h-auto w-full touch-none rounded-lg bg-white shadow-sm ring-1 ring-black/10"
            style={{ cursor: tool === "fill" ? "cell" : "crosshair" }}
          />
          <Cursors bus={cursorBus} peers={peers} myId={me?.id ?? null} width={WIDTH} height={HEIGHT} />
        </div>
      </div>
      <Sidebar me={me} peers={peers} messages={messages} onRename={handleRename} onSend={handleSend} />
    </div>
  );
}
