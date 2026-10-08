import { useEffect, useMemo, useState } from "react";
import type { ImgHTMLAttributes } from "react";
import { srcCandidates } from "../lib/assets";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src: string;
  /** dipanggil setelah semua kandidat path gagal dimuat */
  onFail?: () => void;
};

// <img> yang otomatis mencoba variasi ekstensi (.JPG/.jpg/.jpeg) sebelum menyerah.
export default function AssetImage({ src, onFail, alt = "", ...rest }: Props) {
  const list = useMemo(() => srcCandidates(src), [src]);
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
  }, [src]);
  const cur = list[Math.min(i, list.length - 1)];
  return (
    <img
      {...rest}
      alt={alt}
      src={cur}
      onError={() => {
        if (i < list.length - 1) setI(i + 1);
        else {
          console.warn("[media] gambar tidak ditemukan:", src, "(dicoba:", list.join(", "), ")");
          onFail?.();
        }
      }}
    />
  );
}
