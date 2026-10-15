"use client";

import { useEffect, useRef, useState } from "react";

/** @typedef {import("@/lib/types").Peer} Peer */
/** @typedef {import("@/lib/types").ChatMessage} ChatMessage */

const MAX_MESSAGE_LENGTH = 500;

/**
 * Toas olijad ja vestlus.
 *
 * @param {{
 *   me: Peer | null,
 *   peers: Peer[],
 *   messages: ChatMessage[],
 *   onRename: (name: string) => void,
 *   onSend: (text: string) => void,
 * }} props
 */
export default function Sidebar({ me, peers, messages, onRename, onSend }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  // Uue sõnumi korral keri alla.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text.slice(0, MAX_MESSAGE_LENGTH));
    setDraft("");
  }

  function commitName(e) {
    const name = e.currentTarget.value.trim().slice(0, 24);
    if (name && name !== me?.name) onRename(name);
    else e.currentTarget.value = me?.name ?? "";
  }

  return (
    <aside className="flex h-[420px] w-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 lg:h-[min(640px,calc(100vh-3rem))] lg:w-72 lg:shrink-0 dark:bg-zinc-900 dark:ring-white/10">
      <section className="flex flex-col gap-3 border-b border-black/5 p-4 dark:border-white/10">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Sinu nimi
          <input
            key={me?.name ?? ""}
            defaultValue={me?.name ?? ""}
            disabled={!me}
            maxLength={24}
            onBlur={commitName}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-9 rounded-lg border border-black/10 bg-transparent px-3 text-sm text-foreground outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-xs font-medium text-zinc-500">Ruumis ({peers.length})</h2>
          <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto">
            {peers.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="truncate">{p.name}</span>
                {p.id === me?.id && <span className="text-xs text-zinc-500">(sina)</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col">
        <h2 className="px-4 pt-3 text-xs font-medium text-zinc-500">Vestlus</h2>
        <ul ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-2">
          {messages.length === 0 && (
            <li className="text-sm text-zinc-400">Sõnumeid pole veel. Vestlus ei salvestu.</li>
          )}
          {messages.map((m) => (
            <li key={m.id} className="text-sm break-words">
              <span className="font-medium" style={{ color: m.color }}>
                {m.name}
              </span>
              <span className="text-zinc-400"> · </span>
              {m.text}
            </li>
          ))}
        </ul>
        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-black/5 p-3 dark:border-white/10">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Kirjuta sõnum…"
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={!me}
            className="h-9 min-w-0 flex-1 rounded-full border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40"
          />
          <button
            type="submit"
            disabled={!me || !draft.trim()}
            className="h-9 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity disabled:opacity-40"
          >
            Saada
          </button>
        </form>
      </section>
    </aside>
  );
}
