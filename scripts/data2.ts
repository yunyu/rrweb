import * as path from 'path';
import * as fs from 'fs';

const dir = path.resolve(__dirname, '../../project-r');
const output = path.resolve(__dirname, '../../../new-data/project-r');

function strip(num: number, precision = 12) {
  return +parseFloat(num.toPrecision(precision));
}

function toNumber(str: string) {
  const [n1, n2] = str.replace('.json', '').split('-');
  return parseInt(n1, 10) + (n2 ? strip(0.001 * parseInt(n2, 10)) : 0);
}

const files = fs
  .readdirSync(dir)
  .filter(name => path.extname(name) === '.json')
  .sort((a, b) => {
    return toNumber(a) - toNumber(b);
  });

function omitLastSession(arr: any[]) {
  let p1: any[] = [];
  let p2: any[] = [];
  let s = arr[0].sessionId;
  for (const event of arr) {
    if (s !== event.sessionId) {
      p1 = p1.concat(p2);
      p2 = [];
      s = event.sessionId;
    }
    p2.push(event);
  }
  return [p1, p2];
}

const threshold = 20_000;
let count = 0;
const write = (arena: any[]) => {
  console.log(arena.length);
  fs.writeFileSync(
    path.resolve(output, `${count++}.json`),
    JSON.stringify(arena),
  );
};

(async () => {
  let arena: any[] = [];
  let lastP2 = [];
  for (const file of files) {
    console.log(file);
    const content = fs.readFileSync(path.resolve(dir, file), 'utf8');
    const data = lastP2.concat(JSON.parse(content));
    const [p1, p2] = omitLastSession(data);
    if (arena.length + p1.length >= threshold) {
      write(arena);
      arena = [];
    }
    arena = arena.concat(p1);
    lastP2 = p2;
  }
  write(arena);
  console.log('head', lastP2.length);
  fs.writeFileSync(path.resolve(output, 'head.json'), JSON.stringify(lastP2));
})();
