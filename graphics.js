
// --------  Drawing -------- //

function draw_example() {
	var level = {
		"grid": [[1,1,1],[0,1,1],[1,0,1]],
		"tanks": [
			{"y":0.2,"x":0.2,"direction":1,"color":"#008cff"},
			{"y":0.2,"x":2.2,"direction":3,"color":"#ff0004"},
			{"y":2.2,"x":2.2,"direction":0,"color":"#fff"}
		],
		"castles": [
			{"y":1,"x":1,"color":"#FFFD00"},
			{"y":2,"x":0,"color":"#008cff"}
		],
		"bullets": [],
		"dude_size":0.6,
		"bullet_size":0.05
	};
	var screen_size = {width: 100, height: 100};
	var grid_size = {width: level.grid[0].length, height: level.grid.length};
	var cell_side = get_cell_side(screen_size, grid_size);
	var canvas = document.getElementById('showCanvas');
	set_canvas(canvas, screen_size, grid_size, cell_side);
	context = {
		level: level,
		grid_size: grid_size,
		canvas: canvas,
		cell_side: cell_side,
		dude_size: level.dude_size,
		bullet_size: level.bullet_size,
		pixel_size: cell_side * level.dude_size / 16,
		castle_pixel_size: cell_side / 16,
	};
	cell_colors = ["#1D7F7F", "#68AD14"];
	draw();
	context = {};
}

function draw_grid() {
	var ctx = context.canvas.getContext('2d');
	ctx.clearRect(0, 0, context.canvas.width, context.canvas.height);
	// Draw grass on whole canvas
	ctx.fillStyle = "#68AD14";
	ctx.fillRect(0, 0, context.grid_size.width * context.cell_side, context.grid_size.height * context.cell_side);
	// Draw walls
	for (var y = 0 ; y < context.grid_size.height ; y++) {
		for (var x = 0 ; x < context.grid_size.width ; x++) {
			if (context.level.grid[y][x] === 0) {
				// Whole cell
				ctx.fillStyle = "#666";
				ctx.fillRect(x * context.cell_side, y * context.cell_side, context.cell_side, context.cell_side);
				// Light line. top and right
				ctx.fillStyle = "#999";
				ctx.fillRect(x * context.cell_side , y * context.cell_side, context.cell_side, context.castle_pixel_size);
				ctx.fillRect((x + 1) * context.cell_side - context.castle_pixel_size , y * context.cell_side, context.castle_pixel_size, context.cell_side);
				// Dark line. bottom and left
				ctx.fillStyle = "#333";
				ctx.fillRect(x * context.cell_side , (y + 1) * context.cell_side - context.castle_pixel_size, context.cell_side, context.castle_pixel_size);
				ctx.fillRect(x * context.cell_side , y * context.cell_side, context.castle_pixel_size, context.cell_side);
			}
		}
	}
}

var inner_tank = [
	[0,0,0,1,1,0,0,0],
	[0,0,1,0,0,1,0,0],
	[1,1,1,0,0,1,1,1],
	[1,0,1,0,0,1,0,1],
	[1,0,1,0,0,1,0,1],
	[1,0,1,1,1,1,0,1],
	[1,1,0,0,0,0,1,1],
	[1,0,0,1,1,0,0,1],
	[0,0,1,0,0,1,0,0],
	[0,1,0,0,0,0,1,0],
	[0,1,0,0,0,0,1,0],
	[0,0,1,0,0,1,0,0],
	[1,0,0,1,1,0,0,1],
	[1,1,0,0,0,0,1,1],
	[1,0,1,1,1,1,0,1],
	[0,0,0,0,0,0,0,0]];

function draw_tank_rect(ctx, tank_x, tank_y, pixel_size, x, y, width, height, direction) {
	var temp;
	if (direction === 1) {
		temp = width, width = height, height = temp;
		temp = x, x = 16 - y - width, y = temp;
	}
	else if (direction === 2) {
		temp = width, width = height, height = temp;
		temp = x, x = y, y = temp;
	}
	else if (direction === 3) {
		y = 16 - y - height;
	}
	ctx.fillRect(tank_x + x * pixel_size, tank_y + y * pixel_size, width * pixel_size, height * pixel_size);
}

function draw_tank(tank) {
	var ctx = context.canvas.getContext('2d');
	var x = tank.x * context.cell_side;
	var y = tank.y * context.cell_side;
	// Paint
	ctx.fillStyle = tank.color;
	draw_tank_rect(ctx, x, y, context.pixel_size, 4, 2, 8, 12, tank.direction);
	draw_tank_rect(ctx, x, y, context.pixel_size, 7, 1, 2, 2, tank.direction);
	// Wheels
	ctx.fillStyle = "#000";
	draw_tank_rect(ctx, x, y, context.pixel_size, 1, 1, 3, 15, tank.direction);
	draw_tank_rect(ctx, x, y, context.pixel_size, 12, 1, 3, 15, tank.direction);
	draw_tank_rect(ctx, x, y, context.pixel_size, 0, 2, 2, 13, tank.direction);
	draw_tank_rect(ctx, x, y, context.pixel_size, 14, 2, 2, 13, tank.direction);
	// Inner tank
	for (var i = 0 ; i < 8 ; i++) {
		for (var j = 0 ; j < 16 ; j++) {
			if (inner_tank[j][i] == 1) {
				draw_tank_rect(ctx, x, y, context.pixel_size, i + 4, j, 1, 1, tank.direction);
			}
		}
	}
	// Stripes
	ctx.fillStyle = "#545454";
	for (var i = 2; i < 15 ; i += 2) {
		var small = i == 8 || i == 10? 1 : 0;
		draw_tank_rect(ctx, x, y, context.pixel_size, 1, i, 3 - small, 1, tank.direction);
		draw_tank_rect(ctx, x, y, context.pixel_size, 12 + small, i, 3 - small, 1, tank.direction);
	}
}

function draw_bullet(bullet) {
	var ctx = context.canvas.getContext('2d');
	ctx.fillStyle = bullet.color;
	ctx.fillRect(bullet.x * context.cell_side, bullet.y * context.cell_side, context.bullet_size * context.cell_side, context.bullet_size * context.cell_side);
}

function draw_castle(castle) {
	var ctx = context.canvas.getContext('2d');
	var x = castle.x * context.cell_side;
	var y = castle.y * context.cell_side;
	// Boundaries
	ctx.fillStyle = castle.color;
	draw_tank_rect(ctx, x, y, context.castle_pixel_size, 1, 1, 14, 14, 0);
	// Grass
	ctx.fillStyle = "#68AD14";
	draw_tank_rect(ctx, x, y, context.castle_pixel_size, 3, 3, 4, 4, 0);
	draw_tank_rect(ctx, x, y, context.castle_pixel_size, 9, 3, 4, 4, 0);
	draw_tank_rect(ctx, x, y, context.castle_pixel_size, 3, 9, 4, 4, 0);
	draw_tank_rect(ctx, x, y, context.castle_pixel_size, 9, 9, 4, 4, 0);
	// Center square
	ctx.fillStyle = castle.color;
	draw_tank_rect(ctx, x, y, context.castle_pixel_size, 5, 5, 6, 6, 0);
}

function draw() {
	document.getElementById("time_remaining").innerHTML = context.level.remaining_time | 0;
	draw_grid();
	for (var i = 0 ; i < context.level.castles.length ; i++) {
		draw_castle(context.level.castles[i]);
	}
	for (var i = 0 ; i < context.level.tanks.length ; i++) {
		draw_tank(context.level.tanks[i]);
	}
	for (var i = 0 ; i < context.level.bullets.length ; i++) {
		draw_bullet(context.level.bullets[i]);
	}
}