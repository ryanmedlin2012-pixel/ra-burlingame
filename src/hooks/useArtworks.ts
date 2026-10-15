import { useMemo, useState } from 'react';
import artworksData from '../data/artworks.json';

export interface AlternatePhoto {
  src: string;
  backgroundColor: string;
  fillOverride: string | null;
  vignette: boolean;
  vignetteBlur: number;
  vignetteInset: number;
  vignetteSides: 'all' | 'horizontal';
  paddingY: number;
}

export interface Artwork {
  id: string;
  title: string;
  year: number | null;
  captureDate: string;
  sortDate: string;
  width: number | null;
  height: number | null;
  megapixels: number | null;
  medium: string | null;
  physicalSize: string | null;
  shows: string | null;
  notes: string | null;
  bodyOfWork: string | null;
  thumb: string;
  cardThumb: string | null;
  full: string;
  backgroundColor: string;
  vignette: boolean;
  vignetteBlur: number;
  vignetteInset: number;
  vignetteSides: 'all' | 'horizontal';
  imagePadding: number;
  fillOverride: string | null;
  cardBackground: string | null;
  cardObjectFit: 'contain' | 'cover';
  cardZoom: number;
  paddingY: number;
  alternates: AlternatePhoto[];
}

const artworks = artworksData as Artwork[];

export type SortKey = 'date-desc' | 'date-asc' | 'title-asc';
export type SizeBucket = 'all' | 'small' | 'medium' | 'large';

const knownYears = artworks
  .map((a) => a.year)
  .filter((y): y is number => y != null);

export const YEAR_MIN = Math.min(...knownYears);
export const YEAR_MAX = Math.max(...knownYears);

function inSizeBucket(mp: number | null, bucket: SizeBucket): boolean {
  if (bucket === 'all' || mp == null) return true;
  if (bucket === 'small') return mp < 5;
  if (bucket === 'medium') return mp >= 5 && mp < 20;
  return mp >= 20;
}

export function useArtworks() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date-desc');
  const [yearMin, setYearMin] = useState(YEAR_MIN);
  const [yearMax, setYearMax] = useState(YEAR_MAX);
  const [sizeBucket, setSizeBucket] = useState<SizeBucket>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = artworks.filter((a) => {
      if (a.year != null && (a.year < yearMin || a.year > yearMax)) return false;
      if (!inSizeBucket(a.megapixels, sizeBucket)) return false;
      if (q && !a.title.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sortKey === 'title-asc') return a.title.localeCompare(b.title);
      if (sortKey === 'date-asc') return a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title);
      return b.sortDate.localeCompare(a.sortDate) || a.title.localeCompare(b.title);
    });
  }, [search, sortKey, yearMin, yearMax, sizeBucket]);

  return {
    artworks: filtered,
    total: artworks.length,
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
  };
}

export function getArtworkById(id: string): Artwork | undefined {
  return artworks.find((a) => a.id === id);
}

/** Next piece in the default (date-desc) order, wrapping around at the end. */
export function getNextArtworkId(id: string): string | undefined {
  const index = artworks.findIndex((a) => a.id === id);
  if (index === -1 || artworks.length < 2) return undefined;
  return artworks[(index + 1) % artworks.length].id;
}
