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

const DIRECTION_VECTORS: Record<CollageFabDirection, Vector> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

/** Where the anchor child sits on one axis of the root's box. */
type CollageFabAlign = 'start' | 'center' | 'end';

/** The box the root grows into, plus the anchor's place inside it. */
export interface CollageFabGroupGeometry {
  extent: { width: number; height: number };
  align: { x: CollageFabAlign; y: CollageFabAlign };
}

function translateCss({ x, y }: Vector, horizontal: boolean): string {
  if (x !== 0 && y !== 0) {
    return `translate(${x}px, ${y}px)`;
  }
  return horizontal ? `translateX(${x}px)` : `translateY(${y}px)`;
}

function directionOf(index: number, ownerState: CollageFabOwnerState): CollageFabDirection {
  return ownerState.directions[index] ?? ownerState.direction;
}

/** The offset a child travels by once the group is fully expanded. */
function getItemOffset(index: number, ownerState: CollageFabOwnerState): Vector {
  const direction = directionOf(index, ownerState);
  const vector = DIRECTION_VECTORS[direction];
  const pitch = ownerState.size + ownerState.gap;
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

  return { x: vector.x * travel, y: vector.y * travel };
}

function alignOf(offsets: number[]): CollageFabAlign {
  const negative = offsets.some((offset) => offset < 0);
  const positive = offsets.some((offset) => offset > 0);
  if (negative && positive) {
    return 'center';
  }
  return negative ? 'end' : 'start';
}

/**
 * The root's box grows around whatever the children travel through. The anchor sits
 * on the edge the group fans away from, so pinning that edge in the parent keeps the
 * collapsed button still while the box grows. An axis the children fan along in both
 * directions is centred on the anchor instead, which needs the parent to centre it.
 */
export function getGroupGeometry(ownerState: CollageFabOwnerState): CollageFabGroupGeometry {
  const { count, size } = ownerState;
  const offsets = Array.from({ length: count }, (_, index) => getItemOffset(index, ownerState));
  const xs = offsets.map((offset) => offset.x);
  const ys = offsets.map((offset) => offset.y);

  const span = (values: number[]) => {
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const align = alignOf(values);
    if (align === 'center') {
      return 2 * Math.max(-min, max) + size;
    }
    return max - min + size;
  };

  return {
    extent: { width: span(xs), height: span(ys) },
    align: { x: alignOf(xs), y: alignOf(ys) },
  };
}

/**
 * Every mask is an absolutely positioned window that is slid against the item's
 * own translation, which pins the visible cut line to a fixed position in the
 * container while the button morphs. `spread` is the distance the mask image has
 * to cover to reach across the whole expanded row, so it scales with `gap`.
 *
 * Both the travel and the cut line are vectors, so the same arithmetic carries
 * over to directions that are not aligned with an axis.
 */
export function getItemGeometry(
  index: number,
  ownerState: CollageFabOwnerState,
): CollageFabItemGeometry {
  const { count, size, gap, fadeWidth, open } = ownerState;
  const pitch = size + gap;
  const spread = (count - 1) * pitch + size + fadeWidth;
  const vector = DIRECTION_VECTORS[directionOf(index, ownerState)];
  const horizontal = vector.x !== 0;
  const leading = (horizontal ? vector.x : vector.y) < 0;
  const offset = open ? getItemOffset(index, ownerState) : { x: 0, y: 0 };

  // Slice boundaries, measured inside the item from the edge the group fans towards.
  // The anchor takes a whole `spread` so its cut line never crosses the button: it is
  // never clipped.
  const boundary = index === 0 ? spread : (count - index) * (size / count);
  const anchorBoundary = index === 0 ? -fadeWidth / 2 : index * (size / count);
  // Collapsed, every slice sits on the anchor; the mask stays put and only the cut
  // lines separate them.
  const cut = leading ? boundary : anchorBoundary;
  const ramp = cut - spread - fadeWidth / 2;
  const base: Vector = horizontal ? { x: ramp, y: 0 } : { x: 0, y: ramp };
  // The mask slides against the travel, so `mask-position` and `translate` cancel out
  // and the cut line stays where it was while collapsed.
  const maskPosition: Vector = { x: base.x - offset.x, y: base.y - offset.y };

  // The gradient axis stays fixed per orientation; only the stop order flips.
  const stops = leading
    ? `#000 0px, #000 ${spread}px, transparent ${spread + fadeWidth}px, transparent ${2 * spread}px`
    : `transparent 0px, transparent ${spread}px, #000 ${spread + fadeWidth}px, #000 ${2 * spread}px`;

  return {
    translate: translateCss(offset, horizontal),
    maskImage:
      count > 1 ? `linear-gradient(${horizontal ? 'to right' : 'to bottom'}, ${stops})` : 'none',
    maskSize: horizontal ? `${2 * spread}px 100%` : `100% ${2 * spread}px`,
    maskPosition: `${maskPosition.x}px ${maskPosition.y}px`,
  };
}
