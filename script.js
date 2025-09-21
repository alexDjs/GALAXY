// Access canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state variables (declared early to avoid reference errors)
let gameStarted = false; // Flag for first start
let isPaused = false; // Pause state flag

// Player ship speed - constant regardless of difficulty
const SPACESHIP_SPEED = 4;

// Game Settings
let gameSettings = {
  volume: 50,
  difficulty: 'normal',
  musicEnabled: true,
  soundEnabled: true
};

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

// Responsive canvas sizing
function resizeCanvas() {
  if (isMobile) {
    // Используем полное разрешение экрана для мобильных устройств
    canvas.width = window.innerWidth; // Полная ширина экрана
    canvas.height = window.innerHeight; // Полная высота экрана
    
    console.log(`Mobile canvas size: ${canvas.width}x${canvas.height}`);
  } else {
    canvas.width = 320;
    canvas.height = 480;
  }
}

// Initialize canvas size
resizeCanvas();

// Handle window resize
window.addEventListener('resize', () => {
  resizeCanvas();
  if (gameStarted) {
    initializeSpaceshipPosition();
  }
});

// Loading images
const spaceshipImg = new Image();
spaceshipImg.src = 'images/me.png'; 
const enemyImg = new Image();
enemyImg.src = 'images/bot.png';
const bulletImg = new Image();
bulletImg.src = 'images/missile.png';
const shooterEnemyImg = new Image();
shooterEnemyImg.src = 'images/shooter_enemy.png';
const zigzagEnemyImg = new Image();
zigzagEnemyImg.src = 'images/zigzag_enemy.png';
const bossImg = new Image();
bossImg.src = 'images/boss.png';

// Sound effects with preloading
const shootSound = new Audio('sounds/shoot.mp3'); 
const explosionSound = new Audio('sounds/explosion.mp3');
const gameOverSound = new Audio('sounds/gameOver.mp3');
const bossMusic = new Audio('sounds/boss.mp3');
const victoryMusic = new Audio('sounds/victory.mp3');
const backgroundMusic = new Audio('sounds/background.mp3');

// Audio loading status
let audioLoaded = 0;
let totalAudio = 6;
let audioLoadingComplete = false;

// Preload audio files
function preloadAudio() {
  console.log('🎵 Starting audio preload...');
  updateLoadingStatus(); // Show loading indicator immediately
  
  const audioFiles = [shootSound, explosionSound, gameOverSound, bossMusic, victoryMusic, backgroundMusic];
  
  audioFiles.forEach((audio, index) => {
    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', () => {
      audioLoaded++;
      console.log(`Audio ${index} loaded successfully`);
      updateLoadingStatus();
    });
    audio.addEventListener('error', () => {
      console.log(`Audio ${index} failed to load, continuing...`);
      audioLoaded++;
      updateLoadingStatus();
    });
    audio.load(); // Force loading
  });
}

function updateLoadingStatus() {
  const loadingElement = document.getElementById('loadingText');
  if (!loadingElement) return;
  
  if (audioLoaded >= totalAudio) {
    audioLoadingComplete = true;
    loadingElement.style.display = 'none';
    console.log('🎵 All audio files loaded successfully!');
  } else {
    const progress = Math.round((audioLoaded / totalAudio) * 100);
    loadingElement.innerHTML = `🎵 Loading audio... ${progress}%<br><small>Please wait...</small>`;
    loadingElement.style.display = 'block';
    console.log(`Audio loading progress: ${progress}% (${audioLoaded}/${totalAudio})`);
  }
}

// Boss specific sounds (using existing files with different settings)
const bossShootSound = new Audio('sounds/shoot.mp3');
const bossExplosionSound = new Audio('sounds/explosion.mp3');

// Safe audio playback function
function playAudioSafe(audio) {
  if (audio && audioLoadingComplete) {
    try {
      audio.currentTime = 0; // Reset to start
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Audio play failed:', error);
        });
      }
    } catch (error) {
      console.log('Audio error:', error);
    }
  }
}

explosionSound.volume = 0.3;
shootSound.volume = 0.2;
bossShootSound.volume = 0.4; // Louder for boss
bossShootSound.playbackRate = 0.7; // Deeper sound for boss
bossExplosionSound.volume = 0.5; // Louder explosion for boss hits

backgroundMusic.loop = true;
backgroundMusic.volume = 0.3;
// backgroundMusic.play();

// Star background
let stars = [];

// Initialize stars
function initializeStars() {
  stars = []; 
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.5, 
      speed: Math.random() * 1 + 0.5,
    });
  }
}

//Updating and drawing stars
function updateStars() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach((star) => {
    star.y += star.speed; // Star movement down

    // Move the star up if it goes off screen
    if (star.y > canvas.height) {
      star.y = 0 - star.size; 
      star.x = Math.random() * canvas.width;
      
    }

    // Drawing a star
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Determining the player's ship
let spaceship = {
  x: 160, // Default position, will be updated properly after canvas resize
  y: 320, // Default position higher for mobile, will be updated properly after canvas resize
  width: 45, // Make sure dimensions match the me.png image
  height: 45,
  dx: SPACESHIP_SPEED, // Ship speed - constant regardless of difficulty
};

// Initialize spaceship position after canvas is sized
function initializeSpaceshipPosition() {
  if (canvas && canvas.width && canvas.height) {
    spaceship.x = canvas.width / 2 - spaceship.width / 2;
    
    // Position spaceship higher on mobile to avoid button overlap
    if (isMobile) {
      // Leave more space at bottom for mobile controls (about 90px)
      spaceship.y = canvas.height - spaceship.height - 90;
    } else {
      // Desktop positioning - closer to bottom
      spaceship.y = canvas.height - spaceship.height - 20;
    }
    
    console.log(`Spaceship position: x=${spaceship.x}, y=${spaceship.y}, canvas: ${canvas.width}x${canvas.height}`);
  }
}

// Bullets, enemies and score
let bullets = [];
let enemies = [];
let bossMeteorites = []; // Boss meteorite attacks
let score = 0;

// Initializing enemy speed and spawn frequency
let baseEnemySpeed = 1; // Initial speed
let baseSpawnRate = 0.01; // Initial spawn rate (higher = more frequent)
let enemySpeed;
let spawnRate;
const speedIncrement = 0.0001; // How fast speed increases
const spawnRateIncrement = 0.00005; // How fast spawn rate increases

// Game States
let isGameOver = false;
let isBossActive = false;
let boss = null;
let isGameWon = false; // Victory state flag
let victoryMusicTimeoutId = null; // ID for victory music stop timer

// Control flags
let leftPressed = false;
let rightPressed = false;
let spacePressed = false; // Use flag to shoot in gameLoop

// --- Event Handlers ---
document.addEventListener('keydown', (e) => {
  // Control only if game is running (not Game Over and not Win and not Paused)
  if (gameStarted && !isGameOver && !isGameWon && !isPaused) {
      if (e.code === 'ArrowLeft') leftPressed = true;
      if (e.code === 'ArrowRight') rightPressed = true;
      if (e.code === 'Space') spacePressed = true; // Set flag
  }

  // Restart or start game on Enter
  if ((isGameOver || isGameWon || !gameStarted) && e.code === 'Enter') {
    if (!gameStarted) {
        startGame(); // First start
    } else {
        restartGame(); // Restart after loss or victory
    }
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft') leftPressed = false;
  if (e.code === 'ArrowRight') rightPressed = false;
  if (e.code === 'Space') spacePressed = false; // Reset flag when released (but shoot on press)
});

// Touch controls for mobile devices
let touchControlsActive = false;

// Mobile button controls
let leftBtnPressed = false;
let rightBtnPressed = false;

// Mobile control buttons event handlers
function initializeMobileControls() {
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const shootBtn = document.getElementById('shootBtn');
  
  if (leftBtn && rightBtn && shootBtn) {
    // Left button
    leftBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (gameStarted && !isGameOver && !isGameWon && !isPaused) {
        leftBtnPressed = true;
        leftPressed = true;
      }
    });
    
    leftBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      leftBtnPressed = false;
      leftPressed = false;
    });
    
    leftBtn.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      leftBtnPressed = false;
      leftPressed = false;
    });
    
    // Right button
    rightBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (gameStarted && !isGameOver && !isGameWon && !isPaused) {
        rightBtnPressed = true;
        rightPressed = true;
      }
    });
    
    rightBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      rightBtnPressed = false;
      rightPressed = false;
    });
    
    rightBtn.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      rightBtnPressed = false;
      rightPressed = false;
    });
    
    // Shoot button
    shootBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!gameStarted || isGameOver || isGameWon) {
        // Start or restart game
        if (!gameStarted) {
          startGame();
        } else {
          restartGame();
        }
        return;
      }
      
      if (gameStarted && !isGameOver && !isGameWon && !isPaused) {
        spacePressed = true;
      }
    });
    
    shootBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      // Don't reset spacePressed here, let gameLoop handle it
    });
    
    // Add mouse support for testing on desktop
    // Left button mouse events
    leftBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (gameStarted && !isGameOver && !isGameWon) {
        leftBtnPressed = true;
        leftPressed = true;
      }
    });
    
    leftBtn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      leftBtnPressed = false;
      leftPressed = false;
    });
    
    // Right button mouse events
    rightBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (gameStarted && !isGameOver && !isGameWon) {
        rightBtnPressed = true;
        rightPressed = true;
      }
    });
    
    rightBtn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      rightBtnPressed = false;
      rightPressed = false;
    });
    
    // Shoot button mouse events
    shootBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (!gameStarted || isGameOver || isGameWon) {
        // Start or restart game
        if (!gameStarted) {
          startGame();
        } else {
          restartGame();
        }
        return;
      }
      
      if (gameStarted && !isGameOver && !isGameWon && !isPaused) {
        spacePressed = true;
      }
    });
    
    shootBtn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      // Don't reset spacePressed here, let gameLoop handle it
    });
  }
}

// Initialize mobile controls when page loads
if (isMobile) {
  document.addEventListener('DOMContentLoaded', () => {
    preloadAudio(); // Start audio loading
    initializeMobileControls();
    initializePauseAndSettings();
    updateAudioVolume();
    applyDifficultySettings();
  });
  // Also call it immediately if DOM is already loaded
  if (document.readyState === 'loading') {
    // Still loading
  } else {
    // Already loaded
    preloadAudio(); // Start audio loading
    initializeMobileControls();
    initializePauseAndSettings();
    updateAudioVolume();
    applyDifficultySettings();
  }
} else {
  // For desktop, still initialize pause and settings
  document.addEventListener('DOMContentLoaded', () => {
    preloadAudio(); // Start audio loading
    initializePauseAndSettings();
    updateAudioVolume();
    applyDifficultySettings();
  });
}

// Touch event handlers removed - only button controls are active now
// Use only mobile control buttons for touch interaction

// Add click handler for starting/restarting game on canvas click
canvas.addEventListener('click', (e) => {
  if (!gameStarted || isGameOver || isGameWon) {
    // Start or restart game on click
    if (!gameStarted) {
      startGame();
    } else {
      restartGame();
    }
  }
});

// Touch move handler removed - using only button controls

// --- Sound Function ---
function playSound(sound) {
  sound.currentTime = 0;
  playAudioSafe(sound);
}

// --- Drawing Functions ---
function drawSpaceship() {
  ctx.drawImage(spaceshipImg, spaceship.x, spaceship.y, spaceship.width, spaceship.height);
}

function drawScore() {
  ctx.font = '16px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'right';
  ctx.fillText('Score: ' + score, canvas.width - 10, 20);
}

function drawBossHealth() {
    if (isBossActive && boss) {
        ctx.font = '14px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS HP: ' + boss.health, canvas.width / 2, 20);
    }
}

// --- Movement and Update Functions ---
function moveSpaceship() {
  if (leftPressed && spaceship.x > 0) {
    spaceship.x -= spaceship.dx;
  }
  if (rightPressed && spaceship.x < canvas.width - spaceship.width) {
    spaceship.x += spaceship.dx;
  }
}

function shoot() {
  // Create bullet slightly in front of the ship
  bullets.push({
      x: spaceship.x + spaceship.width / 2 - 2.5, // Center bullet at ship center
      y: spaceship.y,
      width: 5,
      height: 10
  });
  playSound(shootSound);
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    bullet.y -= 5; // Bullet speed
    ctx.drawImage(bulletImg, bullet.x, bullet.y, bullet.width, bullet.height);

    // Remove bullet if it goes off screen
    if (bullet.y + bullet.height < 0) {
      bullets.splice(i, 1);
    }
  }
}

function spawnEnemies() {
  // Basic enemies
  if (Math.random() < spawnRate) {
    const x = Math.random() * (canvas.width - 40); // Consider enemy width
    enemies.push({ x, y: -40, width: 40, height: 40, type: 'basic', speed: enemySpeed });
  }
}

// *** CHANGES HERE: Increased chances ***
function spawnSpecialEnemies() {
    // Shooting enemies (after 25 points, if none on screen)
    // Increase chance from 0.005 to 0.02 (2% per frame)
    if (score >= 25 && !enemies.some(e => e.type === 'shooter') && Math.random() < 0.02) {
        console.log("Trying to spawn Shooter. Score:", score); // Add log
        enemies.push({
          x: Math.random() * (canvas.width - 45),
          y: -45,
          width: 45,
          height: 45,
          type: 'shooter',
          direction: Math.random() < 0.5 ? 1 : -1, // Random initial direction
          speed: enemySpeed * 0.8, // Slightly slower
          shootCooldown: 120 // Shoots every 120 frames (approximately)
        });
      }

    // Zigzag enemies (after 35 points, if none on screen)
    // Increase chance from 0.004 to 0.015 (1.5% per frame)
    if (score >= 35 && !enemies.some(e => e.type === 'zigzag') && Math.random() < 0.015) {
        console.log("Trying to spawn Zigzag. Score:", score); // Add log
        enemies.push({
          x: Math.random() * (canvas.width - 40),
          y: -40,
          width: 40,
          height: 40,
          type: 'zigzag',
          direction: Math.random() < 0.5 ? 1 : -1,
          speedX: 2, // Horizontal speed
          speedY: enemySpeed * 0.9
        });
      }
}
// *** END OF CHANGES ***

// *** CHANGES HERE: Added logs ***
function spawnBoss() {
    // Log before checking condition
    // console.log(`Checking boss spawn: Score=${score}, isBossActive=${isBossActive}, BossHealth=${boss ? boss.health : 'N/A'}`);

    // Boss appears only if score 50+, not yet active and doesn't exist (or is defeated)
    if (score >= 50 && !isBossActive && (!boss || boss.health <= 0)) {
        // Log when condition is met
        console.log("Spawn Boss Conditions Met! Spawning Boss!");
        isBossActive = true;
        boss = {
            x: canvas.width / 2 - 50,
            y: 50,
            width: 100,
            height: 100,
            speed: 1.5, // Boss speed
            health: 35,
            direction: 1,
            lastAttack: 0, // Time since last attack
            attackCooldown: 120, // Frames between attacks (2 seconds at 60fps)
        };

        backgroundMusic.pause();
        playSound(bossMusic); // Start boss music
        bossMusic.loop = true; // Loop it
    }
}
// *** END OF CHANGES ***


function updateEnemies() {
  // Increase difficulty over time, but limit it
  enemySpeed = Math.min(baseEnemySpeed + score * 0.01, 3); // Speed grows with score
  spawnRate = Math.min(baseSpawnRate + score * 0.0001, 0.03); // Spawn rate grows slower

  for (let i = enemies.length - 1; i >= 0; i--) {
    let enemy = enemies[i];
    enemy.y += enemy.speed || enemySpeed; // Use individual speed or base speed

    let enemyImgToUse = enemyImg; // Default
    let enemyWidth = enemy.width;
    let enemyHeight = enemy.height;

    // Movement and rendering logic for different types
    if (enemy.type === 'shooter') {
        enemyImgToUse = shooterEnemyImg;
        enemy.x += enemy.direction * (enemy.speed * 0.5); // Moves horizontally
        if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
            enemy.direction *= -1;
        }
        // Shooting logic for shooting enemy (add later if needed)

    } else if (enemy.type === 'zigzag') {
        enemyImgToUse = zigzagEnemyImg;
        enemy.x += enemy.direction * enemy.speedX;
        enemy.y += enemy.speedY; // Also moves down
        if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
            enemy.direction *= -1;
        }
    }

    ctx.drawImage(enemyImgToUse, enemy.x, enemy.y, enemyWidth, enemyHeight);

    // Check collision between enemy and player
    if (
      spaceship.x < enemy.x + enemyWidth &&
      spaceship.x + spaceship.width > enemy.x &&
      spaceship.y < enemy.y + enemyHeight &&
      spaceship.y + spaceship.height > enemy.y
    ) {
      gameOver();
      return; // Stop updating enemies since game is over
    }

    // Remove enemy if it goes off the bottom edge
    if (enemy.y > canvas.height) {
      enemies.splice(i, 1);
    }
  }

  // Spawn new enemies (only if boss is not active)
  if (!isBossActive) {
      spawnEnemies(); // Basic enemies
      spawnSpecialEnemies(); // Special enemies (with increased chances)
  }
}


function updateBoss() {
  if (!isBossActive || !boss) return; // Exit if no boss

  // Boss movement
  boss.x += boss.speed * boss.direction;

  // Bounce off walls
  if (boss.x <= 0 || boss.x >= canvas.width - boss.width) {
    boss.direction *= -1;
    // Can add small downward movement on bounce
    boss.y += 5;
  }

  // Don't let boss go too low
  if (boss.y > canvas.height / 2) {
      boss.y = canvas.height / 2;
  }

  // Boss attacks with meteorites
  boss.lastAttack++;
  if (boss.lastAttack >= boss.attackCooldown) {
    // Create smaller meteorite attack from boss hands
    const meteoriteSize = Math.min(spaceship.width * 0.6, spaceship.height * 0.6); // Smaller meteorites
    
    // Shoot from boss "hands" (left and right sides)
    const leftHand = {
      x: boss.x + boss.width * 0.2 - meteoriteSize / 2,
      y: boss.y + boss.height * 0.7
    };
    const rightHand = {
      x: boss.x + boss.width * 0.8 - meteoriteSize / 2,
      y: boss.y + boss.height * 0.7
    };
    
    // Create two meteorites (from both hands)
    [leftHand, rightHand].forEach(hand => {
      bossMeteorites.push({
        x: hand.x,
        y: hand.y,
        width: meteoriteSize,
        height: meteoriteSize,
        speed: 3,
        rotation: 0, // For spinning effect
        trail: [], // Trail effect for burning
        burnIntensity: 1.0, // Burning animation intensity
      });
    });
    
    boss.lastAttack = 0; // Reset attack timer
    
    // Play boss shooting sound
    playSound(bossShootSound);
  }

  ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
}

function updateBossMeteorites() {
  // Update and draw boss meteorites
  for (let i = bossMeteorites.length - 1; i >= 0; i--) {
    let meteorite = bossMeteorites[i];
    
    // Add current position to trail
    meteorite.trail.push({
      x: meteorite.x + meteorite.width / 2,
      y: meteorite.y + meteorite.height / 2,
      life: 1.0
    });
    
    // Keep trail length manageable
    if (meteorite.trail.length > 8) {
      meteorite.trail.shift();
    }
    
    // Move meteorite down
    meteorite.y += meteorite.speed;
    meteorite.rotation += 0.15; // Faster spinning effect
    meteorite.burnIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.01); // Pulsing burn effect
    
    // Remove if off screen
    if (meteorite.y > canvas.height) {
      bossMeteorites.splice(i, 1);
      continue;
    }
    
    // Draw trail effect (fire trail)
    meteorite.trail.forEach((point, index) => {
      const alpha = point.life * (index / meteorite.trail.length);
      const size = meteorite.width * 0.3 * alpha;
      
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      
      const trailGradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size);
      trailGradient.addColorStop(0, '#ff6600');
      trailGradient.addColorStop(0.5, '#ff3300');
      trailGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = trailGradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // Fade trail points
      point.life -= 0.1;
    });
    
    // Filter out dead trail points
    meteorite.trail = meteorite.trail.filter(point => point.life > 0);
    
    // Draw main meteorite (circular with burning effect)
    const centerX = meteorite.x + meteorite.width / 2;
    const centerY = meteorite.y + meteorite.height / 2;
    const radius = meteorite.width / 2;
    
    ctx.save();
    
    // Outer glow effect
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 15 * meteorite.burnIntensity;
    
    // Main meteorite body (circular)
    const meteoriteGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
    meteoriteGradient.addColorStop(0, '#ffff99'); // Bright yellow-white center
    meteoriteGradient.addColorStop(0.3, '#ffaa00'); // Bright orange
    meteoriteGradient.addColorStop(0.7, '#ff6600'); // Orange-red
    meteoriteGradient.addColorStop(1, '#aa3300'); // Dark red edge
    
    ctx.fillStyle = meteoriteGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add burning cracks/texture
    ctx.globalAlpha = meteorite.burnIntensity * 0.7;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Draw random burning cracks
    for (let crack = 0; crack < 3; crack++) {
      const angle = meteorite.rotation + (crack * Math.PI * 2 / 3);
      const startRadius = radius * 0.3;
      const endRadius = radius * 0.8;
      
      ctx.moveTo(
        centerX + Math.cos(angle) * startRadius,
        centerY + Math.sin(angle) * startRadius
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * endRadius,
        centerY + Math.sin(angle) * endRadius
      );
    }
    ctx.stroke();
    
    ctx.restore();
  }
}

function checkCollisions() {
  // Bullets against enemies
  for (let i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    let bulletRemoved = false; // Flag so bullet doesn't destroy multiple targets

    // Against regular enemies
    for (let j = enemies.length - 1; j >= 0; j--) {
        if (bulletRemoved) break; // If bullet already hit, move to next one
        let enemy = enemies[j];
        if (
            bullet.x < enemy.x + enemy.width &&
            bullet.x + bullet.width > enemy.x &&
            bullet.y < enemy.y + enemy.height &&
            bullet.y + bullet.height > enemy.y
        ) {
            enemies.splice(j, 1); // Remove enemy
            bullets.splice(i, 1); // Remove bullet
            bulletRemoved = true;
            score += 1;
            // *** Add log to check score ***
            // console.log("Score:", score);
            playSound(explosionSound);
        }
    }

    // Against boss
    if (!bulletRemoved && isBossActive && boss && boss.health > 0) {
      if (
        bullet.x < boss.x + boss.width &&
        bullet.x + bullet.width > boss.x &&
        bullet.y < boss.y + boss.height && // Hit counts when bullet enters boss
        bullet.y + bullet.height > boss.y
      ) {
        bullets.splice(i, 1); // Remove bullet
        bulletRemoved = true;
        boss.health -= 1; // Decrease boss health
        console.log("Boss health:", boss.health); // Log boss health
        playSound(explosionSound); // Hit sound on boss

        // Check for boss destruction
        if (boss.health <= 0) {
          score += 10; // Points for boss
          isBossActive = false; // Boss no longer active
          // boss = null; // Don't remove object yet to avoid error in updateBoss
          isGameWon = true; // Set victory state

          bossMusic.pause();
          bossMusic.currentTime = 0;

          playSound(victoryMusic); // Start victory music
          // Don't loop victory music
          victoryMusic.loop = false;

          // Clear remaining enemies and bullets (just in case)
          enemies = [];
          bossMeteorites = []; // Clear boss meteorites
          // bullets = []; // Can let bullets finish flying

          // Set timer to stop victory music after 15 seconds
          if (victoryMusicTimeoutId) {
            clearTimeout(victoryMusicTimeoutId); // Clear old timer
          }
          victoryMusicTimeoutId = setTimeout(() => {
            victoryMusic.pause();
            victoryMusic.currentTime = 0;
            victoryMusicTimeoutId = null;
            console.log("Victory music stopped by timer.");
          }, 15000); // 15 seconds

          // Important: Don't break loop here, gameLoop will handle isGameWon itself
          // but break collision checking for this bullet
          break; // Exit enemy/boss checking loop for this bullet
        }
      }
    }
  }

  // Check collisions between player bullets and boss meteorites (circular collision)
  for (let i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    for (let j = bossMeteorites.length - 1; j >= 0; j--) {
      let meteorite = bossMeteorites[j];
      
      // Calculate distance between bullet center and meteorite center
      const bulletCenterX = bullet.x + bullet.width / 2;
      const bulletCenterY = bullet.y + bullet.height / 2;
      const meteoriteCenterX = meteorite.x + meteorite.width / 2;
      const meteoriteCenterY = meteorite.y + meteorite.height / 2;
      
      const distance = Math.sqrt(
        Math.pow(bulletCenterX - meteoriteCenterX, 2) + 
        Math.pow(bulletCenterY - meteoriteCenterY, 2)
      );
      
      const meteoriteRadius = meteorite.width / 2;
      const bulletRadius = Math.max(bullet.width, bullet.height) / 2;
      
      if (distance < meteoriteRadius + bulletRadius) {
        // Destroy both bullet and meteorite
        bullets.splice(i, 1);
        bossMeteorites.splice(j, 1);
        playSound(explosionSound);
        score += 1; // Bonus points for destroying meteorite
        break; // Exit meteorite loop for this bullet
      }
    }
  }

  // Check collisions between boss meteorites and player spaceship (circular collision)
  for (let i = bossMeteorites.length - 1; i >= 0; i--) {
    let meteorite = bossMeteorites[i];
    
    // Calculate distance between spaceship center and meteorite center
    const spaceshipCenterX = spaceship.x + spaceship.width / 2;
    const spaceshipCenterY = spaceship.y + spaceship.height / 2;
    const meteoriteCenterX = meteorite.x + meteorite.width / 2;
    const meteoriteCenterY = meteorite.y + meteorite.height / 2;
    
    const distance = Math.sqrt(
      Math.pow(spaceshipCenterX - meteoriteCenterX, 2) + 
      Math.pow(spaceshipCenterY - meteoriteCenterY, 2)
    );
    
    const meteoriteRadius = meteorite.width / 2;
    const spaceshipRadius = Math.max(spaceship.width, spaceship.height) / 2 * 0.8; // Slightly smaller for fairer collision
    
    if (distance < meteoriteRadius + spaceshipRadius) {
      // Player hit by meteorite - game over
      isGameOver = true;
      bossMeteorites.splice(i, 1); // Remove the meteorite that hit
      
      // Stop boss music if playing
      if (bossMusic) {
        bossMusic.pause();
        bossMusic.currentTime = 0;
      }
      
      // Stop background music
      if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
      }
      
      playSound(gameOverMusic);
      playSound(bossExplosionSound); // Louder explosion sound for player hit by boss meteorite
      break; // No need to check more meteorites
    }
  }
}

// --- Game State Logic ---
// *** CHANGES HERE: Added logs ***
function updateGameState() {
    // Log before attempting boss spawn
    // console.log("updateGameState called. Checking for boss spawn...");
    spawnBoss(); // Try to spawn boss

    // Update boss if active
    if (isBossActive && boss) {
        updateBoss();
        updateBossMeteorites(); // Update boss meteorite attacks
    }
}
// *** END OF CHANGES ***

// --- Game Over and Restart ---
function gameOver() {
  if (isGameOver) return; // Prevent multiple calls

  playSound(gameOverSound);
  playSound(explosionSound); // Add explosion sound for player collision
  isGameOver = true;
  backgroundMusic.pause(); // Stop background music
  bossMusic.pause(); // And boss music just in case
  // Don't clear screen here, gameLoop will do it
}

function restartGame() {
  console.log("Restarting game...");
  // Stop victory music and clear timer
  if (victoryMusicTimeoutId) {
    clearTimeout(victoryMusicTimeoutId);
    victoryMusicTimeoutId = null;
  }
  victoryMusic.pause();
  victoryMusic.currentTime = 0;

  // Reset all state variables
  score = 0;
  enemies = [];
  bullets = [];
  bossMeteorites = []; // Clear boss meteorites
  isGameOver = false;
  isBossActive = false;
  boss = null; // Now can safely remove boss
  isGameWon = false;
  
  // Reset spaceship position properly for current canvas size
  initializeSpaceshipPosition();
  
  // Ensure spaceship speed remains constant regardless of difficulty
  spaceship.dx = SPACESHIP_SPEED;

  // Reset difficulty
  enemySpeed = baseEnemySpeed;
  spawnRate = baseSpawnRate;

  // Reset controls
  leftPressed = false;
  rightPressed = false;
  spacePressed = false;
  touchControlsActive = false;
  leftBtnPressed = false;
  rightBtnPressed = false;

  // Hide touch controls hint when game is running
  const touchControls = document.getElementById('touchControls');
  const mobileControls = document.getElementById('mobileControls');
  
  if (isMobile) {
    if (touchControls) {
      touchControls.style.display = 'none';
    }
    if (mobileControls) {
      mobileControls.style.display = 'block';
    }
  }

  // Stop all sounds just in case
  bossMusic.pause(); bossMusic.currentTime = 0;
  gameOverSound.pause(); gameOverSound.currentTime = 0;

  // Reinitialize stars
  initializeStars();

  // Start background music
  backgroundMusic.currentTime = 0;
  playAudioSafe(backgroundMusic);

  // Start game loop again
  gameLoop();
}

// --- Initial Setup ---
function showStartScreen() {
    // Show appropriate controls for mobile/desktop
    const touchControls = document.getElementById('touchControls');
    const mobileControls = document.getElementById('mobileControls');
    
    if (isMobile) {
        if (touchControls) {
            touchControls.style.display = 'block';
        }
        if (mobileControls) {
            mobileControls.style.display = 'block';
        }
    } else {
        if (touchControls) {
            touchControls.style.display = 'none';
        }
        if (mobileControls) {
            mobileControls.style.display = 'none';
        }
    }
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('GALAXY', canvas.width / 2, canvas.height / 2 - 60);
    
    if (isMobile) {
        ctx.font = '16px Arial';
        ctx.fillText('Tap FIRE to Start', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '14px Arial';
        ctx.fillText('Use buttons to control', canvas.width / 2, canvas.height / 2 + 10);
    } else {
        ctx.font = '16px Arial';
        ctx.fillText('Press Enter to Start', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText('Arrows to Move, Space to Shoot', canvas.width / 2, canvas.height / 2 + 10);
    }
}

function startGame() {
    if (gameStarted) return; // Don't start twice
    console.log("Starting game...");
    gameStarted = true;
    
    // Hide touch controls hint but keep mobile controls visible
    const touchControls = document.getElementById('touchControls');
    const mobileControls = document.getElementById('mobileControls');
    
    if (isMobile) {
        if (touchControls) {
            touchControls.style.display = 'none';
        }
        if (mobileControls) {
            mobileControls.style.display = 'block';
        }
    }
    
    // Initialize spaceship position for current canvas size
    initializeSpaceshipPosition();
    
    initializeStars(); // Initialize stars on start
    restartGame(); // restartGame will reset everything to initial values and start gameLoop and music
}

// --- Main Game Loop ---
function gameLoop() {
    // If game not started, show start screen
    if (!gameStarted) {
        showStartScreen();
        // Don't call requestAnimationFrame here, wait for Enter in event handler
        return; // Exit function until game starts
    }

    // If game is paused, show pause overlay and continue loop
    if (isPaused) {
        // Draw pause overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '40px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        
        // Continue loop to keep rendering pause screen
        requestAnimationFrame(gameLoop);
        return;
    }

    // "Game Over" state
    if (isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '30px Arial';
      ctx.fillStyle = 'red';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '18px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
      
      if (isMobile) {
        ctx.fillText('Tap FIRE to Restart', canvas.width / 2, canvas.height / 2 + 50);
      } else {
        ctx.fillText('Press Enter to Restart', canvas.width / 2, canvas.height / 2 + 50);
      }
      // Don't call requestAnimationFrame, loop is stopped
      return;
    }

    // "Victory" state
    if (isGameWon) {
      // No need to clear since background and stars are drawn below
      // But can draw semi-transparent layer for emphasis
      ctx.fillStyle = 'rgba(0, 0, 50, 0.7)'; // Bluish background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Background first
      updateStars(); // Continue star animation

      // Then victory text
      ctx.font = '30px Arial';
      ctx.fillStyle = 'lime';
      ctx.textAlign = 'center';
      ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '18px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
      
      if (isMobile) {
        ctx.fillText('Tap FIRE for New Game', canvas.width / 2, canvas.height / 2 + 50);
      } else {
        ctx.fillText('Press Enter for New Game', canvas.width / 2, canvas.height / 2 + 50);
      }

      requestAnimationFrame(gameLoop); // Continue loop for animation and waiting for Enter
      return; // Stop rest of game logic
    }

    // ---- If game is running (not Game Over and not Win) ----

    // Clear and background (now stars are drawn first in updateStars)
    // ctx.clearRect(0, 0, canvas.width, canvas.height); // Not needed since updateStars fills background
    updateStars(); // Draw background and stars

    // Update and render ship
    drawSpaceship();
    moveSpaceship();

    // Handle shooting by flag
    if (spacePressed) {
        shoot();
        spacePressed = false; // Reset flag immediately after shot
    }

    // Update other objects
    updateBullets();
    updateEnemies(); // Includes enemy spawning
    updateGameState(); // Includes boss spawn and update
    checkCollisions(); // Check collisions

    // Render interface
    drawScore();
    drawBossHealth(); // Show boss health if present

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// --- Initial Call ---
// Don't start gameLoop immediately, wait for Enter press
showStartScreen(); // Show start screen
gameLoop(); // Start the main loop to handle start screen and input
// Loop will start after Enter press and calling startGame -> restartGame -> gameLoop

// --- Pause and Settings System ---
function initializePauseAndSettings() {
  const pauseBtn = document.getElementById('pauseBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const pauseMenu = document.getElementById('pauseMenu');
  const settingsMenu = document.getElementById('settingsMenu');
  const resumeBtn = document.getElementById('resumeBtn');
  const pauseSettingsBtn = document.getElementById('pauseSettingsBtn');
  const restartBtn = document.getElementById('restartBtn');
  const settingsBackBtn = document.getElementById('settingsBackBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  const difficultySelect = document.getElementById('difficultySelect');
  const musicToggle = document.getElementById('musicToggle');
  const soundToggle = document.getElementById('soundToggle');

  // Pause button click
  pauseBtn.addEventListener('click', () => {
    if (gameStarted && !isGameOver && !isGameWon) {
      togglePause();
    }
  });

  // Settings button click
  settingsBtn.addEventListener('click', () => {
    showSettingsMenu();
  });

  // Resume button
  resumeBtn.addEventListener('click', () => {
    togglePause();
  });

  // Settings from pause menu
  pauseSettingsBtn.addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    showSettingsMenu();
  });

  // Restart button
  restartBtn.addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    isPaused = false;
    restartGame();
  });

  // Settings back button
  settingsBackBtn.addEventListener('click', () => {
    settingsMenu.style.display = 'none';
    if (isPaused) {
      pauseMenu.style.display = 'block';
    }
  });

  // Volume slider
  volumeSlider.addEventListener('input', (e) => {
    gameSettings.volume = parseInt(e.target.value);
    volumeValue.textContent = gameSettings.volume + '%';
    updateAudioVolume();
  });

  // Difficulty select
  difficultySelect.addEventListener('change', (e) => {
    gameSettings.difficulty = e.target.value;
    applyDifficultySettings();
  });

  // Music toggle
  musicToggle.addEventListener('change', (e) => {
    gameSettings.musicEnabled = e.target.checked;
    if (gameSettings.musicEnabled) {
      if (backgroundMusic && !isGameOver && !isGameWon) {
        backgroundMusic.play();
      }
    } else {
      if (backgroundMusic) {
        backgroundMusic.pause();
      }
    }
  });

  // Sound toggle
  soundToggle.addEventListener('change', (e) => {
    gameSettings.soundEnabled = e.target.checked;
  });

  // ESC key to pause
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && gameStarted && !isGameOver && !isGameWon) {
      e.preventDefault();
      togglePause();
    }
  });
}

function togglePause() {
  isPaused = !isPaused;
  const pauseMenu = document.getElementById('pauseMenu');
  
  if (isPaused) {
    pauseMenu.style.display = 'block';
    if (backgroundMusic && gameSettings.musicEnabled) {
      backgroundMusic.pause();
    }
  } else {
    pauseMenu.style.display = 'none';
    if (backgroundMusic && gameSettings.musicEnabled && !isGameOver && !isGameWon) {
      backgroundMusic.play();
    }
  }
}

function showSettingsMenu() {
  const settingsMenu = document.getElementById('settingsMenu');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  const difficultySelect = document.getElementById('difficultySelect');
  const musicToggle = document.getElementById('musicToggle');
  const soundToggle = document.getElementById('soundToggle');

  // Update UI with current settings
  volumeSlider.value = gameSettings.volume;
  volumeValue.textContent = gameSettings.volume + '%';
  difficultySelect.value = gameSettings.difficulty;
  musicToggle.checked = gameSettings.musicEnabled;
  soundToggle.checked = gameSettings.soundEnabled;

  settingsMenu.style.display = 'block';
}

function updateAudioVolume() {
  const volume = gameSettings.volume / 100;
  if (backgroundMusic) backgroundMusic.volume = volume * 0.3;
  if (bossMusic) bossMusic.volume = volume * 0.4;
  if (victoryMusic) victoryMusic.volume = volume * 0.5;
  if (gameOverMusic) gameOverMusic.volume = volume * 0.4;
  
  // Update boss sound effects
  if (bossShootSound) bossShootSound.volume = volume * 0.4;
  if (bossExplosionSound) bossExplosionSound.volume = volume * 0.5;
  if (shootSound) shootSound.volume = volume * 0.2;
  if (explosionSound) explosionSound.volume = volume * 0.3;
}

function applyDifficultySettings() {
  // Apply difficulty multipliers - only affects enemies, NOT player ship speed
  switch (gameSettings.difficulty) {
    case 'easy':
      enemySpeed = 1;
      enemySpawnRate = 0.02;
      break;
    case 'normal':
      enemySpeed = 2;
      enemySpawnRate = 0.03;
      break;
    case 'hard':
      enemySpeed = 3;
      enemySpawnRate = 0.04;
      break;
  }
  // Note: spaceship.dx remains constant at SPACESHIP_SPEED for stable control
}

function playSound(sound) {
  if (gameSettings.soundEnabled && sound) {
    sound.currentTime = 0;
    sound.play();
  }
}
