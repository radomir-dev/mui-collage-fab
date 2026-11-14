import { describe, expectTypeOf, it } from 'vitest';
import type { CollageFabProps } from '../src/components/CollageFab';

describe('CollageFab public types', () => {
  it('keeps the documented unions', () => {
    expectTypeOf<NonNullable<CollageFabProps['direction']>>().toEqualTypeOf<
      'left' | 'right' | 'up' | 'down'
    >();
    expectTypeOf<NonNullable<CollageFabProps['trigger']>>().toEqualTypeOf<
      'hover' | 'click' | 'manual'
    >();
    expectTypeOf<NonNullable<CollageFabProps['variant']>>().toEqualTypeOf<
      'circular' | 'rounded' | 'square'
    >();
    expectTypeOf<NonNullable<CollageFabProps['spread']>>().toEqualTypeOf<'line' | 'radial'>();
  });

  it('accepts one direction per child', () => {
    expectTypeOf<NonNullable<CollageFabProps['directions']>>().toEqualTypeOf<
      ('left' | 'right' | 'up' | 'down')[]
    >();
  });

  it('accepts a diameter as a number or a named size', () => {
    expectTypeOf<CollageFabProps['size']>().toEqualTypeOf<
      'small' | 'medium' | 'large' | number | undefined
    >();
  });

  it('exposes slot overrides keyed by slot name', () => {
    expectTypeOf<NonNullable<CollageFabProps['slotProps']>>().toMatchTypeOf<{ item?: unknown }>();
    expectTypeOf<NonNullable<CollageFabProps['slots']>>().toMatchTypeOf<{ item?: unknown }>();
  });

  it('rejects an unknown direction, trigger and spread', () => {
    // @ts-expect-error `sideways` is not a direction
    const direction: CollageFabProps = { direction: 'sideways' };
    // @ts-expect-error `pinch` is not a trigger
    const trigger: CollageFabProps = { trigger: 'pinch' };
    // @ts-expect-error `spiral` is not a spread
    const spread: CollageFabProps = { spread: 'spiral' };
    // @ts-expect-error `diagonal` is not a direction
    const directions: CollageFabProps = { directions: ['diagonal'] };
    void direction;
    void trigger;
    void spread;
    void directions;
  });
});
