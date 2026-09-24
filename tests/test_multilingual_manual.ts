import { LanguageDetector } from '../src/voice/multilingual/index.js';

const detector = new LanguageDetector();

const samples = [
  'Hello HṚṢĪKEŚA, I am ready.',
  'हृषीकेश, नमस्ते, आप कैसे हैं?',
  'हृषीकेश, आज आपण काय करू शकतो?',
  'हृषीकेशः सन्नद्धः अस्ति, ॐ नमः शिवाय।',
  'Rishi, आज आपण SAHIKARA project वर काम करूया.',
  'मराठीत बोला',
  'speak slower',
];

for (const sample of samples) {
  const result = detector.detect(sample);
  console.log('---');
  console.log('INPUT   :', sample);
  console.log('LANG    :', result.name, `(${result.code})`, 'Conf:', result.confidence);
  console.log('SCRIPT  :', result.script, 'CodeSwitched:', result.isCodeSwitched);
  if (result.detectedCommand) {
    console.log('COMMAND :', result.detectedCommand, 'Target:', result.targetLanguageOverride);
  }
}
