// Access canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 320;
canvas.height = 480;

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

// Sound effects
const shootSound = new Audio('sounds/shoot.mp3');
const explosionSound = new Audio('sounds/explosion.mp3');
const gameOverSound = new Audio('sounds/gameover.mp3');
const bossMusic = new Audio('sounds/boss.mp3');
const victoryMusic = new Audio('sounds/victory.mp3');
const backgroundMusic = new Audio('sounds/background.mp3');

explosionSound.volume = 0.3;
shootSound.volume = 0.2;

backgroundMusic.loop = true;
backgroundMusic.volume = 0.3;
backgroundMusic.play();

// Star background
let stars = [];

// Initialize stars
function initializeStars() {
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1, // Star size
      speed: Math.random() * 1 + 0.5, // Star movement speed
    });
  }
}

//Updating and drawing stars
function updateStars() {
  stars.forEach((star) => {
    star.y += star.speed; // Star movement down

    // Move the star up if it goes off screen
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
      star.size = Math.random() * 1 + 0.5;
      star.speed = Math.random() * 1 + 0.5;
    }

    // Drawing a star
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Calling the star initialization function
initializeStars();

// Determining the player's ship
let spaceship = {
  x: canvas.width / 2 - 15,
  y: canvas.height - 50,
  width: 45,
  height: 45,
  dx: 5,
};

// Bullets, enemies and glasses
let bullets = [];
let enemies = [];
let score = 0;

// Initializing enemy speed and spawn frequency
let enemySpeed = 0.05;
let spawnRate = 0.001;
const speedIncrement = 0.0005;
const spawnRateIncrement = 0.00005;

let isGameOver = false;
let isBossActive = false;
let boss = null;

let leftPressed = false;
let rightPressed = false;
let spacePressed = false;

//Event Handlers
document.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft') leftPressed = true;
  if (e.code === 'ArrowRight') rightPressed = true;
  if (e.code === 'Space') spacePressed = true;
  if (isGameOver && e.code === 'Enter') restartGame();
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft') leftPressed = false;
  if (e.code === 'ArrowRight') rightPressed = false;
  if (e.code === 'Space') spacePressed = false;
});

function playSound(sound) {
  sound.currentTime = 0;
  sound.play();
}

// Drawing a ship
function drawSpaceship() {
  ctx.drawImage(spaceshipImg, spaceship.x, spaceship.y, spaceship.width, spaceship.height);
}

// Ship movement
function moveSpaceship() {
  if (leftPressed && spaceship.x > 0) spaceship.x -= spaceship.dx;
  if (rightPressed && spaceship.x < canvas.width - spaceship.width) spaceship.x += spaceship.dx;
}

// Shooting
function shoot() {
  bullets.push({ x: spaceship.x + spaceship.width / 2 - 2, y: spaceship.y });
  playSound(shootSound);
}

// Bullet update
function updateBullets() {
  bullets = bullets.filter((bullet) => bullet.y > 0);
  bullets.forEach((bullet) => {
    bullet.y -= 5;
    ctx.drawImage(bulletImg, bullet.x, bullet.y, 5, 10);
  });
}

// Enemies Appear
function spawnEnemies() {
  if (Math.random() < spawnRate) {
    const x = Math.floor(Math.random() * (canvas.width - 20));
    enemies.push({ x, y: -20, type: 'basic' });
  }
}

// Special Enemies Appear
function spawnSpecialEnemies() {
  if (score >= 25 && enemies.every((e) => e.type !== 'shooter')) {
    enemies.push({
      x: Math.floor(Math.random() * (canvas.width - 30)),
      y: -20,
      width: 45,
      height: 45,
      type: 'shooter',
      direction: 1,
    });
  }

  if (score >= 35 && enemies.every((e) => e.type !== 'zigzag')) {
    enemies.push({
      x: Math.floor(Math.random() * (canvas.width - 40)),
      y: -20,
      width: 40,
      height: 40,
      type: 'zigzag',
      direction: 1,
    });
  }

  if (score >= 50 && !isBossActive) {
    spawnBoss();
  }
}

// Boss Spawn
function spawnBoss() {
  // The boss only appears if the score is 50 and his health is greater than 0
  if (isBossActive || score !== 50|| (boss && boss.health <= 0)) return;

  isBossActive = true;
  boss = {
    x: canvas.width / 2 - 50,
    y: 50,
    width: 100,
    height: 100,
    speed: 2,
    health: 35,  // Setting the boss's health
    direction: 1,
  };

  backgroundMusic.pause();
  bossMusic.currentTime = 0;
  bossMusic.loop = true;
  bossMusic.play();
}


// Enemy Update
function updateEnemies() {
  enemySpeed = Math.min(enemySpeed + speedIncrement, 0.5);
  spawnRate = Math.min(spawnRate + spawnRateIncrement, 0.03);

  enemies.forEach((enemy, i) => {
    enemy.y += enemySpeed;

    let enemyImgToUse = enemyImg;
    if (enemy.type === 'shooter') enemyImgToUse = shooterEnemyImg;
    else if (enemy.type === 'zigzag') enemyImgToUse = zigzagEnemyImg;

    ctx.drawImage(enemyImgToUse, enemy.x, enemy.y, 40, 40);

    if (
      enemy.y > canvas.height - spaceship.height &&
      enemy.x > spaceship.x &&
      enemy.x < spaceship.x + spaceship.width
    ) {
      gameOver();
    }

    if (enemy.y > canvas.height) {
      enemies.splice(i, 1);
    }

    if (enemy.type === 'zigzag') {
      enemy.x += enemy.direction * 2;
      if (enemy.x <= 0 || enemy.x >= canvas.width - 40) {
        enemy.direction *= -1;
      }
    }
  });

  spawnEnemies();
  spawnSpecialEnemies();
}

// Boss Update
function updateBoss() {
  if (!boss || boss.health <= 0) {
    // The boss is destroyed, update the status
    isBossActive = false;
    boss = null;  // Removing the boss
    bossMusic.pause();  // Stop the music
    victoryMusic.currentTime = 0;
    victoryMusic.play();  // Let's turn on the music of victory
    return;  // Exiting the function
  }

  // Moving the boss
  boss.x += boss.speed * boss.direction;

  // Reflecting the boss from the walls
  if (boss.x <= 0 || boss.x >= canvas.width - boss.width) {
    boss.direction *= -1;
  }

  // Displaying the boss
  ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
}


// Checking boss encounters
function checkCollisions() {
  bullets.forEach((bullet, bulletIndex) => {
    // Checking encounters with regular enemies
    enemies.forEach((enemy, enemyIndex) => {
      if (
        bullet.x < enemy.x + 20 &&
        bullet.x + 5 > enemy.x &&
        bullet.y < enemy.y + 20 &&
        bullet.y + 10 > enemy.y
      ) {
        bullets.splice(bulletIndex, 1);
        enemies.splice(enemyIndex, 1);
        score += 1;
        playSound(explosionSound);
      }
    });

    // Checking the impact of a bullet with a boss
    if (
      isBossActive &&
      boss &&
      bullet.x < boss.x + boss.width &&
      bullet.x + 5 > boss.x &&
      bullet.y < boss.y + boss.height &&
      bullet.y + 10 > boss.y
    ) {
      bullets.splice(bulletIndex, 1);
      boss.health -= 1; // Reduce the boss's health by 1

      // If the boss' health is <= 0, destroy him
      if (boss.health <= 0) {
        score += 5;  // Extra points for defeating a boss
        isBossActive = false; // Boss is no longer active
        boss = null; // Removing the boss
        bossMusic.pause();  // Stop the music
        victoryMusic.currentTime = 0;
        victoryMusic.play();  // Let's turn on the music of victory
        playSound(explosionSound);  // Explosion sound
      }
    }
  });
}


// Game State Logic
function updateGameState() {
 // The boss appears only if the score is 50 and his health is greater than 0
  if (score === 50 && !isBossActive && (!boss || boss.health > 0)) {
    console.log("Attempting to spawn boss");
    spawnBoss(); //Boss spawn if there is no boss and the score is 50
  }

  // If the boss is active, update it
  if (isBossActive) {
    updateBoss();
  }
}


// Drawing glasses
function drawScore() {
  ctx.font = '15px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'right';
  ctx.fillText('Score: ' + score, canvas.width - 10, 20);
}

// The end of the game
function gameOver() {
  playSound(gameOverSound);
  isGameOver = true;

  ctx.font = '25px Arial';
  ctx.fillStyle = 'red';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
  ctx.fillText('Press Enter to Restart', canvas.width / 2, canvas.height / 2 + 40);
}

// Restarting the game
function restartGame() {
  score = 0;
  enemies = [];
  bullets = [];
  isGameOver = false;
  isBossActive = false;
  boss = null;
  spaceship.x = canvas.width / 2 - 15;

  bossMusic.pause();
  backgroundMusic.play();

  gameLoop();
}

// Main game loop
function gameLoop() {
  if (isGameOver) return;

  // Clearing the screen
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update and render the starry background
  updateStars();

  // Updating the status and visualizing the status of a graceful
  drawSpaceship();
  moveSpaceship();

  // Shooting processing
  if (spacePressed) {
    shoot();
    spacePressed = false;
  }

  // Updating other game objects
  updateBullets();
  updateEnemies();
  checkCollisions();
  updateGameState();

  // Rendering the interface (for example, glasses)
  drawScore();

  // Start next frame
  requestAnimationFrame(gameLoop);
}

// Starting the game
gameLoop();
