// -----------  Data ----------- //

var started = false;
var context = {};
var cell_colors = ["#1D7F7F", "#68AD14"];

// --------  Initialize -------- //

function get_screen_size() {
	var body = document.getElementById('body');
	return {width: body.offsetWidth, height: body.offsetHeight}
};

function get_cell_side(screen_size, grid_size) {
	var cell_height = screen_size.height / grid_size.height;
	var cell_width = screen_size.width / grid_size.width;
	return Math.floor(Math.min(cell_height, cell_width));
}

function set_canvas(canvas, screen_size, grid_size, cell_side) {
	canvas.setAttribute("width", grid_size.width * cell_side);
	canvas.setAttribute("height", grid_size.height * cell_side);
	canvas.setAttribute("style", "margin-top:" + Math.floor((screen_size.height - grid_size.height * cell_side) / 2) + "px;");
}

function init(level) {
	var screen_size = get_screen_size();
	var grid_size = {width: level.grid[0].length, height: level.grid.length};
	var cell_side = get_cell_side(screen_size, grid_size);
	var canvas = document.getElementById('myCanvas');
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
	grass = 1;
	draw();
	loop_song();
}

