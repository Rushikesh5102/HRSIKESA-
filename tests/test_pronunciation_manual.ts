import { PronunciationNormalizer } from '../src/voice/pronunciation/index.js';

const normalizer = new PronunciationNormalizer();
const text = 'Welcome to HṚṢĪKEŚA with Gāṇḍīva and Mṛtyu.';

const piperFormatted = normalizer.normalize(text, { targetFormat: 'piper-phonetic' });
const sapiFormatted = normalizer.normalize(text, { targetFormat: 'sapi-ssml' });
const plainFormatted = normalizer.normalize(text, { targetFormat: 'plain-phonetic' });

console.log('ORIGINAL:', text);
console.log('PIPER   :', piperFormatted);
console.log('SAPI    :', sapiFormatted);
console.log('PLAIN   :', plainFormatted);
