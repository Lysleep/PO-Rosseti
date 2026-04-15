const config = {
    type: Phaser.AUTO,
    width: 600,
    height: 800,
    parent: 'game-container',
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    pixelArt: true
};

let game = new Phaser.Game(config);
let player;
let cursors;
let spaceKey;
let bullets;
let cats;
let shields;
let score = 0;
let scoreText;
let playerDamage = 1.0;
let gameState = 'START';
let inventory = [];
let timeLeft = 90;
let timerText;
let gameTimer;

function preload() {}

function create() {
    // Generate Textures Procedurally
    let graphics = this.add.graphics();
    
    // Player: A simple white triangle/ship
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.beginPath();
    graphics.moveTo(16, 0);
    graphics.lineTo(32, 32);
    graphics.lineTo(0, 32);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('player_proc', 32, 32);

    // Cat: A simple white box with ears (pixelated)
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(4, 8, 24, 20); // body
    graphics.fillRect(4, 0, 6, 8);   // left ear
    graphics.fillRect(22, 0, 6, 8);  // right ear
    graphics.generateTexture('cat_proc', 32, 32);

    // Shield: A greyish block
    graphics.clear();
    graphics.fillStyle(0x888888, 1);
    graphics.fillRect(0, 0, 20, 20);
    graphics.generateTexture('shield_proc', 20, 20);

    // Bullet: A small rectangle
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 12);
    graphics.generateTexture('bullet_proc', 4, 12);
    
    graphics.destroy();

    // Create Game Objects
    player = this.physics.add.sprite(300, 750, 'player_proc');
    player.setCollideWorldBounds(true);

    bullets = this.physics.add.group({
        defaultKey: 'bullet_proc',
        maxSize: 10
    });

    cats = this.physics.add.group();
    shields = this.physics.add.staticGroup();

    createCats.call(this);
    createShields.call(this);

    cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D');
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    scoreText = this.add.text(16, 16, 'Gatos: 0/10', { 
        fontSize: '24px', 
        fill: '#fff',
        fontFamily: '"Courier New", Courier, monospace'
    });

    timerText = this.add.text(400, 16, 'Tempo: 01:30', {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: '"Courier New", Courier, monospace'
    });

    // Collisions
    this.physics.add.overlap(bullets, cats, hitCat, null, this);
    this.physics.add.collider(bullets, shields, hitShield, null, this);

    showInstructions.call(this);
}

function update() {
    if (gameState !== 'PLAYING') return;

    if (cursors.left.isDown || (this.keys.A && this.keys.A.isDown)) {
        player.setVelocityX(-300);
    } else if (cursors.right.isDown || (this.keys.D && this.keys.D.isDown)) {
        player.setVelocityX(300);
    } else {
        player.setVelocityX(0);
    }

    // Update Timer
    if (gameState === 'PLAYING') {
        timeLeft -= game.loop.delta / 1000;
        if (timeLeft <= 0) {
            timeLeft = 0;
            showGameOver.call(this);
        }
        let mins = Math.floor(timeLeft / 60);
        let secs = Math.floor(timeLeft % 60);
        timerText.setText(`Tempo: ${mins}:${secs < 10 ? '0' : ''}${secs}`);
    }

    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        fireBullet.call(this);
    }

    bullets.children.each(function(b) {
        if (b.active && b.y < 0) {
            b.setActive(false);
            b.setVisible(false);
            b.body.velocity.y = 0;
        }
    }.bind(this));
}

function fireBullet() {
    let bullet = bullets.get(player.x, player.y - 20);
    if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.body.velocity.y = -500;
    }
}

function createCats() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 4; j++) {
            let cat = cats.create(80 + i * 60, 100 + j * 50, 'cat_proc');
            cat.health = 5.0;
            
            // Movement: go 40px right, then back, repeat every 1s
            this.tweens.add({
                targets: cat,
                x: cat.x + 40,
                duration: 1000,
                ease: 'Linear',
                yoyo: true,
                repeat: -1
            });
        }
    }
}

function createShields() {
    for (let i = 0; i < 4; i++) {
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 2; y++) {
                let shield = shields.create(100 + i * 140 + x * 20, 600 + y * 20, 'shield_proc');
                shield.health = 8;
            }
        }
    }
}

function hitCat(bullet, cat) {
    if (!bullet.active) return;
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.body.velocity.y = 0;

    cat.health -= playerDamage;
    
    this.tweens.add({
        targets: cat,
        alpha: 0.5,
        duration: 50,
        yoyo: true
    });

    if (cat.health <= 0) {
        cat.destroy();
        score++;
        scoreText.setText('Gatos: ' + score + '/10');
        
        if (score >= 10) {
            openShop.call(this);
        }
    }
}

function hitShield(bullet, shield) {
    if (!bullet.active) return;
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.body.velocity.y = 0;

    shield.health -= 1;
    
    if (shield.health <= 0) {
        shield.destroy();
    } else {
        shield.setAlpha(shield.health / 8);
    }
}

function openShop() {
    gameState = 'SHOP';
    this.physics.world.pause();
    
    let shopBg = this.add.rectangle(300, 400, 450, 500, 0x000000).setStrokeStyle(4, 0xffffff);
    let shopTitle = this.add.text(300, 200, 'LOJA DE RESGATE', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    
    let item1 = this.add.text(300, 300, '1. Racao Premium (Dano 2.5) [10 Gatos]', { fontSize: '18px', fill: '#fff' }).setOrigin(0.5).setInteractive();
    let item2 = this.add.text(300, 360, '2. Laser Ultra-Forte (Dano 5.0) [10 Gatos]', { fontSize: '18px', fill: '#fff' }).setOrigin(0.5).setInteractive();
    let closeBtn = this.add.text(300, 550, '[ VER INVENTARIO ]', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5).setInteractive();

    item1.on('pointerdown', () => {
        if (score >= 10) {
            score -= 10;
            scoreText.setText('Gatos: ' + score + '/10');
            addToInventory('Racao Premium', 2.5);
            item1.setText('COMPRADO!');
            item1.disableInteractive();
        }
    });

    item2.on('pointerdown', () => {
        if (score >= 10) {
            score -= 10;
            scoreText.setText('Gatos: ' + score + '/10');
            addToInventory('Laser Ultra-Forte', 5.0);
            item2.setText('COMPRADO!');
            item2.disableInteractive();
        }
    });

    closeBtn.on('pointerdown', () => {
        shopBg.destroy(); shopTitle.destroy(); item1.destroy(); item2.destroy(); closeBtn.destroy();
        openInventory.call(this);
    });
}

function addToInventory(name, damage) {
    inventory.push({ name, damage });
}

function openInventory() {
    gameState = 'INVENTORY';
    
    let invBg = this.add.rectangle(300, 400, 450, 500, 0x000000).setStrokeStyle(4, 0xffffff);
    let invTitle = this.add.text(300, 200, 'INVENTARIO', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    
    let items = [];
    inventory.forEach((item, index) => {
        let txt = this.add.text(300, 280 + index * 40, `Equipar: ${item.name}`, { fontSize: '18px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        txt.on('pointerdown', () => {
            playerDamage = item.damage;
            alert(`Equipado: ${item.name}! Dano: ${playerDamage}`);
        });
        items.push(txt);
    });

    let startBtn = this.add.text(300, 550, '[ VOLTAR AO JOGO ]', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5).setInteractive();
    
    startBtn.on('pointerdown', () => {
        invBg.destroy(); invTitle.destroy(); startBtn.destroy();
        items.forEach(i => i.destroy());
        gameState = 'PLAYING';
        this.physics.world.resume();
        if (cats.countActive() === 0) createCats.call(this);
    });
}
function showInstructions() {
    this.physics.world.pause();
    
    let bg = this.add.rectangle(300, 400, 550, 650, 0x000000).setStrokeStyle(4, 0xffffff);
    let title = this.add.text(300, 120, 'CAT INVADERS', { fontSize: '36px', fill: '#fff', fontWeight: 'bold' }).setOrigin(0.5);
    
    let story = "Voce e o 'Louco dos Gatos'. Entidades ocultas estao levando\nseus gatinhos para o espaco! Use seu lancador de petiscos\npara convence-los a descer e morar com voce.";
    let storyTxt = this.add.text(300, 200, story, { fontSize: '15px', fill: '#fff', align: 'center' }).setOrigin(0.5);

    let rules = [
        "1. Atirar: Barra de Espaco",
        "2. Movimentacao: Teclas A / D ou Setas",
        "3. Objetivo: Acerte os petiscos nos gatos para resgata-los",
        "4. Loja: Abre automaticamente ao atingir 10 gatos",
        "5. Compra: Use seus gatos resgatados para comprar itens",
        "6. Retorno: Equipe o item no inventario e volte ao jogo",
        "7. Tempo: Voce tem 01:30 para resgatar o máximo de gatos!"
    ];

    let rulesTxt = this.add.text(60, 280, rules.join('\n\n'), { fontSize: '16px', fill: '#fff', align: 'left' });

    let startBtn = this.add.text(300, 680, '[ CLIQUE PARA INICIAR ]', { fontSize: '24px', fill: '#fff', backgroundColor: '#333', padding: 10 }).setOrigin(0.5).setInteractive();

    startBtn.on('pointerdown', () => {
        bg.destroy(); title.destroy(); storyTxt.destroy(); rulesTxt.destroy(); startBtn.destroy();
        gameState = 'PLAYING';
        this.physics.world.resume();
    });
}

function showGameOver() {
    gameState = 'GAMEOVER';
    this.physics.world.pause();
    
    let bg = this.add.rectangle(300, 400, 450, 400, 0x000000).setStrokeStyle(4, 0xffffff);
    let title = this.add.text(300, 300, 'FIM DE JOGO', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
    let finalScoreText = this.add.text(300, 380, `Gatos resgatados: ${score}`, { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
    
    let replayBtn = this.add.text(300, 500, '[ REPLAY ]', { fontSize: '32px', fill: '#fff', backgroundColor: '#333', padding: 10 }).setOrigin(0.5).setInteractive();

    replayBtn.on('pointerdown', () => {
        score = 0;
        timeLeft = 90;
        playerDamage = 1.0;
        inventory = [];
        this.scene.restart();
    });
}
