import { Link } from 'react-router-dom';
import type { Artwork } from '../hooks/useArtworks';
import styles from './ArtworkCard.module.css';

export default function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <Link to={`/piece/${artwork.id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <img src={artwork.thumb} alt={artwork.title} loading="lazy" />
      </div>
    </Link>
  );
}
