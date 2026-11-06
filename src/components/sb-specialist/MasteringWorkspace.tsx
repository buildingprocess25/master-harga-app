"use client";

import { useState } from "react";
import type { OpsiKoefisien } from "@/lib/services/ahsp-service";
import { KartuValidasiSpesifikasi } from "./KartuValidasiSpesifikasi";
import { BarisAwal, WorksheetAhsp } from "./WorksheetAhsp";

/**
 * Alur dua langkah tiket DIAJUKAN: validasi spesifikasi, lalu worksheet AHSP.
 * Bila draft resep sudah pernah disimpan, spesifikasi dianggap sudah divalidasi.
 */
export function MasteringWorkspace(props: {
  tiketId: string;
  divisiId: string;
  marginAwal: number;
  opsiKoefisien: OpsiKoefisien[];
  barisAwal: BarisAwal[];
}) {
  const [valid, setValid] = useState(props.barisAwal.length > 0);

  return (
    <div className="space-y-5">
      <KartuValidasiSpesifikasi tiketId={props.tiketId} valid={valid} onValid={() => setValid(true)} />
      {valid && (
        <WorksheetAhsp
          tiketId={props.tiketId}
          divisiId={props.divisiId}
          marginAwal={props.marginAwal}
          opsiAwal={props.opsiKoefisien}
          barisAwal={props.barisAwal}
        />
      )}
    </div>
  );
}
