import * as React from 'react';
import { Box, Container, Fab, Grid, Paper, Typography } from '@mui/material';
import { Settings, BugReport, Speed, Code, Palette, Api, Terminal } from '@mui/icons-material';
import { CollageFab, type CollageFabDirection } from '../components/CollageFab';

const MOCK_TOOLS = [
  { icon: <Settings />, color: '#1976d2', name: 'Settings' },
  { icon: <BugReport />, color: '#9c27b0', name: 'Debugger' },
  { icon: <Speed />, color: '#ed6c02', name: 'Performance' },
  { icon: <Code />, color: '#2e7d32', name: 'Source' },
  { icon: <Palette />, color: '#e91e63', name: 'Theme' },
  { icon: <Api />, color: '#0288d1', name: 'Network' },
  { icon: <Terminal />, color: '#4caf50', name: 'Console' },
];

const BUTTON_MIN = 24;
const BUTTON_MAX = 56;
const GAP_MIN = 6;
const GAP_MAX = 14;
const GAP_RATIO = 0.25;
const CARD_MIN_HEIGHT = 180;
const DIRECTION_SIZE = 48;
const DIRECTION_GAP = 12;

interface RowFit {
  size: number;
  gap: number;
  extent: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Largest button diameter that keeps `count` buttons on one line inside
 * `available` px. The gap shrinks with the diameter, so a dense row on a narrow
 * card tightens up instead of spilling past the card edge.
 */
function fitRow(count: number, available: number): RowFit {
  const spans = Math.max(count - 1, 0);
  let size = BUTTON_MAX;
  let gap = GAP_MAX;
  if (available > 0) {
    for (let pass = 0; pass < 6; pass += 1) {
      size = clamp(Math.floor((available - spans * gap) / count), BUTTON_MIN, BUTTON_MAX);
      const nextGap = clamp(Math.round(size * GAP_RATIO), GAP_MIN, GAP_MAX);
      if (nextGap === gap) {
        break;
      }
      gap = nextGap;
    }
  }
  return { size, gap, extent: count * size + spans * gap };
}

function useMeasuredWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }
    const update = () => setWidth(node.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

const DEMO_CARD_HEIGHT = 328;

const CARD_SX = {
  p: 3,
  borderRadius: 4,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  background: 'linear-gradient(145deg, #232323 0%, #1a1a1a 100%)',
} as const;

function CardHeading({ title, caption }: { title: string; caption?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Typography variant="h6" fontWeight="bold" color="grey.300">
        {title}
      </Typography>
      {caption && (
        <Typography variant="caption" sx={{ color: 'grey.600', maxWidth: 100, textAlign: 'right' }}>
          {caption}
        </Typography>
      )}
    </Box>
  );
}

function CountCard({ count }: { count: number }) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const { size, gap } = fitRow(count, width);

  return (
    <Paper elevation={3} sx={{ ...CARD_SX, minHeight: CARD_MIN_HEIGHT }}>
      <CardHeading title={`${count} Button${count > 1 ? 's' : ''}`} />

      {/* Full-width stage: it is the measured box the row has to fit into, and it
          centers the stack. The bottom padding mirrors the heading so the stack
          lands on the card's centreline instead of sinking into the lower half. */}
      <Box
        ref={ref}
        sx={{
          width: '100%',
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          pb: 4,
        }}
      >
        <CollageFab size={size} gap={gap} fadeWidth={12}>
          {MOCK_TOOLS.slice(0, count).map((tool, idx) => (
            <Fab
              key={idx}
              sx={{
                bgcolor: tool.color,
                color: 'white',
                '&:hover': { bgcolor: tool.color, filter: 'brightness(1.2)' },
              }}
            >
              {tool.icon}
            </Fab>
          ))}
        </CollageFab>
      </Box>
    </Paper>
  );
}

const DIRECTION_CORNERS = [
  { direction: 'down', justify: 'flex-start', align: 'flex-start' },
  { direction: 'right', justify: 'flex-start', align: 'flex-end' },
  { direction: 'up', justify: 'flex-end', align: 'flex-end' },
  { direction: 'left', justify: 'flex-end', align: 'flex-start' },
] as const;

function DirectionCornersCard() {
  return (
    <Paper
      elevation={3}
      sx={{ ...CARD_SX, p: 1.5, width: 280, height: DEMO_CARD_HEIGHT, flexShrink: 0 }}
      data-testid="direction-card"
    >
      <CardHeading title="Direction" caption="A fan per axis" />

      <Box sx={{ position: 'relative', flexGrow: 1, mt: 1, minHeight: 0 }}>
        {DIRECTION_CORNERS.map((corner) => (
          <Box
            key={corner.direction}
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              justifyContent: corner.justify,
              alignItems: corner.align,
              pointerEvents: 'none',
            }}
          >
            <CollageFab
              direction={corner.direction}
              size={DIRECTION_SIZE}
              gap={DIRECTION_GAP}
              fadeWidth={12}
              sx={{ pointerEvents: 'auto' }}
            >
              {MOCK_TOOLS.slice(0, 2).map((tool, idx) => (
                <Fab
                  key={idx}
                  sx={{
                    bgcolor: tool.color,
                    color: 'white',
                    '&:hover': { bgcolor: tool.color, filter: 'brightness(1.2)' },
                  }}
                >
                  {tool.icon}
                </Fab>
              ))}
            </CollageFab>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function MixedStage({
  directions,
  justify,
  align,
}: {
  directions: CollageFabDirection[];
  justify: 'flex-start' | 'flex-end' | 'center';
  align: 'flex-start' | 'flex-end' | 'center';
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        justifyContent: justify,
        alignItems: align,
        pointerEvents: 'none',
      }}
    >
      <CollageFab
        directions={directions}
        size={DIRECTION_SIZE}
        gap={DIRECTION_GAP}
        fadeWidth={12}
        sx={{ pointerEvents: 'auto' }}
      >
        {MOCK_TOOLS.slice(0, directions.length).map((tool, idx) => (
          <Fab
            key={idx}
            sx={{
              bgcolor: tool.color,
              color: 'white',
              '&:hover': { bgcolor: tool.color, filter: 'brightness(1.2)' },
            }}
          >
            {tool.icon}
          </Fab>
        ))}
      </CollageFab>
    </Box>
  );
}

function MixedAxesCard() {
  return (
    <Paper elevation={3} sx={{ ...CARD_SX, p: 1.5, width: 280, height: DEMO_CARD_HEIGHT, flexShrink: 0 }}>
      <CardHeading title="Mixed axes" caption="Corners and centre" />

      <Box sx={{ position: 'relative', flexGrow: 1, mt: 1, minHeight: 0 }}>
        <MixedStage
          directions={['left', 'left', 'left', 'down']}
          justify="flex-end"
          align="flex-start"
        />
        <MixedStage
          directions={['right', 'right', 'right', 'up']}
          justify="flex-start"
          align="flex-end"
        />
        <MixedStage
          directions={['up', 'right', 'down', 'left', 'up']}
          justify="center"
          align="center"
        />
      </Box>
    </Paper>
  );
}

function ThreeSidesCard() {
  return (
    <Paper elevation={3} sx={{ ...CARD_SX, p: 1.5, width: 280, height: DEMO_CARD_HEIGHT, flexShrink: 0 }}>
      <CardHeading title="Three sides" caption="120° each" />

      <Box sx={{ position: 'relative', flexGrow: 1, mt: 1, minHeight: 0 }}>
        <MixedStage directions={['up', 'left', 'right', 'up']} justify="center" align="center" />
      </Box>
    </Paper>
  );
}

function RadialCard() {
  return (
    <Paper elevation={3} sx={{ ...CARD_SX, p: 1.5, width: 280, height: DEMO_CARD_HEIGHT, flexShrink: 0 }}>
      <CardHeading title="Radial" caption="Ring around the anchor" />

      {/* A radial group is centred on the anchor in both axes, so a centring stage
          keeps the collapsed button still while the ring grows around it. */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mt: 1,
        }}
      >
        <CollageFab spread="radial" size={DIRECTION_SIZE} gap={DIRECTION_GAP} fadeWidth={12}>
          {MOCK_TOOLS.slice(0, 6).map((tool, idx) => (
            <Fab
              key={idx}
              sx={{
                bgcolor: tool.color,
                color: 'white',
                '&:hover': { bgcolor: tool.color, filter: 'brightness(1.2)' },
              }}
            >
              {tool.icon}
            </Fab>
          ))}
        </CollageFab>
      </Box>
    </Paper>
  );
}

export function DemoPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" fontWeight="900" gutterBottom align="center" color="white">
        Perfected CollageFab
      </Typography>
      <Typography
        variant="subtitle1"
        color="text.secondary"
        align="center"
        mb={2}
        sx={{ maxWidth: 700, mx: 'auto' }}
      >
        Mathematical clipping slices overlapping circles. Simultaneous inverse translation of the
        <strong> mask position</strong> against the component&apos;s <strong>transform</strong>{' '}
        creates a flawless morphing unfold without bounds popping.
      </Typography>

      <Grid container spacing={4} justifyContent="center">
        {[1, 2, 3, 4, 5, 6].map((count) => (
          <Grid item xs={12} md={6} lg={4} key={`demo-${count}`}>
            <CountCard count={count} />
          </Grid>
        ))}
      </Grid>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 3,
          flexWrap: 'wrap',
          mt: 3,
        }}
      >
        <DirectionCornersCard />
        <MixedAxesCard />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap', mt: 3 }}>
        <ThreeSidesCard />
        <RadialCard />
      </Box>
    </Container>
  );
}
