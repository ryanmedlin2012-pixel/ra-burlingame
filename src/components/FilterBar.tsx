import type { SizeBucket, SortKey } from '../hooks/useArtworks';
import styles from './FilterBar.module.css';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  sortKey: SortKey;
  onSortChange: (v: SortKey) => void;
  yearMin: number;
  yearMax: number;
  yearBoundMin: number;
  yearBoundMax: number;
  onYearMinChange: (v: number) => void;
  onYearMaxChange: (v: number) => void;
  sizeBucket: SizeBucket;
  onSizeBucketChange: (v: SizeBucket) => void;
  count: number;
  total: number;
}

const SIZE_BUCKETS: { value: SizeBucket; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'small', label: 'S <5MP' },
  { value: 'medium', label: 'M 5–20MP' },
  { value: 'large', label: 'L >20MP' },
];

export default function FilterBar(props: Props) {
  return (
    <div className={styles.bar}>
      <div className={styles.group}>
        <label className={styles.label} htmlFor="search">
          SEARCH
        </label>
        <input
          id="search"
          className={styles.input}
          type="text"
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          placeholder="title..."
        />
      </div>

      <div className={styles.group}>
        <label className={styles.label} htmlFor="sort">
          SORT
        </label>
        <select
          id="sort"
          className={styles.select}
          value={props.sortKey}
          onChange={(e) => props.onSortChange(e.target.value as SortKey)}
        >
          <option value="date-desc">DATE ↓ NEWEST</option>
          <option value="date-asc">DATE ↑ OLDEST</option>
          <option value="title-asc">TITLE A–Z</option>
        </select>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>YEAR</span>
        <div className={styles.yearRange}>
          <input
            aria-label="year min"
            className={styles.yearInput}
            type="number"
            value={props.yearMin}
            min={props.yearBoundMin}
            max={props.yearMax}
            onChange={(e) => props.onYearMinChange(Number(e.target.value))}
          />
          <span className={styles.dash}>–</span>
          <input
            aria-label="year max"
            className={styles.yearInput}
            type="number"
            value={props.yearMax}
            min={props.yearMin}
            max={props.yearBoundMax}
            onChange={(e) => props.onYearMaxChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>SIZE</span>
        <div className={styles.chips}>
          {SIZE_BUCKETS.map((b) => (
            <button
              key={b.value}
              type="button"
              className={`${styles.chip} ${props.sizeBucket === b.value ? styles.chipActive : ''}`}
              onClick={() => props.onSizeBucketChange(b.value)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <span className={styles.count}>
        {props.count} / {props.total}
      </span>
    </div>
  );
}
