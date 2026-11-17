import { artworks, filterAndSortArtworks, YEAR_MAX, YEAR_MIN } from '../hooks/useArtworks';
import styles from './SeriesTiles.module.css';

export default function SeriesTiles({ series, onSelect }: { series: string[]; onSelect: (s: string) => void }) {
  return (
    <div className={styles.grid}>
      {series.map((s) => {
        const pieces = filterAndSortArtworks(artworks, {
          search: '',
          sortKey: 'date-desc',
          yearMin: YEAR_MIN,
          yearMax: YEAR_MAX,
          sizeBucket: 'all',
          series: s,
        });
        const cover = pieces[0];
        return (
          <button key={s} type="button" className={styles.tile} onClick={() => onSelect(s)}>
            <span className={styles.imageWrap}>
              {cover && <img src={cover.cardThumb ?? cover.thumb} alt="" loading="lazy" />}
            </span>
            <span className={styles.meta}>
              <span className={styles.name}>{s}</span>
              <span className={styles.count}>{pieces.length}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
