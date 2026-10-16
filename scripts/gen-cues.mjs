// Generates Pip's 5 cached voice cues into public/audio with ElevenLabs (run once; files are committed).
// Usage: npm run cues   (needs ELEVENLABS_API_KEY; optional ELEVENLABS_VOICE_ID, else first voice on the account)
import { mkdir, writeFile } from 'node:fs/promises';
// Load only the clients this script needs; the SDK root eagerly loads every resource.
import { TextToSpeechClient } from '@elevenlabs/elevenlabs-js/api/resources/textToSpeech/client/Client.js';
import { VoicesClient } from '@elevenlabs/elevenlabs-js/api/resources/voices/client/Client.js';

const CUES = {
  greeting: 'Hi! I’m Pip. Tell me what’s going on in this room.',
  thinking: 'Let me check what happened here before.',
  solved: 'Yay, that did it!',
  escalating: 'Okay, let’s get this reported. I’ll need your OK first.',
  safety: 'Please stop and get staff right away.',
};

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('ELEVENLABS_API_KEY not set');
  process.exit(1);
}
const options = { apiKey, timeoutInSeconds: 15, maxRetries: 0 };
const tts = new TextToSpeechClient(options);
const voicesClient = new VoicesClient(options);

try {
let voiceId = process.env.ELEVENLABS_VOICE_ID;
if (!voiceId) {
  const { voices } = await voicesClient.search({ pageSize: 10 }, { abortSignal: AbortSignal.timeout(15000) });
  if (!voices.length) throw new Error('No voices on this ElevenLabs account; set ELEVENLABS_VOICE_ID');
  voiceId = voices[0].voiceId;
  console.log(`Using voice ${voices[0].name} (${voiceId}) — set ELEVENLABS_VOICE_ID to pin a different one`);
}

await mkdir('public/audio', { recursive: true });
const manifest = { voiceId, generatedAt: new Date().toISOString(), cues: {} };
for (const [name, text] of Object.entries(CUES)) {
  const stream = await tts.convert(voiceId, { text, modelId: 'eleven_multilingual_v2', outputFormat: 'mp3_44100_128' }, { abortSignal: AbortSignal.timeout(15000) });
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  await writeFile(`public/audio/${name}.mp3`, buf);
  manifest.cues[name] = { text, file: `/audio/${name}.mp3`, bytes: buf.length };
  console.log(`✓ ${name}.mp3 (${buf.length} bytes)`);
}
await writeFile('public/audio/manifest.json', JSON.stringify(manifest, null, 2));
} catch (error) {
  const detail = error.body?.detail;
  console.error(`Voice generation failed: ${detail?.message ?? error.message ?? 'unknown error'}`);
  if (detail?.status === 'missing_permissions' || detail?.code === 'unauthorized') {
    console.error('Enable Text to Speech access on the ElevenLabs API key, then rerun npm run cues.');
  }
  process.exitCode = 1;
}
