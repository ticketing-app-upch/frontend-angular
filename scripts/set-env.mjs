// Aplica el archivo `.env` (si existe) a los environments de Angular.
// Sin `.env` no cambia nada y el proyecto sigue en modo mock.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ENV_FILES = ['src/enviroments/enviroment.ts', 'src/enviroments/enviroment.prod.ts'];

const parseEnv = (text) =>
  Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const at = line.indexOf('=');
        return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^['"]|['"]$/g, '')];
      }),
  );

if (!existsSync('.env')) {
  console.log('[set-env] No hay .env: se usan los valores del repo (mock).');
  process.exit(0);
}

const env = parseEnv(readFileSync('.env', 'utf8'));
const trimUrl = (value) => value.replace(/\/+$/, '');
const settings = [
  ['apiBackendUrl', env.API_BACKEND_URL, (v) => `'${trimUrl(v)}'`],
  ['apiPricingUrl', env.API_PRICING_URL, (v) => `'${trimUrl(v)}'`],
  ['useMock', env.USE_MOCK, (v) => String(v.toLowerCase() === 'true')],
  ['useMockAuth', env.USE_MOCK_AUTH, (v) => String(v.toLowerCase() === 'true')],
];

for (const file of ENV_FILES) {
  let source = readFileSync(file, 'utf8');
  for (const [key, value, format] of settings) {
    if (value === undefined || value === '') continue;
    source = source.replace(new RegExp(`(\\b${key}:\\s*)[^,\\n]+`), `$1${format(value)}`);
  }
  writeFileSync(file, source);
}
console.log('[set-env] .env aplicado a', ENV_FILES.join(', '));
