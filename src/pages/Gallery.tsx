import { useState } from 'react';
import { buildFilterQuery, useArtworks, YEAR_MAX, YEAR_MIN } from '../hooks/useArtworks';
import Nav from '../components/Nav';
import FilterBar from '../components/FilterBar';
import GalleryGrid from '../components/GalleryGrid';
import styles from './Gallery.module.css';

export default function Gallery() {
  const {
    artworks,
    total,
    search,
    setSearch,
    sortKey,
    setSortKey,
    yearMin,
    setYearMin,
    yearMax,
    setYearMax,
    sizeBucket,
    setSizeBucket,
  } = useArtworks();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const linkQuery = buildFilterQuery({ search, sortKey, yearMin, yearMax, sizeBucket });

  return (
    <div>
      <Nav />
      <div className={styles.page}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.filterToggle}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            {filtersOpen ? 'HIDE FILTERS' : 'FILTERS'}
          </button>
          <span className={styles.mobileCount}>
            {artworks.length} / {total}
          </span>
        </div>

        <div className={`${styles.filterWrap} ${filtersOpen ? '' : styles.filterWrapCollapsed}`}>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            sortKey={sortKey}
            onSortChange={setSortKey}
            yearMin={yearMin}
            yearMax={yearMax}
            yearBoundMin={YEAR_MIN}
            yearBoundMax={YEAR_MAX}
            onYearMinChange={setYearMin}
            onYearMaxChange={setYearMax}
            sizeBucket={sizeBucket}
            onSizeBucketChange={setSizeBucket}
            count={artworks.length}
            total={total}
          />
        </div>

        <GalleryGrid artworks={artworks} linkQuery={linkQuery} />
      </div>
    </div>
  );
}
