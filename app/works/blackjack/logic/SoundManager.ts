class SoundManager {
  private ctx: AudioContext | null = null;

  // 1. 오디오 컨텍스트 초기화 (사용자 인터랙션 직후 호출 필요)
  public init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.error('Failed to initialize Web Audio Context:', e);
    }
  }

  // 오디오 상태 안전 재개
  private resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 2. 카드가 날아갈 때의 미끄러지는 둔탁한 소리 합성 (Sliding Sound)
  public playSlide() {
    this.resumeContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // 2-1. 노이즈 버퍼 생성 (바닥 마찰음 모사)
    const bufferSize = this.ctx.sampleRate * 0.25; // 0.25초 길이
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // 화이트 노이즈
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // 2-2. 로우패스 필터로 고주파 깎아서 둔탁한 소리로 변환
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    // 마찰음이 스르륵 사라지는 느낌을 위해 주파수를 400Hz -> 100Hz로 쓸어내림(Sweep)
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.25);
    filter.Q.setValueAtTime(3, now);

    // 2-3. 볼륨 엔벨로프 조절
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05); // 짧은 어택
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25); // 서서히 댐핑

    // 노드 연결
    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    // 재생 및 정지
    noiseNode.start(now);
    noiseNode.stop(now + 0.25);
  }

  // 3. 유리 블록이 부딪힐 때의 맑고 둔탁한 타격음 합성 (Glass Clink Sound)
  public playClink() {
    this.resumeContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 3-1. 맑은 메인 유리 톤 (900Hz 근처 고주파 오실레이터)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(920, now);
    // 피치가 미세하게 떨어지게 램핑하여 맑고 차가운 타격감 묘사
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3);

    // 3-2. 배음 톤 (오버톤 역할을 할 1.8kHz 고음 오실레이터)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1840, now);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

    // 3-3. 둔탁한 충격음 모사를 위한 노이즈 어택 레이어 (가죽 바닥 충돌)
    const bufferSize = this.ctx.sampleRate * 0.03; // 극단적으로 짧은 30ms 노이즈 펄스
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(150, now); // 바닥 쿵 소리를 위해 낮은 대역만 추출

    // 3-4. 볼륨 조절기 결합
    const gainNode1 = this.ctx.createGain(); // 메인 톤용
    gainNode1.gain.setValueAtTime(0.2, now);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 0.35); // 0.35초 울림 지속

    const gainNode2 = this.ctx.createGain(); // 오버톤용 (더 빠르게 댐핑)
    gainNode2.gain.setValueAtTime(0.07, now);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    const gainNoise = this.ctx.createGain(); // 임팩트 노이즈용
    gainNoise.gain.setValueAtTime(0.18, now);
    gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    // 노드 체인 연결
    osc1.connect(gainNode1);
    osc2.connect(gainNode2);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(gainNoise);

    gainNode1.connect(this.ctx.destination);
    gainNode2.connect(this.ctx.destination);
    gainNoise.connect(this.ctx.destination);

    // 동시 재생 및 해제
    osc1.start(now);
    osc1.stop(now + 0.35);

    osc2.start(now);
    osc2.stop(now + 0.15);

    noiseSource.start(now);
    noiseSource.stop(now + 0.03);
  }

  // 3-5. 3D 물리 버튼 클릭용 짧고 둔탁한 타격음 합성 (Button Click Sound)
  public playClick() {
    this.resumeContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // 묵직하고 짧은 사인파 (400Hz -> 100Hz)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    // 틱 하는 미세 마찰 노이즈 추가
    const bufferSize = this.ctx.sampleRate * 0.015; // 15ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.28, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);

    noiseSource.start(now);
    noiseSource.stop(now + 0.015);
  }

  // 4. 유리가 깨질 때의 쨍그랑하는 파편 소리 합성 (Glass Shattering Sound)
  public playShatter() {
    this.resumeContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.65; // 전체 지속 시간

    // 4-1. 여러 개의 고주파 오실레이터로 유리 파편의 맑은 공명 연출
    const frequencies = [1500, 2200, 3100, 4300, 5200];
    frequencies.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      // 무작위 피치 변동으로 부서진 유리 느낌 강조
      const pitchJitter = (Math.random() - 0.5) * 200;
      osc.frequency.setValueAtTime(freq + pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime((freq + pitchJitter) * 0.7, now + duration);

      // 개별 파편들의 볼륨 엔벨로프 (각 파편마다 무작위 감쇄 속도 적용)
      const maxVolume = 0.04 + Math.random() * 0.04;
      const decayTime = 0.15 + Math.random() * (duration - 0.2);

      gainNode.gain.setValueAtTime(maxVolume, now);
      gainNode.gain.linearRampToValueAtTime(maxVolume * 0.8, now + 0.02); // 어택 피크
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + decayTime);
    });

    // 4-2. 파쇄 노이즈 어택 (유리창이 찢어지며 와장창하는 크랙 사운드)
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // 거친 파쇄음을 위해 노이즈 생성
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass'; // 맑은 고주파 깨짐 소리를 위해 하이패스 필터 사용
    noiseFilter.frequency.setValueAtTime(2500, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(800, now + duration);

    const gainNoise = this.ctx.createGain();
    gainNoise.gain.setValueAtTime(0.12, now);
    gainNoise.gain.linearRampToValueAtTime(0.06, now + 0.05); // 어택 직후 감쇄
    gainNoise.gain.exponentialRampToValueAtTime(0.001, now + duration); // 천천히 소멸

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(gainNoise);
    gainNoise.connect(this.ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  }
}

// 싱글톤 인스턴스로 내보냄
export const soundManager = new SoundManager();
export default soundManager;
