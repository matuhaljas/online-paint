"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Toolbar from "./Toolbar";

/** @typedef {import("@/lib/types").Seg} Seg */
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

  const [color, setColor] = useState("#111111");
  const [size, setSize] = useState(4);
  const [erasing, setErasing] = useState(false);
  const [status, setStatus] = useState("CONNECTING");

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
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
            for (const seg of row.data) drawSeg(ctx, seg);
          }
        }
        for (const seg of pending) drawSeg(ctx, seg);
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
      color: erasing ? BACKGROUND : color,
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

  function handlePointerDown(e) {
    if (e.button !== 0) return;
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

  async function handlePointerUp(e) {
    if (!lastRef.current) return;
    const p = toCanvasPoint(e);
    if (p.x !== lastRef.current.x || p.y !== lastRef.current.y) {
      addSeg(lastRef.current, p);
    }
    lastRef.current = null;

    const data = bufRef.current;
    bufRef.current = [];
    const { error } = await supabase.from("strokes").insert({ room: roomId, data });
    if (error) console.error("Joone salvestamine ebaõnnestus:", error.message);
  }

  async function handleClear() {
    clearCanvas(canvasRef.current.getContext("2d"));
    if (joinedRef.current) {
      channelRef.current.send({ type: "broadcast", event: "clear", payload: {} });
    }
    // Kustutame ka DB-st, muidu hiljem liituja näeks tühjendatud pilti uuesti.
    const { error } = await supabase.from("strokes").delete().eq("room", roomId);
    if (error) console.error("Lõuendi tühjendamine ebaõnnestus:", error.message);
  }

  return (
    <div className="flex w-full max-w-[1000px] flex-col gap-3">
      <Toolbar
        roomId={roomId}
        status={status}
        color={color}
        onColorChange={(c) => {
          setColor(c);
          setErasing(false);
        }}
        size={size}
        onSizeChange={setSize}
        erasing={erasing}
        onErasingChange={setErasing}
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
        style={{ cursor: "crosshair" }}
      />
    </div>
  );
}
