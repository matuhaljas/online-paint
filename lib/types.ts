// Ühised tüübid – muuda ainult tiimi kokkuleppel (README: Kokkulepped)

/** Üks joone lõik. Koordinaadid on lõuendi pikslites (1000×600). */
export type Seg = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
};

/** Rida tabelist public.strokes */
export type StrokeRow = {
  id: number;
  room: string;
  data: Seg[];
  created_at: string;
};

/** Realtime kanali nimi toa jaoks */
export const roomChannel = (roomId: string) => `room:${roomId}`;