// ---------  Level generation --------- //

function add_neighbors(grid, grid_size, neighbors, cell) {
	// Has right neighbor
	if (cell.x + 1 < grid_size.width && grid[cell.y][cell.x + 1] === 0) {
		neighbors.push({y: cell.y, x: cell.x + 1});
	}
	// Has left neighbor
	if (cell.x - 1 > 0 && grid[cell.y][cell.x - 1] === 0) {
		neighbors.push({y: cell.y, x: cell.x - 1});
	}
	// Has top neighbor
	if (cell.y + 1 < grid_size.height && grid[cell.y + 1][cell.x] === 0) {
		neighbors.push({y: cell.y + 1, x: cell.x});
	}
	// Has bottom neighbor
	if (cell.y - 1 > 0 && grid[cell.y - 1][cell.x] === 0) {
		neighbors.push({y: cell.y - 1, x: cell.x});
	}
}

function does_not_more_than_one_neighbors_in_maze(grid, grid_size, cell){
	var neighbors_in_maze = (cell.x + 1 < grid_size.width && grid[cell.y][cell.x + 1] === 1) +
							(cell.x - 1 > 0 && grid[cell.y][cell.x - 1] === 1) +
							(cell.y + 1 < grid_size.height && grid[cell.y + 1][cell.x] === 1) +
							(cell.y - 1 > 0 && grid[cell.y - 1][cell.x] === 1);
	return neighbors_in_maze < 2;
}

function prim(grid, grid_size) {
	// Generate a minimum spaning tree prim style
	var start_y = Math.floor((Math.random() * (grid_size.height - 1))) + 1;
	var	start_x = Math.floor((Math.random() * (grid_size.width - 1))) + 1;
	grid[start_y][start_x] = 1;
	var neighbors = [];
	add_neighbors(grid, grid_size, neighbors, {y: start_y, x: start_x});
	var add_to_maze = null;
	while (neighbors.length !== 0) {
		var random_neighbor_index = Math.floor((Math.random() * neighbors.length));
		add_to_maze = neighbors[random_neighbor_index];
		grid[add_to_maze.y][add_to_maze.x] = 1;
		add_neighbors(grid, grid_size, neighbors, add_to_maze);
		neighbors = neighbors.filter(
			function (cell) {
				return (cell.y !== add_to_maze.y || cell.x !== add_to_maze.x) && 
						does_not_more_than_one_neighbors_in_maze(grid, grid_size, cell)
				;
			}
		);
	}
}

function random_direction() {
	return Math.floor((Math.random() * 4));
}

function generate_tanks(players, grid, grid_width, grid_height, occupied_spots) {
	var x, y;
	tanks = [];
	for (var i = 0 ; i < players.length ; i++) {
		do {
			x = Math.floor((Math.random() * grid_width));
			y = Math.floor((Math.random() * grid_height));
		} while (grid[y][x] == 0 || occupied_spots.indexOf(y * grid_height + x) > -1)
		occupied_spots.push(y * grid_height + x);
		players[i].direction = random_direction();
		tanks.push({
			y: y + 0.125,
			x: x + 0.125,
			direction: players[i].direction,
			moving: false,
			shoot: false,
			reload: 0,
			player: players[i],
			color: players[i].color
		});

	}
	return tanks;
}

function generate_castles(players, castles_per_tank, grid, grid_width, grid_height, occupied_spots) {
	var x, y;
	castles = [];
	for (var i = 0 ; i < players.length ; i++) {
		for (var j = 0 ; j < castles_per_tank ; j++) {	
			do {
				x = Math.floor((Math.random() * grid_width));
				y = Math.floor((Math.random() * grid_height));
			} while (grid[y][x] == 0 || occupied_spots.indexOf(y * grid_height + x) > -1) 
			/*x = Math.floor((Math.random() * grid_width));
			y = Math.floor((Math.random() * grid_height));*/
			occupied_spots.push(y * grid_height + x);
			castles.push({y: y, x: x, color: players[i].color});
			// grid[y][x] = 1;
		}
	}
	return castles;
}

module.exports = {
    generate_castles: generate_castles,
    generate_tanks: generate_tanks,
    prim: prim
};