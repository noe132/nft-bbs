import { readFileSync } from 'fs';
import { join } from 'path';
import { array, boolean, partial, string, TypeOf } from 'io-ts';
import { either } from 'fp-ts';
import { load } from 'js-yaml';
import { PathReporter } from 'io-ts/lib/PathReporter';

const configType = partial({
  defaultGroup: partial({
    mixin: boolean,
    keystore: boolean,
    anonymous: boolean,
    metamask: boolean,
  }),
  admin: array(string),
  joinBySeedUrl: boolean,
});

type Config = TypeOf<typeof configType>;

const loadConfig = (): Config => {
  let file = '';
  try {
    const fileBuffer = readFileSync(join(process.cwd(), 'config.yml'));
    file = fileBuffer.toString();
  } catch (e) {
    return {};
  }
  const data = load(file) as Config;
  const decodeResult = configType.decode(data);
  if (either.isLeft(decodeResult)) {
    console.error('config validation failed');
    console.error(PathReporter.report(decodeResult).join(', '));
    process.exit(1);
  }
  return data;
};

export const config = loadConfig();
