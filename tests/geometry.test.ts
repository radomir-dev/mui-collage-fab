import { describe, expect, it } from 'vitest';
import {
  getGroupGeometry,
  getItemGeometry,
  resolveSize,
} from '../src/components/collageFabGeometry';
import type { CollageFabDirection, CollageFabOwnerState } from '../src/components/CollageFab';

const DIRECTIONS: CollageFabDirection[] = ['left', 'right', 'up', 'down'];

function state(overrides: Partial<CollageFabOwnerState> = {}): CollageFabOwnerState {
  const base = {
    open: false,
    direction: 'left',
    trigger: 'hover',
    size: 56,
    variant: 'circular',
    cornerRadius: '50%',
    gap: 16,
    fadeWidth: 12,
    ringPeek: 2,
    spread: 'line',
    radialStart: 0,
    radialStep: 120,
    count: 3,
    transitionDuration: 400,
    transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    ...overrides,
  } as const;

  return {
    ...base,
    directions: overrides.directions ?? Array.from({ length: base.count }, () => base.direction),
  };
}

const numbers = (value: string) => (value.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

const offsetOf = (translate: string) => {
  const values = numbers(translate);
  if (translate.startsWith('translateX(')) {
    return { x: values[0] ?? 0, y: 0 };
  }
  if (translate.startsWith('translateY(')) {
    return { x: 0, y: values[0] ?? 0 };
  }
  return { x: values[0] ?? 0, y: values[1] ?? 0 };
};

const translateOf = (geometry: ReturnType<typeof getItemGeometry>) =>
  numbers(geometry.translate)[0];
const maskPositionOf = (geometry: ReturnType<typeof getItemGeometry>, axis: 'x' | 'y') => {
  const [x = 0, y = 0] = numbers(geometry.maskPosition);
  return axis === 'x' ? x : y;
};
const maskSizeOf = (geometry: ReturnType<typeof getItemGeometry>) => numbers(geometry.maskSize)[0];

describe('resolveSize', () => {
  it('passes numeric sizes through untouched', () => {
    expect(resolveSize(37)).toBe(37);
  });

  it('maps every named size onto a larger diameter', () => {
    expect(resolveSize('medium')).toBeGreaterThan(resolveSize('small'));
    expect(resolveSize('large')).toBeGreaterThan(resolveSize('medium'));
  });
});

describe('getGroupGeometry', () => {
  it('grows along the direction the children travel and stays one button deep across it', () => {
    for (const direction of DIRECTIONS) {
      const { extent } = getGroupGeometry(state({ direction }));
      const horizontal = direction === 'left' || direction === 'right';

      expect(horizontal ? extent.width : extent.height).toBe(3 * 56 + 2 * 16);
      expect(horizontal ? extent.height : extent.width).toBe(56);
    }
  });

  it('puts the anchor against the edge the group fans away from', () => {
    expect(getGroupGeometry(state({ direction: 'left' })).align).toEqual({ x: 'end', y: 'start' });
    expect(getGroupGeometry(state({ direction: 'right' })).align).toEqual({
      x: 'start',
      y: 'start',
    });
    expect(getGroupGeometry(state({ direction: 'up' })).align).toEqual({ x: 'start', y: 'end' });
    expect(getGroupGeometry(state({ direction: 'down' })).align).toEqual({
      x: 'start',
      y: 'start',
    });
  });

  it('keeps the box a single button for one child', () => {
    expect(getGroupGeometry(state({ count: 1 })).extent).toEqual({ width: 56, height: 56 });
  });

  it('grows both axes when the children fan over both', () => {
    const { extent, align } = getGroupGeometry(
      state({ count: 3, directions: ['left', 'left', 'down'] }),
    );

    expect(extent).toEqual({ width: 128, height: 128 });
    expect(align).toEqual({ x: 'end', y: 'start' });
  });

  it('centres an axis the children fan along in both directions', () => {
    const { extent, align } = getGroupGeometry(
      state({ count: 3, directions: ['right', 'right', 'left'] }),
    );

    expect(align.x).toBe('center');
    expect(extent.width).toBe(2 * 72 + 56);
  });
});

describe('getItemGeometry with radial spread', () => {
  const radial = (overrides: Partial<CollageFabOwnerState> = {}) =>
    state({ spread: 'radial', count: 4, radialStep: 90, ...overrides });

  it('sends every child one pitch out along its own angle', () => {
    expect(getItemGeometry(0, radial({ open: true })).translate).toBe('translateY(0px)');
    expect(getItemGeometry(1, radial({ open: true })).translate).toBe('translateY(-72px)');
    expect(getItemGeometry(2, radial({ open: true })).translate).toBe('translateX(72px)');
    expect(getItemGeometry(3, radial({ open: true })).translate).toBe('translateY(72px)');
  });

  it('spaces the ring evenly from radialStart', () => {
    const angles = [1, 2, 3].map((index) => {
      const offset = offsetOf(getItemGeometry(index, radial({ open: true })).translate);
      return Math.atan2(offset.x, -offset.y) * (180 / Math.PI);
    });

    expect(angles).toEqual([0, 90, 180]);
  });

  it('keeps the wedge apex on the stack centre while the child slides out', () => {
    for (const index of [1, 2, 3]) {
      const closed = getItemGeometry(index, radial());
      const opened = getItemGeometry(index, radial({ open: true }));
      const [closedX, closedY] = numbers(closed.maskPosition);
      const [openX, openY] = numbers(opened.maskPosition);
      const translate = offsetOf(opened.translate);

      expect(openX + translate.x).toBeCloseTo(closedX, 6);
      expect(openY + translate.y).toBeCloseTo(closedY, 6);
      expect(opened.maskImage).toContain('conic-gradient(from ');
      expect(numbers(opened.maskSize)).toEqual([200, 200]);
    }
  });

  it('fades the last wedge out into the anchor and hands every other one over hard', () => {
    const stops = (index: number) =>
      (getItemGeometry(index, radial()).maskImage.match(/(-?[\d.]+)deg/g) ?? []).map((value) =>
        Number.parseFloat(value),
      );

    // [from, taper start, taper end, window end]
    const middle = stops(2);
    const last = stops(3);

    expect(middle[3]).toBeCloseTo(middle[4], 6);
    expect(last[3]).toBeLessThan(last[4]);
  });

  it('leaves the anchor whole and keeps the root a single button wide', () => {
    expect(getItemGeometry(0, radial()).maskImage).toBe('none');
    expect(getGroupGeometry(radial())).toEqual({
      extent: { width: 56, height: 56 },
      align: { x: 'center', y: 'center' },
    });
  });
});

describe('getItemGeometry with per-child directions', () => {
  const directions: CollageFabDirection[] = ['left', 'right', 'down', 'down'];

  it('gives every direction its own leg, one pitch apart', () => {
    const group = (index: number) =>
      getItemGeometry(index, state({ count: 4, directions, open: true }));

    expect(group(1).translate).toBe('translateX(72px)');
    expect(group(2).translate).toBe('translateY(72px)');
    expect(group(3).translate).toBe('translateY(144px)');
  });

  it('puts two opposite legs half a disc apart', () => {
    const directions: CollageFabDirection[] = ['right', 'right', 'left', 'left'];
    const mask = (index: number) => getItemGeometry(index, state({ count: 4, directions }));

    const start = (index: number) =>
      Number(/from (-?[\d.]+)deg/.exec(mask(index).maskImage)?.[1] ?? 0);

    expect(Math.abs(start(1) - start(2))).toBeCloseTo(180, 0);
  });

  it('falls back to direction for children past the end of the list', () => {
    const geometry = getItemGeometry(2, state({ directions: ['up'], direction: 'up', open: true }));

    expect(geometry.translate).toBe('translateY(-144px)');
  });
});

describe('getItemGeometry', () => {
  it('translates each slice by a whole pitch once expanded, and not at all while collapsed', () => {
    for (const direction of DIRECTIONS) {
      for (const index of [0, 1, 2]) {
        const closed = getItemGeometry(index, state({ direction }));
        const opened = getItemGeometry(index, state({ direction, open: true }));

        expect(Math.abs(translateOf(closed))).toBe(0);
        expect(Math.abs(translateOf(opened))).toBe(index * (56 + 16));
      }
    }
  });

  it('sends the fan along the axis of the direction', () => {
    for (const direction of DIRECTIONS) {
      const geometry = getItemGeometry(1, state({ direction, open: true }));
      const horizontal = direction === 'left' || direction === 'right';

      expect(geometry.translate.startsWith(horizontal ? 'translateX(' : 'translateY(')).toBe(true);
      expect(geometry.maskPosition).toMatch(
        horizontal ? /^-?\d+(\.\d+)?px 0px$/ : /^0px -?\d+(\.\d+)?px$/,
      );
      expect(geometry.maskSize).toMatch(horizontal ? /^\d+px 100%$/ : /^100% \d+px$/);
    }
  });

  it('keeps the cut line pinned in container space while the slice travels', () => {
    for (const direction of DIRECTIONS) {
      for (const index of [0, 1, 2, 3]) {
        const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
        const closed = getItemGeometry(index, state({ direction, count: 4 }));
        const opened = getItemGeometry(index, state({ direction, count: 4, open: true }));

        expect(maskPositionOf(opened, axis) + translateOf(opened)).toBeCloseTo(
          maskPositionOf(closed, axis) + translateOf(closed),
          6,
        );
      }
    }
  });

  it('drops the mask for a single child', () => {
    expect(getItemGeometry(0, state({ count: 1 })).maskImage).toBe('none');
    expect(getItemGeometry(0, state({ count: 2 })).maskImage).not.toBe('none');
  });

  it('flips the gradient stop order with the leading edge', () => {
    expect(getItemGeometry(1, state({ direction: 'right' })).maskImage).toContain(
      'linear-gradient(to right, transparent 0px',
    );
    expect(getItemGeometry(1, state({ direction: 'left' })).maskImage).toContain(
      'linear-gradient(to right, #000 0px',
    );
    expect(getItemGeometry(1, state({ direction: 'up' })).maskImage).toContain(
      'linear-gradient(to bottom, #000 0px',
    );
    expect(getItemGeometry(1, state({ direction: 'down' })).maskImage).toContain(
      'linear-gradient(to bottom, transparent 0px',
    );
  });

  it('scales the mask window with the expanded extent', () => {
    const [size, gap, fadeWidth, count] = [56, 16, 12, 3];
    const spread = (count - 1) * (size + gap) + size + fadeWidth;

    expect(maskSizeOf(getItemGeometry(1, state({ size, gap, fadeWidth, count })))).toBe(2 * spread);
  });
});

describe('mixed directions', () => {
  const geometryFor = (directions: CollageFabDirection[]) => {
    const group = state({ directions, count: directions.length });
    return directions.map((_, index) => getItemGeometry(index, group));
  };

  const startOf = (mask: string) => Number(/from (-?[\d.]+)deg/.exec(mask)?.[1]);
  const spanOf = (mask: string) => {
    const stops = /#000 ([\d.]+)deg,.*transparent ([\d.]+)deg/.exec(mask);
    return Number(stops?.[2]) - Number(stops?.[1]);
  };

  it('gives every side an equal sector of the collapsed disc', () => {
    const starts = geometryFor(['up', 'right', 'down', 'left', 'up'])
      .slice(1)
      .map((item) => startOf(item.maskImage))
      .sort((a, b) => a - b);

    for (let index = 1; index < starts.length; index += 1) {
      expect(starts[index] - starts[index - 1]).toBeCloseTo(90, 0);
    }
  });

  it('keeps children on one side inside that side alone', () => {
    const items = geometryFor(['left', 'left', 'left', 'down']);

    expect(spanOf(items[1].maskImage)).toBeCloseTo(180, 0);
    expect(items[1].maskImage).toBe(items[2].maskImage);
    expect(spanOf(items[3].maskImage)).toBeCloseTo(180, 0);
    expect(Math.abs(startOf(items[1].maskImage) - startOf(items[3].maskImage))).toBeCloseTo(180, 0);
  });
});
