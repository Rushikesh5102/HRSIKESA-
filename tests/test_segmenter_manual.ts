import { NaturalTextSegmenter } from '../src/voice/streaming/index.js';

const segmenter = new NaturalTextSegmenter();
const streamTokens = [
  'Yes, ', 'I can ', 'help with ', 'that. ',
  'We are running ', 'version 0.2.0 ', 'of HṚṢĪKEŚA, ',
  'which uses Dr. Smith\'s ', 'principles. ',
  'Next, ', 'Gāṇḍīva will deploy ', 'the cluster ', 'and verify health.'
];

console.log('--- STREAMING TOKENS INGESTION ---');
for (const token of streamTokens) {
  const chunks = segmenter.push(token);
  if (chunks.length > 0) {
    console.log('EMITTED CHUNK:', chunks);
  }
}
const finalFlush = segmenter.flush();
if (finalFlush.length > 0) {
  console.log('FINAL FLUSH  :', finalFlush);
}
