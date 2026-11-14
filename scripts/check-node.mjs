import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const mise = await readFile('mise.toml', 'utf8');

const majorOf = (version) => {
  const match = version?.match(/\d+/);
  return match ? Number(match[0]) : null;
};

const floor = majorOf(pkg.engines?.node);
const dev = majorOf(pkg.devEngines?.runtime?.version);
const miseMajor = majorOf(mise.match(/^node\s*=\s*"([^"]+)"/m)?.[1]);
const types = majorOf(pkg.devDependencies?.['@types/node']);

const problems = [
  floor ? null : 'package.json has no engines.node floor',
  dev ? null : 'package.json has no devEngines.runtime pin',
  miseMajor ? null : 'mise.toml has no node pin',
  types ? null : 'package.json has no @types/node dependency',
  dev && types && dev !== types
    ? `@types/node targets Node ${types}, but devEngines requires Node ${dev}`
    : null,
  dev && miseMajor && dev !== miseMajor
    ? `mise.toml pins Node ${miseMajor}, but devEngines requires Node ${dev}`
    : null,
  floor && dev && floor > dev
    ? `engines.node supports Node ${floor}, newer than the Node ${dev} the repo develops on`
    : null,
].filter(Boolean);

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
