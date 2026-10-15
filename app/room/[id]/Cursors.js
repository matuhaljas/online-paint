"use client";

import { useEffect, useState } from "react";

/** @typedef {import("@/lib/types").Peer} Peer */
/** @typedef {import("@/lib/types").Cursor} Cursor */

/**
 * Teiste kasutajate kursorid lõuendi kohal. Asukohad tulevad `bus` kaudu
 * (sündmus "cursor"), et kiired uuendused ei renderdaks kogu Canvast uuesti.
 *
 * @param {{ bus: EventTarget, peers: Peer[], myId: string | null, width: number, height: number }} props
 */
export default function Cursors({ bus, peers, myId, width, height }) {
  const [positions, setPositions] = useState(/** @type {Record<string, {x: number, y: number} | null>} */ ({}));

  useEffect(() => {
    function onCursor(e) {
      /** @type {Cursor} */
      const c = e.detail;
      setPositions((prev) => ({ ...prev, [c.uid]: c.x == null ? null : { x: c.x, y: c.y } }));
    }
    bus.addEventListener("cursor", onCursor);
    return () => bus.removeEventListener("cursor", onCursor);
  }, [bus]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      {peers.map((p) => {
        const pos = positions[p.id];
        if (p.id === myId || !pos) return null;
        return (
          <div
            key={p.id}
            className="absolute top-0 left-0 flex items-start transition-[left,top] duration-75 ease-linear"
            style={{ left: `${(pos.x / width) * 100}%`, top: `${(pos.y / height) * 100}%` }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" className="drop-shadow-sm">
              <path d="M1 1 L1 15 L5 11 L8 17 L10.5 16 L7.5 10 L13 10 Z" fill={p.color} stroke="white" strokeWidth="1.2" />
            </svg>
            <span
              className="mt-3 -ml-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-white shadow-sm"
              style={{ backgroundColor: p.color }}
            >
              {p.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
