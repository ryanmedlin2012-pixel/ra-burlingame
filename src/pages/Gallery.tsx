import { useArtworks, YEAR_MAX, YEAR_MIN } from '../hooks/useArtworks';
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

  return (
    <div>
      <Nav />
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>WORK</h1>
          <span className={styles.count}>
            {artworks.length} / {total}
          </span>
        </header>

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
        />

        <GalleryGrid artworks={artworks} />
      </div>
    </div>
  );
}
