"use client";
import { motion } from "framer-motion";

interface Ring {
  diameter: number;
  duration: number;
  color: string;
  planetSize: number;
  reverse?: boolean;
  dashed?: boolean;
}

const RINGS: Ring[] = [
  { diameter: 340, duration: 18, color: "#22d3ee", planetSize: 6 },
  { diameter: 460, duration: 30, color: "#a78bfa", planetSize: 8, reverse: true },
  { diameter: 580, duration: 44, color: "#fbbf24", planetSize: 5 },
  { diameter: 700, duration: 60, color: "#34d399", planetSize: 5, reverse: true, dashed: true },
];

export function OrbitField() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
      {RINGS.map((ring, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: ring.diameter,
            height: ring.diameter,
            border: `1px ${ring.dashed ? "dashed" : "solid"} ${ring.color}`,
            opacity: 0.14,
          }}
        />
      ))}
      {RINGS.map((ring, i) => (
        <motion.div
          key={`spin-${i}`}
          className="absolute"
          style={{ width: ring.diameter, height: ring.diameter }}
          animate={{ rotate: ring.reverse ? -360 : 360 }}
          transition={{ duration: ring.duration, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: ring.planetSize,
              height: ring.planetSize,
              top: -ring.planetSize / 2,
              left: "50%",
              marginLeft: -ring.planetSize / 2,
              background: ring.color,
              boxShadow: `0 0 10px 2px ${ring.color}99`,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
