import { readFileSync } from 'fs';
import { join } from 'path';
import { array, boolean, intersection, number, partial, string, type, TypeOf } from 'io-ts';
import { either } from 'fp-ts';
import { load } from 'js-yaml';
import { PathReporter } from 'io-ts/lib/PathReporter';

const configType = intersection([
  type({
    db: type({
      host: string,
      port: number,
      database: string,
      user: string,
      password: string,
      dialect: string,
    }),
  }),
  partial({
    defaultGroup: partial({
      mixin: boolean,
      keystore: boolean,
      anonymous: boolean,
    }),
    admin: array(string),
  }),
]);

const file = readFileSync(join(process.cwd(), 'config.yml')).toString();
export const config = load(file) as TypeOf<typeof configType>;

const decodeResult = configType.decode(config);
if (either.isLeft(decodeResult)) {
  console.error('config validation failed');
  console.error(PathReporter.report(decodeResult).join(', '));
}
