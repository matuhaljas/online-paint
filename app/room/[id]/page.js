import { Suspense } from "react";
import Canvas from "./Canvas";

// cacheComponents: params on käitusaja andmed, seega Suspense ümber.
export default function RoomPage({ params }) {
  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-100 px-4 py-6 dark:bg-zinc-950">
      <Suspense fallback={<p className="text-zinc-500">Laen tuba…</p>}>
        {params.then(({ id }) => (
          <Canvas roomId={id} />
        ))}
      </Suspense>
    </main>
  );
}
