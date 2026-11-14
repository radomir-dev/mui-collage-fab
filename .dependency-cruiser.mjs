export default {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'A runtime cycle means the modules involved cannot be understood in isolation.',
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
    },
    {
      name: 'no-unresolved',
      severity: 'error',
      comment: 'This import does not resolve to a file on disk.',
      from: {},
      to: { couldNotResolve: true, pathNot: '^virtual:' },
    },
    {
      name: 'no-orphans',
      severity: 'error',
      comment: 'Nothing imports this module; either use it or delete it.',
      from: { orphan: true, pathNot: ['^src/(index\\.ts|main\\.tsx)$', '\\.d\\.ts$'] },
      to: {},
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      comment: 'This package is not declared in package.json, so it may not be installed.',
      from: {},
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'], pathNot: '^virtual:' },
    },
    {
      name: 'lib-not-to-demo',
      severity: 'error',
      comment: 'The published library must not reach into demo site code.',
      from: { path: '^src/(components/|index\\.ts$)' },
      to: { path: '^src/(pages|site)/|^src/(App|main|theme)\\.tsx?$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};
