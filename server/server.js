var io = require('sandbox-io');
var generator = require('./level_generation.js');

var running_games = {};
var waiting_games = {};
var players = [];

// ----------- Game object ---------- //

function Game(players_amount, width, height, castles_amount, duration) {
    this.id = 'game' + Math.random();
    this.players_amount = players_amount;
    this.players = [];
    this.castles_amount = castles_amount;
    this.width = width;
    this.height = height;
    this.duration = duration;
    this.playing = false;
    this.finished = false;
    waiting_games[this.id] = this;
    return this;
}

Game.prototype.start = function() {
    this.create_level();
    running_games[this.id] = this;
    delete waiting_games[this.id];
    this.start_time = Date.now();
    this.send_level();
    this.duration += 1000;
    setTimeout(this.tic.bind(this), 1000);
};

Game.prototype.tic = function() {
    if (this.finished) {
        return ;
    }
    this.update_actions();
    this.update();
    this.send_level();
    setTimeout(this.tic.bind(this), 16);    // 60 turns per second
    // setTimeout(this.tic.bind(this), 33);   // 30 turns per second
};

Game.prototype.send_level = function() {
    var tanks = [];
    for (var i = 0 ; i < this.level.tanks.length ; i++ ) {
        tanks.push({
                y: this.level.tanks[i].y,
                x: this.level.tanks[i].x,
                direction: this.level.tanks[i].direction,
                color: this.level.tanks[i].color
            }
        );
    }
    var data = {
        grid: this.level.grid,
        tanks: tanks,
        castles: this.level.castles,
        bullets: this.level.bullets,
        dude_size: this.level.dude_size,
        bullet_size: this.level.bullet_size,
        remaining_time: (this.duration - (Date.now() - this.start_time)) / 1000,
        bullet_sound: this.level.bullet_sound
    };
    io.to(this.id).emit('level', { level: data });
};

Game.prototype.add_player = function(player) {
    this.players.push(player);
    if (this.players.length == this.players_amount) {
        this.start();
    }
    else {
        //player.socket.emit('news', { message: 'You have joined the game. Waiting for ' + (this.players_amount - this.players.length) + ' more players.' });
    }
};

Game.prototype.remove_player = function(player) {
    this.players = this.players.filter(function (p) { return p.color !== player.color; });
    if (this.players.length === 0) {
        this.end();
    }
};

Game.prototype.update_actions = function() {
    for (var i = 0 ; i < this.level.tanks.length ; i++) {
        this.level.tanks[i].direction = this.level.tanks[i].player.direction;
        this.level.tanks[i].moving = this.level.tanks[i].player.moving;
        this.level.tanks[i].shoot = this.level.tanks[i].player.shoot;
    }
};

Game.prototype.end = function() {
    for (var i = 0 ; i < this.players.length ; i++) {
        this.players[i].exit();
    }
    if (this.playing == true) {
        delete running_games[this.id];
    }
    else {
        delete waiting_games[this.id];
    }
};

Game.prototype.create_level = function() {
    // Create empty grid
    var grid = [];
    for (var y = 0 ; y < this.height ; y++) {
        grid[y] = [];
        for (var x = 0 ; x < this.width ; x++) {
            grid[y][x] = 0;
        }
    }
    // Add walls
    generator.prim(grid, {width: this.width, height: this.height});
    // All border are walkable
    for (var y = 0 ; y < this.height ; y++) {
        for (var x = 0 ; x < this.width ; x++) {
            if (y == 0 || x == 0 || y == this.height - 1 || x == this.width - 1) {
                grid[y][x] = 1;
            }
        }
    }
    // Add castles
    var occupied_spots = [];
    var castles = generator.generate_castles(this.players, this.castles_amount, grid, this.width, this.height, occupied_spots)
    // Add tanks
    var tanks = generator.generate_tanks(this.players, grid, this.width, this.height, occupied_spots);
    // Complete level
    this.level = {
        grid: grid,
        tanks: tanks,
        castles: castles,
        bullets: [],
        dude_size: 0.6,
        bullet_size: 0.05,
        step: 0.02,
        bullet_step: 0.05,
        bullet_sound: false
    };
};

// ----------- Game update ---------- //

// ---------    Tank --------- //

Game.prototype.collision = function(rect1, rect2) {
    closeness = 1;
    return Math.abs(rect1.x - rect2.x) < closeness * this.level.dude_size && Math.abs(rect1.y - rect2.y) < closeness * this.level.dude_size;
};

Game.prototype.out_of_grid_check = function(tank) {
    // Leaves top
    if (tank.y < 0) {
        tank.y = 0;
    }
    // Leaves bottom
    else if (tank.y + this.level.dude_size >= this.height) {
        tank.y = this.height - this.level.dude_size;
    }
    // Leaves left
    if (tank.x < 0) {
        tank.x = 0;
    }
    // Leaves right
    else if (tank.x + this.level.dude_size >= this.width) {
        tank.x = this.width - this.level.dude_size;
    }
};

Game.prototype.hit_wall_check = function(tank) {
    var tol = 1e-5;
    var left_x = Math.max((tank.x + tol) | 0, 0);
    var right_x = Math.min((tank.x + this.level.dude_size - tol)    | 0, this.width - 1);
    var top_y = Math.max((tank.y + tol)    | 0, 0);
    var bottom_y = Math.min((tank.y + this.level.dude_size - tol)    | 0, this.height - 1);
    // Top
    if (tank.direction == 0 && (this.level.grid[top_y][left_x] !== 1 || this.level.grid[top_y][right_x] !== 1)) {
        tank.y = top_y + 1;
    }
    // Bottom
    else if (tank.direction == 3 && (this.level.grid[bottom_y][left_x] !== 1 || this.level.grid[bottom_y][right_x] !== 1)) {
        tank.y = top_y + 1 - this.level.dude_size;
    }
    // Right
    else if (tank.direction == 1 && (this.level.grid[top_y][right_x] !== 1 || this.level.grid[bottom_y][right_x] !== 1)) {
        tank.x = left_x + 1 - this.level.dude_size;
    }
    // Left
    else if (tank.direction == 2 && (this.level.grid[top_y][left_x] !== 1 || this.level.grid[bottom_y][left_x] !== 1)) {
        tank.x = left_x + 1;
    }
};

Game.prototype.hit_tank_check = function(tank) {
    // Check all tanks
    for (var i = 0 ; i < this.level.tanks.length ; i++) {
        // Avoid self
        if (tank.color == this.level.tanks[i].color) {
            continue;
        }
        // Hits
        // Top
        if (tank.direction == 0 && this.collision(tank, this.level.tanks[i]) && tank.y > this.level.tanks[i].y) {
            tank.y = this.level.tanks[i].y + this.level.dude_size;
        }
        // Right
        else if (tank.direction == 1 && this.collision(tank, this.level.tanks[i]) && tank.x < this.level.tanks[i].x) {
            tank.x = this.level.tanks[i].x - this.level.dude_size;
        }
        // Left
        else if (tank.direction == 2 && this.collision(tank, this.level.tanks[i]) && tank.x > this.level.tanks[i].x) {
            tank.x = this.level.tanks[i].x + this.level.dude_size;
        }
        // Bottom
        else if (tank.direction == 3 && this.collision(tank, this.level.tanks[i]) && tank.y < this.level.tanks[i].y) {
            tank.y = this.level.tanks[i].y - this.level.dude_size;
        }
    }
};

Game.prototype.move_tank = function(tank) {
    // Move up
    if (!tank.moving) {
        return ;
    }
    if (tank.direction == 0) {
        tank.y -= this.level.step;
    }
    // Move right
    else if (tank.direction == 1) {
        tank.x += this.level.step;
    }
    // Move left
    else if (tank.direction == 2) {
        tank.x -= this.level.step;
    }
    // Move bottom
    else if (tank.direction == 3) {
        tank.y += this.level.step;
    }
    this.out_of_grid_check(tank);
    this.hit_wall_check(tank);
    this.hit_tank_check(tank);
};

Game.prototype.shoot = function(tank) {
    if (!tank.shoot || tank.reload > 0) {
        return ;
    }
    var x, y, start = 0.05;
    if (tank.direction == 0) {
        x = tank.x + this.level.dude_size / 2;
        y = tank.y - start;
    }
    else if (tank.direction == 1) {
        x = tank.x + this.level.dude_size + start;
        y = tank.y + this.level.dude_size / 2;
    }
    else if (tank.direction == 2) {
        x = tank.x - start;
        y = tank.y + this.level.dude_size / 2;
    }
    else if (tank.direction == 3) {
        x = tank.x + this.level.dude_size / 2;
        y = tank.y + this.level.dude_size + start;
    }
    var bullet = {
        color: tank.color,
        direction: tank.direction,
        x: x,
        y: y
    };
    this.level.bullets.push(bullet);
    tank.shoot = false;
    tank.reload = 30;
    this.level.bullet_sound = true;
};

Game.prototype.update_tank = function(tank) {
    tank.reload = Math.max(0, tank.reload - 1);
    this.move_tank(tank);
    this.shoot(tank);
};

// ---------    Bullet --------- //

Game.prototype.move_bullet = function(bullet) {
    // Move up
    if (bullet.direction == 0) {
        bullet.y -= this.level.bullet_step;
    }
    // Move right
    else if (bullet.direction == 1) {
        bullet.x += this.level.bullet_step;
    }
    // Move left
    else if (bullet.direction == 2) {
        bullet.x -= this.level.bullet_step;
    }
    // Move bottom
    else if (bullet.direction == 3) {
        bullet.y += this.level.bullet_step;
    }
};

Game.prototype.bullet_hits = function(bullet) {
    // Out of grid
    if (bullet.x < 0 || bullet.y < 0 || bullet.x > this.width || bullet.y > this.height) {
        return false;
    }
    // Hit wall
    else if (this.level.grid[bullet.y | 0][bullet.x | 0] === 0) {
        return false;
    }
    // Hits tank
    for (var i = 0 ; i < this.level.tanks.length ; i++) {
        if (bullet.color !== this.level.tanks[i].color &&
            bullet.x > this.level.tanks[i].x &&
            bullet.x < this.level.tanks[i].x + this.level.dude_size &&
            bullet.y > this.level.tanks[i].y &&
            bullet.y < this.level.tanks[i].y + this.level.dude_size
            ) {
            // Switch tank colors
            for (var j = 0 ; j < this.level.tanks.length ; j++) {
                if (this.level.tanks[j].color == bullet.color) {
                    this.level.tanks[j].color = this.level.tanks[i].color;
                    this.level.tanks[j].player.color = this.level.tanks[i].color;
                }
            }
            this.level.tanks[i].color = bullet.color;
            this.level.tanks[i].player.color = bullet.color;
            return false;
        }
    }
    // Hits castle
    for (var i = 0 ; i < this.level.castles.length ; i++) {
        if (bullet.x > this.level.castles[i].x &&
            bullet.x < this.level.castles[i].x + 1 &&
            bullet.y > this.level.castles[i].y &&
            bullet.y < this.level.castles[i].y + 1
            ) {
            this.level.castles[i].color = bullet.color;
            return false;
        }
    }
    return true;
};

Game.prototype.check_winners = function() {
    // Get how many castles each tank conquered
    var tank_castles = {};
    for (var i = 0 ; i < this.level.tanks.length ; i++) {
        tank_castles[this.level.tanks[i].color] = 0;
    }
    for (var i = 0 ; i < this.level.castles.length ; i++) {
        tank_castles[this.level.castles[i].color] += 1;
    }
    // Sort by conquered castles
    var results = [];
    for (var i = 0 ; i < this.level.tanks.length ; i++) {
        results.push([this.level.tanks[i].color, tank_castles[this.level.tanks[i].color]]);
    }
    results.sort(function(a, b) {return b[1] - a[1]});
    // Add positions to conquered castles
    results[0] = [1, results[0][0], results[0][1]];
    for (var i = 1 ; i < results.length ; i++) {
        if (results[i][1] == results[i - 1][2]) {
            results[i] = [results[i - 1][0], results[i][0], results[i][1]];
        }
        else {
            results[i] = [results[i - 1][0] + 1, results[i][0], results[i][1]];
        }
        
    }
    return results;
};

Game.prototype.update = function() {
    // Clear sounds
    this.level.bullet_sound = false;
    // Update tanks
    for (var i = 0 ; i < this.level.tanks.length ; i++) {
        this.update_tank(this.level.tanks[i]);
    }
    // Update bullets
    for (var i = 0 ; i < this.level.bullets.length ; i++) {
        this.move_bullet(this.level.bullets[i]);
    }
    this.level.bullets = this.level.bullets.filter(this.bullet_hits.bind(this));
    // Check if time is over
    if (Date.now() - this.start_time > this.duration) {
        this.finish();
    }
};

Game.prototype.finish = function() {
    io.to(this.id).emit('finish', { positions: this.check_winners() });
    this.finished = true;
    delete running_games[this.id];
    for (var i = 0 ; i < this.players.length ; i++) {
        // this.players[i].leave(this.id);
        this.players[i].game_id = null;
    }
};

// ----------- Player object ---------- //

function Player(socket) {
    this.socket = socket;
    this.socket.on('create_game', this.create_game.bind(this));
    this.socket.on('join_game', this.join_game.bind(this));
    this.socket.on('disconnect', this.onExit.bind(this));
    this.socket.on('get_open_games', this.get_open_games.bind(this));
    this.socket.on('action', this.on_action.bind(this));
    this.game_id = null;
    players.push(this);
    return this;
}

// Data: {players_amount, width, height, castles_amount, duration, color}
Player.prototype.create_game = function(data) {
    this.moving = false, this.shoot = false, this.direction = 0;
    this.color = data.color;
    game = new Game(data.players_amount, data.width, data.height, data.castles_amount, data.duration);
    this.game_id = game.id;
    this.socket.join(game.id);
    game.add_player(this);
};

// Data: {game_id, color}
Player.prototype.join_game = function(data) {
    this.moving = false;
    this.shoot = false;
    this.direction = 0;
    this.color = data.color;
    game = waiting_games[data.game_id];
    this.game_id = game.id;
    this.socket.join(game.id);
    game.add_player(this);
};

// Data: {direction, stop, shoot}
Player.prototype.on_action = function(data){
    this.direction = data.direction;
    this.shoot = data.shoot;
    this.moving = data.moving;
};

Player.prototype.onExit = function() {
    if (this.game_id != null) {
        if (waiting_games.hasOwnProperty(this.game_id)) {
            waiting_games[this.game_id].remove_player(this);
        }
        else if (running_games.hasOwnProperty(this.game_id)) {
            running_games[this.game_id].remove_player(this);
        }
    }
};

Player.prototype.exit = function(msg) {
    if (!this.game_id) {
        return;
    }
    this.socket.disconnect();
    this.game_id = null;
};

Player.prototype.get_open_games = function() {
    this.socket.emit('games', { games: waiting_games_data() });
};

function waiting_games_data() {
    var res = [];
    for (var game_id in waiting_games) {
        if (waiting_games.hasOwnProperty(game_id)) {
            res.push({
                id: game_id,
                players_amount: waiting_games[game_id].players_amount,
                missing_players: waiting_games[game_id].players_amount - waiting_games[game_id].players.length,
                width: waiting_games[game_id].width,
                height: waiting_games[game_id].height,
                bases: waiting_games[game_id].castles_amount,
                duration: waiting_games[game_id].duration / 1000,
                used_colors: waiting_games[game_id].players.map(function(player) { return player.color; })
            });
        }
    }
    return res;
}

// Connection

io.on('connection', function(socket) {
    var newPlayer = new Player(socket);
    socket.emit('games', { games: waiting_games_data() });
});