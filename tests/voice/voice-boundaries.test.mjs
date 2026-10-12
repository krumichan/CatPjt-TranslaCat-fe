import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { VoicePcmFrameEncoder } from '../../src/features/voice/audio/voicePcm.ts';
import { prepareVoiceMedia } from '../../src/features/voice/audio/voiceMedia.ts';
import { startVoiceAudioCapture } from '../../src/features/voice/audio/voiceAudioCapture.ts';
import { VoiceChannelSocket } from '../../src/features/voice/stream/VoiceChannelSocket.ts';
import { voiceLiveReducer, INITIAL_VOICE_LIVE_STATE } from '../../src/features/voice/session/voiceLiveReducer.ts';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const setMedia = mediaDevices => Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices } });

test('PCM: 16/44.1/48kHz input produces ten 3200-byte mono frames per second', () => {
  // 준비 / 실행 / 검증: arbitrary worklet boundaries preserve exact output duration.
  for (const rate of [16000, 44100, 48000]) {
    const encoder = new VoicePcmFrameEncoder();
    const frames = [];
    for (let offset = 0; offset < rate; offset += 128) {
      frames.push(...encoder.push(new Float32Array(Math.min(128, rate - offset)).fill(0.25), rate));
    }
    assert.equal(frames.length, 10);
    assert.ok(frames.every(frame => frame.byteLength === 3200));
  }
});

test('PCM: digital silence stays zero while being forwarded for server VAD', () => {
  const frames = new VoicePcmFrameEncoder().push(new Float32Array(16000), 16000);
  assert.equal(frames.length, 10);
  assert.ok(frames.every(frame => new Int16Array(frame).every(value => value === 0)));
});

test('WORKLET: right-only stereo speech must survive mono capture', () => {
  // 준비: YouTube/browser tab stereo with speech only on the right.
  let Processor;
  const sandbox = {
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: data => this.messages.push(data) }; this.messages = []; } },
    registerProcessor: (_name, implementation) => { Processor = implementation; },
  };
  vm.runInNewContext(readFileSync(new URL('../../public/workers/audio-processor.js', import.meta.url), 'utf8'), sandbox);
  const processor = new Processor();

  // 실행 / 검증: downmix should contain the right channel rather than zero.
  processor.process([[new Float32Array(128), new Float32Array(128).fill(0.5)]]);
  assert.ok(processor.messages[0].some(value => value !== 0), 'all right-channel speech was discarded');
});

test('MEDIA: selecting a display source without audio rejects and stops tracks', async () => {
  let stops = 0;
  setMedia({ getUserMedia: async () => {}, getDisplayMedia: async () => ({
    getAudioTracks: () => [], getTracks: () => [{ stop() { stops += 1; } }],
  }) });
  await assert.rejects(prepareVoiceMedia('MEDIA'), error => error.code === 'DISPLAY_AUDIO_REQUIRED');
  assert.equal(stops, 1);
});

test('MEETING: microphone denial releases the acquired shared audio', async () => {
  let stops = 0;
  setMedia({ getUserMedia: async () => { throw new Error('denied'); }, getDisplayMedia: async () => ({
    getAudioTracks: () => [{}], getTracks: () => [{ stop() { stops += 1; } }],
  }) });
  await assert.rejects(prepareVoiceMedia('MEETING'), error => error.code === 'MICROPHONE_PERMISSION');
  assert.equal(stops, 1);
});

test('REDUCER: NO_SPEECH clears the partial without creating a segment', () => {
  const partial = voiceLiveReducer(INITIAL_VOICE_LIVE_STATE, { type: 'EVENT', event: { type: 'TRANSCRIPT_PARTIAL', channel: 'SELF', sourceText: 'noise' } });
  const result = voiceLiveReducer(partial, { type: 'EVENT', event: { type: 'NO_SPEECH', channel: 'SELF' } });
  assert.equal(result.partials.SELF, '');
  assert.equal(result.segments.length, 0);
});

class FakeWebSocket {
  static OPEN = 1; static CLOSING = 2; static sockets = [];
  readyState = 1; bufferedAmount = 0; sent = [];
  constructor(url) { this.url = url; FakeWebSocket.sockets.push(this); }
  send(frame) { this.sent.push(frame); }
  close() { this.readyState = 3; this.onclose?.(); }
  emit(event) { this.onmessage?.({ data: JSON.stringify(event) }); }
}

function createSocket(ticketProvider = async () => 'test-ticket') {
  globalThis.WebSocket = FakeWebSocket;
  const states = [];
  const events = [];
  const socket = new VoiceChannelSocket({ sessionId: 'audit', channel: 'REMOTE', ticketProvider, onEvent: event => events.push(event), onStateChange: state => states.push(state) });
  return { socket, states, events };
}

test('SOCKET: server BACKPRESSURE must recover after retryAfterMs', async () => {
  const { socket, states } = createSocket();
  const pending = socket.connect();
  await delay(0);
  const ws = FakeWebSocket.sockets.at(-1);
  ws.emit({ type: 'STREAM_READY', sessionId: 'audit', channel: 'REMOTE' });
  await pending;
  ws.emit({ type: 'BACKPRESSURE', sessionId: 'audit', channel: 'REMOTE', retryAfterMs: 5, bufferedAudioMs: 100 });
  await delay(40);
  const state = states.at(-1);
  socket.closeLocal();
  assert.equal(state, 'STREAMING', 'server backpressure leaves capture paused indefinitely');
});

test('SOCKET: closing while ticket request is pending must not open a new socket', async () => {
  let resolveTicket;
  const { socket } = createSocket(() => new Promise(resolve => { resolveTicket = resolve; }));
  const count = FakeWebSocket.sockets.length;
  const pending = socket.connect();
  socket.closeLocal();
  const cancelled = assert.rejects(pending, { name: 'AbortError' });
  resolveTicket('late-ticket');
  await delay(0);
  const leaked = FakeWebSocket.sockets.length > count;
  if (leaked) FakeWebSocket.sockets.at(-1).emit({ type: 'STREAM_READY' });
  await cancelled;
  socket.closeLocal();
  assert.equal(leaked, false, 'cleanup was followed by a fresh WebSocket');
});

test('CAPTURE: worklet load failure must close AudioContext', async () => {
  let closed = 0;
  globalThis.MediaStream = class {};
  globalThis.AudioContext = class {
    state = 'running'; audioWorklet = { addModule: async () => { throw new Error('worklet load failure'); } };
    async close() { closed += 1; }
  };
  await assert.rejects(startVoiceAudioCapture({ stream: { getAudioTracks: () => [new EventTarget()] }, onFrame() {} }), /worklet load failure/);
  assert.equal(closed, 1, 'AudioContext remains running after failed initialization');
});

test('서버 재시도 시간이 지나도 클라이언트 버퍼가 크면 재개하지 않는다', async () => {
  // 준비
  const { socket, states } = createSocket();
  const pending = socket.connect();
  await delay(0);
  const ws = FakeWebSocket.sockets.at(-1);
  ws.emit({ type: 'STREAM_READY' });
  await pending;

  // 실행 / 검증: 두 역압 원인이 모두 해소되어야 재개한다.
  ws.bufferedAmount = 512 * 1024;
  assert.equal(socket.sendAudio(new ArrayBuffer(3200)), false);
  ws.emit({ type: 'BACKPRESSURE', retryAfterMs: 5 });
  await delay(120);
  assert.equal(states.at(-1), 'BACKPRESSURED');
  ws.bufferedAmount = 0;
  await delay(120);
  assert.equal(states.at(-1), 'STREAMING');
  socket.closeLocal();
});

test('역압 대기 중 종료한 소켓은 타이머가 다시 시작하지 않는다', async () => {
  // 준비
  const { socket, states } = createSocket();
  const pending = socket.connect();
  await delay(0);
  const ws = FakeWebSocket.sockets.at(-1);
  ws.emit({ type: 'STREAM_READY' });
  await pending;

  // 실행
  ws.emit({ type: 'BACKPRESSURE', retryAfterMs: 30 });
  socket.closeLocal();
  const count = states.length;
  await delay(60);

  // 검증
  assert.equal(states.at(-1), 'DISCONNECTED');
  assert.equal(states.length, count);
});

test('공유 종료 뒤 받은 마지막 final을 전달하고 STREAM_CLOSED까지 기다린다', async () => {
  // 준비
  const { socket, events } = createSocket();
  const pending = socket.connect();
  await delay(0);
  const ws = FakeWebSocket.sockets.at(-1);
  ws.emit({ type: 'STREAM_READY' });
  await pending;

  // 실행: 캡처 종료 뒤에도 이미 수락한 발화의 서버 응답을 받을 수 있어야 한다.
  const drained = socket.closeGracefully();
  assert.equal(ws.readyState, WebSocket.OPEN);
  assert.equal(socket.sendAudio(new ArrayBuffer(3200)), false);
  assert.equal(JSON.parse(ws.sent.at(-1)).type, 'STREAM_CLOSE');
  ws.emit({ type: 'TRANSCRIPT_FINAL', utteranceKey: 'last', sourceText: 'Last sentence' });
  ws.emit({ type: 'VOICE_PIPELINE_COMPLETED', utteranceKey: 'last', translatedText: '마지막 문장' });
  ws.emit({ type: 'STREAM_CLOSED' });
  assert.equal(await drained, true);

  // 검증
  assert.ok(events.some(event => event.translatedText === '마지막 문장'));
  assert.equal(ws.readyState, 3);
});

test('graceful 종료 대기 중 강제 정리는 남은 타이머와 promise를 해제한다', async () => {
  // 준비
  const { socket } = createSocket();
  const pending = socket.connect();
  await delay(0);
  const ws = FakeWebSocket.sockets.at(-1);
  ws.emit({ type: 'STREAM_READY' });
  await pending;

  // 실행 / 검증
  const drained = socket.closeGracefully();
  socket.closeLocal();
  assert.equal(await drained, false);
  assert.equal(ws.readyState, 3);
});

async function flushSocketPromises() {
  for (let i = 0; i < 4; i++) await Promise.resolve();
}

test('짧은 READY 뒤 반복 종료는 네 번의 재접속 예산을 소진한다', async (context) => {
  // 준비: 네트워크 대기와 연결 안정 시간을 실제 대기 없이 진행한다.
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const { socket, states } = createSocket();
  const pending = socket.connect();
  await flushSocketPromises();
  let current = FakeWebSocket.sockets.at(-1);
  current.emit({ type: 'STREAM_READY' });
  await pending;

  // 실행: 재접속마다 READY는 도착하지만 연결은 곧 끊어진다.
  for (const wait of [400, 800, 1600, 3200]) {
    current.close();
    context.mock.timers.tick(wait);
    await flushSocketPromises();
    const next = FakeWebSocket.sockets.at(-1);
    assert.notEqual(next, current);
    current = next;
    current.emit({ type: 'STREAM_READY' });
    await flushSocketPromises();
  }
  current.close();
  const socketCount = FakeWebSocket.sockets.length;
  context.mock.timers.tick(60_000);
  await flushSocketPromises();

  // 검증: 짧은 성공은 예산을 되돌리지 않아 다섯 번째 연결 이후 자동 재시도를 멈춘다.
  assert.equal(states.at(-1), 'ERROR');
  assert.equal(FakeWebSocket.sockets.length, socketCount);
  socket.closeLocal();
});

test('30초 안정 연결 뒤에만 재접속 예산을 회복하고 오래된 콜백은 무시한다', async (context) => {
  // 준비
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const { socket, states } = createSocket();
  const pending = socket.connect();
  await flushSocketPromises();
  const previous = FakeWebSocket.sockets.at(-1);
  previous.emit({ type: 'STREAM_READY' });
  await pending;
  previous.close();
  context.mock.timers.tick(400);
  await flushSocketPromises();
  let current = FakeWebSocket.sockets.at(-1);
  current.emit({ type: 'STREAM_READY' });
  await flushSocketPromises();

  // 실행: 현재 연결은 안정 상태를 유지하고 이전 소켓의 늦은 이벤트가 도착한다.
  context.mock.timers.tick(30_000);
  const stateCount = states.length;
  previous.onclose();
  previous.emit({ type: 'STREAM_READY' });
  assert.equal(states.length, stateCount);

  // 검증: 안정 연결 뒤 새 단절에는 다시 네 번의 기회가 생긴다.
  for (const wait of [400, 800, 1600, 3200]) {
    current.close();
    context.mock.timers.tick(wait);
    await flushSocketPromises();
    const next = FakeWebSocket.sockets.at(-1);
    assert.notEqual(next, current);
    current = next;
    current.emit({ type: 'STREAM_READY' });
    await flushSocketPromises();
  }
  current.close();
  assert.equal(states.at(-1), 'ERROR');
  socket.closeLocal();
});

test('graceful 종료 시간은 안정 연결이나 재접속 예산 회복으로 계산하지 않는다', async (context) => {
  // 준비
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const { socket, states } = createSocket();
  const pending = socket.connect();
  await flushSocketPromises();
  const current = FakeWebSocket.sockets.at(-1);
  current.emit({ type: 'STREAM_READY' });
  await pending;
  context.mock.timers.tick(29_000);

  // 실행: ACK가 오지 않는 종료 대기 뒤 강제 정리하고 오래된 이벤트를 재생한다.
  const draining = socket.closeGracefully();
  context.mock.timers.tick(30_000);
  assert.equal(await draining, false);
  const socketCount = FakeWebSocket.sockets.length;
  current.onclose();
  current.emit({ type: 'STREAM_READY' });
  context.mock.timers.tick(60_000);
  await flushSocketPromises();

  // 검증
  assert.equal(states.at(-1), 'DISCONNECTED');
  assert.equal(FakeWebSocket.sockets.length, socketCount);
});

test('BE 저장의 비복구 STREAM 오류는 재접속하지 않고 ERROR를 유지한다', async (context) => {
  // 준비
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const { socket, states, events } = createSocket();
  const pending = socket.connect();
  await flushSocketPromises();
  const current = FakeWebSocket.sockets.at(-1);
  current.emit({ type: 'STREAM_READY' });
  await pending;

  // 실행: 데이터 저장 실패 이후 서버가 public WebSocket도 닫는다.
  current.emit({ type: 'VOICE_PIPELINE_FAILED', error: {
    code: 'VOICE_BE_INTERNAL_ERROR', stage: 'STREAM', retryable: false,
  } });
  assert.equal(socket.sendAudio(new ArrayBuffer(3200)), false);
  current.close();
  const socketCount = FakeWebSocket.sockets.length;
  context.mock.timers.tick(60_000);
  await flushSocketPromises();

  // 검증: 서버 종료가 오류 표시를 지우거나 같은 실패를 자동 반복하지 않는다.
  assert.equal(events.at(-1).error.code, 'VOICE_BE_INTERNAL_ERROR');
  assert.equal(states.at(-1), 'ERROR');
  assert.equal(FakeWebSocket.sockets.length, socketCount);
  socket.closeLocal();
});

test('발화 단위 비재시도 오류는 다음 음성을 계속 전송한다', async () => {
  // 준비
  const { socket, states } = createSocket();
  const pending = socket.connect();
  await flushSocketPromises();
  const current = FakeWebSocket.sockets.at(-1);
  current.emit({ type: 'STREAM_READY' });
  await pending;

  // 실행 / 검증: retryable=false만으로 연결 전체의 중단을 결정하지 않는다.
  for (const error of [
    { code: 'VOICE_AI_UNSUPPORTED_LANGUAGE', stage: 'LANGUAGE', retryable: false },
    { code: 'VOICE_AI_TRANSLATION_TIMEOUT', stage: 'TRANSLATION', retryable: false },
    { code: 'VOICE_BE_INTERNAL_ERROR', stage: 'TRANSLATION', retryable: false },
  ]) {
    current.emit({ type: 'VOICE_PIPELINE_FAILED', error });
    assert.equal(socket.sendAudio(new ArrayBuffer(3200)), true);
    assert.equal(states.at(-1), 'STREAMING');
  }
  socket.closeLocal();
});


