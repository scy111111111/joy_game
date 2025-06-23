/**
 * 游戏音效服务
 * 管理游戏中的所有音效播放
 */
class SoundService {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  // 音效URL配置
  private soundUrls = {
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // 点击音效
    open: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3',    // 打开安全格子
    mine: 'https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3',    // 踩雷音效
    win: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',   // 胜利音效
    lose: 'https://assets.mixkit.co/active_storage/sfx/2030/2030-preview.mp3',  // 失败音效
    predict: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // 预测音效
  };

  constructor() {
    // 预加载所有音效
    this.preloadSounds();
  }

  /**
   * 预加载所有音效
   */
  private preloadSounds(): void {
    Object.entries(this.soundUrls).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.sounds.set(key, audio);
    });
  }

  /**
   * 播放指定音效
   * @param soundName 音效名称
   */
  play(soundName: keyof typeof this.soundUrls): void {
    if (!this.enabled) return;

    const sound = this.sounds.get(soundName);
    if (sound) {
      // 重置音频以便重复播放
      sound.currentTime = 0;
      sound.play().catch(error => {
        console.error(`播放音效 ${soundName} 失败:`, error);
      });
    }
  }

  /**
   * 启用/禁用音效
   * @param value 是否启用
   */
  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /**
   * 获取音效启用状态
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 切换音效启用状态
   */
  toggleEnabled(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

// 导出单例实例
export const soundService = new SoundService();
