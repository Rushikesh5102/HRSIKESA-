import { ModelRegistry } from '../dist/models/registry/model.registry.js';
import { ModelRouter } from '../dist/models/router/model.router.js';
import { OllamaProvider } from '../dist/models/providers/ollama.provider.js';

async function main() {
  const reg = new ModelRegistry();
  const provider = new OllamaProvider({ host: 'http://127.0.0.1:11434' });
  await reg.registerProvider(provider);
  const router = new ModelRouter(reg);

  const testCases = [
    { prompt: 'What is 12 + 19?', expected: 'llama3.2:3b' },
    { prompt: 'Write a TypeScript function to reverse a string', expected: 'llama3.2:3b' },
    { prompt: 'Give me a 5-step architectural plan for database migration', expected: 'qwen2.5:7b' },
  ];

  for (const tc of testCases) {
    const dec = router.routeAdvanced({ prompt: tc.prompt });
    console.log(`Prompt: "${tc.prompt}" -> Model: ${dec.modelId}, Tier: ${dec.modelTier}`);
  }
}

main().catch(console.error);
