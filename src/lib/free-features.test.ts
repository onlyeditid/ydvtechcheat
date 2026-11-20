import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLocalUsageSummary } from './dashboard-activity';
import {
  buildLocalSystemPrompt,
  parseGeneratedPromptResponse,
} from './prompt-generator';

test('computeLocalUsageSummary aggregates requests by day and estimates tokens', () => {
  const ts1 = Date.UTC(2026, 10, 19, 10, 0, 0);
  const ts2 = Date.UTC(2026, 10, 20, 12, 0, 0);

  const summary = computeLocalUsageSummary([
    {
      id: 'c1',
      title: 'First chat',
      createdAt: ts1,
      updatedAt: ts2,
      messages: [
        { id: 'm1', role: 'user', content: '12345678', timestamp: ts1 },
        { id: 'm2', role: 'assistant', content: '12345678', timestamp: ts1 + 100 },
        { id: 'm3', role: 'user', content: '1234', timestamp: ts2 },
      ],
    },
  ]);

  assert.equal(summary.totalConversations, 1);
  assert.equal(summary.totalMessages, 3);
  assert.equal(summary.estimatedTokens, 5);
  assert.deepEqual(summary.data, [
    { date: '2026-11-19', requests: 1 },
    { date: '2026-11-20', requests: 1 },
  ]);
});

test('buildLocalSystemPrompt builds structured prompt and name from description', () => {
  const result = buildLocalSystemPrompt('I want an AI that helps with TypeScript code reviews');
  assert.equal(result.prompt_name, 'Helps With TypeScript Code');
  assert.ok(result.system_prompt.includes('TypeScript code reviews'));
});

test('parseGeneratedPromptResponse parses valid JSON and falls back cleanly on non-JSON', () => {
  const jsonParsed = parseGeneratedPromptResponse(
    '```json\n{"prompt_name":"SQL Tutor","system_prompt":"Teach SQL step by step."}\n```',
    'SQL helper'
  );
  assert.equal(jsonParsed.prompt_name, 'SQL Tutor');
  assert.equal(jsonParsed.system_prompt, 'Teach SQL step by step.');

  const textParsed = parseGeneratedPromptResponse(
    'You are an experienced technical interviewer giving concise feedback.',
    'technical interviewer'
  );
  assert.equal(textParsed.prompt_name, 'Technical Interviewer');
  assert.equal(
    textParsed.system_prompt,
    'You are an experienced technical interviewer giving concise feedback.'
  );
});
