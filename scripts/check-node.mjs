import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const mise = await readFile('mise.toml', 'utf8');

const majorOf = (version) => {
  const match = version?.match(/\d+/);
  return match ? Number(match[0]) : null;
};

const supported = majorOf(pkg.engines?.node);
const types = majorOf(pkg.devDependencies?.['@types/node']);
const dev = majorOf(mise.match(/^node\s*=\s*"([^"]+)"/m)?.[1]);

const problems = [
  supported ? null : 'package.json has no engines.node floor',
  types ? null : 'package.json has no @types/node dependency',
  dev ? null : 'mise.toml has no node pin',
  supported && types && supported !== types
    ? `@types/node targets Node ${types}, but engines.node supports Node ${supported}`
    : null,
  supported && dev && supported !== dev
    ? `mise.toml pins Node ${dev}, but engines.node supports Node ${supported}`
    : null,
].filter(Boolean);

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
