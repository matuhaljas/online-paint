import { redirect } from "next/navigation";

async function createRoom() {
  "use server";
  redirect(`/room/${crypto.randomUUID().slice(0, 8)}`);
}

async function joinRoom(formData) {
  "use server";
  const id = String(formData.get("room") ?? "").trim();
  if (!id) return;
  redirect(`/room/${encodeURIComponent(id)}`);
}

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Online Paint</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Joonista koos sõpradega samal lõuendil reaalajas.
          </p>
        </div>

        <form action={createRoom}>
          <button
            type="submit"
            className="h-11 w-full rounded-full bg-foreground px-5 font-medium text-background transition-opacity hover:opacity-85"
          >
            Loo tuba
          </button>
        </form>

        <form action={joinRoom} className="flex flex-col gap-2">
          <label htmlFor="room" className="text-sm text-zinc-600 dark:text-zinc-400">
            Või liitu olemasoleva toaga
          </label>
          <div className="flex gap-2">
            <input
              id="room"
              name="room"
              placeholder="Toa id"
              autoComplete="off"
              className="h-11 min-w-0 flex-1 rounded-full border border-black/10 bg-transparent px-4 outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40"
            />
            <button
              type="submit"
              className="h-11 rounded-full border border-black/10 px-5 font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            >
              Liitu
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
