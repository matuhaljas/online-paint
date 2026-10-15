"use client";

import { useEffect, useRef, useState } from "react";
import { floodFill } from "@/lib/floodFill";
import { supabase } from "@/lib/supabase";
import Toolbar from "./Toolbar";

/** @typedef {import("@/lib/types").Seg} Seg */
/** @typedef {import("@/lib/types").Fill} Fill */
/** @typedef {import("@/lib/types").StrokeRow} StrokeRow */

// Fikseeritud suurus, et koordinaadid oleksid kõigil samad. Skaleerimine käib CSS-iga.
const WIDTH = 1000;
const HEIGHT = 600;
const BACKGROUND = "#ffffff";
// eventsPerSecond: 60 → saadame kuni ühe lõigu ~16 ms kohta.
const MIN_SEG_INTERVAL_MS = 16;

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

  const [color, setColor] = useState("#111111");
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState("brush"); // "brush" | "eraser" | "fill"
  const [status, setStatus] = useState("CONNECTING");

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

    const channel = supabase
      .channel(`room:${roomId}`)
      .on("broadcast", { event: "seg" }, ({ payload }) => {
        if (loaded) drawSeg(ctx, payload);
        else pending.push(payload);
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
      });
    channelRef.current = channel;

    supabase
      .from("strokes")
      .select("data")
      .eq("room", roomId)
      .order("id")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Joonte laadimine ebaõnnestus:", error.message);
        } else if (!clearedWhileLoading) {
          for (const row of /** @type {StrokeRow[]} */ (data)) {
            for (const item of row.data) drawItem(ctx, item);
          }
        }
        for (const item of pending) drawItem(ctx, item);
        pending = [];
        loaded = true;
      });

    return () => {
      active = false;
      joinedRef.current = false;
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

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
      channelRef.current.send({ type: "broadcast", event: "seg", payload: seg });
    }
  }

  function enqueueWrite(label, write) {
    writeQueueRef.current = writeQueueRef.current.then(async () => {
      try {
        const { error } = await write();
        if (error) console.error(`${label} ebaõnnestus:`, error.message);
      } catch (err) {
        // Ära lase ühel veal järjekorda lukustada.
        console.error(`${label} ebaõnnestus:`, err);
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
    enqueueWrite("Täitmise salvestamine", () =>
      supabase.from("strokes").insert({ room: roomId, data: [fill] }),
    );
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

  function handlePointerMove(e) {
    if (!lastRef.current) return;
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
    enqueueWrite("Joone salvestamine", () =>
      supabase.from("strokes").insert({ room: roomId, data }),
    );
  }

  function handleClear() {
    clearCanvas(canvasRef.current.getContext("2d"));
    if (joinedRef.current) {
      channelRef.current.send({ type: "broadcast", event: "clear", payload: {} });
    }
    // Kustutame ka DB-st, muidu hiljem liituja näeks tühjendatud pilti uuesti.
    enqueueWrite("Lõuendi tühjendamine", () =>
      supabase.from("strokes").delete().eq("room", roomId),
    );
  }

  return (
    <div className="flex w-full max-w-[1000px] flex-col gap-3">
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
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="aspect-[5/3] h-auto w-full touch-none rounded-lg bg-white shadow-sm ring-1 ring-black/10"
        style={{ cursor: tool === "fill" ? "cell" : "crosshair" }}
      />
    </div>
  );
}
