let audioCtx: AudioContext | null = null;
let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
let isAudioEnabled = false;

export function initAudio() {
  if (audioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
    isAudioEnabled = true;

    // Resume context if suspended (common in browsers)
    if (audioCtx.state === 'suspended') {
      const resume = () => {
        audioCtx?.resume().then(() => {
          window.removeEventListener('click', resume);
          window.removeEventListener('keydown', resume);
        });
      };
      window.addEventListener('click', resume);
      window.addEventListener('keydown', resume);
    }
  } catch (e) {
    console.error('Failed to initialize Web Audio API', e);
  }
}

export function toggleAudio(enabled: boolean) {
  isAudioEnabled = enabled;
  if (enabled) {
    initAudio();
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume();
    }
  } else {
    stopEngineSound();
  }
}

function createNoiseBuffer(): AudioBuffer {
  if (!audioCtx) throw new Error('No audio context');
  const bufferSize = audioCtx.sampleRate * 2; // 2 seconds
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function playEngineSound(speedRatio: number) {
  if (!isAudioEnabled) return;
  initAudio();
  if (!audioCtx) return;

  try {
    if (!engineOsc) {
      engineOsc = audioCtx.createOscillator();
      engineGain = audioCtx.createGain();

      engineOsc.type = 'sawtooth';
      engineOsc.frequency.setValueAtTime(45, audioCtx.currentTime);

      // Low pass filter to make it sound full and deep
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, audioCtx.currentTime);

      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(audioCtx.destination);

      engineOsc.start();
    }

    // Dynamic pitch and volume based on speed
    const baseFreq = 35 + speedRatio * 30; // 35Hz to 65Hz
    const volume = 0.03 + speedRatio * 0.05; // soft hum

    engineOsc.frequency.setTargetAtTime(baseFreq, audioCtx.currentTime, 0.1);
    engineGain?.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.1);
  } catch (e) {
    console.warn('Engine sound error:', e);
  }
}

export function stopEngineSound() {
  try {
    if (engineOsc) {
      engineOsc.stop();
      engineOsc.disconnect();
      engineOsc = null;
    }
    if (engineGain) {
      engineGain.disconnect();
      engineGain = null;
    }
  } catch (e) {
    console.warn('Stop engine sound error:', e);
  }
}

export function playSonarPing() {
  if (!isAudioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

    // Resonant bandpass filter to give sonar ring feel
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1000, audioCtx.currentTime);
    bp.Q.setValueAtTime(8, audioCtx.currentTime);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
  } catch (e) {
    console.warn(e);
  }
}

export function playBombDrop() {
  if (!isAudioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // Whistling drop sound starting high and sliding down
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 1.2);

    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 1.25);
  } catch (e) {
    console.warn(e);
  }
}

export function playExplosion(isHeavy = false) {
  if (!isAudioEnabled || !audioCtx) return;
  try {
    // Generate noise for explosion boom
    const noise = audioCtx.createBufferSource();
    noise.buffer = createNoiseBuffer();

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    // Lower frequency cutoff for heavy bombs
    const cutoff = isHeavy ? 100 : 250;
    filter.frequency.setValueAtTime(cutoff, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + (isHeavy ? 1.5 : 0.8));

    const gain = audioCtx.createGain();
    const volume = isHeavy ? 0.35 : 0.2;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isHeavy ? 1.8 : 1.0));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start();
    noise.stop(audioCtx.currentTime + (isHeavy ? 1.8 : 1.0));

    // Also add a low sine oscillator for a tactile sub-bass punch
    const subOsc = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(70, audioCtx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(25, audioCtx.currentTime + 0.4);

    subGain.gain.setValueAtTime(volume * 1.5, audioCtx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

    subOsc.connect(subGain);
    subGain.connect(audioCtx.destination);
    subOsc.start();
    subOsc.stop(audioCtx.currentTime + 0.5);

  } catch (e) {
    console.warn(e);
  }
}

export function playCoin() {
  if (!isAudioEnabled || !audioCtx) return;
  try {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5
    osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime); // E6

    osc1.frequency.setValueAtTime(987.77, audioCtx.currentTime);
    osc1.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc1.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    console.warn(e);
  }
}

export function playTakeDamage() {
  if (!isAudioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, audioCtx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(200, audioCtx.currentTime);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    console.warn(e);
  }
}

export function playAlarm() {
  if (!isAudioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);

    // Beeping volume pulse
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    console.warn(e);
  }
}

export function playShoot() {
  if (!isAudioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.warn(e);
  }
}

export function playUpgrade() {
  if (!isAudioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(261.63, now); // C4
    osc.frequency.setValueAtTime(329.63, now + 0.1); // E4
    osc.frequency.setValueAtTime(392.00, now + 0.2); // G4
    osc.frequency.setValueAtTime(523.25, now + 0.3); // C5

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(now + 0.6);
  } catch (e) {
    console.warn(e);
  }
}
