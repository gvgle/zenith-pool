
let audioCtx: AudioContext | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// 预生成白噪声缓冲区，用于撞击的“脆”声
let noiseBuffer: AudioBuffer | null = null;
const getNoiseBuffer = (ctx: AudioContext) => {
  if (!noiseBuffer) {
    const bufferSize = ctx.sampleRate * 0.1; // 0.1秒的噪声
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
};

export const playCollisionSound = (impulse: number) => {
  const ctx = initAudio();
  if (ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const volume = Math.min(impulse * 0.08, 0.5);
  if (volume < 0.01) return;

  // 1. 瞬态冲击声 (Noise burst for the "click")
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(2000, now);
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(volume * 0.8, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  // 2. 主体共鸣声 (Triangle wave for the body of the ball)
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const baseFreq = 1200 + Math.random() * 400;
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(volume, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);

  noise.start(now);
  osc.start(now);
  noise.stop(now + 0.05);
  osc.stop(now + 0.05);
};

export const playPocketSound = () => {
  const ctx = initAudio();
  if (ctx.state !== 'running') return;

  const now = ctx.currentTime;

  // 模拟球掉进网兜的闷响 (Thud)
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, now);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.2);
};
