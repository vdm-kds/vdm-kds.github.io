import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export type CarouselProduct = {
  id: string | number;
  name: string;
  category: string;
  price: number;
  conditionPct: number;
  stock: number;
  image?: string;
};

type Props = {
  products: CarouselProduct[];
  onOpen: (p: CarouselProduct) => void;
  onAddToCart: (p: CarouselProduct) => void;
};

const money = (n: number) => n.toLocaleString('vi-VN') + 'đ';

// Vẽ tứ giác bo góc cho clip-path: path()
function roundedQuad(pts: number[][], r: number): string {
  let d = '';
  for (let i = 0; i < 4; i++) {
    const p = pts[i];
    const prev = pts[(i + 3) % 4];
    const next = pts[(i + 1) % 4];
    const l1 = Math.hypot(prev[0] - p[0], prev[1] - p[1]) || 1;
    const l2 = Math.hypot(next[0] - p[0], next[1] - p[1]) || 1;
    const r1 = Math.min(r, l1 / 2);
    const r2 = Math.min(r, l2 / 2);
    const ax = p[0] + ((prev[0] - p[0]) / l1) * r1;
    const ay = p[1] + ((prev[1] - p[1]) / l1) * r1;
    const bx = p[0] + ((next[0] - p[0]) / l2) * r2;
    const by = p[1] + ((next[1] - p[1]) / l2) * r2;
    d += `${i === 0 ? 'M' : 'L'}${ax.toFixed(1)},${ay.toFixed(1)} Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)} `;
  }
  return d + 'Z';
}

export default function CurvedCarousel({ products, onOpen, onAddToCart }: Props) {
  const bandRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const s = useRef({
    W: 0, u: 1, N: 0, pos: 0, vel: 0,
    dragging: false, captured: false, startX: 0, lastX: 0, lastT: 0, moved: 0,
    hover: false,
  });
  const [count, setCount] = useState(0);

  // Đo chiều rộng thật của dải thẻ → tính đơn vị u và số thẻ cần vẽ
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const measure = () => {
      const W = band.clientWidth;
      const u = W <= 820 ? W / 640 : Math.min(window.innerWidth / 1440, window.innerHeight / 1080);
      const N = Math.ceil(W / (196 * u)) + 4;
      Object.assign(s.current, { W, u, N });
      band.style.height = `${400 * u}px`;
      setCount(N);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(band);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Vòng lặp chuyển động: tự trôi phải → trái, quán tính, tính độ cong mỗi khung hình
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = performance.now();

    const layout = () => {
      const st = s.current;
      const { W, u, N } = st;
      if (!W || !N) return;
      const cx = W / 2;
      const R = W / 2;
      const pitch = 196 * u;
      const total = N * pitch;
      const midY = 200 * u;
      for (let i = 0; i < N; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const t = ((((i * pitch - st.pos) % total) + total) % total) - total / 2;
        const x = cx + t * (1 + 0.083 * (t / R) ** 2);
        const d = Math.min(Math.abs(x - cx) / R, 1.2);
        const w = (170 + 48 * d * d) * u;
        const xl = x - w / 2;
        const xr = x + w / 2;
        const qL = Math.min(Math.abs(xl - cx) / R, 1.2);
        const qR = Math.min(Math.abs(xr - cx) / R, 1.2);
        const hL = (280 + 92 * qL ** 2.6) * u;
        const hR = (280 + 92 * qR ** 2.6) * u;
        const cy = midY - 12 * d * d * u;
        const topL = cy - hL / 2;
        const topR = cy - hR / 2;
        const botL = cy + hL / 2;
        const botR = cy + hR / 2;
        const boxTop = Math.min(topL, topR);
        const boxH = Math.max(botL, botR) - boxTop;
        el.style.width = `${w}px`;
        el.style.height = `${boxH}px`;
        el.style.transform = `translate3d(${xl}px, ${boxTop}px, 0)`;
        el.style.clipPath = `path('${roundedQuad(
          [[0, topL - boxTop], [w, topR - boxTop], [w, botR - boxTop], [0, botL - boxTop]],
          15 * u
        )}')`;
        el.style.visibility = xr < -40 || xl > W + 40 ? 'hidden' : 'visible';
        el.classList.toggle('is-narrow', w < 120);
        const inner = innerRefs.current[i];
        if (inner) {
          const pad = 12 * u;
          inner.style.left = `${pad}px`;
          inner.style.right = `${pad}px`;
          inner.style.top = `${Math.max(topL, topR) - boxTop + pad}px`;
          inner.style.bottom = `${Math.max(botL, botR) - Math.min(botL, botR) + pad}px`;
        }
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const st = s.current;
      if (!st.dragging) {
        const auto = reduce || st.hover ? 0 : 50 * st.u;
        st.pos += (auto + st.vel) * dt;
        st.vel *= Math.pow(0.05, dt); // giảm ~95% vận tốc mỗi giây
        if (Math.abs(st.vel) < 2) st.vel = 0;
      }
      layout();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    const st = s.current;
    st.dragging = true;
    st.captured = false;
    st.moved = 0;
    st.vel = 0;
    st.startX = st.lastX = e.clientX;
    st.lastT = performance.now();
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const st = s.current;
    if (!st.dragging) return;
    const now = performance.now();
    const dx = e.clientX - st.lastX;
    st.pos -= dx;
    st.moved = Math.abs(e.clientX - st.startX);
    const dtm = Math.max((now - st.lastT) / 1000, 0.008);
    st.vel = Math.max(-4000, Math.min(4000, 0.7 * (-dx / dtm) + 0.3 * st.vel));
    st.lastX = e.clientX;
    st.lastT = now;
    if (!st.captured && st.moved > 6) {
      bandRef.current?.setPointerCapture(e.pointerId);
      st.captured = true;
    }
  };

  const endDrag = () => {
    const st = s.current;
    if (!st.dragging) return;
    if (performance.now() - st.lastT > 80) st.vel = 0;
    st.dragging = false;
  };

  return (
    <div
      ref={bandRef}
      className="curved-band"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') s.current.hover = true;
      }}
      onPointerLeave={() => {
        s.current.hover = false;
        endDrag();
      }}
    >
      {products.length > 0 &&
        Array.from({ length: count }, (_, i) => {
          const p = products[i % products.length];
          const soldOut = p.stock <= 0;
          return (
            <div
              key={i}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={`curved-card${soldOut ? ' is-sold' : ''}`}
              role="link"
              tabIndex={0}
              aria-label={`${p.name}, ${money(p.price)}, ${p.conditionPct}% mới`}
              onClick={() => {
                if (s.current.moved <= 6) onOpen(p);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onOpen(p);
              }}
              onFocus={() => {
                s.current.hover = true;
              }}
              onBlur={() => {
                s.current.hover = false;
              }}
            >
              <div className="curved-fallback">
                <span className="curved-fallback-cat">{p.category}</span>
                <span className="curved-fallback-name">{p.name}</span>
              </div>
              {p.image && (
                <img
                  className="curved-img"
                  src={p.image}
                  alt={p.name}
                  draggable={false}
                  style={{ animationDelay: `${-i * 1.7}s` }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div
                ref={(el) => {
                  innerRefs.current[i] = el;
                }}
                className="curved-inner"
              >
                <div className="curved-top">
                  <span className="curved-stamp">{soldOut ? 'Đã có chủ mới' : `${p.conditionPct}% mới`}</span>
                  {!soldOut && (
                    <button
                      type="button"
                      className="curved-cart"
                      aria-label={`Thêm ${p.name} vào giỏ`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(p);
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 6h15l-1.5 9h-12z" />
                        <path d="M6 6 5 3H2" />
                        <circle cx="9" cy="20" r="1.5" />
                        <circle cx="18" cy="20" r="1.5" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="curved-bottom">
                  <span className="curved-name">{p.name}</span>
                  <span className="curved-price">{money(p.price)}</span>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
