import * as path from 'path';
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';
import { Replayer } from '../src';
import { eventWithTime, MouseInteractions } from '../src/types';

const bundlePath = path.resolve(__dirname, '../dist/rrweb.min.js');
const code = fs.readFileSync(bundlePath, 'utf8');

interface IWindow extends Window {
  rrweb: {
    Replayer: typeof Replayer;
  };
}

const _rules = [
  {
    label: 'download',
    events: [
      {
        selector: 'button',
        types: [MouseInteractions.Click, MouseInteractions.TouchStart],
        contains: '立即下载',
      },
    ],
  },
  {
    label: 'request_demo',
    events: [
      {
        selector: 'button',
        types: [MouseInteractions.Click, MouseInteractions.TouchStart],
        contains: '提交申请',
      },
    ],
  },
  {
    label: 'consulting',
    events: [
      {
        selector: 'button',
        types: [MouseInteractions.Click, MouseInteractions.TouchStart],
        contains: '提交咨询',
      },
    ],
  },
];

export async function analyze(obj: any) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  console.time(':1');

  async function getLabels(_events: eventWithTime[]) {
    const page = await browser.newPage();
    try {
      // page.on('console', msg => console.log('PAGE LOG:', msg.text()));
      // console.time(':2');
      await page.evaluate(code);
      const results: any = await page.evaluate(
        (events: eventWithTime[], rules: typeof _rules) => {
          return new Promise((resolve, reject) => {
            try {
              window.onerror = error => reject(error);
              const replayer = new (window as IWindow).rrweb.Replayer(events);
              replayer.on(
                'mouse-interaction',
                (payload: { target: any; type: any }) => {
                  rules.forEach(rule => {
                    if (!rule.events.length) {
                      return;
                    }
                    const scopeEvents = rule.events.slice(0);
                    const matchSelector = Array.from(
                      replayer.iframe.contentDocument!.querySelectorAll(
                        scopeEvents[0].selector,
                      ),
                    )
                      .filter(node => {
                        if (!scopeEvents[0].contains) {
                          return true;
                        }
                        return (node as HTMLElement).innerText.includes(
                          scopeEvents[0].contains,
                        );
                      })
                      .some(node => node === payload.target);
                    if (
                      matchSelector &&
                      scopeEvents[0].types.includes(payload.type)
                    ) {
                      rule.events.shift();
                    }
                  });
                },
              );
              const inputs: Array<{ label: string }> = [];
              const match = (selector: string, dom: HTMLElement) => {
                return Array.from(
                  replayer.iframe.contentDocument!.querySelectorAll(selector),
                ).some(node => node === dom);
              };
              replayer.on('input', ({ target }: { target: HTMLElement }) => {
                if (match('.modal-download input', target)) {
                  inputs.push({
                    label: 'try_download',
                  });
                }
                if (match('.solution-project-form input', target)) {
                  inputs.push({
                    label: 'try_request_demo',
                  });
                }
                if (match('.demo-request__content input', target)) {
                  inputs.push({
                    label: 'try_request_demo',
                  });
                }
                if (match('.modal-consult input', target)) {
                  inputs.push({
                    label: 'try_consulting',
                  });
                }
              });
              replayer.on('finish', () => {
                resolve({ inputs, rules });
              });
              replayer.play(events[events.length - 1].timestamp);
            } catch (error) {
              console.log(error.message);
              reject(error);
            }
          });
        },
        _events as any,
        _rules,
      );
      // console.timeEnd(':2');
      const { inputs, rules } = results;
      const labels = [];
      for (const rule of rules) {
        if (rule.events.length === 0) {
          labels.push(rule.label);
        }
      }
      for (const input of inputs) {
        labels.push(input.label);
      }
      await page.close();
      return labels;
    } catch (error) {
      console.log('error', error.message);
      await page.close();
      return [];
    }
  }

  const meta: Record<string, string[]> = {};

  for (const sessionId of Object.keys(obj)) {
    const labels = await getLabels(obj[sessionId]);
    if (labels!.length) {
      meta[sessionId] = Array.from(new Set(labels));
    }
  }

  console.timeEnd(':1');
  browser.close();
  return meta;
}
