import type { Artwork } from '../hooks/useArtworks';
import ArtworkCard from './ArtworkCard';
import styles from './GalleryGrid.module.css';

export default function GalleryGrid({ artworks, linkQuery }: { artworks: Artwork[]; linkQuery: string }) {
  if (artworks.length === 0) {
    return <p className={styles.empty}>NO RESULTS</p>;
  }

  return (
    <div className={styles.grid}>
      {artworks.map((a) => (
        <ArtworkCard key={a.id} artwork={a} linkQuery={linkQuery} />
      ))}
    </div>
  );
}
