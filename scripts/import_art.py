#!/usr/bin/env python3
"""
import_art.py — build this site's data/image layer from full_index.csv.

full_index.csv (from the art_index_tool review pipeline) already reflects
current on-disk paths directly — it was scanned fresh after any renames, so
no rename_log join is needed (unlike the original 97-piece import, which
predates the review tool). One CSV row = one photographed file; rows that
share a group_id (set by dedupe_and_group.py / confirmed by hand in
review_app) are multiple photos of the SAME physical artwork and get
collapsed into one artwork entry here, using the highest-resolution member
as the primary image and the rest as alternates for the detail view.

INCLUSION RULES (deliberately conservative — see Context in the project's
plan doc)
    - skip != true
    - body_of_work is blank — every collection tagged in review_app so far
      (Bart photos, old instagrams, early 80s political debate) is
      reference/process material, not a fine-art piece, even though it's
      organized and tagged. If a real curatorial series ever gets tagged
      this way, add it to INCLUDABLE_COLLECTIONS below as an explicit
      override rather than changing this default.
    - a piece needs at least one DELIBERATELY titled photo: either an
      explicit new_title (typed by hand or confirmed against the inventory
      in review_app), or a filename that already went through
      rename_from_index.py's own YYYY-MM-DD-title-NN convention (a real
      title chosen at rename time). Trying to guess "is this raw original
      filename secretly a real title" from pattern-matching alone doesn't
      work — this archive has too much auto-generated-looking junk
      (scanner IDs like "017_vcfjrp", "20104-07_eq") that no regex
      reliably tells apart from a short real word. Once a piece clears
      this bar through ANY one photo, every other photo already grouped
      with it (even untitled ones) comes along as an alternate — they're
      legitimately more photos of the same now-named piece.

USAGE
    python3 scripts/import_art.py
    python3 scripts/import_art.py --csv /path/to/full_index.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageOps

THUMB_LONG_EDGE = 480
THUMB_QUALITY = 72
FULL_LONG_EDGE = 1600
FULL_QUALITY = 82
# Alternates can become the main detail-view image when clicked (see
# ArtworkDetail.tsx's thumbnail strip), so they need real viewing
# resolution, not thumbnail size — same target as the primary photo. The
# strip itself just displays them small via CSS.

DEFAULT_CSV = Path.home() / "Documents/art/art_index_tool/full_index.csv"

# Every body_of_work tag is reference material by default. Add a name here
# only once a tagged collection is confirmed to be real curatorial work.
INCLUDABLE_COLLECTIONS: set[str] = set()

# Pieces where the corner-sampled vignette (see corner_background_color)
# looks wrong — e.g. the artwork runs to the photo's edges with no real
# wall visible, so the "background" it samples is actually part of the
# piece. Keyed by artwork id (the primary photo's filename stem).
NO_VIGNETTE_IDS: set[str] = {
    "2026-03-23-atck-01",
    "2026-03-23-lunar-01",
    "2025-02-27-dark-mountain-01",
    "2024-10-29-untitled-33-01",
    "2024-10-29-magic-mountain-01",
    "2024-10-29-untitled-301-01",
    "2024-10-29-untitled-31-01",
    "2023-05-25-chirotic-mileau-01",
    "2023-01-24-untitled-27-01",
    "2023-01-20-untitled-21-01",
    "2023-01-20-untitled-22-01",
    "2023-01-20-untitled-23-01",
    "2023-01-24-untitled-28-01",
    "2023-01-24-untitled-30-01",
    "2015-09-17-self-moment-01",
    "2013-08-10-dennis-01",
    "2013-08-10-gene-01",
    "2013-08-10-untitled-19-01",
    "2025-02-27-see-you-01",
    "2025-02-27-see-you-02",
    "2013-08-10-untitled-20-01",
    "201",  # Urine Test — primary swapped to this photo after removing the old instance 1
    "203",  # Untitled (superstar specials | malcolm | foot) — was 2013-08-10-untitled-31-01 before primary swap
    "2023-01-20-untitled-24-01",
    "2023-01-20-untitled-25-01",
    "2023-01-20-untitled-26-01",
    "2013-08-03-new-religion-11-01",
    "2013-08-03-untitled-13-01",
    "2015-09-17-untitled-161-01",
    "2013-10-05-untitled-61-01",
    "2013-10-05-untitled-141-01",
    "2013-08-10-untitled-92-01",
    "2013-08-10-untitled-18-01",
    "2013-08-03-untitled-11-01",
    "2013-07-13-psychic-twinks-1-01",
    "011",
}

# The vignette is an inset box-shadow (see ArtworkDetail.tsx) — blur/inset
# in px, fading from each of the 4 sides independently rather than a radial
# ellipse (which shortchanges the sides to reach the farthest corner).
# Smaller numbers = less spread into the photo. Override per piece below.
DEFAULT_VIGNETTE_BLUR = 90
DEFAULT_VIGNETTE_INSET = 40
VIGNETTE_OVERRIDES: dict[str, tuple[int, int]] = {
    "2024-10-29-untitled-32-01": (45, 1),  # less spread than default
    "2025-02-27-1982-01": (55, 20),  # less spread than default
    "2026-03-23-temperance-guild-01": (30, 10),  # much less spread than default
    "2024-10-29-blue-sunshine-05": (45, 17),  # less spread than default
    "2026-03-23-aloe-01": (40, 10),  # less spread — was overlapping the painted edges
}

# Same (enabled, blur, inset) idea as above, but per individual PHOTO id —
# for when a piece's photos shouldn't all get the same vignette treatment,
# e.g. only the primary photo should have it. Takes priority over both
# NO_VIGNETTE_IDS and VIGNETTE_OVERRIDES for that one photo.
PHOTO_VIGNETTE_OVERRIDES: dict[str, tuple[bool, int, int]] = {
    "2013-08-10-untitled-51-01": (True, 20, 8),  # primary only, much less spread
    "015": (False, 0, 0),
    "2013-07-14-untitled-8-01": (False, 0, 0),
    "106": (False, 0, 0),  # Crisco instance 2
    "2011-10-16-untitled-3-01": (True, 90, 40),  # Untitled 31 instance 3
    "2013-08-10-untitled-15-01": (True, 40, 20),  # Untitled (nature scene) — horizontal only, less spread
    "2025-02-27-see-you-01": (True, 30, 10),  # Untitled (see you) — small, horizontal only
    "2025-02-27-see-you-02": (True, 30, 10),  # Untitled (see you) II — small, horizontal only
}

# Photo ids whose vignette only fades the left/right edges (top/bottom stay
# sharp) — rendered as two edge gradients instead of the usual 4-side
# box-shadow. "all" (the default, not listed here) keeps the normal look.
PHOTO_VIGNETTE_SIDES: dict[str, str] = {
    "2013-08-10-untitled-15-01": "horizontal",
    "2025-02-27-see-you-01": "horizontal",
    "2025-02-27-see-you-02": "horizontal",
}

# Extra padding (px) inside the image container, so a wide/landscape photo
# that would otherwise touch the box's top/bottom edges (while naturally
# getting left/right gaps from flex-centering) gets equal space on all 4
# sides instead. 0 = no change from the default flex-centered fit.
DEFAULT_IMAGE_PADDING = 0
IMAGE_PADDING_OVERRIDES: dict[str, int] = {
    "2023-05-25-chirotic-mileau-01": 32,
}

# Same idea, but vertical-only (top/bottom) and per individual PHOTO id —
# for a near-square alternate photo that already gets natural left/right
# gaps from flex-centering (container wider than image) but touches the
# box's top/bottom edges; adds matching negative space there using the
# same container background, without affecting the piece's other photos.
PHOTO_PADDING_Y_OVERRIDES: dict[str, int] = {
    "2024-10-29-white-foam-01": 30,
    "2024-10-29-untitled-311-01": 10,
    "2015-09-17-self-moment-01": 10,
    "2015-09-17-untitled-161-01": 30,
}

# Grid-ordering date only (the detail page's displayed DATE always stays the
# real captureDate) — lets two separately-dated but thematically paired
# pieces sit next to each other in the gallery grid instead of being split
# apart by their true capture dates.
SORT_DATE_OVERRIDES: dict[str, str] = {
    "2011-10-16-new-religion-2-01": "2013-08-03",  # sits next to Untitled (new Religion)
}

# Corrects the displayed DATE (and grid position) to the piece's actual
# creation year when it's known to differ from the photo's capture date —
# unlike SORT_DATE_OVERRIDES, this changes what's shown on the detail page.
CAPTURE_DATE_OVERRIDES: dict[str, str] = {
    "2013-08-10-untitled-92-01": "2007",  # Untitled (castle)
    "2013-08-10-untitled-15-01": "2007",  # Untitled (nature scene)
    "203": "2013",  # Untitled (superstar specials | malcolm | foot)
    "210": "2007",  # Untitled (#nails)
    "021": "2006",  # Untitled (flight)
    "2013-08-10-fresh-meat-market-01": "2008",  # Untitled (for Dennis Cooper)
    "2013-08-10-dennis-01": "2005",  # Mary (Matt)
    "2023-01-20-untitled-22-01": "2021",  # Untitled (enforcement)
    "2023-01-20-untitled-26-01": "2022",  # Untitled (blue chair)
    "2024-10-29-untitled-301-01": "2022",  # Untitled (shield / suds)
    "2024-10-29-untitled-33-01": "2021",  # Untitled (Chirotic milieu)
    "2013-10-05-untitled-141-01": "2014",  # Untitled (heaven / swiffer)
    "2023-01-24-untitled-27-01": "2021",  # Untitled (sentiment)
    "011": "2012",  # Untitled (autophagy)
}

# Forces the image container's background to a specific color instead of
# the corner-sampled one (or the #f2f2f2 CSS default when vignette is off)
# — e.g. to match a piece's own white edges exactly. None = no override.
BACKGROUND_OVERRIDES: dict[str, str] = {
    "2023-01-24-untitled-27-01": "#ffffff",
    "2023-01-24-untitled-28-01": "#ffffff",
    "2013-10-05-untitled-141-01": "#ffffff",
    "2013-08-10-untitled-92-01": "#ffffff",
    "2013-08-10-untitled-18-01": "#ffffff",
    "011": "#ffffff",
    "2023-01-24-untitled-30-01": "#ffffff",
    "2013-08-10-dennis-01": "#ffffff",
}

# Same idea as BACKGROUND_OVERRIDES, but per individual PHOTO (keyed by that
# photo's own filename stem) rather than per piece — for when only some of a
# piece's photos need it, e.g. ones that sampled a near-white-but-not-quite
# corner color while the rest of the piece's photos already read as true white.
PHOTO_BACKGROUND_OVERRIDES: dict[str, str] = {
    "2013-08-10-gene-01": "#ffffff",
    "2013-08-10-untitled-19-01": "#ffffff",
    "2013-08-10-untitled-20-01": "#ffffff",
    "2013-08-10-untitled-31-01": "#ffffff",
    "2011-10-16-untitled-3-01": "#ffffff",  # Untitled 31 instance 3 — whiter gradient
    "2023-01-24-untitled-62-01": "#ffffff",  # Untitled 161 instance 2
}

# Matches rename_from_index.py's own output convention — the title group
# captures what was a deliberately chosen name at the time of renaming.
RENAMED_STEM_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-(.+)-\d{2}$")

# Forces a specific Work-grid card's thumbnail container to a flat color —
# independent of the detail page's fillOverride, since a card's fixed
# square aspect ratio can show a seam that the full detail page doesn't.
CARD_OBJECT_FIT_OVERRIDES: dict[str, str] = {
    "2013-08-10-fresh-meat-market-01": "cover",  # Untitled (for Dennis Cooper) — zoom to fill
    "2013-07-13-psychic-twinks-1-01": "cover",  # Untitled (enforcement)
    "2013-07-13-helen-anne-01": "cover",  # Helen Anne
    "2013-07-14-untitled-10-01": "cover",  # Untitled 10
    "2013-08-10-untitled-91-01": "cover",  # Untitled 91
    "2013-08-10-untitled-51-01": "cover",  # Untitled 51
    "2023-01-20-untitled-23-01": "cover",  # Untitled 23
    "2023-01-20-untitled-25-01": "cover",  # Untitled (embrace)
    "2023-01-20-untitled-26-01": "cover",  # Untitled (blue chair)
    "2024-10-29-untitled-32-01": "cover",  # Untitled (haunted house)
}

# Scales a card's thumbnail up beyond 100% (combined with object-fit: cover)
# for a more dramatic crop-in than cover alone gives on a near-square photo.
CARD_ZOOM_OVERRIDES: dict[str, float] = {
    "2013-08-10-fresh-meat-market-01": 2.2,
    "2013-07-13-psychic-twinks-1-01": 2.2,
    "2013-07-14-untitled-10-01": 2.2,
    "2013-08-10-untitled-51-01": 2.2,
    "2023-01-20-untitled-25-01": 1.6,
    "2023-01-20-untitled-26-01": 1.6,
    "2015-09-17-crisco-01": 0.8,  # shrink inward so whitespace shows on all 4 sides
    "2023-01-20-untitled-21-01": 0.8,  # zoom out / shrink inward
    "2023-01-20-untitled-24-01": 0.8,  # zoom out / shrink inward
    "2023-01-20-untitled-22-01": 0.8,  # zoom out / shrink inward
    "2024-10-29-untitled-32-01": 2.2,  # zoom in
}

# Pre-crops a dedicated card thumbnail to just one region of the photo
# (pixel box: left, top, right, bottom, in the ORIGINAL file's orientation)
# — for a card that should show only part of a multi-object photo, rather
# than relying on object-fit/zoom against the whole image.
CARD_CROP_OVERRIDES: dict[str, tuple[int, int, int, int]] = {
    "2013-07-13-helen-anne-01": (90, 100, 596, 598),  # just the Helen Reddy sleeve
    "2013-08-10-untitled-91-01": (223, 260, 1527, 1940),  # just the bust/poster panel, zoomed in
    "2023-01-20-untitled-23-01": (6, 6, 494, 500),  # just the left (curved shape) panel
}

CARD_BACKGROUND_OVERRIDES: dict[str, str] = {
    "2023-01-20-untitled-25-01": "#ffffff",  # Untitled (embrace)
    "2023-01-20-untitled-21-01": "#ffffff",  # Untitled 21
    "2023-01-20-untitled-23-01": "#ffffff",  # Untitled 23
    "2023-01-20-untitled-22-01": "#ffffff",  # Untitled (enforcement)
    "2013-08-10-fresh-meat-market-01": "#f2f2f2",  # Untitled (for Dennis Cooper) — back to plain default
    "2015-09-17-crisco-01": "#f2f2f2",  # Crisco — back to plain default
    "2023-01-20-untitled-24-01": "#ffffff",  # Untitled 24
}

# Catalog data for pieces matched against ~/Documents/art/art_inventory.pdf
# (the private collector spreadsheet). Only medium / physical size / public
# exhibition history are ever pulled from that file — price, sold/sold-to,
# buyer address, phone and email must never appear here or reach the site.
PIECE_METADATA: dict[str, dict] = {
    "2025-02-27-1982-01": {
        "medium": "Oil and acrylics on canvas",
        "physicalSize": "14 × 14 in",
    },
    "2025-02-27-dark-mountain-01": {
        "medium": "Mixed media on wood panel",
        "physicalSize": "26 × 16 in",
    },
    "2025-02-27-see-you-01": {
        "medium": "Resin, skirt, dye, sequins on wood panel",
        "physicalSize": "8.5 × 10 in",
    },
    "2025-02-27-see-you-02": {
        "medium": "Resin, skirt, dye, sequins on wood panel",
        "physicalSize": "8.5 × 10 in",
    },
    "2024-10-29-untitled-31-01": {
        "medium": "Mixed media on raw canvas",
        "physicalSize": "60 × 72 in",
        "shows": "Van der Plas Gallery, NYC — October 2025",
    },
    "2023-01-24-untitled-28-01": {
        "medium": "Oil and acrylic on canvas",
        "physicalSize": "16 × 16 in",
    },
    "2023-01-24-untitled-30-01": {
        "medium": "Oil and acrylics on raw canvas",
        "physicalSize": "48 × 60 in",
        "notes": "No longer exists, available as digital print, dimensions variable.",
    },
    "2023-01-20-untitled-21-01": {
        "medium": "Oil on canvas",
        "physicalSize": "24 × 12 in",
    },
    "2023-01-20-untitled-23-01": {
        "medium": "Oil on canvas",
        "physicalSize": "24 × 12 in",
    },
    "2024-10-29-blue-sunshine-05": {
        "medium": "Oil and acrylics on raw canvas",
        "physicalSize": "20 × 20 in",
        "shows": "Van der Plas Gallery, NYC — October 2025",
    },
    "2024-10-29-magic-mountain-01": {
        "medium": "Mixed media on wood panel",
        "physicalSize": "36 × 12 in",
    },
    "201": {
        "medium": "Collage / assemblage",
        "physicalSize": "16 × 19 in",
        "notes": "Private collection",
    },
    "2023-05-25-chirotic-mileau-01": {
        "medium": "Acrylic and oils on canvas",
        "physicalSize": "20 × 20 in",
    },
    "2015-09-17-crisco-01": {
        "medium": "Mixed media, collage, resin",
        "physicalSize": "19 × 14.75 in",
    },
    "2015-09-17-self-moment-01": {
        "medium": "Mixed media, collage, resin, acrylics",
        "physicalSize": "24.25 × 24.25 in",
        "shows": "Mount Analogue: The Door to the Invisible Must Be Made Visible — Seattle",
    },
    "2013-08-10-gene-01": {
        "medium": "Collage / digital print",
        "physicalSize": "16.5 × 20.5 in",
    },
    "2013-08-03-new-religion-11-01": {
        "medium": "Mixed media, collage, resin, dye",
        "physicalSize": "9.75 × 15 in",
    },
    "2013-08-03-untitled-11-01": {
        "medium": "Mixed media, collage, resin, dye",
    },
    "2013-08-10-untitled-19-01": {
        "medium": "Mixed media / collage",
        "physicalSize": "11.75 × 11.75 in",
        "shows": "Bay Area Open Studios, Berkeley, CA",
    },
    "2013-08-10-untitled-18-01": {
        "medium": "Mixed media / collage",
        "physicalSize": "11.57 × 11.75 in",
        "shows": "Bay Area Open Studios, Berkeley, CA",
    },
    "2013-08-10-untitled-20-01": {
        "medium": "Mixed media / collage",
        "physicalSize": "11.75 × 11.75 in",
        "shows": "Bay Area Open Studios, Berkeley, CA",
    },
    "2013-08-10-untitled-92-01": {
        "medium": "Paper collage",
        "physicalSize": "8 × 10 in",
    },
    "2013-08-10-untitled-15-01": {
        "medium": "Collage",
        "physicalSize": "9 × 10 in",
    },
    "203": {
        "medium": "Mixed media / collage / resin",
        "notes": "Available as print, dimensions variable.",
    },
    "210": {
        "medium": "Collage on card",
        "physicalSize": "4.5 × 5 in",
        "notes": "Available as digital print",
    },
    "021": {
        "medium": "Collage / assemblage",
        "physicalSize": "5 × 6 in",
        "notes": "Available as digital print",
    },
    "2013-08-10-fresh-meat-market-01": {
        "medium": "Collage",
        "physicalSize": "17 × 16 in",
    },
    "2013-08-10-dennis-01": {
        "medium": "Collage / assemblage",
        "physicalSize": "11.75 × 14 in",
    },
    "2023-01-20-untitled-22-01": {
        "medium": "Oils and acrylic on canvas",
        "physicalSize": "24 × 12 in",
    },
    "2023-01-20-untitled-26-01": {
        "medium": "Oils and acrylics on raw unstretched canvas",
        "physicalSize": "15.5 × 14.5 in",
    },
    "2024-10-29-untitled-301-01": {
        "medium": "Oils and acrylics on stretched raw canvas",
        "physicalSize": "45 × 42.5 in",
    },
    "2024-10-29-untitled-33-01": {
        "medium": "Oils and acrylic on canvas",
        "physicalSize": "24 × 12 in",
    },
    "2013-10-05-untitled-141-01": {
        "medium": "Mixed media / collage",
        "physicalSize": "21.5 × 14 in",
    },
    "2023-01-24-untitled-27-01": {
        "medium": "Acrylic and oils on raw canvas",
        "physicalSize": "16 × 16 in",
    },
    "2024-10-29-untitled-32-01": {
        "medium": "Acrylic spray paint and oils on canvas (stretched)",
        "physicalSize": "54 × 68 in",
    },
    "011": {
        "medium": "Collage",
        "physicalSize": "11.25 × 11.25 in",
        "notes": "Private collection",
    },
    "2023-01-20-untitled-25-01": {
        "medium": "Acrylic and oils on raw canvas (unstretched)",
        "physicalSize": "24 × 12 in",
    },
    "2026-03-23-aloe-01": {
        "medium": "Oil and acrylic on canvas",
        "physicalSize": "12 × 19 in",
    },
    "2013-07-13-psychic-twinks-1-01": {
        "medium": "Mixed media, collage, resin",
        "notes": "No longer exists. Available as digital print (dimensions variable).",
    },
}


def compute_vignette(photo_id: str, piece_id: str) -> tuple[bool, int, int]:
    """(enabled, blur, inset) for one photo — photo-level override wins,
    otherwise falls back to the piece-level default/override."""
    if photo_id in PHOTO_VIGNETTE_OVERRIDES:
        return PHOTO_VIGNETTE_OVERRIDES[photo_id]
    enabled = piece_id not in NO_VIGNETTE_IDS
    blur, inset = VIGNETTE_OVERRIDES.get(piece_id, (DEFAULT_VIGNETTE_BLUR, DEFAULT_VIGNETTE_INSET))
    return enabled, blur, inset


def truthy(v: str) -> bool:
    return str(v or "").strip().lower() in {"1", "yes", "true", "y"}


def deliberate_title(r: dict) -> str | None:
    new_title = (r.get("new_title") or "").strip()
    if new_title:
        return new_title
    stem = Path(r["original_path"]).stem
    m = RENAMED_STEM_RE.match(stem)
    return m.group(1) if m else None


def prettify_title(title: str) -> str:
    """new_title/title are typically lowercase slugs ('aloe', 'new-religion-1',
    'chirotic-mileau') — make them presentable for display. A title with ANY
    uppercase letter already is assumed intentionally cased (hand-typed in
    review_app, or a confirmed inventory title straight from the PDF like
    "Untitled (dark mountain)") and passes through untouched."""
    title = title.strip()
    if title != title.lower():
        return title
    return " ".join(w.capitalize() for w in re.split(r"[-\s]+", title) if w)


def corner_background_color(img: Image.Image) -> str:
    """Estimate the wall/surface color behind a photographed piece by
    sampling its four corners — in a typically centered studio/gallery
    photo, the corners are the part least likely to be covered by the
    artwork itself. Median (not mean) so a stray frame edge or shadow in
    one corner doesn't skew the result."""
    w, h = img.size
    patch = max(4, min(w, h) // 10)
    corners = [
        img.crop((0, 0, patch, patch)),
        img.crop((w - patch, 0, w, patch)),
        img.crop((0, h - patch, patch, h)),
        img.crop((w - patch, h - patch, w, h)),
    ]
    pixels = [p for c in corners for p in c.getdata()]
    pixels.sort(key=sum)
    r, g, b = pixels[len(pixels) // 2]
    return f"#{r:02x}{g:02x}{b:02x}"


def save_derivative(src_path: Path, dest_path: Path, long_edge: int, quality: int) -> str:
    """Saves the resized derivative and returns its estimated background color."""
    with Image.open(src_path) as img:
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")
        ratio = long_edge / max(img.width, img.height)
        if ratio < 1:
            img = img.resize((max(1, round(img.width * ratio)), max(1, round(img.height * ratio))))
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest_path, format="JPEG", quality=quality)
        return corner_background_color(img)


def save_card_crop(src_path: Path, dest_path: Path, box: tuple[int, int, int, int], long_edge: int, quality: int) -> None:
    """Like save_derivative, but crops to `box` (in the exif-corrected
    image's pixel coordinates) before resizing — for a Work-grid card
    thumbnail that should show only part of the full photo."""
    with Image.open(src_path) as img:
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB").crop(box)
        ratio = long_edge / max(img.width, img.height)
        if ratio < 1:
            img = img.resize((max(1, round(img.width * ratio)), max(1, round(img.height * ratio))))
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest_path, format="JPEG", quality=quality)


def main():
    ap = argparse.ArgumentParser(description="Build artworks.json + image derivatives from full_index.csv")
    ap.add_argument("--csv", default=str(DEFAULT_CSV))
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    csv_path = Path(args.csv)
    if not csv_path.is_file():
        sys.exit(f"ERROR: not found: {csv_path}")

    with csv_path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    # Wipe prior derivatives — which pieces are eligible changes between runs
    # as titling/grouping work continues, and stale images would otherwise
    # just accumulate in public/images/ forever.
    for sub in ("thumb", "full", "alt"):
        d = repo_root / "public" / "images" / sub
        if d.is_dir():
            for f in d.iterdir():
                f.unlink()

    candidates = []
    for r in rows:
        if truthy(r.get("skip", "")):
            continue
        bow = (r.get("body_of_work") or "").strip()
        if bow and bow not in INCLUDABLE_COLLECTIONS:
            continue
        if not Path(r["original_path"]).is_file():
            continue
        candidates.append(r)

    # Group ALL candidates first (not just titled ones) — an untitled photo
    # that's already grouped with a titled one is a legitimate alternate.
    pieces = defaultdict(list)
    for r in candidates:
        key = r["group_id"] or r["original_path"]
        pieces[key].append(r)

    artworks = []
    skipped_untitled_pieces = 0
    for members in pieces.values():
        titled_members = [r for r in members if deliberate_title(r)]
        if not titled_members:
            skipped_untitled_pieces += 1
            continue
        # Prefer a confirmed inventory match, then highest resolution, among
        # the deliberately titled members — that's the piece's primary photo.
        titled_members.sort(
            key=lambda r: (r.get("proposed_inventory_confidence") == "confirmed", float(r["megapixels"] or 0)),
            reverse=True,
        )
        primary = titled_members[0]
        alternates = [r for r in members if r is not primary]

        artwork_id = Path(primary["original_path"]).stem
        title = prettify_title(deliberate_title(primary) or "Untitled")
        capture_date = CAPTURE_DATE_OVERRIDES.get(artwork_id, primary.get("capture_date") or "0000-00-00")
        year = int(capture_date[:4]) if capture_date[:4].isdigit() else None
        width = int(primary["width"]) if primary.get("width") else None
        height = int(primary["height"]) if primary.get("height") else None
        megapixels = float(primary["megapixels"]) if primary.get("megapixels") else None
        medium = (primary.get("proposed_inventory_medium") or primary.get("detected_medium_hint") or "").strip() or None
        body_of_work = (primary.get("body_of_work") or "").strip() or None

        catalog = PIECE_METADATA.get(artwork_id, {})
        medium = catalog.get("medium", medium)
        physical_size = catalog.get("physicalSize")
        shows = catalog.get("shows")
        notes = catalog.get("notes")

        piece_override = BACKGROUND_OVERRIDES.get(artwork_id)

        thumb_rel = f"images/thumb/{artwork_id}.jpg"
        full_rel = f"images/full/{artwork_id}.jpg"
        save_derivative(Path(primary["original_path"]), repo_root / "public" / thumb_rel, THUMB_LONG_EDGE, THUMB_QUALITY)
        background_color = save_derivative(
            Path(primary["original_path"]), repo_root / "public" / full_rel, FULL_LONG_EDGE, FULL_QUALITY
        )

        card_thumb_rel = None
        crop_box = CARD_CROP_OVERRIDES.get(artwork_id)
        if crop_box:
            card_thumb_rel = f"images/thumb/{artwork_id}-card.jpg"
            save_card_crop(
                Path(primary["original_path"]), repo_root / "public" / card_thumb_rel, crop_box, THUMB_LONG_EDGE, THUMB_QUALITY
            )
        # fillOverride is the color to force-display (piece-level wins if both
        # are set); None means "no explicit override, use backgroundColor only
        # while vignette is on" — see ArtworkDetail.tsx.
        fill_override = piece_override or PHOTO_BACKGROUND_OVERRIDES.get(artwork_id)
        primary_vignette, primary_blur, primary_inset = compute_vignette(artwork_id, artwork_id)

        alt_photos = []
        for alt in alternates:
            alt_src = Path(alt["original_path"])
            if not alt_src.is_file():
                continue
            alt_id = alt_src.stem
            alt_rel = f"images/alt/{alt_id}.jpg"
            alt_bg = save_derivative(alt_src, repo_root / "public" / alt_rel, FULL_LONG_EDGE, FULL_QUALITY)
            alt_fill_override = piece_override or PHOTO_BACKGROUND_OVERRIDES.get(alt_id)
            alt_vignette, alt_blur, alt_inset = compute_vignette(alt_id, artwork_id)
            alt_photos.append({
                "src": f"/{alt_rel}",
                "backgroundColor": alt_bg,
                "fillOverride": alt_fill_override,
                "vignette": alt_vignette,
                "vignetteBlur": alt_blur,
                "vignetteInset": alt_inset,
                "vignetteSides": PHOTO_VIGNETTE_SIDES.get(alt_id, "all"),
                "paddingY": PHOTO_PADDING_Y_OVERRIDES.get(alt_id, 0),
            })

        artworks.append({
            "id": artwork_id,
            "title": title,
            "year": year,
            "captureDate": capture_date,
            "sortDate": SORT_DATE_OVERRIDES.get(artwork_id, capture_date),
            "width": width,
            "height": height,
            "megapixels": megapixels,
            "medium": medium,
            "physicalSize": physical_size,
            "shows": shows,
            "notes": notes,
            "bodyOfWork": body_of_work,
            "thumb": f"/{thumb_rel}",
            "cardThumb": f"/{card_thumb_rel}" if card_thumb_rel else None,
            "full": f"/{full_rel}",
            "backgroundColor": background_color,
            "vignette": primary_vignette,
            "vignetteBlur": primary_blur,
            "vignetteInset": primary_inset,
            "vignetteSides": PHOTO_VIGNETTE_SIDES.get(artwork_id, "all"),
            "imagePadding": IMAGE_PADDING_OVERRIDES.get(artwork_id, DEFAULT_IMAGE_PADDING),
            "fillOverride": fill_override,
            "cardBackground": CARD_BACKGROUND_OVERRIDES.get(artwork_id),
            "cardObjectFit": CARD_OBJECT_FIT_OVERRIDES.get(artwork_id, "contain"),
            "cardZoom": CARD_ZOOM_OVERRIDES.get(artwork_id, 1),
            "paddingY": PHOTO_PADDING_Y_OVERRIDES.get(artwork_id, 0),
            "alternates": alt_photos,
        })

    artworks.sort(key=lambda a: (a["sortDate"], a["title"]), reverse=True)

    out_path = repo_root / "src" / "data" / "artworks.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(artworks, indent=2), encoding="utf-8")

    multi = sum(1 for a in artworks if a["alternates"])
    print(f"{len(candidates)} candidate row(s) (of {len(rows)} total) in {csv_path.name}, grouped into {len(pieces)} piece(s)")
    print(f"Wrote {len(artworks)} artwork(s) to {out_path}")
    print(f"  {multi} piece(s) have alternate photos from merged groups")
    print(f"  {skipped_untitled_pieces} piece(s) skipped — not yet titled (review in review_app, then re-run)")


if __name__ == "__main__":
    main()
