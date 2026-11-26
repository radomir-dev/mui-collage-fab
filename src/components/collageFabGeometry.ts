import type {
  CollageFabDirection,
  CollageFabItemGeometry,
  CollageFabOwnerState,
  CollageFabSize,
} from './CollageFab';

const SIZE_MAP: Record<'small' | 'medium' | 'large', number> = {
  small: 40,
  medium: 48,
  large: 56,
};

export function resolveSize(size: CollageFabSize): number {
  return typeof size === 'number' ? size : SIZE_MAP[size];
}

interface Vector {
  x: number;
  y: number;
}

const ORIGIN: Vector = { x: 0, y: 0 };

const DIRECTION_VECTORS: Record<CollageFabDirection, readonly [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

/** The sector of the collapsed disc each direction owns, clockwise from twelve o'clock. */
const DIRECTION_ANGLES: Record<CollageFabDirection, number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
};

/** Where the anchor child sits on one axis of the root's box. */
type CollageFabAlign = 'start' | 'center' | 'end';

/** The box the root grows into, plus the anchor's place inside it. */
export interface CollageFabGroupGeometry {
  extent: { width: number; height: number };
  align: { x: CollageFabAlign; y: CollageFabAlign };
}

function translateCss({ x, y }: Vector, horizontal: boolean): string {
  if (y === 0 && (horizontal || x !== 0)) {
    return `translateX(${x}px)`;
  }
  if (x === 0) {
    return `translateY(${y}px)`;
  }
  return `translate(${x}px, ${y}px)`;
}

// Trigonometry leaves floating-point dust on the axes, which would show up in the
// generated CSS strings.
function clean(value: number): number {
  return +value.toFixed(4);
}

/** A wedge that fades in from its start, holds, and fades out at `window`. */
function conic(from: number, taper: number, body: number, window: number): string {
  return `conic-gradient(from ${clean(from)}deg, #0000 0deg, #000 ${clean(taper)}deg, #000 ${clean(body)}deg, transparent ${clean(window)}deg)`;
}

function directionOf(index: number, ownerState: CollageFabOwnerState): CollageFabDirection {
  return ownerState.directions[index] ?? ownerState.direction;
}

/** The offset a child travels by once the group is fully expanded. */
/** Where a child sits while collapsed: a ring's petals keep a collar of `ringPeek` px out. */
function getRestOffset(index: number, ownerState: CollageFabOwnerState): Vector {
  if (ownerState.spread !== 'radial' || index === 0 || !ownerState.ringPeek) {
    return ORIGIN;
  }
  const angle = ((ownerState.radialStart + (index - 1) * ownerState.radialStep) * Math.PI) / 180;
  return {
    x: clean(Math.sin(angle) * ownerState.ringPeek),
    y: clean(-Math.cos(angle) * ownerState.ringPeek),
  };
}

function getItemOffset(index: number, ownerState: CollageFabOwnerState): Vector {
  const pitch = ownerState.size + ownerState.gap;

  if (ownerState.spread === 'radial') {
    if (index === 0) {
      return ORIGIN;
    }
    const angle = ((ownerState.radialStart + (index - 1) * ownerState.radialStep) * Math.PI) / 180;
    return { x: clean(Math.sin(angle) * pitch), y: clean(-Math.cos(angle) * pitch) };
  }

  const direction = directionOf(index, ownerState);
  const [x, y] = DIRECTION_VECTORS[direction];
  // Children sharing a direction fan one pitch apart, so a group that splits over
  // two axes reads as one leg per direction instead of leaving a long empty one.
  let position = 0;
  for (let previous = 0; previous < index; previous += 1) {
    if (directionOf(previous, ownerState) === direction) {
      position += 1;
    }
  }
  // The anchor already occupies the first slot of its own direction group.
  const travel = (position + (direction === directionOf(0, ownerState) ? 0 : 1)) * pitch;

  return { x: x * travel, y: y * travel };
}

function spanOf(offsets: number[], size: number): [number, CollageFabAlign] {
  const low = Math.min(...offsets, 0);
  const high = Math.max(...offsets, 0);
  const align = low < 0 && high > 0 ? 'center' : low < 0 ? 'end' : 'start';
  const extent = align === 'center' ? 2 * Math.max(-low, high) + size : high - low + size;
  return [extent, align];
}

/**
 * The root's box grows around whatever the children travel through. The anchor sits
 * on the edge the group fans away from, so pinning that edge in the parent keeps the
 * collapsed button still while the box grows. An axis the children fan along in both
 * directions is centred on the anchor instead, which needs the parent to centre it.
 * A radial group keeps the box a single button: the ring paints outside it, which is
 * what keeps the anchor on one pixel while the children travel.
 */
export function getGroupGeometry(ownerState: CollageFabOwnerState): CollageFabGroupGeometry {
  const { count, size } = ownerState;

  if (ownerState.spread === 'radial') {
    return {
      extent: { width: size, height: size },
      align: { x: 'center', y: 'center' },
    };
  }

  const offsets = Array.from({ length: count }, (_, index) => getItemOffset(index, ownerState));
  const xs = offsets.map((offset) => offset.x);
  const ys = offsets.map((offset) => offset.y);

  const [width, x] = spanOf(xs, size);
  const [height, y] = spanOf(ys, size);

  return { extent: { width, height }, align: { x, y } };
}

/**
 * Every mask is an absolutely positioned window that is slid against the item's
 * own translation, which pins the visible cut line to a fixed position in the
 * container while the button morphs. `spread` is the distance the mask image has
 * to cover to reach across the whole expanded row, so it scales with `gap`.
 *
 * A row cuts each slice with a band; a radial group cuts it with a wedge whose apex
 * sits on the stack centre. Both keep the cut pinned by cancelling the travel out
 * of `mask-position`.
 */
export function getItemGeometry(
  index: number,
  ownerState: CollageFabOwnerState,
): CollageFabItemGeometry {
  if (ownerState.spread === 'radial') {
    return getWedgeGeometry(index, ownerState);
  }

  if (usesSectors(ownerState)) {
    return getSectorGeometry(index, ownerState);
  }

  const { count, size, gap, fadeWidth, open } = ownerState;
  const spread = (count - 1) * (size + gap) + size + fadeWidth;
  const [x, y] = DIRECTION_VECTORS[directionOf(index, ownerState)];
  const horizontal = x !== 0;
  const leading = (horizontal ? x : y) < 0;
  const offset = open ? getItemOffset(index, ownerState) : getRestOffset(index, ownerState);

  // Slice boundaries, measured inside the item from the edge the group fans towards.
  // The anchor takes a whole `spread` so its cut line never crosses the button: it is
  // never clipped.
  const boundary = index === 0 ? spread : (count - index) * (size / count);
  const anchorBoundary = index === 0 ? -fadeWidth / 2 : index * (size / count);
  // Collapsed, every slice sits on the anchor; the mask stays put and only the cut
  // lines separate them.
  const cut = leading ? boundary : anchorBoundary;
  const ramp = cut - spread - fadeWidth / 2;
  // The mask slides against the travel, so `mask-position` and `translate` cancel out
  // and the cut line stays where it was while collapsed.
  const maskPositionX = horizontal ? ramp - offset.x : -offset.x;
  const maskPositionY = horizontal ? -offset.y : ramp - offset.y;

  // The gradient axis stays fixed per orientation; only the stop order flips.
  const stops = leading
    ? `#000 0px, #000 ${spread}px, transparent ${spread + fadeWidth}px, transparent ${2 * spread}px`
    : `transparent 0px, transparent ${spread}px, #000 ${spread + fadeWidth}px, #000 ${2 * spread}px`;

  return {
    translate: translateCss(offset, horizontal),
    maskImage:
      count > 1 ? `linear-gradient(${horizontal ? 'to right' : 'to bottom'}, ${stops})` : 'none',
    maskSize: horizontal ? `${2 * spread}px 100%` : `100% ${2 * spread}px`,
    maskPosition: `${maskPositionX}px ${maskPositionY}px`,
  };
}

function getWedgeGeometry(index: number, ownerState: CollageFabOwnerState): CollageFabItemGeometry {
  const { count, size, gap, fadeWidth, open } = ownerState;
  const step = ownerState.radialStep;
  const offset = open ? getItemOffset(index, ownerState) : getRestOffset(index, ownerState);
  // Every child of a ring travels one pitch, so the mask image has to reach that far
  // past it for the apex to stay on the stack centre.
  const reach = count > 1 ? size + gap : 0;
  const extent = size + 2 * reach;
  // An arc of `fadeWidth` on the rim reads the same at every size.
  const fade = fadeWidth ? ((fadeWidth / (size / 2)) * 180) / Math.PI : 0;
  const from = ownerState.radialStart + (index - 1) * step - step / 2 - fade / 2;
  // The last wedge fades out into the anchor's disc; every earlier one hands over to
  // the wedge above it and ends hard, so the two never double-fade the same edge.
  const window = clean(step + fade);

  return {
    translate: translateCss(offset, false),
    maskImage:
      count > 1 && index > 0
        ? conic(from, fade, index === count - 1 ? step : step + fade, window)
        : 'none',
    maskSize: `${extent}px ${extent}px`,
    maskPosition: `${-offset.x - reach}px ${-offset.y - reach}px`,
  };
}

/** A group that fans over more than one axis shares the collapsed disc by direction. */
function usesSectors(ownerState: CollageFabOwnerState): boolean {
  const sides = new Set<CollageFabDirection>();
  for (let index = 1; index < ownerState.count; index += 1) {
    sides.add(directionOf(index, ownerState));
  }
  return sides.size > 1;
}

/**
 * Every side of a mixed group owns an equal sector of the collapsed disc, and the
 * children on one side split that sector between them, so no side can take more of
 * the collage than another. The sector is cut with a conic mask whose apex sits on
 * the stack centre, like the ring, so the cut stays put while a child travels.
 */
function getSectorGeometry(
  index: number,
  ownerState: CollageFabOwnerState,
): CollageFabItemGeometry {
  const { count, size, fadeWidth, open } = ownerState;
  const directions = Array.from({ length: count }, (_, child) => directionOf(child, ownerState));
  const side = directions[index];
  const sides = [...new Set(directions.slice(1))].sort(
    (a, b) => DIRECTION_ANGLES[a] - DIRECTION_ANGLES[b],
  );
  const share = 360 / sides.length;
  const slot = sides.indexOf(side);

  const offsets = Array.from({ length: count }, (_, child) => getItemOffset(child, ownerState));
  const offset = open ? offsets[index] : getRestOffset(index, ownerState);
  const travel = Math.max(...offsets.map((entry) => Math.abs(entry.x) + Math.abs(entry.y)));
  const extent = size + 2 * travel;
  const fade = fadeWidth ? ((fadeWidth / (size / 2)) * 180) / Math.PI : 0;

  // Children sharing a side share its slot, so a side can never take more of the
  // collage than another. Equal slots in angular order, the first squared to its own
  // direction, which tiles the disc however the sides are spread.
  const start = DIRECTION_ANGLES[sides[0]] - share / 2 + slot * share;
  // A slot that does not hold its direction in the middle would cut the child as it
  // travels, so it grows just enough to keep the whole button inside.
  const angle = DIRECTION_ANGLES[side];
  const own = Math.abs(offset.x) + Math.abs(offset.y);
  const need = own ? (Math.atan(size / 2 / own) * 180) / Math.PI : 0;
  const before = Math.max(0, need - (angle - start));
  const after = Math.max(0, need - (start + share - angle));
  const window = share + before + after;
  // The last slot fades out into the anchor; the others hand over and end hard, so no
  // edge fades twice.
  const closes = slot === sides.length - 1;

  return {
    translate: translateCss(offset, offset.x !== 0),
    maskImage:
      index > 0
        ? conic(start - before - fade / 2, fade, closes ? window : window + fade, window + fade)
        : 'none',
    maskSize: `${extent}px ${extent}px`,
    maskPosition: `${-offset.x - travel}px ${-offset.y - travel}px`,
  };
}
