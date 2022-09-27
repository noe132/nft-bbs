import * as path from 'path';
import * as Alias from 'module-alias';

Alias.addAliases({
  '~': path.join(__dirname, '../..'),
});
