Reaalajas ühisjoonistus – arendusjuhend
Ülevaade

Mitu kasutajat joonistavad samal ajal ühel lõuendil. Joonestus liigub otse brauserite vahel (Supabase Realtime Broadcast), valmis jooned salvestatakse andmebaasi, et hilisem liituja näeks olemasolevat pilti.

Stack: Next.js (App Router, TypeScript) + Supabase (Postgres + Realtime) + Vercel.

Back-end (Supabase)

Tabel strokes

id bigint PK (identity)
room text – toa id
data jsonb – lõigu massiiv [{x0,y0,x1,y1,color,size}]
created_at timestamptz
Indeks (room, id), RLS sisse lülitatud (select/insert/delete avatud prototüübi jaoks)

Realtime kanalid

Kanal: room:<id>
Sündmused (Broadcast):
seg – üks joone lõik (payload Seg)
clear – lõuendi tühjendamine
Valikuline: Presence kursorite jaoks

Reeglid

Broadcast ei kirjuta andmebaasi, DB-sse salvestatakse ainult pointerup peale.
Kliendi seadistus: realtime: { params: { eventsPerSecond: 60 } }
Hiljem: autentimine ja RLS-i karmistamine, toa omanikud (rooms tabel).
Front-end (Next.js)

Struktuur

app/
  page.tsx                 // avaleht: "Loo tuba" → suunab /room/<id>
  room/[id]/page.tsx       // server component, annab toa id Canvasile
  room/[id]/Canvas.tsx     // "use client", joonistus + realtime
  room/[id]/Toolbar.tsx    // värv, pintsli suurus, tühjenda
lib/
  supabase.ts              // kliendi init
  types.ts                 // Seg, StrokeRow
.env.local                 // NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

Canvas töövoog

Mountimisel laeb toa olemasolevad strokes ja joonistab need.
Liitub kanaliga room:<id> ja kuulab seg / clear sündmusi.
pointerdown/move: joonistab lõigu kohe lokaalselt ja saadab seg Broadcastiga.
pointerup: salvestab kogu joone (buf) strokes tabelisse.
Lõuend on fikseeritud suurusega (nt 1000×600), skaleerimine ainult CSS-iga, et koordinaadid oleksid kõigil samad.
Tööjaotus
Roll	Ülesanded
Back-end	SQL skeem, RLS, Realtime seaded, hilisem auth ja rooms
Front-end A	Canvas, joonistamine, realtime kuulamine
Front-end B	Toolbar (värv, suurus, tühjenda, kustutaja), avaleht, stiil
Lisa	Kursorid (Presence), undo, deploy Vercelisse
Kokkulepped
Tüübid ainult failis lib/types.ts.
Sündmuste nimed ja payload’i kuju ei muutu ilma kokkuleppeta (seg, clear).
Üks haru funktsiooni kohta, PR enne mergemist.
Hilisemad täiendused

Kustutuskumm, undo/redo, kursorid, mobiilituki parandused, segmentide batchimine (kui on viivitust), autentimine ja privaatsed toad.


NEXT_PUBLIC_SUPABASE_URL=https://gzdxlldmgiscijqssxbc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_dCo8X2O1h6hk8rowU5gPGw_BMsIWCp9