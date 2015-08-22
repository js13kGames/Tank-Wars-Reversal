'use strict';

var available_colors = ['#008cff', '#F200FF', '#ff0004', '#FFFD00', '#ff7300', '#FFF', '#0dff00', '#6900FF', '#ACACAC', '#95F7FF'];
var socket = {};
var connected = false;
var playing = false;
var last_action = {"direction": 0, "moving": false, "shoot": false};
var current_action = {"direction": 0, "moving": false, "shoot": false};
var current_level = null;
var last_received_level = null;
MainLoop.setUpdate(update).setDraw(draw);

function connect() {
    connected = true;
    if (!socket.connected) {
        socket = io(document.location.href);
    }
    socket.on('level', on_level);
    socket.on('disconnect', on_disconnect);
    socket.on('games', show_games);
    socket.on('finish', on_game_end);
}

function update() {
    context.level = last_received_level;
}

function on_level(data) {
    last_received_level = data.level;
    if (last_received_level.bullet_sound) {
        play_sound(shoot_sound);
    }
    if (!playing) {
        document.getElementById("message").style.display = "none";
        document.getElementById("duration_div").style.display = "inline";
        document.getElementById("myCanvas").style.display = "inline";
        playing = true;
        init(data.level);
        MainLoop.start();
    }
}

function on_disconnect(data) {
    connected = playing = false;
}

function on_game_end(data) {
    // Stop updating and drawing loop
    MainLoop.stop();
    // Play finish sound
    stop_song();
    setTimeout(function () { play_sound(finish_sound) }, 1);
    // Show duration as 0 exactly
    document.getElementById("duration_div").innerHTML = "Time remaining: 0s";
    // Generate message with positions
    var positions_html = "<h3>Positions</h3>";
    for (var i = 0 ; i < data.positions.length ; i++) {
        positions_html += "<b>" + data.positions[i][0] + ".</b> " + "<span style='background-color:" + data.positions[i][1] + ";width:1rem;height:1rem;display: inline-block;'></span> (" + data.positions[i][2] + " bases) <br>";
    }
    positions_html += "<br><a href='' class='play_again_button'>Play again</a><br><br>";
    document.getElementById("message").innerHTML = positions_html;
    document.getElementById("message").style.display = "inline";
}

function show_games(data) {
    // Create a table to show the games
    var lobby = document.getElementById("lobby");
    var lobbyhtml = "<table align='center'><tr> <th>Players</th> <th>Missing players</th> <th>width</th> <th>height</th> <th>bases</th> <th>duration</th> <th>color</th> <th>join</th> </tr>";
    // Generate a row for each open game
    for (var i = 0 ; i < data.games.length ; i++) {
        var colors = available_colors.filter(function(color) { return data.games[i].used_colors.indexOf(color) < 0; });
        lobbyhtml += "<tr> <td>"+data.games[i].players_amount+"</td> <td>"+data.games[i].missing_players+"</td> <td>"+data.games[i].width+"</td> <td>"+data.games[i].height+"</td> <td>"+data.games[i].bases+"</td> <td>"+data.games[i].duration+"</td> <td>";
        lobbyhtml += color_selection_html(data.games[i].id+"_color", colors);
        lobbyhtml += "</td> <td><button onclick=";
        lobbyhtml += "\"join_game('"+data.games[i].id+"',document.getElementById('"+data.games[i].id+"_color').value)\">Join</button></td> </tr>";
    }
    lobbyhtml += "</table>";
    // Show the table
    lobby.innerHTML = lobbyhtml;
}

function create_game(players_amount, width, height, castles_amount, duration, color) {
    // Show waiting message, don't show lobby
    document.getElementById("welcome").style.display = "none";
    document.getElementById("message").style.display = "inline";
    document.getElementById("message").innerHTML = "Waiting...";
    // Send a create game request
    socket.emit('create_game', {players_amount: players_amount, width: width, height: height, castles_amount: castles_amount, duration: 1000 * duration, color: color});
}

function join_game(game_id, color) {
    document.getElementById("welcome").style.display = "none";
    document.getElementById("message").style.display = "inline";
    document.getElementById("message").innerHTML = "Waiting...";
    socket.emit('join_game', { game_id: game_id, color: color });
}

function refresh_games() {
    socket.emit('get_open_games');
}

function color_selection_html(select_id, colors) {
    var color_options = "";
    for (var i = 0 ; i < colors.length ; i++) {
        color_options += "<option style='background-color:" + colors[i] + ";' value='" + colors[i] + "'></option>";
    }
    return "<select style='width:2em;' id='" + select_id + "'>" + color_options + "</select>";
}

// -------- Key presses -------- //

setInterval(function(){
    // Submit key presses only each 33ms if there was changed.
    if (!connected || !playing) {
        return ;
    }
    if (last_action.direction !== current_action.direction ||
            last_action.moving !== current_action.moving ||
            last_action.shoot !== current_action.shoot) {
        last_action.direction = current_action.direction;
        last_action.moving = current_action.moving;
        last_action.shoot = current_action.shoot;
        socket.emit('action', current_action);
    }
}, 33);

document.onkeydown = function(evt) {
        evt = evt || window.event;
        if (evt.keyCode == 37) {
                // left
                current_action.direction = 2;
                current_action.moving = true;
        }
        else if (evt.keyCode == 38) {
                // top
                current_action.direction = 0;
                current_action.moving = true;
        }
        else if (evt.keyCode == 39) {
                // right
                current_action.direction = 1;
                current_action.moving = true;
        }
        else if (evt.keyCode == 40) {
                // bottom
                current_action.direction = 3;
                current_action.moving = true;
        }
        else if (evt.keyCode == 32) {
                // spacebar
                current_action.shoot = true;
        }
};

document.onkeyup = function(evt) {
        evt = evt || window.event;
        // Releases the key of the current direction
        if ((evt.keyCode === 37 && current_action.direction === 2) ||
            (evt.keyCode === 38 && current_action.direction === 0) ||
            (evt.keyCode === 39 && current_action.direction === 1) ||
            (evt.keyCode === 40 && current_action.direction === 3)) {
                current_action.moving = false;
        }
        if (evt.keyCode == 32) {
                // spacebar
                current_action.shoot = false;
        }
};

connect();
document.getElementById("create_colors").innerHTML = color_selection_html("c6", available_colors);
draw_example();