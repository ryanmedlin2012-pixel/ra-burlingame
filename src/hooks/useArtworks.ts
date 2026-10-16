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

export const artworks = artworksData as Artwork[];

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

export interface FilterParams {
  search: string;
  sortKey: SortKey;
  yearMin: number;
  yearMax: number;
  sizeBucket: SizeBucket;
}

/** Pure filter+sort, shared by the grid (live state) and the piece page
 * (reconstructed from the URL) so NEXT/PREV can match whatever view the
 * grid was showing when the piece was opened. */
export function filterAndSortArtworks(list: Artwork[], params: FilterParams): Artwork[] {
  const q = params.search.trim().toLowerCase();
  const filtered = list.filter((a) => {
    if (a.year != null && (a.year < params.yearMin || a.year > params.yearMax)) return false;
    if (!inSizeBucket(a.megapixels, params.sizeBucket)) return false;
    if (q && !a.title.toLowerCase().includes(q)) return false;
    return true;
  });
  return [...filtered].sort((a, b) => {
    if (params.sortKey === 'title-asc') return a.title.localeCompare(b.title);
    if (params.sortKey === 'date-asc') return a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title);
    return b.sortDate.localeCompare(a.sortDate) || a.title.localeCompare(b.title);
  });
}

const DEFAULT_FILTER_PARAMS: FilterParams = {
  search: '',
  sortKey: 'date-desc',
  yearMin: YEAR_MIN,
  yearMax: YEAR_MAX,
  sizeBucket: 'all',
};

/** Query string carrying the grid's current filter/sort state, appended to
 * each card's link — omits anything still at its default so the common
 * (unfiltered) case produces no query string at all. */
export function buildFilterQuery(params: FilterParams): string {
  const sp = new URLSearchParams();
  if (params.search.trim()) sp.set('q', params.search.trim());
  if (params.sortKey !== DEFAULT_FILTER_PARAMS.sortKey) sp.set('sort', params.sortKey);
  if (params.yearMin !== YEAR_MIN) sp.set('ymin', String(params.yearMin));
  if (params.yearMax !== YEAR_MAX) sp.set('ymax', String(params.yearMax));
  if (params.sizeBucket !== 'all') sp.set('size', params.sizeBucket);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

const SORT_KEYS: SortKey[] = ['date-desc', 'date-asc', 'title-asc'];
const SIZE_BUCKETS: SizeBucket[] = ['all', 'small', 'medium', 'large'];

/** Inverse of buildFilterQuery — reconstructs filter state from a piece
 * page's URL, falling back to defaults for anything absent (e.g. a piece
 * opened directly, with no grid context). */
export function parseFilterQuery(searchParams: URLSearchParams): FilterParams {
  const sortParam = searchParams.get('sort');
  const sizeParam = searchParams.get('size');
  const yminParam = Number(searchParams.get('ymin'));
  const ymaxParam = Number(searchParams.get('ymax'));
  return {
    search: searchParams.get('q') ?? '',
    sortKey: SORT_KEYS.includes(sortParam as SortKey) ? (sortParam as SortKey) : DEFAULT_FILTER_PARAMS.sortKey,
    yearMin: Number.isFinite(yminParam) && searchParams.has('ymin') ? yminParam : YEAR_MIN,
    yearMax: Number.isFinite(ymaxParam) && searchParams.has('ymax') ? ymaxParam : YEAR_MAX,
    sizeBucket: SIZE_BUCKETS.includes(sizeParam as SizeBucket) ? (sizeParam as SizeBucket) : DEFAULT_FILTER_PARAMS.sizeBucket,
  };
}

export function useArtworks() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date-desc');
  const [yearMin, setYearMin] = useState(YEAR_MIN);
  const [yearMax, setYearMax] = useState(YEAR_MAX);
  const [sizeBucket, setSizeBucket] = useState<SizeBucket>('all');

  const filtered = useMemo(
    () => filterAndSortArtworks(artworks, { search, sortKey, yearMin, yearMax, sizeBucket }),
    [search, sortKey, yearMin, yearMax, sizeBucket],
  );

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

/** Next piece within `orderedList` (the grid's current filter/sort view,
 * reconstructed from the URL), wrapping around at the end. Falls back to
 * every piece in default order when the id isn't present in that view
 * (e.g. the piece no longer matches a filter carried over from the grid). */
export function getNextArtworkId(id: string, orderedList?: Artwork[]): string | undefined {
  const list = orderedList && orderedList.some((a) => a.id === id) ? orderedList : artworks;
  const index = list.findIndex((a) => a.id === id);
  if (index === -1 || list.length < 2) return undefined;
  return list[(index + 1) % list.length].id;
}
