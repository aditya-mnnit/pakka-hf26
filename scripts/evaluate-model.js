import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analyzeWithOllama, buildPrompt, parseModelText, validateAnalysis } from '../analyze.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const splitArg = process.argv.find(arg => arg.startsWith('--split='))?.slice('--split='.length) || 'development';
if (!['development', 'holdout', 'all'].includes(splitArg)) {
  console.error('Usage: node scripts/evaluate-model.js [--split=development|holdout|all]');
  process.exit(2);
}

const cases = JSON.parse(await readFile(join(root, 'test/fixtures/evaluation-cases.json'), 'utf8'))
  .filter(testCase => splitArg === 'all' || testCase.split === splitArg);
const results = [];

function checkCase(testCase, items) {
  const failures = [];
  for (const expected of testCase.checks || []) {
    const candidates = items.filter(item => (expected.terms || []).every(term =>
      `${item.title} ${item.reason} ${item.owner} ${(item.evidence || []).map(span => span.source_quote).join(' ')}`
        .toLocaleLowerCase().includes(term.toLocaleLowerCase())));
    const match = candidates.find(item => (!expected.status || item.status === expected.status)
      && (!expected.statusNot || item.status !== expected.statusNot)
      && (!expected.type || item.type === expected.type)
      && (!expected.date || item.date === expected.date)
      && ((item.evidence || []).length >= (expected.minEvidence || 0)));
    if (!match) failures.push(`Expected item not found: ${expected.terms?.join(', ') || '(unlabelled)'}`);
  }
  if (Number.isInteger(testCase.maxConfirmedEvents)) {
    const count = items.filter(item => item.type === 'event' && item.status === 'confirmed').length;
    if (count > testCase.maxConfirmedEvents) failures.push(`Expected at most ${testCase.maxConfirmedEvents} confirmed events; got ${count}`);
  }
  if (testCase.maxEventsAtOldDate) {
    const { date, max } = testCase.maxEventsAtOldDate;
    const count = items.filter(item => item.type === 'event' && item.date === date).length;
    if (count > max) failures.push(`Expected at most ${max} event(s) on superseded date ${date}; got ${count}`);
  }
  if (testCase.maxConfirmedEventsAtDate) {
    const { date, max } = testCase.maxConfirmedEventsAtDate;
    const count = items.filter(item => item.type === 'event' && item.status === 'confirmed' && item.date === date).length;
    if (count > max) failures.push(`Expected at most ${max} confirmed event(s) on ${date}; got ${count}`);
  }
  const visibleOutput = items.map(item => `${item.title} ${item.reason} ${item.owner}`).join(' ').toLocaleLowerCase();
  for (const term of testCase.forbiddenTerms || []) {
    if (visibleOutput.includes(term.toLocaleLowerCase())) failures.push(`Output included unsupported detail: ${term}`);
  }
  return failures;
}

for (const testCase of cases) {
  const started = performance.now();
  try {
    const lines = testCase.chat.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const prompt = buildPrompt(lines, 'synthetic evaluation user', testCase.today);
    const text = await analyzeWithOllama(prompt);
    const analysis = validateAnalysis(parseModelText(text), lines);
    const failures = checkCase(testCase, analysis.items);
    results.push({
      id: testCase.id,
      split: testCase.split,
      latencyMs: Math.round(performance.now() - started),
      passed: failures.length === 0,
      failures,
      items: analysis.items,
      rejected: analysis.rejected,
    });
  } catch (error) {
    results.push({ id: testCase.id, split: testCase.split, latencyMs: Math.round(performance.now() - started), passed: false, failures: [error.message] });
    if (/Could not reach local Ollama|Ollama error/.test(error.message)) break;
  }
}

const completed = results.length;
const passed = results.filter(result => result.passed).length;
const report = {
  recordedAt: new Date().toISOString(),
  provider: 'local Ollama',
  model: process.env.OLLAMA_MODEL || 'gemma4:e2b',
  split: splitArg,
  completed,
  passed,
  failed: completed - passed,
  results,
  note: 'Synthetic cases only. This is a small behavior check, not a general accuracy estimate. Review every result before citing it.',
};
const outputDir = join(root, 'evaluation-results');
await mkdir(outputDir, { recursive: true });
const outputFile = join(outputDir, `gemma-${splitArg}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(`${passed}/${completed} ${splitArg} cases passed. Report: ${outputFile}`);
if (completed !== cases.length || passed !== completed) process.exitCode = 1;
