let sprite;
const FRAMES = 12;
let frameW, frameH;
let currentFrame = 0;
let frameDelay = 5; // ticks per frame
let delayCounter = 0;
let scaleFactor = 2; // 視覺放大倍數

// 圖片資源
let fishImg;
let seaweedImg;
// 新增複製魚圖檔（5 隻一群）
let smallGroupImg;

// 背景音樂與振幅分析
let bgm;
let amp;
let ampSmoothed = 0;
let running = false; // 初始靜止，滑鼠點擊後開始/暫停

// 原始魚顯示比例基準，實際小魚為該基準的 1/12
let originalFishScale = 0.6;
let fishScale = originalFishScale / 12.0;
let seaweedScale = 0.6; // 海草縮放基準

// 多隻小魚
let fishes = [];
const NUM_FISH = 14;

// 一隻較大的黃魚（比小魚大 1/4）
let specialFish = null;
// 一群小魚（複製檔），5 隻，分布上2中1下2
let smallGroup = null;

function preload() {
  // 精靈表（主角）
  sprite = loadImage('2025.01/0101.png', () => {
    console.log('sprite loaded:', sprite.width, 'x', sprite.height);
  }, (err) => {
    console.error('Failed to load sprite:', err);
  });

  // 魚與水草檔案（檔名含特殊字元，位於專案根目錄）
  fishImg = loadImage('—Pngtree—pixel goldfish decoration illustration_4742180.png', () => {
    console.log('fish loaded:', fishImg.width, 'x', fishImg.height);
  }, (err) => {
    console.error('Failed to load fish:', err);
  });

  seaweedImg = loadImage('—Pngtree—seabed seaweed water grass painted_3808974.png', () => {
    console.log('seaweed loaded:', seaweedImg.width, 'x', seaweedImg.height);
  }, (err) => {
    console.error('Failed to load seaweed:', err);
  });
  // 複製的小魚圖檔
  smallGroupImg = loadImage('—Pngtree—pixel goldfish decoration illustration_4742180 - 複製.png', () => {
    console.log('smallGroupImg loaded:', smallGroupImg.width, 'x', smallGroupImg.height);
  }, (err) => {
    console.error('Failed to load smallGroupImg:', err);
  });

  // 請將音訊檔 `MooveKa - Happy Toes.mp3` 放在專案根目錄
  // 檔案過大或瀏覽器限制可能需要使用開發者伺服器來測試
  bgm = loadSound('MooveKa - Happy Toes.mp3', () => {
    console.log('bgm loaded');
  }, (err) => {
    console.warn('Failed to load bgm (is the mp3 present?):', err);
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  // sprite 在 preload 已載入
  frameW = sprite.width / FRAMES;
  frameH = sprite.height;

  // 初始化小魚（從右往左出現）
  for (let i = 0; i < NUM_FISH; i++) {
    const s = random(0.9, 1.1);
    fishes.push({
      x: random(width, width * 2),
      y: random(height * 0.2, height * 0.8),
      speed: random(1, 3),
      scale: fishScale * s,
      phase: random(TWO_PI)
    });
  }

  // 初始化特殊黃魚（比小魚大 1/4）
  specialFish = {
    x: random(width * 0.8, width * 1.5),
    y: random(height * 0.55, height * 0.85),
    speed: random(1.5, 2.5),
    scale: fishScale * 1.25,
    phase: random(TWO_PI)
  };

  // 初始化小群（5 隻，一群由右往左，大小比現在的魚小 1/4）
  // "比現在的魚小1/4" 解讀為尺寸 * 0.75
  const groupScale = fishScale * 0.75;
  smallGroup = {
    x: random(width, width * 1.5),
    y: random(height * 0.3, height * 0.7),
    speed: random(2, 3),
    scale: groupScale,
    // 五隻的垂直分布（上2，中1，下2）
    yOffsets: [-48, -24, 0, 24, 48],
    xOffsets: [0, 0, 0, 0, 0], // 若需水平微分可修改
    phases: [random(TWO_PI), random(TWO_PI), random(TWO_PI), random(TWO_PI), random(TWO_PI)]
  };

  // 無音訊：保持原本設定
  // 建立振幅分析器（會監聽主輸出，當 bgm 播放時可取得音量）
  amp = new p5.Amplitude();
  amp.smoothing = 0.8;
  console.log('setup complete (audio ready, initial state paused)');
}

function mousePressed() {
  // 切換播放/暫停：第一次點擊會開始播放並讓場景開始動作
  if (!running) {
    if (bgm) {
      if (!bgm.isPlaying()) {
        bgm.loop();
      }
    }
    running = true;
  } else {
    if (bgm && bgm.isPlaying()) {
      bgm.pause();
    }
    running = false;
  }
}

function draw() {
  // 頁面與畫布背景保持一致的水藍
  background('#AEEFF2');

  // 音訊分析：當 running 時，從 amp 取得音量並平滑
  if (running && amp) {
    const lvl = amp.getLevel();
    ampSmoothed = lerp(ampSmoothed, lvl, 0.12);
  } else {
    ampSmoothed = lerp(ampSmoothed, 0, 0.08);
  }
  // 把振幅映射成影響因子（0 ~ ~）
  const ampEffect = constrain(map(ampSmoothed, 0, 0.25, 0, 1), 0, 4);
  // speedFactor 可視需要放大到 0.5 ~ 3 倍
  const speedFactor = 1.0 + ampEffect * 1.2;

  // 繪製密集海草（下排） - 使用無平滑以呈現像素風格
  if (seaweedImg) {
    const sw = seaweedImg.width * seaweedScale;
    const sh = seaweedImg.height * seaweedScale;

    push();
    imageMode(CORNER);
    noSmooth();

    const swayAmp = 8;
    const swayFreq = 0.03;
    const overlapStep = Math.max(6, sw * 0.55);
    const cols = Math.ceil((width + sw) / overlapStep) + 3;

    // 畫兩排（或更多）以顯示茂密的下排海草
    for (let row = 0; row < 2; row++) {
      // row 0: 原始大小，貼齊底部；
      // row 1: 縮小為 2/5、略右移，並下移使底部貼齊螢幕
      const rowScale = (row === 1) ? seaweedScale * 0.4 : seaweedScale;
      const swRow = seaweedImg.width * rowScale;
      const shRow = seaweedImg.height * rowScale;
      const rowRightShift = (row === 1) ? Math.round(sw * 0.18) : 0; // 右移量（使用原始 sw 的比例）

      // 若為上排（row 1 原本較高），我們把它下移到貼齊底部：y = height - shRow
      const baseY = height - shRow;

      for (let i = -2; i < cols; i++) {
        const x = i * overlapStep + rowRightShift;
        const sway = Math.sin(frameCount * swayFreq + i * 0.4 + row * 1.2) * swayAmp;
        const y = baseY; // 確保底部貼齊
        image(seaweedImg, x + sway, y, swRow, shRow);
      }
    }

    // 在主海草排的空隙中穿插放大 2 倍的小海草（同樣像素風格）
    // smallScale = seaweedScale * 1
    const smallScale = seaweedScale * 2.0;
    const smallSw = seaweedImg.width * smallScale;
    const smallSh = seaweedImg.height * smallScale;
    // 將小海草置於主列之間，水平位移半步進以穿插
    for (let i = -2; i < cols; i++) {
      const xSmall = i * overlapStep + overlapStep * 0.5 + Math.round(sw * 0.08);
      // 小海草的擺動頻率略不同，幅度也較小，讓視覺更豐富
      const swaySmall = Math.sin(frameCount * (swayFreq * 1.1) + i * 0.6) * (swayAmp * 0.6);
      // 放在主海草的上方空隙處，並確保底部不超出畫面
      const ySmall = height - sh - smallSh * 0.25;
      image(seaweedImg, xSmall + swaySmall, ySmall, smallSw, smallSh);
    }

    pop();
    imageMode(CENTER);
  }

  // 主角精靈表（位在中央略偏上）
  if (sprite) {
    // 主角會依振幅略為跳動（靜止時不跳）
    const jumpBase = 4;
    const jump = running ? Math.sin(frameCount * 0.12) * (jumpBase + ampEffect * 24) : 0;
    const displayW = frameW * scaleFactor;
    const displayH = frameH * scaleFactor;
    const sx = currentFrame * frameW;
    image(sprite, width / 2, height / 2 - 30 - jump, displayW, displayH, sx, 0, frameW, frameH);

    // 僅在 running 時更新動畫幀
    if (running) {
      delayCounter++;
      if (delayCounter >= frameDelay) {
        delayCounter = 0;
        currentFrame = (currentFrame + 1) % FRAMES;
      }
    }
  }

  // 多隻小魚（右往左），速度受音量影響
  if (fishImg) {
    for (let i = 0; i < fishes.length; i++) {
      const f = fishes[i];
      // 當 running 時魚會往左游並受振幅影響；否則不移動
      if (running) {
        const sp = (f.speed || 1) * (0.6 + speedFactor * 0.7);
        f.x -= sp;
        if (f.x + (fishImg.width * f.scale) / 2 < 0) {
          f.x = random(width, width * 1.5);
          f.y = random(height * 0.2, height * 0.8);
          f.speed = random(1, 3);
        }
      }

      const baseBob = 6;
      const bobAmp = baseBob * (1 + ampEffect * 1.2);
      const bob = running ? Math.sin((frameCount + i * 10) * 0.06 + f.phase) * bobAmp : 0;

      push();
      translate(f.x, f.y + bob);
      scale(-1, 1); // 翻轉面向左
      imageMode(CENTER);
      const fw = fishImg.width * f.scale;
      const fh = fishImg.height * f.scale;
      image(fishImg, 0, 0, fw, fh);
      pop();
    }
  }

  // 特殊黃魚（較大、黃色 tint，右往左）
  if (fishImg && specialFish) {
    const f = specialFish;
    if (running) {
      f.x -= (f.speed || 1) * (0.9 + speedFactor * 0.6);
      if (f.x + (fishImg.width * f.scale) / 2 < 0) {
        f.x = random(width * 0.8, width * 1.5);
        f.y = random(height * 0.55, height * 0.85);
        f.speed = random(1.5, 2.5);
      }
    }
    const bobAmp = 6 * (1 + ampEffect * 1.4);
    const bob = running ? Math.sin((frameCount + 999) * 0.05 + f.phase) * bobAmp : 0;

    push();
    translate(f.x, f.y + bob);
    scale(-1, 1);
    imageMode(CENTER);
    tint(255, 230, 120); // 黃色調
    const fw = fishImg.width * f.scale;
    const fh = fishImg.height * f.scale;
    image(fishImg, 0, 0, fw, fh);
    noTint();
    pop();
  }

  // 繪製小群（複製圖），5 隻，上2中1下2，由右往左
  if (smallGroupImg && smallGroup) {
    // 讓整個群體移動（僅在 running 時）
    if (running) {
      smallGroup.x -= (smallGroup.speed || 2) * (0.8 + speedFactor * 0.6);
    }
    // 當整群游出左邊時從右邊再出現
    const groupWidth = smallGroupImg.width * smallGroup.scale;
    if (smallGroup.x + groupWidth / 2 < 0) {
      smallGroup.x = random(width, width * 1.6);
      smallGroup.y = random(height * 0.3, height * 0.7);
      smallGroup.speed = random(2, 3);
    }

    // 繪製五隻，依序用 yOffsets 排列
    for (let i = 0; i < 5; i++) {
      const xo = smallGroup.x + (smallGroup.xOffsets[i] || 0);
      const yo = smallGroup.y + smallGroup.yOffsets[i];
      const bob = Math.sin(frameCount * 0.06 + smallGroup.phases[i]) * 6;

      push();
      translate(xo, yo + bob);
      scale(-1, 1);
      imageMode(CENTER);
      const fw = smallGroupImg.width * smallGroup.scale;
      const fh = smallGroupImg.height * smallGroup.scale;
      image(smallGroupImg, 0, 0, fw, fh);
      pop();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (specialFish) specialFish.y = height * 0.7;
}