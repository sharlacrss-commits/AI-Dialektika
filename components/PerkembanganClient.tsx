"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { CheckCircle2, Award } from "lucide-react";

type Tren = { tanggal: string; skor: number };
type RadarData = { keterampilan: string; nilai: number };

export function PerkembanganClient({
  tren,
  radar,
  totalSesi,
  topikDikuasai,
  rataSkor,
}: {
  tren: Tren[];
  radar: RadarData[];
  totalSesi: number;
  topikDikuasai: number;
  rataSkor: number;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Perkembangan</h1>
      <p className="mt-1 text-muted">
        Terus tingkatkan semangat belajarmu. Ini hasil nyatamu sejauh ini.
      </p>

      {/* Ringkasan */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Rata-rata skor" value={`${rataSkor}`} highlight />
        <Stat label="Sesi selesai" value={`${totalSesi}`} />
        <Stat label="Topik dikuasai" value={`${topikDikuasai}`} />
      </div>

      {/* Tren skor */}
      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display font-bold text-ink">Tren Skor Belajar</h2>
        <p className="mb-4 text-sm text-muted">Skor dari sesi ke sesi</p>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tren} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="tanggal" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: "#6b7280" }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="skor"
                stroke="#14b8a6"
                strokeWidth={3}
                dot={{ fill: "#14b8a6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar 6 keterampilan */}
      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display font-bold text-ink">Kekuatan Berpikir</h2>
        <p className="mb-4 text-sm text-muted">
          Rata-rata 6 keterampilan berpikir kritis (Facione)
        </p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar} outerRadius="70%">
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="keterampilan"
                tick={{ fontSize: 11, fill: "#0f766e" }}
              />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              <Radar
                dataKey="nilai"
                stroke="#14b8a6"
                fill="#14b8a6"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        highlight ? "bg-primary text-white" : "border border-line bg-white"
      }`}
    >
      <span
        className={`grid size-8 place-items-center rounded-lg ${
          highlight ? "bg-white/20" : "bg-accent-soft text-primary-press"
        }`}
      >
        {highlight ? <Award size={16} /> : <CheckCircle2 size={16} />}
      </span>
      <p className={`mt-2 font-display text-2xl font-bold ${highlight ? "" : "text-ink"}`}>
        {value}
      </p>
      <p className={`text-xs ${highlight ? "text-white/80" : "text-muted"}`}>
        {label}
      </p>
    </div>
  );
}
