// Aplica la configuración a los environments de Angular.
// Fuentes (de mayor a menor prioridad): variables de entorno del proceso
// (Vercel, Netlify, CI) > archivo `.env` (local) > valores del repo (mock).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ENV_FILES = ['src/enviroments/enviroment.ts', 'src/enviroments/enviroment.prod.ts'];
const KEYS = ['API_BACKEND_URL', 'API_PRICING_URL', 'USE_MOCK', 'USE_MOCK_AUTH'];

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

const hasValue = (value) => value !== undefined && value !== '';
const fromProcess = (key) => (hasValue(process.env[key]) ? process.env[key] : undefined);

const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
const env = Object.fromEntries(
  KEYS.map((key) => [key, fromProcess(key) ?? (hasValue(fileEnv[key]) ? fileEnv[key] : undefined)]),
);

const sources = KEYS.filter((key) => hasValue(env[key])).map(
  (key) => `${key}=${env[key]}${fromProcess(key) !== undefined ? ' (env)' : ' (.env)'}`,
);

if (sources.length === 0) {
  console.log('[set-env] Sin .env ni variables de entorno: se usan los valores del repo (dev: mock, prod: backend real).');
  process.exit(0);
}

const missing = ['USE_MOCK', 'USE_MOCK_AUTH', 'API_PRICING_URL'].filter((key) => !hasValue(env[key]));
if (hasValue(env.API_BACKEND_URL) && missing.length > 0) {
  console.warn(
    `[set-env] AVISO: falta(n) ${missing.join(', ')} junto a API_BACKEND_URL. ` +
      'Se conservan los valores del archivo (producción: useMock=false). ' +
      'Si el panel define USE_MOCK como vacío o "true", la app seguirá en maqueta: decláralo como "false".',
  );
}

const useMock = String(env.USE_MOCK ?? '').toLowerCase() === 'true';
if (!useMock && String(env.USE_MOCK ?? '') !== '' && !hasValue(env.API_BACKEND_URL)) {
  console.error(
    '[set-env] USE_MOCK=false pero falta API_BACKEND_URL: define la variable de entorno ' +
      '(panel de Vercel/Netlify) o el archivo .env. Build cancelado.',
  );
  process.exit(1);
}

const trimUrl = (value) => value.replace(/\/+$/, '');
const settings = [
  ['apiBackendUrl', env.API_BACKEND_URL, (v) => `'${trimUrl(v)}'`],
  ['apiPricingUrl', env.API_PRICING_URL, (v) => `'${trimUrl(v)}'`],
  ['useMock', env.USE_MOCK, (v) => String(v.toLowerCase() === 'true')],
  ['useMockAuth', env.USE_MOCK_AUTH, (v) => String(v.toLowerCase() === 'true')],
];

// Ancla a la línea de la propiedad (`   useMock: ...`) para no tocar menciones
// dentro de comentarios: en enviroment.prod.ts la doc menciona `useMock: false`
// antes del campo real y un regex libre reescribía el comentario y dejaba el
// campo en true.
const propertyLine = (key) => new RegExp(`^([ \\t]*${key}:\\s*)([^,\\n]+)`, 'm');

const failures = [];

for (const file of ENV_FILES) {
  let source = readFileSync(file, 'utf8');
  for (const [key, value, format] of settings) {
    if (value === undefined || value === '') continue;
    const pattern = propertyLine(key);
    const match = source.match(pattern);
    if (!match) {
      failures.push(`${file}: no existe la propiedad "${key}"`);
      continue;
    }
    const expected = format(value);
    source = source.replace(pattern, (_line, prefix) => prefix + expected);
    const applied = source.match(pattern)?.[2]?.trim();
    if (applied !== expected) {
      failures.push(`${file}: "${key}" quedó en ${applied} y se esperaba ${expected}`);
    }
  }
  writeFileSync(file, source);
}

if (failures.length > 0) {
  console.error('[set-env] Configuración no aplicada:\n  - ' + failures.join('\n  - '));
  process.exit(1);
}

console.log('[set-env] aplicado a', ENV_FILES.join(', '));
console.log('[set-env]', sources.join(' | '));
