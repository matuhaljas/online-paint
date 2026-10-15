"use client";

import { useState } from "react";

const COLORS = ["#111111", "#e11d48", "#f97316", "#eab308", "#16a34a", "#2563eb", "#9333ea"];

const STATUS_LABELS = {
  SUBSCRIBED: "Ühendatud",
  CONNECTING: "Ühendan…",
  TIMED_OUT: "Ühendus aegus",
  CHANNEL_ERROR: "Ühenduse viga",
  CLOSED: "Ühendus suletud",
};

export default function Toolbar({
  roomId,
  status,
  color,
  onColorChange,
  size,
  onSizeChange,
  erasing,
  onErasingChange,
  onClear,
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const toolButton =
    "h-9 rounded-full px-4 text-sm font-medium transition-colors ring-1 ring-black/10";

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-center gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Värv ${c}`}
            onClick={() => onColorChange(c)}
            className={`size-7 rounded-full ring-offset-2 ring-offset-white transition-shadow dark:ring-offset-zinc-900 ${
              !erasing && color === c ? "ring-2 ring-zinc-500" : ""
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color"
          aria-label="Vali muu värv"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="size-7 cursor-pointer rounded-full bg-transparent"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        Suurus
        <input
          type="range"
          min={1}
          max={40}
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="w-28"
        />
        <span className="w-6 tabular-nums">{size}</span>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-pressed={erasing}
          onClick={() => onErasingChange(!erasing)}
          className={`${toolButton} ${
            erasing
              ? "bg-foreground text-background"
              : "hover:bg-black/5 dark:ring-white/15 dark:hover:bg-white/10"
          }`}
        >
          Kustutaja
        </button>
        <button
          type="button"
          onClick={onClear}
          className={`${toolButton} text-red-600 hover:bg-red-50 dark:ring-white/15 dark:hover:bg-red-950`}
        >
          Tühjenda
        </button>
      </div>

      <div className="ml-auto flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 text-zinc-500">
          <span
            className={`size-2 rounded-full ${
              status === "SUBSCRIBED" ? "bg-green-500" : "bg-amber-400"
            }`}
          />
          {STATUS_LABELS[status] ?? status}
        </span>
        <button
          type="button"
          onClick={copyLink}
          className={`${toolButton} hover:bg-black/5 dark:ring-white/15 dark:hover:bg-white/10`}
          title={`Tuba ${roomId}`}
        >
          {copied ? "Kopeeritud!" : "Kopeeri link"}
        </button>
      </div>
    </div>
  );
}
