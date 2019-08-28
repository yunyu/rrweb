/* tslint:disable no-string-literal no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { expect } from 'chai';
import { Suite } from 'mocha';
import { Replayer } from '../src';

interface IWindow extends Window {
  rrweb: {
    Replayer: typeof Replayer;
  };
}

interface ISuite extends Suite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

describe('fast forward', function(this: ISuite) {
  this.timeout(10 * 1000);

  before(async () => {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox'],
    });

    const bundlePath = path.resolve(__dirname, '../dist/rrweb.min.js');
    this.code = fs.readFileSync(bundlePath, 'utf8');
  });

  beforeEach(async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(this.code);
    this.page = page;

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await this.page.close();
  });

  after(async () => {
    await this.browser.close();
  });

  [
    '5cfd38be027439000719c3b8.json',
    '5cfdc5c5027439000719e121.json',
    '5cfde52d027439000719fe59.json',
  ].forEach(name => {
    it(name, async () => {
      const eventsStr = fs.readFileSync(
        path.resolve(__dirname, `./recordings/${name}`),
        'utf8',
      );
      const events = JSON.parse(eventsStr);
      await this.page.evaluate(`const events = ${eventsStr}`);
      const duration = await this.page.evaluate(() => {
        const { Replayer } = (window as IWindow).rrweb;
        const replayer = new Replayer(events);
        const start = performance.now();
        const lastTimestamp = events[events.length - 1].timestamp;
        replayer.play(lastTimestamp);
        return performance.now() - start;
      });
      expect(duration).to.lessThan(160);
    });
  });
});
