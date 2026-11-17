import { useMemo, useState } from 'react';
import {
  ACTIVE_SERIES,
  artworks as allArtworks,
  buildFilterQuery,
  filterAndSortArtworks,
  useArtworks,
  YEAR_MAX,
  YEAR_MIN,
} from '../hooks/useArtworks';
import Nav from '../components/Nav';
import FilterBar from '../components/FilterBar';
import GalleryGrid from '../components/GalleryGrid';
import Footer from '../components/Footer';
import FeaturedCarousel from '../components/FeaturedCarousel';
import SeriesTiles from '../components/SeriesTiles';
import styles from './Gallery.module.css';

const FEATURED_SERIES = 'Psychological landscape';

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
    series,
    setSeries,
  } = useArtworks();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const linkQuery = buildFilterQuery({ search, sortKey, yearMin, yearMax, sizeBucket, series });

  const featuredParams = { search, sortKey, yearMin, yearMax, sizeBucket, series: FEATURED_SERIES };
  const featuredQuery = buildFilterQuery(featuredParams);
  const featuredPieces = useMemo(
    () => filterAndSortArtworks(allArtworks, featuredParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, sortKey, yearMin, yearMax, sizeBucket],
  );

  return (
    <div className={styles.root}>
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
            series={series}
            onSeriesChange={setSeries}
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

        {series === 'all' ? (
          <>
            <FeaturedCarousel title={FEATURED_SERIES} pieces={featuredPieces} linkQuery={featuredQuery} />
            <GalleryGrid artworks={artworks} linkQuery={linkQuery} />
          </>
        ) : (
          <>
            <FeaturedCarousel key={series} title={series} pieces={artworks} linkQuery={linkQuery} />
            <SeriesTiles
              series={ACTIVE_SERIES.filter((s) => s !== series)}
              onSelect={(s) => {
                setSeries(s);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
