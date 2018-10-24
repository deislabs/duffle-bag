import * as sysfs from 'fs';
import { promisify } from 'util';

export const fs = {
  // TODO: ES5 kicks up a fuss if we do this the easy way - but ES6 causes component
  // mount failures.  Goal is to move to ES6 (as this also unblocks iterators) but
  // that's not the focus right now.
  // copyFile: promisify(sysfs.copyFile),
  // exists: promisify(sysfs.exists),
  // mkdir: promisify(sysfs.mkdir),
  // readFile: promisify(sysfs.readFile),
  writeFile: promisify((path: string, data: any, options: any) => sysfs.writeFile(path, data, options)),
};
