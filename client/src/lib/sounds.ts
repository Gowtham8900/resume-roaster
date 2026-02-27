let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function primeAudio() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

export function playFireSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const duration = 1.2;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(800, now);
    bandpass.frequency.exponentialRampToValueAtTime(200, now + duration);
    bandpass.Q.value = 1.5;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(2000, now);
    lowpass.frequency.exponentialRampToValueAtTime(300, now + duration);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.05);
    gainNode.gain.setValueAtTime(0.35, now + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + duration);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const osc2 = ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(100, now);
    osc2.frequency.exponentialRampToValueAtTime(40, now + 0.8);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0, now);
    osc2Gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    noise.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc2.connect(osc2Gain);
    osc2Gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
    osc.start(now);
    osc.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + 0.8);
  } catch {
  }
}
