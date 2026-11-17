import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { artworks, buildFilterQuery, filterAndSortArtworks, YEAR_MAX, YEAR_MIN } from '../hooks/useArtworks';
import styles from './FeaturedCarousel.module.css';

const DRAG_THRESHOLD = 5;
const FRICTION = 0.94; // per-frame velocity decay for the glide after a drag

export default function FeaturedCarousel({ series }: { series: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0, lastX: 0, lastT: 0, velocity: 0 });
  const glide = useRef(0);
  const [dragging, setDragging] = useState(false);

  const params = { search: '', sortKey: 'date-desc' as const, yearMin: YEAR_MIN, yearMax: YEAR_MAX, sizeBucket: 'all' as const, series };
  const pieces = filterAndSortArtworks(artworks, params);
  const linkQuery = buildFilterQuery(params);

  if (pieces.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  // Mouse-only: touch and trackpads already scroll the track natively.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !trackRef.current) return;
    cancelAnimationFrame(glide.current);
    drag.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startScroll: trackRef.current.scrollLeft,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = trackRef.current;
    if (!d.active || !el) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > DRAG_THRESHOLD) {
      d.moved = true;
      setDragging(true);
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) {
      el.scrollLeft = d.startScroll - dx;
      const now = performance.now();
      const dt = Math.max(1, now - d.lastT);
      // px per ~16ms frame, smoothed so one jittery sample doesn't dominate
      d.velocity = 0.8 * ((e.clientX - d.lastX) / dt) * 16 + 0.2 * d.velocity;
      d.lastX = e.clientX;
      d.lastT = now;
    }
  };

  const endDrag = () => {
    const d = drag.current;
    const el = trackRef.current;
    const wasDragging = d.active && d.moved;
    d.active = false;
    if (!wasDragging || !el) {
      setDragging(false);
      return;
    }
    // Let the row keep gliding briefly, then hand back to scroll-snap.
    let v = d.velocity;
    const step = () => {
      if (Math.abs(v) < 0.5) {
        setDragging(false);
        return;
      }
      el.scrollLeft -= v;
      v *= FRICTION;
      glide.current = requestAnimationFrame(step);
    };
    glide.current = requestAnimationFrame(step);
  };

  // A drag that ends over a piece would otherwise also open it.
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{series}</h2>
        <div className={styles.arrows}>
          <button type="button" className={styles.arrow} onClick={() => scrollBy(-1)} aria-label="Scroll left">
            ←
          </button>
          <button type="button" className={styles.arrow} onClick={() => scrollBy(1)} aria-label="Scroll right">
            →
          </button>
        </div>
      </div>
      <div className={styles.trackWrap}>
        <div
          ref={trackRef}
          className={`${styles.track} ${dragging ? styles.dragging : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
        >
          {pieces.map((a) => (
            <Link
              key={a.id}
              to={`/piece/${a.id}${linkQuery}`}
              className={styles.item}
              draggable={false}
            >
              <span className={styles.frame}>
                <img src={a.full} alt={a.title} loading="lazy" draggable={false} />
              </span>
              <span className={styles.caption}>{a.title}</span>
            </Link>
          ))}
        </div>
        <div className={styles.fade} aria-hidden="true" />
      </div>
    </section>
  );
}
