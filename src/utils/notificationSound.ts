let audioContext: AudioContext | null = null;

export const playNotificationSound = () => {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    // Crear un beep amigable usando Web Audio API
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Segundo beep
    setTimeout(() => {
      const osc2 = audioContext!.createOscillator();
      const gain2 = audioContext!.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext!.destination);
      osc2.frequency.value = 1000;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, audioContext!.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext!.currentTime + 0.5);
      osc2.start(audioContext!.currentTime);
      osc2.stop(audioContext!.currentTime + 0.5);
    }, 200);

  } catch (err) {
    console.error('Audio playback failed:', err);
  }
};