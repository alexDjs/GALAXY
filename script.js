// Получаем доступ к canvas и контексту
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 320;
canvas.height = 480;

// Загрузка изображений
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

// Звуковые эффекты
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

// Звёздный фон
let stars = [];

// Инициализация звёзд
function initializeStars() {
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1, // Размер звезды
      speed: Math.random() * 1 + 0.5, // Скорость движения звезды
    });
  }
}

// Обновление и отрисовка звёзд
function updateStars() {
  stars.forEach((star) => {
    star.y += star.speed; // Движение звезды вниз

    // Перемещение звезды наверх, если она выходит за пределы экрана
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
      star.size = Math.random() * 1 + 0.5;
      star.speed = Math.random() * 1 + 0.5;
    }

    // Рисуем звезду
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Вызываем функцию инициализации звёзд
initializeStars();

// Определяем корабль игрока
let spaceship = {
  x: canvas.width / 2 - 15,
  y: canvas.height - 50,
  width: 45,
  height: 45,
  dx: 5,
};

// Пули, враги и очки
let bullets = [];
let enemies = [];
let score = 0;

// Инициализация скорости врагов и частоты их появления
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

// Обработчики событий
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

// Рисование корабля
function drawSpaceship() {
  ctx.drawImage(spaceshipImg, spaceship.x, spaceship.y, spaceship.width, spaceship.height);
}

// Движение корабля
function moveSpaceship() {
  if (leftPressed && spaceship.x > 0) spaceship.x -= spaceship.dx;
  if (rightPressed && spaceship.x < canvas.width - spaceship.width) spaceship.x += spaceship.dx;
}

// Стрельба
function shoot() {
  bullets.push({ x: spaceship.x + spaceship.width / 2 - 2, y: spaceship.y });
  playSound(shootSound);
}

// Обновление пуль
function updateBullets() {
  bullets = bullets.filter((bullet) => bullet.y > 0);
  bullets.forEach((bullet) => {
    bullet.y -= 5;
    ctx.drawImage(bulletImg, bullet.x, bullet.y, 5, 10);
  });
}

// Появление врагов
function spawnEnemies() {
  if (Math.random() < spawnRate) {
    const x = Math.floor(Math.random() * (canvas.width - 20));
    enemies.push({ x, y: -20, type: 'basic' });
  }
}

// Появление специальных врагов
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

// Спавн босса
function spawnBoss() {
  // Босс появляется только если счет равен 50 и его здоровье больше 0
  if (isBossActive || score !== 100|| (boss && boss.health <= 0)) return;

  isBossActive = true;
  boss = {
    x: canvas.width / 2 - 50,
    y: 50,
    width: 100,
    height: 100,
    speed: 2,
    health: 20,  // Устанавливаем здоровье босса
    direction: 1,
  };

  backgroundMusic.pause();
  bossMusic.currentTime = 0;
  bossMusic.loop = true;
  bossMusic.play();
}


// Обновление врагов
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

// Обновление босса
function updateBoss() {
  if (!boss || boss.health <= 0) {
    // Босс уничтожен, обновляем состояние
    isBossActive = false;
    boss = null;  // Удаляем босса
    bossMusic.pause();  // Останавливаем музыку
    victoryMusic.currentTime = 0;
    victoryMusic.play();  // Включаем музыку победы
    return;  // Выходим из функции
  }

  // Двигаем босса
  boss.x += boss.speed * boss.direction;

  // Отражаем босса от стен
  if (boss.x <= 0 || boss.x >= canvas.width - boss.width) {
    boss.direction *= -1;
  }

  // Отображаем босса
  ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
}


// Проверка столкновений с боссом
function checkCollisions() {
  bullets.forEach((bullet, bulletIndex) => {
    // Проверка столкновений с обычными врагами
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

    // Проверка столкновения пули с боссом
    if (
      isBossActive &&
      boss &&
      bullet.x < boss.x + boss.width &&
      bullet.x + 5 > boss.x &&
      bullet.y < boss.y + boss.height &&
      bullet.y + 10 > boss.y
    ) {
      bullets.splice(bulletIndex, 1);
      boss.health -= 1; // Уменьшаем здоровье босса на 1

      // Если здоровье босса <= 0, уничтожаем его
      if (boss.health <= 0) {
        score += 5;  // Дополнительные очки за уничтожение босса
        isBossActive = false; // Босс больше не активен
        boss = null; // Удаляем босса
        bossMusic.pause();  // Останавливаем музыку
        victoryMusic.currentTime = 0;
        victoryMusic.play();  // Включаем музыку победы
        playSound(explosionSound);  // Звук взрыва
      }
    }
  });
}


// Логика игрового состояния
function updateGameState() {
  // Босс появляется только если счет равен 50 и его здоровье больше 0
  if (score === 50 && !isBossActive && (!boss || boss.health > 0)) {
    console.log("Attempting to spawn boss");
    spawnBoss(); // Спавн босса, если его нет и счет равен 50
  }

  // Если босс активен, обновляем его
  if (isBossActive) {
    updateBoss();
  }
}


// Отрисовка очков
function drawScore() {
  ctx.font = '15px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'right';
  ctx.fillText('Score: ' + score, canvas.width - 10, 20);
}

// Конец игры
function gameOver() {
  playSound(gameOverSound);
  isGameOver = true;

  ctx.font = '25px Arial';
  ctx.fillStyle = 'red';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
  ctx.fillText('Press Enter to Restart', canvas.width / 2, canvas.height / 2 + 40);
}

// Перезапуск игры
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

// Основной игровой цикл
function gameLoop() {
  if (isGameOver) return;

  // Очистка экрана
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Обновление и отрисовка звёздного фона
  updateStars();

  // Обновление состояния и отрисовка корабля игрока
  drawSpaceship();
  moveSpaceship();

  // Обработка стрельбы
  if (spacePressed) {
    shoot();
    spacePressed = false;
  }

  // Обновление остальных игровых объектов
  updateBullets();
  updateEnemies();
  checkCollisions();
  updateGameState();

  // Отрисовка интерфейса (например, очков)
  drawScore();

  // Запуск следующего кадра
  requestAnimationFrame(gameLoop);
}

// Запуск игры
gameLoop();
