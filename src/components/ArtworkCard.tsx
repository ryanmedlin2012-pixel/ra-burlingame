import { Link } from 'react-router-dom';
import type { Artwork } from '../hooks/useArtworks';
import styles from './ArtworkCard.module.css';

export default function ArtworkCard({ artwork, linkQuery }: { artwork: Artwork; linkQuery: string }) {
  return (
    <Link to={`/piece/${artwork.id}${linkQuery}`} className={styles.card}>
      <div
        className={styles.imageWrap}
        style={{ backgroundColor: artwork.cardBackground ?? artwork.fillOverride ?? artwork.backgroundColor }}
      >
        <img
          src={artwork.cardThumb ?? artwork.thumb}
          alt={artwork.title}
          loading="lazy"
          style={{
            objectFit: artwork.cardObjectFit,
            transform: artwork.cardZoom !== 1 ? `scale(${artwork.cardZoom})` : undefined,
          }}
        />
      </div>
    </Link>
  );
}
