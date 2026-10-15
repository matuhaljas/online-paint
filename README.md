Reaalajas ühisjoonistus – arendusjuhend
Ülevaade

Mitu kasutajat joonistavad samal ajal ühel lõuendil. Joonestus liigub otse brauserite vahel (Supabase Realtime Broadcast), valmis jooned salvestatakse andmebaasi, et hilisem liituja näeks olemasolevat pilti.

Stack: Next.js (App Router, JavaScript) + Supabase (Postgres + Realtime) + Vercel.

Back-end (Supabase)

Tabel strokes

id bigint PK (identity)
room text – toa id
data jsonb – lõigu massiiv [{x0,y0,x1,y1,color,size}] või täitmine [{type:"fill",x,y,color}]
created_at timestamptz
Indeks (room, id), RLS sisse lülitatud (select/insert/delete avatud prototüübi jaoks)

Realtime kanalid

Kanal: room:<id>
Sündmused (Broadcast):
seg – üks joone lõik (payload Seg + valikuline uid, et teised näeksid joonistaja kursorit; uid DB-sse ei lähe)
clear – lõuendi tühjendamine
fill – ala täitmine värvipotiga (payload Fill), salvestatakse kohe eraldi reana
cursor – kursori asukoht {uid, x, y}, x: null = lahkus lõuendilt (~20/s, joonistamise ajal ei saadeta)
chat – vestluse sõnum {id, uid, name, color, text, ts}, DB-sse ei salvestata
Presence: võti = kasutaja id (uus iga külastusega), payload {name, color, onlineAt}.
Iga liituja valib vaba kursorivärvi; kui kahel on sama, vahetab hiljem liitunu.

Reeglid

Broadcast ei kirjuta andmebaasi, DB-sse salvestatakse ainult pointerup peale.
Kliendi seadistus: realtime: { params: { eventsPerSecond: 60 } }
Hiljem: autentimine ja RLS-i karmistamine, toa omanikud (rooms tabel).
Front-end (Next.js)

Struktuur

app/
  page.js                  // avaleht: "Loo tuba" → suunab /room/<id>
  room/[id]/page.js        // server component, annab toa id Canvasile
  room/[id]/Canvas.js      // "use client", joonistus + realtime
  room/[id]/Toolbar.js     // värv, pintsli suurus, tühjenda
  room/[id]/Cursors.js     // teiste kursorid lõuendi kohal
  room/[id]/Sidebar.js     // toas olijad ja vestlus
lib/
  supabase.js              // kliendi init
  types.js                 // Seg, Fill, StrokeRow (JSDoc), roomChannel
  strokes.js               // loadStrokes, saveStroke, clearRoom
  floodFill.js             // värvipoti täitmine
  users.js                 // kursorivärvid, nimed, Presence olek
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
Tüübid ainult failis lib/types.js (JSDoc).
Sündmuste nimed ja payload’i kuju ei muutu ilma kokkuleppeta (seg, clear, fill, cursor, chat, Presence).
Üks haru funktsiooni kohta, PR enne mergemist.
Hilisemad täiendused

Kustutuskumm, undo/redo, kursorid, mobiilituki parandused, segmentide batchimine (kui on viivitust), autentimine ja privaatsed toad.


NEXT_PUBLIC_SUPABASE_URL=https://gzdxlldmgiscijqssxbc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_dCo8X2O1h6hk8rowU5gPGw_BMsIWCp9