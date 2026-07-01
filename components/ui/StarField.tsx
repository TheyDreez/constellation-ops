"use client";

/**
 * Campo de estrelas decorativo. Posições e timings são gerados com um PRNG
 * com seed fixa (não usa Math.random) para não gerar mismatch de hidratação
 * entre servidor e cliente no Next.js.
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number;
  y: number;
  r: number;
  delay: number;
  dur: number;
  opacity: number;
}

function makeStars(count: number, seed: number): Star[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    r: 0.4 + rand() * 1.4,
    delay: rand() * 6,
    dur: 3 + rand() * 5,
    opacity: 0.35 + rand() * 0.5,
  }));
}

const STAR_CACHE = new Map<string, Star[]>();
function getStars(count: number, seed: number) {
  const key = `${count}-${seed}`;
  if (!STAR_CACHE.has(key)) STAR_CACHE.set(key, makeStars(count, seed));
  return STAR_CACHE.get(key)!;
}

interface StarFieldProps {
  className?: string;
  count?: number;
  seed?: number;
  color?: string;
}

export function StarField({ className = "", count = 140, seed = 42, color = "#ffffff" }: StarFieldProps) {
  const stars = getStars(count, seed);
  return (
    <svg
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          fill={color}
          style={{
            opacity: s.opacity,
            animation: `star-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </svg>
  );
}
