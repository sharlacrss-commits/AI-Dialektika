import { Dna, FlaskConical, Calculator, Lightbulb } from "lucide-react";

export const MAPEL = [
  {
    nama: "Biologi",
    desc: "Sel, genetika, dan ekosistem.",
    icon: Dna,
    img: "/images/biologi.jpg",
  },
  {
    nama: "Kimia",
    desc: "Reaksi kimia dan tabel periodik.",
    icon: FlaskConical,
    img: "/images/kimia.jpg",
  },
  {
    nama: "Matematika",
    desc: "Aljabar, kalkulus, dan statistik.",
    icon: Calculator,
    img: "/images/matematika.jpg",
  },
  {
    nama: "Studi Kasus",
    desc: "Terapkan nalar ke dunia nyata.",
    icon: Lightbulb,
    img: "/images/studikasus.jpg",
  },
] as const;

export function iconMapel(nama: string) {
  return MAPEL.find((m) => m.nama === nama)?.icon ?? Lightbulb;
}
