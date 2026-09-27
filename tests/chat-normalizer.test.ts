import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ChatNormalizer } from '../src/conversation/chat.normalizer.js';

describe('INT-002: Chat Input Normalizer', () => {
  test('1. Normalizes simple greeting "hello"', () => {
    const res = ChatNormalizer.normalize('hello');
    assert.equal(res.originalMessage, 'hello');
    assert.equal(res.classificationText, 'hello');
    assert.equal(res.cleanedPrompt, 'hello');
    assert.equal(res.languagePreference, undefined);
  });

  test('2. Normalizes punctuation: "Hello!", "Hi???", "hey..."', () => {
    assert.equal(ChatNormalizer.normalize('Hello!').classificationText, 'hello');
    assert.equal(ChatNormalizer.normalize('Hi???').classificationText, 'hi');
    assert.equal(ChatNormalizer.normalize('hey...').classificationText, 'hey');
    assert.equal(ChatNormalizer.normalize('  "Namaste!"  ').classificationText, 'namaste');
  });

  test('3. Strips language preference suffix without altering originalMessage', () => {
    const raw = 'hello\n\n[Language Preference: Respond in clear, articulate Indian English.]';
    const res = ChatNormalizer.normalize(raw);

    assert.equal(res.originalMessage, raw);
    assert.equal(res.classificationText, 'hello');
    assert.equal(res.cleanedPrompt, 'hello');
    assert.equal(res.languagePreference, 'Respond in clear, articulate Indian English.');
  });

  test('4. Strips Hindi/Devanagari language preference suffix', () => {
    const raw = 'namaste\n\n[Language Preference: उत्तर शुद्ध और सरल हिन्दी (Devanagari script) में दीजिए।]';
    const res = ChatNormalizer.normalize(raw);

    assert.equal(res.originalMessage, raw);
    assert.equal(res.classificationText, 'namaste');
    assert.equal(res.cleanedPrompt, 'namaste');
    assert.ok(res.languagePreference?.includes('हिन्दी'));
  });

  test('5. Strips client metadata tags and extracts them', () => {
    const raw = '[Client: Web-Control-Center] [Session: test-123] who are you?';
    const res = ChatNormalizer.normalize(raw);

    assert.equal(res.originalMessage, raw);
    assert.equal(res.classificationText, 'who are you');
    assert.equal(res.cleanedPrompt, 'who are you?');
    assert.equal(res.metadata['Client'], 'Web-Control-Center');
    assert.equal(res.metadata['Session'], 'test-123');
  });

  test('6. Normalizes repeated internal whitespace and newlines', () => {
    const raw = '  what   is    \n\n\n\n  2+2?   ';
    const res = ChatNormalizer.normalize(raw);

    assert.equal(res.classificationText, 'what is 2 2');
    assert.equal(res.cleanedPrompt, 'what is \n\n 2+2?');
  });

  test('7. Strips natural language suffix: "hello, please reply in English"', () => {
    const raw = 'hello, please reply in English';
    const res = ChatNormalizer.normalize(raw);

    assert.equal(res.originalMessage, raw);
    assert.equal(res.classificationText, 'hello');
    assert.equal(res.cleanedPrompt, 'hello');
    assert.equal(res.languagePreference, 'English');
  });

  test('8. Strips parenthesized natural language instruction: "hi (reply in clear Hindi)"', () => {
    const raw = 'hi (reply in clear Hindi)';
    const res = ChatNormalizer.normalize(raw);

    assert.equal(res.originalMessage, raw);
    assert.equal(res.classificationText, 'hi');
    assert.equal(res.cleanedPrompt, 'hi');
    assert.equal(res.languagePreference, 'clear Hindi');
  });
});
