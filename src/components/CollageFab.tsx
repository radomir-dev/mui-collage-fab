import * as React from 'react';
import { ClickAwayListener } from '@mui/material';
import { styled, useThemeProps } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import { useControlled, useForkRef } from '@mui/material/utils';
import type { CreateSlotsAndSlotProps, SlotProps } from '@mui/material/utils';
import useSlotProps from '@mui/utils/useSlotProps';
import composeClasses from '@mui/utils/composeClasses';
import generateUtilityClass from '@mui/utils/generateUtilityClass';
import { getGroupGeometry, getItemGeometry, resolveSize } from './collageFabGeometry';
import { COLLAGE_FAB_DEFAULTS } from './collageFabDefaults';

/**
 * The axis the buttons fan out on, starting from the anchor child.
 */
export type CollageFabDirection = 'left' | 'right' | 'up' | 'down';

/**
 * How the group reacts to pointers.
 */
export type CollageFabTrigger = 'hover' | 'click' | 'manual' | 'auto';

/**
 * Diameter of every button. Named sizes resolve to small 40px, medium 48px and
 * large 56px; numeric values are used verbatim.
 */
export type CollageFabSize = 'small' | 'medium' | 'large' | number;

/**
 * The shape of every button: a circle, a rounded square or a sharp-cornered
 * square.
 */
export type CollageFabVariant = 'circular' | 'rounded' | 'square';

/**
 * How the children leave the anchor: along a line, or onto a ring around it.
 */
export type CollageFabSpread = 'line' | 'radial';

// `'rounded'` scales with the button so its corner reads the same at every size;
// 25% stays a rounded square, where a circle would need 50%.
const CORNER_RADIUS: Record<CollageFabVariant, number | string> = {
  circular: '50%',
  rounded: '25%',
  square: 0,
};

const FOCUSABLE_DESCENDANT_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Class names the component applies, and the accepted keys for `classes`.
 */
export interface CollageFabClasses {
  /** The animated container that holds every slice. */
  root: string;
  /** One masked wrapper per child. */
  item: string;
  /** Applied to the root while the group is expanded. */
  expanded: string;
  /** Applied to the root while the group is collapsed. */
  collapsed: string;
}

/**
 * Every key accepted by `classes`.
 */
export type CollageFabClassKey = keyof CollageFabClasses;

/**
 * Slot props accepted by a custom `root` slot component.
 */
export interface CollageFabRootSlotPropsOverrides {}

/**
 * Slot props accepted by a custom `item` slot component.
 */
export interface CollageFabItemSlotPropsOverrides {}

/**
 * State shared by the root slot and the item slots while styling.
 */
export interface CollageFabOwnerState {
  /** Whether the group is currently expanded. */
  open: boolean;
  /** The resolved fan-out direction used by every child without a `directions` entry. */
  direction: CollageFabDirection;
  /** The resolved direction of each child, in child order. */
  directions: CollageFabDirection[];
  /** How the children leave the anchor: along a line, or onto a ring. */
  spread: CollageFabSpread;
  /** The angle in degrees the first wedge is centred on when `spread` is `'radial'`. */
  radialStart: number;
  /** The angle in degrees between two wedges when `spread` is `'radial'`. */
  radialStep: number;
  /** The resolved pointer trigger mode. */
  trigger: CollageFabTrigger;
  /** The button diameter in pixels, after resolving the named size. */
  size: number;
  /** The resolved shape of every button. */
  variant: CollageFabVariant;
  /** The corner radius resolved from `variant`, inherited by every child. */
  cornerRadius: number | string;
  /** The main-axis gap in pixels. */
  gap: number;
  /** The fade width in pixels. */
  fadeWidth: number;
  /** How far the petals overhang the anchor while a radial group is collapsed. */
  ringPeek: number;
  /** The number of valid children currently rendered. */
  count: number;
  /** The morph duration in milliseconds. */
  transitionDuration: number;
  /** The morph easing. */
  transitionEasing: string;
}

/**
 * The per-slice CSS computed for one child.
 */
export interface CollageFabItemGeometry {
  /** The translate that moves the slice along the main axis. */
  translate: string;
  /** The gradient that cuts the slice out of the container. */
  maskImage: string;
  /** The size of that gradient, wide enough to cover the expanded row. */
  maskSize: string;
  /** The offset that pins the cut line in container space. */
  maskPosition: string;
  /** How two mask layers combine, when a cut needs more than one. */
  maskComposite?: string;
  /** The prefixed form of `maskComposite` for older WebKit. */
  WebkitMaskComposite?: string;
}

/**
 * State handed to the item slot. It extends the shared state with the position
 * of the child, so an item can be styled individually.
 */
export interface CollageFabItemOwnerState extends CollageFabOwnerState {
  /** The position of the child in the stack. 0 is the anchor. */
  index: number;
  /** True for the anchor child (index 0). */
  isAnchor: boolean;
  /** The computed translate, mask image, mask size and mask position for this slice. */
  geometry: CollageFabItemGeometry;
}

/**
 * Replaceable internal components.
 */
export interface CollageFabSlots {
  /** The animated container. A replacement must forward `ref`, which `ClickAwayListener` needs. */
  root?: React.ElementType;
  /** One masked wrapper per child, shaped by `variant`. */
  item?: React.ElementType;
}

/**
 * The `slots` and `slotProps` props, typed per slot.
 */
export type CollageFabSlotsAndSlotProps = CreateSlotsAndSlotProps<
  CollageFabSlots,
  {
    /** Props for the root slot, or a resolver that receives the shared ownerState. */
    root: SlotProps<'div', CollageFabRootSlotPropsOverrides, CollageFabOwnerState>;
    /** Props for the item slot, or a resolver that receives the item ownerState. */
    item: SlotProps<'div', CollageFabItemSlotPropsOverrides, CollageFabItemOwnerState>;
  }
>;

/**
 * Props for the CollageFab component.
 */
export interface CollageFabProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * The buttons to stack. Every valid element is wrapped in a masked slot shaped
   * by `variant`. Order matters: index 0 is the anchor, the rest fan out along
   * `direction` or their own entry in `directions`.
   */
  children?: React.ReactNode;
  /**
   * The axis the buttons fan out on, starting from the anchor child. `left`
   * matches the original right-anchored behaviour.
   */
  direction?: CollageFabDirection;
  /**
   * A direction per child, in child order, so one group can fan over several axes.
   * Entry 0 belongs to the anchor and has no visible effect; an entry that is
   * missing or past the end of the list falls back to `direction`.
   */
  directions?: CollageFabDirection[];
  /**
   * How the children leave the anchor. `'line'` fans them along their directions;
   * `'radial'` sends them onto a ring one pitch around the anchor, each cut by a wedge
   * that lets it emerge from behind the anchor.
   */
  spread?: CollageFabSpread;
  /**
   * Angle in degrees the first ring child sits on when `spread` is `'radial'`.
   */
  radialStart?: number;
  /**
   * Angle in degrees between two ring children when `spread` is `'radial'`.
   * Defaults to `360 / (count - 1)`, which spaces them evenly around the anchor.
   */
  radialStep?: number;
  /**
   * Diameter of every button. Named sizes resolve to small 40px, medium 48px,
   * large 56px; numeric values are used verbatim.
   */
  size?: CollageFabSize;
  /**
   * The shape of every button. `'circular'` clips each slice to a circle,
   * `'rounded'` to a rounded square and `'square'` to a sharp-cornered square.
   * The mask still slices the silhouette along the main axis, so the stack reads
   * as one shape when collapsed and as separate shapes when expanded.
   */
  variant?: CollageFabVariant;
  /**
   * Main-axis gap in pixels between two buttons when expanded.
   */
  gap?: number;
  /**
   * Width in pixels of the soft cut line between two slices. On a ring it is also the
   * width of the ramp where the petals blend into the anchor and into each other.
   */
  fadeWidth?: number;
  /**
   * How many pixels the petals of a collapsed ring or multi-axis group grow beyond the
   * anchor's radius, so their colours show as an even collar blended into the button.
   * `0` hides them completely.
   */
  ringPeek?: number;
  /**
   * How the group reacts to pointers. `'hover'` opens on mouse enter, closes on
   * mouse leave and toggles on touch or pen tap; `'click'` toggles on any click;
   * `'manual'` disables all built-in pointer interaction; `'auto'` behaves like
   * `'hover'` where the primary pointer can hover and like `'click'` elsewhere.
   */
  trigger?: CollageFabTrigger;
  /**
   * If `true`, the group is expanded. Use it to control the component.
   */
  open?: boolean;
  /**
   * If `true`, the group is expanded by default (uncontrolled).
   */
  defaultOpen?: boolean;
  /**
   * Callback fired when the group is expanded.
   */
  onOpen?: (event: React.SyntheticEvent) => void;
  /**
   * Callback fired when the group is collapsed.
   */
  onClose?: (event: React.SyntheticEvent) => void;
  /**
   * If `true`, the group does not collapse when the user clicks away from it.
   */
  disableClickAway?: boolean;
  /**
   * Duration of the morph, in milliseconds.
   */
  transitionDuration?: number;
  /**
   * Easing of the morph.
   */
  transitionEasing?: string;
  /**
   * System prop that defines system overrides as well as additional CSS styles.
   */
  sx?: SxProps<Theme>;
  /**
   * Override or extend the styles applied to the component.
   */
  classes?: Partial<CollageFabClasses>;
  /**
   * Custom components for the `root` and `item` slots.
   */
  slots?: CollageFabSlotsAndSlotProps['slots'];
  /**
   * Props for each slot. `slotProps.item` accepts either a props object or an
   * `(ownerState) => props` callback, which is the per-child escape hatch.
   */
  slotProps?: CollageFabSlotsAndSlotProps['slotProps'];
}

function canHover(): boolean {
  return (
    typeof window === 'undefined' ||
    !window.matchMedia ||
    window.matchMedia('(hover: hover)').matches
  );
}

function getTransitionTiming(duration: number, easing: string): string {
  return `${duration}ms ${easing}`;
}

function getCollageFabUtilityClass(slot: string) {
  return generateUtilityClass('MuiCollageFab', slot);
}

const useUtilityClasses = (open: boolean, classes: Partial<CollageFabClasses> | undefined) => {
  const slots = {
    root: ['root', open ? 'expanded' : 'collapsed'],
    item: ['item'],
  };
  return composeClasses(slots, getCollageFabUtilityClass, classes);
};

const CollageFabRoot = styled('div', {
  name: 'MuiCollageFab',
  slot: 'root',
  overridesResolver: (_props, styles) => styles.root,
})(({ ownerState }: { ownerState: CollageFabOwnerState }) => {
  const { open, size, spread, gap, count, transitionDuration, transitionEasing } = ownerState;
  const { extent, align } = getGroupGeometry(ownerState);
  const timing = getTransitionTiming(transitionDuration, transitionEasing);
  // A centred axis grows both ways around the anchor, so the box would only re-centre
  // itself: keep it one button and let the children paint outside.
  const wide = align.x === 'center' ? size : open ? extent.width : size;
  const tall = align.y === 'center' ? size : open ? extent.height : size;
  // A centred group paints outside its box, so the root keeps a pad over the whole fan:
  // without it the pointer leaves the root on its way to a child and the group folds.
  const centred = align.x === 'center' || align.y === 'center';
  const reach = spread === 'radial' ? size + gap : Math.max(extent.width, extent.height) / 2;
  const pad = open && count > 1 && centred ? reach : 0;

  return {
    position: 'relative',
    // The ring paints outside the root's box, so without a pad the gap between the
    // anchor and a child leaves the root and collapses a hover-opened group.
    ...(pad > 0 && {
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: -pad,
        borderRadius: '50%',
        zIndex: -1,
      },
    }),
    width: wide,
    height: tall,
    transition: `width ${timing}, height ${timing}`,
    // A filter traces the soft mask edges; a box-shadow would trace the wrapper rectangles.
    filter: 'drop-shadow(0px 6px 12px rgba(0,0,0,0.25))',
    cursor: open ? 'default' : 'pointer',
    WebkitTapHighlightColor: 'transparent',
  };
});

const CollageFabItemRoot = styled('div', {
  name: 'MuiCollageFab',
  slot: 'item',
  overridesResolver: (_props, styles) => styles.item,
})(({ ownerState }: { ownerState: CollageFabItemOwnerState }) => {
  const { size, index, geometry, cornerRadius, transitionDuration, transitionEasing } = ownerState;
  const { align } = getGroupGeometry(ownerState);
  const placement = {
    ...(align.x === 'end'
      ? { right: 0 }
      : align.x === 'center'
        ? { left: '50%', marginLeft: -size / 2 }
        : { left: 0 }),
    ...(align.y === 'end'
      ? { bottom: 0 }
      : align.y === 'center'
        ? { top: '50%', marginTop: -size / 2 }
        : { top: 0 }),
  };
  const timing = getTransitionTiming(transitionDuration, transitionEasing);

  return {
    position: 'absolute',
    ...placement,
    width: size,
    height: size,
    borderRadius: cornerRadius,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // The left-most slices have to stack on top of the right-ward ones; on a ring the
    // anchor has to stack on top of every wedge, so a collapsed ring reads as the button.
    zIndex: index,
    // Always present, even collapsed: the transform is what makes this wrapper a
    // stacking context, which neutralizes the child's own z-index.
    transform: geometry.translate,
    WebkitMaskImage: geometry.maskImage,
    maskImage: geometry.maskImage,
    WebkitMaskSize: geometry.maskSize,
    maskSize: geometry.maskSize,
    WebkitMaskPosition: geometry.maskPosition,
    maskPosition: geometry.maskPosition,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    ...(geometry.maskComposite && { maskComposite: geometry.maskComposite }),
    ...(geometry.WebkitMaskComposite && { WebkitMaskComposite: geometry.WebkitMaskComposite }),
    transition: `transform ${timing}, -webkit-mask-position ${timing}, mask-position ${timing}`,
    // Strip arbitrary shadows from the children and make them inherit the wrapper's
    // silhouette, so the root controls the global 3D shape.
    '& > *': {
      boxShadow: 'none !important',
      borderRadius: 'inherit !important',
      width: '100%',
      height: '100%',
      margin: 0,
    },
  };
});

type CollageFabItemSlotProps = NonNullable<CollageFabSlotsAndSlotProps['slotProps']>['item'];

interface CollageFabItemProps {
  index: number;
  ownerState: CollageFabOwnerState;
  geometry: CollageFabItemGeometry;
  className: string;
  component: React.ElementType;
  inert: boolean;
  itemRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  slotProps: CollageFabItemSlotProps;
  children?: React.ReactNode;
}

function CollageFabItem(props: CollageFabItemProps) {
  const {
    index,
    ownerState,
    geometry,
    className,
    component,
    inert,
    itemRefs,
    slotProps,
    children,
  } = props;

  const itemOwnerState = React.useMemo<CollageFabItemOwnerState>(
    () => ({ ...ownerState, index, isAnchor: index === 0, geometry }),
    [ownerState, index, geometry],
  );

  const nodeRef = React.useRef<HTMLDivElement>(null);
  const registerItem = React.useCallback(
    (element: HTMLDivElement | null) => {
      itemRefs.current[index] = element;
    },
    [itemRefs, index],
  );
  const handleRef = useForkRef(registerItem, nodeRef);

  React.useEffect(() => {
    const node = nodeRef.current;
    if (!node || !('inert' in HTMLElement.prototype)) {
      return;
    }
    // Collapsed slices are only a few pixels wide but still occupy their full
    // rectangle, so they must leave both the tab order and the accessibility tree.
    node.inert = inert;
  }, [inert]);

  const itemSlotProps = useSlotProps({
    elementType: component,
    externalSlotProps: slotProps,
    ownerState: itemOwnerState,
    additionalProps: {
      ref: handleRef,
      className,
      'aria-hidden': inert || undefined,
      children,
    },
  });

  const ItemComponent = component;
  return <ItemComponent {...itemSlotProps} />;
}

/**
 * A floating action button that stacks several children into a single shape and
 * unfolds them along a configurable direction on interaction. The root animates
 * its own main-axis extent and applies one shared drop shadow, while each child
 * is clipped by a moving gradient mask.
 */
export const CollageFab = React.forwardRef<HTMLDivElement, CollageFabProps>(
  function CollageFab(inProps, ref) {
    const props = useThemeProps({ props: inProps, name: 'MuiCollageFab' });

    const {
      children,
      direction = COLLAGE_FAB_DEFAULTS.direction,
      directions: directionsProp,
      spread = COLLAGE_FAB_DEFAULTS.spread,
      radialStart = COLLAGE_FAB_DEFAULTS.radialStart,
      radialStep: radialStepProp,
      size = COLLAGE_FAB_DEFAULTS.size,
      variant = COLLAGE_FAB_DEFAULTS.variant,
      gap = COLLAGE_FAB_DEFAULTS.gap,
      fadeWidth = COLLAGE_FAB_DEFAULTS.fadeWidth,
      ringPeek = COLLAGE_FAB_DEFAULTS.ringPeek,
      trigger: triggerProp = COLLAGE_FAB_DEFAULTS.trigger,
      open: openProp,
      defaultOpen = COLLAGE_FAB_DEFAULTS.defaultOpen,
      onOpen,
      onClose,
      disableClickAway = COLLAGE_FAB_DEFAULTS.disableClickAway,
      transitionDuration = COLLAGE_FAB_DEFAULTS.transitionDuration,
      transitionEasing = COLLAGE_FAB_DEFAULTS.transitionEasing,
      classes: classesProp,
      slots,
      slotProps,
      className,
      ...other
    } = props;

    const [open, setOpen] = useControlled<boolean>({
      controlled: openProp,
      default: defaultOpen,
      name: 'CollageFab',
      state: 'open',
    });

    const childArray = React.useMemo(
      () => React.Children.toArray(children).filter((child) => React.isValidElement(child)),
      [children],
    );
    const count = childArray.length;
    const directions = React.useMemo(
      () => childArray.map((_, index) => directionsProp?.[index] ?? direction),
      [childArray, directionsProp, direction],
    );

    const resolvedTrigger = triggerProp === 'auto' ? (canHover() ? 'hover' : 'click') : triggerProp;

    const ownerState: CollageFabOwnerState = {
      open,
      direction,
      directions,
      spread,
      radialStart,
      radialStep: radialStepProp ?? 360 / Math.max(count - 1, 1),
      trigger: resolvedTrigger,
      size: resolveSize(size),
      variant,
      cornerRadius: CORNER_RADIUS[variant],
      gap,
      fadeWidth,
      ringPeek,
      count,
      transitionDuration,
      transitionEasing,
    };

    const classes = useUtilityClasses(open, classesProp);

    const rootRef = React.useRef<HTMLDivElement>(null);
    const itemRefs = React.useRef<Array<HTMLDivElement | null>>([]);
    const suppressClickRef = React.useRef(false);
    const lastPointerTypeRef = React.useRef('mouse');
    const focusFirstItemRef = React.useRef(false);
    const handleRootRef = useForkRef(rootRef, ref);

    const setOpenState = React.useCallback(
      (next: boolean, event: React.SyntheticEvent) => {
        if (next === open) {
          return;
        }
        setOpen(next);
        if (next) {
          onOpen?.(event);
        } else {
          onClose?.(event);
        }
      },
      [open, setOpen, onOpen, onClose],
    );

    const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
      if (resolvedTrigger !== 'hover' || event.pointerType !== 'mouse') {
        return;
      }
      setOpenState(true, event);
    };

    const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
      if (resolvedTrigger !== 'hover' || event.pointerType !== 'mouse') {
        return;
      }
      setOpenState(false, event);
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      if (resolvedTrigger === 'manual') {
        return;
      }
      lastPointerTypeRef.current = event.pointerType;
      // A fresh gesture invalidates suppression left over from a gesture that never
      // produced a click.
      suppressClickRef.current = false;
      if (event.pointerType === 'mouse' || open) {
        return;
      }
      // The tap that opens the group must not also activate the slice under the finger.
      suppressClickRef.current = true;
      setOpenState(true, event);
    };

    const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
      if (!suppressClickRef.current) {
        return;
      }
      suppressClickRef.current = false;
      event.stopPropagation();
      event.preventDefault();
    };

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (resolvedTrigger === 'manual') {
        return;
      }
      if (resolvedTrigger === 'click') {
        setOpenState(!open, event);
        return;
      }
      // A mouse click keeps the group open (leaving the group collapses it); a tap on
      // a child both activates it and collapses the group.
      if (open && lastPointerTypeRef.current !== 'mouse') {
        setOpenState(false, event);
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (resolvedTrigger === 'manual') {
        return;
      }
      if (open) {
        if (event.key !== 'Escape') {
          return;
        }
        event.stopPropagation();
        setOpenState(false, event);
        rootRef.current?.focus();
        return;
      }
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      focusFirstItemRef.current = true;
      setOpenState(true, event);
    };

    const handleClickAway = (event: MouseEvent | TouchEvent) => {
      // ClickAwayListener reports the native event while the public contract is a
      // React synthetic event.
      setOpenState(false, event as unknown as React.SyntheticEvent);
    };

    const RootComponent = slots?.root ?? CollageFabRoot;
    const ItemComponent = slots?.item ?? CollageFabItemRoot;

    const rootSlotProps = useSlotProps({
      elementType: RootComponent,
      externalForwardedProps: other,
      externalSlotProps: slotProps?.root,
      ownerState,
      additionalProps: {
        ref: handleRootRef,
        role: 'group',
        tabIndex: !open && resolvedTrigger !== 'manual' ? 0 : -1,
        onPointerEnter: handlePointerEnter,
        onPointerLeave: handlePointerLeave,
        onPointerDown: handlePointerDown,
        onClick: handleClick,
        onClickCapture: handleClickCapture,
        onKeyDown: handleKeyDown,
      },
      className: [classes.root, className],
    });

    React.useEffect(() => {
      if (!open || !focusFirstItemRef.current) {
        return;
      }
      focusFirstItemRef.current = false;
      const wrapper = itemRefs.current[0];
      if (!wrapper) {
        return;
      }
      const target = wrapper.querySelector<HTMLElement>(FOCUSABLE_DESCENDANT_SELECTOR);
      (target ?? wrapper).focus();
    }, [open]);

    if (count === 0) {
      return null;
    }

    const group = (
      <RootComponent {...rootSlotProps}>
        {childArray.map((child, index) => (
          <CollageFabItem
            key={index}
            index={index}
            ownerState={ownerState}
            geometry={getItemGeometry(index, ownerState)}
            className={classes.item}
            component={ItemComponent}
            inert={!open && (resolvedTrigger !== 'manual' || index > 0)}
            itemRefs={itemRefs}
            slotProps={slotProps?.item}
          >
            {child}
          </CollageFabItem>
        ))}
      </RootComponent>
    );

    if (disableClickAway || resolvedTrigger === 'manual') {
      return group;
    }

    return <ClickAwayListener onClickAway={handleClickAway}>{group}</ClickAwayListener>;
  },
);
