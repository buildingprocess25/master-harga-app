import { Store } from "lucide-react";
import { RincianSurvei3TokoCard, RingkasanBiayaMaterial } from "@/components/global";
import { SurveyTokoItem } from "@/types";
import { formatKoefisien } from "@/lib/utils";

export interface KomponenSurvei {
  id: string;
  namaKomponen: string;
  satuan: string;
  nilaiKoefisien: number;
  surveiList: SurveyTokoItem[];
}

/**
 * Hasil survei 3 toko ditampilkan per komponen wajib survei (satu tiket bisa
 * punya beberapa material), memakai kartu survei & ringkasan biaya global.
 */
export function SurveiPerKomponen({ komponen }: { komponen: KomponenSurvei[] }) {
  if (komponen.length === 0) return null;
  return (
    <section className="space-y-4" aria-labelledby="judul-survei-komponen">
      <h2 id="judul-survei-komponen" className="text-sm font-bold text-slate-900 uppercase tracking-wide">
        Hasil Survei Pasar per Komponen
      </h2>
      {komponen.map((k) => (
        <div key={k.id} className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <Store className="w-4 h-4 text-[#005BAC]" />
            <span className="font-bold text-slate-900">{k.namaKomponen}</span>
            <span className="text-slate-500">
              koefisien {formatKoefisien(k.nilaiKoefisien)} {k.satuan}
            </span>
          </div>
          {k.surveiList.length === 0 ? (
            <p className="text-xs text-[#990F14] bg-[#FDECEE] border border-[#F7C1C5] rounded-lg px-3 py-2">
              Belum ada data survei untuk komponen ini.
            </p>
          ) : (
            <div className="grid xl:grid-cols-2 gap-4">
              <RincianSurvei3TokoCard surveiList={k.surveiList} readonly />
              <RingkasanBiayaMaterial surveiList={k.surveiList} namaMaterial={k.namaKomponen} />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
