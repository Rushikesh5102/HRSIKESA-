/**
 * HṚṢĪKEŚA (हृषीकेश) — Developer Interactive CLI
 */

import readline from 'node:readline';
import { HrisekesaKernel } from '../runtime/kernel.js';

export async function runCli(): Promise<void> {
  const kernel = new HrisekesaKernel({
    HRISEKESA_PORT: '4201', // Use alternative port to avoid conflict if dev server is running
    HRISEKESA_LOG_LEVEL: 'warn'
  });

  await kernel.start();
  const identity = kernel.identity.getSystemIdentity();
  const owner = kernel.identity.getOwnerIdentity();

  let activeSessionId: string | undefined = undefined;

  console.log(`\n================================================================`);
  console.log(` ${identity.name} (${identity.sanskrit}) Developer Shell`);
  console.log(` Master: ${owner.fullName}`);
  console.log(` Commands: status, models, chat <message>, ask <prompt>, voice <status|test|speak|turn>, new, exit`);
  console.log(`================================================================\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'HṚṢĪKEŚA> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input === 'exit' || input === 'quit') {
      console.log('Stopping HṚṢĪKEŚA runtime...');
      await kernel.shutdown('CLI exit');
      rl.close();
      process.exit(0);
    } else if (input === 'new' || input === 'reset') {
      activeSessionId = undefined;
      console.log('Conversation session reset. Starting fresh context.\n');
    } else if (input === 'status') {
      const snap = kernel.lifecycle.getSnapshot();
      const hw = kernel.hardware.getProfile();
      console.log('\n--- SYSTEM STATUS ---');
      console.log(`State: ${snap.state}`);
      console.log(`Uptime: ${snap.uptimeSeconds}s`);
      console.log(`Hardware: ${hw.cpu.model} (${hw.cpu.logicalProcessors} threads) | RAM: ${hw.memory.freeGb}/${hw.memory.totalGb} GB`);
      console.log(`Active Session: ${activeSessionId || 'None'}`);
      console.log(`Voice Subsystem: STT [${kernel.stt.name}] | TTS [${kernel.tts.name}]`);
      console.log(`Degradation: ${snap.degradationReason || 'None (Normal Operation)'}\n`);
    } else if (input.startsWith('voice ')) {
      const subCmd = input.slice(6).trim();
      if (subCmd === 'status') {
        console.log('\n--- VOICE SUBSYSTEM STATUS ---');
        console.log(`STT Engine: ${kernel.stt.name} (ID: ${kernel.stt.id})`);
        console.log(`TTS Engine: ${kernel.tts.name} (ID: ${kernel.tts.id})`);
        console.log(`Microphone Recorder: ${kernel.audioRecorder.isRecording ? 'RECORDING' : 'IDLE'}`);
        console.log(`Speaker Player: ${kernel.audioPlayer.isPlaying ? 'PLAYING' : 'IDLE'}\n`);
      } else if (subCmd === 'test') {
        console.log('\nTesting TTS synthesis and audio playback...');
        try {
          await kernel.tts.speak('Greetings Master Rushikesh. HṚṢĪKEŚA voice subsystem is fully operational.');
          console.log('TTS test audio played successfully.\n');
        } catch (err) {
          console.error('Voice test failed:', err);
        }
      } else if (subCmd.startsWith('speak ')) {
        const textToSpeak = subCmd.slice(6).trim();
        if (!textToSpeak) {
          console.log('Error: Text to speak cannot be empty.');
        } else {
          console.log(`\nSpeaking: "${textToSpeak}"...`);
          try {
            await kernel.tts.speak(textToSpeak);
            console.log('Speech playback completed.\n');
          } catch (err) {
            console.error('TTS speak failed:', err);
          }
        }
      } else if (subCmd === 'turn' || subCmd === 'start') {
        console.log('\n[Voice Push-to-Talk] Recording started. Speak into microphone. Type "voice stop" to finish utterance...');
        try {
          await kernel.audioRecorder.startRecording();
        } catch (err) {
          console.error('Failed to start recording:', err);
        }
      } else if (subCmd === 'stop') {
        if (!kernel.audioRecorder.isRecording) {
          console.log('No voice recording is currently active.');
        } else {
          console.log('Stopping recording and processing voice interaction...');
          try {
            const recResult = await kernel.audioRecorder.stopRecording();
            console.log(`Recording captured: ${recResult.durationMs}ms (${recResult.audioFilePath})`);
            console.log('Transcribing speech...');
            const voiceResult = await kernel.voicePipeline.processAudio(recResult.audioFilePath, activeSessionId);
            activeSessionId = voiceResult.sessionId;
            console.log(`\nUser (Voice): "${voiceResult.transcription.text}" (STT: ${voiceResult.latencies.sttMs}ms)`);
            console.log(`HṚṢĪKEŚA: "${voiceResult.responseText}" (LLM: ${voiceResult.latencies.conversationMs}ms)`);
            if (voiceResult.responseText) {
              console.log('Playing synthesized response...');
              await kernel.tts.speak(voiceResult.responseText);
            }
            console.log(`Total Interaction Latency: ${voiceResult.totalDurationMs}ms\n`);
          } catch (err) {
            console.error('Voice turn processing failed:', err);
          }
        }
      } else {
        console.log(`Unknown voice command: "${subCmd}". Available: voice status, voice test, voice speak <text>, voice start, voice stop`);
      }
    } else if (input === 'models') {
      const records = kernel.registry.getAllRecords();
      console.log('\n--- REGISTERED PROVIDERS & MODELS ---');
      for (const rec of records) {
        console.log(`Provider: ${rec.provider.displayName} [${rec.provider.id}]`);
        console.log(`  Health: ${rec.health.status} (${rec.health.message})`);
        console.log(`  Models (${rec.models.length}):`);
        for (const m of rec.models) {
          console.log(`    - ${m.id} (${m.displayName}) | Priority: ${m.priority}`);
        }
      }
      console.log('');
    } else if (input.startsWith('chat ')) {
      const message = input.slice(5).trim();
      if (!message) {
        console.log('Error: Message cannot be empty.');
      } else {
        console.log(`\nProcessing chat: "${message}"...`);
        try {
          const res = await kernel.conversation.sendMessage(message, activeSessionId);
          activeSessionId = res.sessionId;
          console.log(`\nHṚṢĪKEŚA [${res.provider}:${res.model}] (${res.durationMs}ms):`);
          console.log(res.response);
          console.log('');
        } catch (err) {
          console.error(`Chat failed: ${err instanceof Error ? err.message : String(err)}\n`);
        }
      }
    } else if (input.startsWith('ask ')) {
      const prompt = input.slice(4).trim();
      if (!prompt) {
        console.log('Error: Prompt cannot be empty.');
      } else {
        console.log(`\nRouting prompt: "${prompt}"...`);
        try {
          const res = await kernel.router.routeAndExecute({ prompt });
          console.log(`\nResponse from [${res.providerId}:${res.modelId}] (${res.durationMs}ms):`);
          console.log(res.text);
          console.log('');
        } catch (err) {
          console.error(`Execution failed: ${err instanceof Error ? err.message : String(err)}\n`);
        }
      }
    } else {
      console.log(`Unknown command: "${input}". Available commands: status, models, chat <message>, ask <prompt>, new, exit`);
    }

    rl.prompt();
  });
}

const isMain = process.argv[1] && process.argv[1].endsWith('cli.ts');
if (isMain) {
  runCli().catch((err) => {
    console.error('CLI encountered fatal error:', err);
    process.exit(1);
  });
}
