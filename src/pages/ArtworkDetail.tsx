import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { artworks, filterAndSortArtworks, getArtworkById, getNextArtworkId, parseFilterQuery } from '../hooks/useArtworks';
import Nav from '../components/Nav';
import styles from './ArtworkDetail.module.css';

export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();
  const artwork = id ? getArtworkById(id) : undefined;
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Reconstructs the grid's filter/sort view from the URL (carried along
  // from the card that was clicked) so NEXT follows that same order
  // instead of always the grid's default date-desc view.
  const orderedList = useMemo(
    () => filterAndSortArtworks(artworks, parseFilterQuery(searchParams)),
    [searchParams],
  );
  // location.key is 'default' only for the very first history entry (no
  // in-app navigation happened yet, e.g. a piece page opened directly) —
  // real browser back only makes sense once there's somewhere to go back to.
  const hasHistory = location.key !== 'default';
  const goBack = () => (hasHistory ? navigate(-1) : navigate('/work'));

  // Navigating via the NEXT control keeps this same route/component mounted
  // (only :id changes) — reset the selected photo so it doesn't carry over
  // an out-of-range index from the previous piece's alternates.
  useEffect(() => {
    setActiveIndex(0);
  }, [id]);

  if (!artwork) {
    return (
      <div>
        <Nav />
        <div className={styles.wrap}>
          <button type="button" onClick={goBack} className={styles.back}>
            ← BACK
          </button>
          <p>NOT FOUND</p>
        </div>
      </div>
    );
  }

  const allPhotos = [
    {
      src: artwork.full,
      backgroundColor: artwork.backgroundColor,
      fillOverride: artwork.fillOverride,
      vignette: artwork.vignette,
      vignetteBlur: artwork.vignetteBlur,
      vignetteInset: artwork.vignetteInset,
      vignetteSides: artwork.vignetteSides,
      paddingY: artwork.paddingY,
    },
    ...artwork.alternates,
  ];
  const shown = allPhotos[activeIndex] ?? allPhotos[0];
  const nextId = getNextArtworkId(artwork.id, orderedList);
  // An explicit override always wins (set per-photo or per-piece at build
  // time); otherwise only show the sampled color while the vignette is on —
  // with it off and no override, the plain CSS default is intentional.
  const fillColor = shown.fillOverride ?? shown.backgroundColor;
  const showFill = shown.vignette || !!shown.fillOverride;
  // Photo-level vertical-only padding (matches the natural left/right gap's
  // background) takes priority over the piece-level all-sides padding.
  const paddingStyle = shown.paddingY
    ? { padding: `${shown.paddingY}px 0` }
    : artwork.imagePadding
      ? { padding: `${artwork.imagePadding}px` }
      : undefined;

  return (
    <div>
      <Nav />
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.topRowMedia}>
            <button type="button" onClick={goBack} className={styles.back}>
              ← BACK
            </button>
            {nextId && (
              <Link to={`/piece/${nextId}${location.search}`} className={styles.next}>
                NEXT →
              </Link>
            )}
          </div>
          <div className={styles.topRowMetaSpacer} />
        </div>
        <div className={styles.layout}>
          <div className={styles.media}>
            <div
              className={styles.image}
              style={{
                ...(showFill ? { backgroundColor: fillColor } : undefined),
                ...paddingStyle,
              }}
            >
              <div className={styles.imageInner}>
                <img src={shown.src} alt={artwork.title} />
                {shown.vignette && shown.vignetteSides === 'horizontal' && (
                  <div
                    className={styles.imageVignette}
                    style={{
                      backgroundImage: `linear-gradient(to right, ${fillColor}, transparent), linear-gradient(to left, ${fillColor}, transparent)`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'left, right',
                      backgroundSize: `${shown.vignetteInset}px 100%, ${shown.vignetteInset}px 100%`,
                    }}
                  />
                )}
                {shown.vignette && shown.vignetteSides !== 'horizontal' && (
                  <div
                    className={styles.imageVignette}
                    style={{
                      boxShadow: `inset 0 0 ${shown.vignetteBlur}px ${shown.vignetteInset}px ${fillColor}`,
                    }}
                  />
                )}
              </div>
            </div>

            {allPhotos.length > 1 && (
              <div className={styles.altStrip}>
                {allPhotos.map((photo, i) => {
                  const thumbFill = photo.fillOverride ?? (photo.vignette ? photo.backgroundColor : undefined);
                  return (
                    <button
                      key={photo.src}
                      type="button"
                      className={`${styles.altThumb} ${i === activeIndex ? styles.altThumbActive : ''}`}
                      style={thumbFill ? { backgroundColor: thumbFill } : undefined}
                      onClick={() => setActiveIndex(i)}
                    >
                      <img src={photo.src} alt="" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <dl className={styles.meta}>
            <dt>TITLE</dt>
            <dd>{artwork.title}</dd>
            <dt>DATE</dt>
            <dd>{artwork.captureDate}</dd>
            <dt>MEDIUM</dt>
            <dd>{artwork.medium ?? '—'}</dd>
            {artwork.physicalSize && (
              <>
                <dt>SIZE</dt>
                <dd>{artwork.physicalSize}</dd>
              </>
            )}
            {artwork.shows && (
              <>
                <dt>SHOWS</dt>
                <dd>{artwork.shows}</dd>
              </>
            )}
            {artwork.notes && (
              <>
                <dt>NOTES</dt>
                <dd>{artwork.notes}</dd>
              </>
            )}
            {artwork.bodyOfWork && (
              <>
                <dt>COLLECTION</dt>
                <dd>{artwork.bodyOfWork}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
