/**
 * Tests for GSD format adapter - round-trip and edge cases.
 * Run: npx tsx tests/test-gsd-adapter.ts
 */
import { toGsdXml, fromGsdXml, MswTask } from '../src/planning/gsd-adapter.js';
import assert from 'node:assert';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (e: any) {
    console.error(`FAIL: ${name}`);
    console.error(e.message);
    process.exitCode = 1;
  }
}

const sampleTasks: MswTask[] = [
  {
    id: '1',
    name: 'Task 1: Create adapter',
    files: ['src/planning/gsd-adapter.ts'],
    action: 'Implement the GSD format adapter',
    verify: 'npx tsc --noEmit',
    done: 'Adapter compiles and round-trips',
    type: 'auto',
  },
  {
    id: '2',
    name: 'Task 2: Review output',
    files: ['src/planning/gsd-adapter.ts', 'tests/test-gsd-adapter.ts'],
    action: 'Review the generated XML',
    verify: 'Manual review',
    done: 'Output looks correct',
    type: 'checkpoint:human-verify',
  },
];

test('toGsdXml produces valid XML structure', () => {
  const xml = toGsdXml(sampleTasks);
  assert.ok(xml.includes('<task type="auto">'), 'should have auto task');
  assert.ok(xml.includes('<task type="checkpoint:human-verify">'), 'should have checkpoint task');
  assert.ok(xml.includes('<name>Task 1: Create adapter</name>'), 'should have task name');
  assert.ok(xml.includes('<verify>npx tsc --noEmit</verify>'), 'should have verify');
});

test('toGsdXml joins files with comma-space', () => {
  const xml = toGsdXml(sampleTasks);
  assert.ok(xml.includes('src/planning/gsd-adapter.ts, tests/test-gsd-adapter.ts'));
});

test('fromGsdXml parses tasks correctly', () => {
  const xml = toGsdXml(sampleTasks);
  const parsed = fromGsdXml(xml);
  assert.strictEqual(parsed.length, 2);
  assert.strictEqual(parsed[0].name, 'Task 1: Create adapter');
  assert.strictEqual(parsed[0].type, 'auto');
  assert.deepStrictEqual(parsed[0].files, ['src/planning/gsd-adapter.ts']);
});

test('round-trip preserves data', () => {
  const xml = toGsdXml(sampleTasks);
  const parsed = fromGsdXml(xml);
  assert.strictEqual(parsed.length, sampleTasks.length);
  for (let i = 0; i < sampleTasks.length; i++) {
    assert.strictEqual(parsed[i].name, sampleTasks[i].name);
    assert.strictEqual(parsed[i].action, sampleTasks[i].action);
    assert.strictEqual(parsed[i].verify, sampleTasks[i].verify);
    assert.strictEqual(parsed[i].done, sampleTasks[i].done);
    assert.strictEqual(parsed[i].type, sampleTasks[i].type);
    assert.deepStrictEqual(parsed[i].files, sampleTasks[i].files);
  }
});

test('XML-escapes special characters', () => {
  const tasks: MswTask[] = [{
    id: '1',
    name: 'Task with <special> & "chars"',
    files: ['file.ts'],
    action: 'Use x < y && z > w',
    verify: 'check "quotes"',
    done: 'Done & dusted',
    type: 'auto',
  }];
  const xml = toGsdXml(tasks);
  assert.ok(!xml.includes('x < y'), 'should escape <');
  assert.ok(xml.includes('&amp;'), 'should escape &');

  const parsed = fromGsdXml(xml);
  assert.strictEqual(parsed[0].name, 'Task with <special> & "chars"');
  assert.strictEqual(parsed[0].action, 'Use x < y && z > w');
});

test('fromGsdXml handles decision type', () => {
  const xml = `<task type="checkpoint:decision">
  <name>Decision point</name>
  <files>none</files>
  <action>Decide direction</action>
  <verify>Team consensus</verify>
  <done>Direction chosen</done>
</task>`;
  const parsed = fromGsdXml(xml);
  assert.strictEqual(parsed[0].type, 'checkpoint:decision');
});

console.log('\nAll tests complete.');
