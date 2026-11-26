import { Fab } from '@mui/material';
import { BugReport, Palette, Settings, Speed, Terminal } from '@mui/icons-material';
import { CollageFab } from '../../components/CollageFab';

export function RadialUsage() {
  return (
    <CollageFab spread="radial" trigger="click" gap={14} radialStart={90}>
      <Fab color="primary" aria-label="settings">
        <Settings />
      </Fab>
      <Fab color="secondary" aria-label="debug">
        <BugReport />
      </Fab>
      <Fab color="success" aria-label="speed">
        <Speed />
      </Fab>
      <Fab color="warning" aria-label="theme">
        <Palette />
      </Fab>
      <Fab color="info" aria-label="console">
        <Terminal />
      </Fab>
    </CollageFab>
  );
}
