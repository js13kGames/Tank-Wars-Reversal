// -------- Song definition and generation -------- //

// Music notes frequencies
var a3 = 2.0 * Math.PI * 220
var b3 = 2.0 * Math.PI * 246.94
var a4 = 2.0 * Math.PI * 440
var b4 = 2.0 * Math.PI * 493.88
var c4 = 2.0 * Math.PI * 261.63
var e4 = 2.0 * Math.PI * 329.63
var f4 = 2.0 * Math.PI * 349.23
var g4b = 2.0 * Math.PI * 369.99
var g4 = 2.0 * Math.PI * 392
var d5 = 2.0 * Math.PI * 587.33
var e5 = 2.0 * Math.PI * 659.25
var x = [a3,e4,a4,e5];
var y = [a3,e4,g4];
var z = [e4];
var u = [a3,a4,c4];
var v = [e4,g4,b4,e5];
// Notes for the chords in each section of the song
notes = [0,x,0,x,0,x,y,0,z,u,0,y,0,x,0,x,0,x,0,z,u,0,[d5],0,x,0,x,0,x,y,z,x,0,v,0,v,0,v,0,v,0,[c4,e4,g4,b4],0,[b3,e4,g4b,b4],0];
// Duration in seconds of each section of the song, in the ith section the chords from notes[i] is played 
sections = [0.001,0.21,0.6,0.81,1.2,1.35,1.54,1.64,1.8,2,2.1,2.27,2.4,2.64,3,3.21,3.6,3.81,4.05,4.2,4.41,4.5,4.69,4.8,
            5.01,5.4,5.61,6,6.15,6.45,6.6,6.81,6.9,7.07,7.2,7.65,7.8,8.01,8.1,8.27,8.4,8.9,9,9.5,9.501];  // 9.6

// Get the value of the song at the time t
previous_section_start = 0;
current_section = 0;
current_section_time = 0;
time = 0;
sampleFrequency = 8000.0;
middle = 128;
var get_wav_value = function (t) { 
    time += 0.000125;
    current_section_time += 0.000125;
    linear_soften = Math.max(0.90 - current_section_time / (sections[current_section] - previous_section_start), 0.05);
    if (time > sections[current_section]) {
        previous_section_start = sections[current_section];
        current_section_time = 0;
        current_section += 1;
    }
    if (notes[current_section] === 0) {
        return middle;
    }
    else if (notes[current_section].length == 1) {
        return middle + linear_soften * 127 * Math.sin(notes[current_section][0] * current_section_time);
    }
    else if (notes[current_section].length == 2) {
        return middle + linear_soften * 63 * (
                    Math.sin(notes[current_section][0] * current_section_time) +
                    Math.sin(notes[current_section][1] * current_section_time));
    }
    else if (notes[current_section].length == 3) {
        return middle + linear_soften * 42 * (
                    Math.sin(notes[current_section][0] * current_section_time) +
                    Math.sin(notes[current_section][1] * current_section_time) +
                    Math.sin(notes[current_section][2] * current_section_time));
    }
    else if (notes[current_section].length == 4) {
        return middle + linear_soften * 31 * (
                    Math.sin(notes[current_section][0] * current_section_time) +
                    Math.sin(notes[current_section][1] * current_section_time) +
                    Math.sin(notes[current_section][2] * current_section_time) +
                    Math.sin(notes[current_section][3] * current_section_time));
    }
};

// Function to generate a wav using get_wav_value. 140bytes softsynth
var softSynth = function(f,d,t,S){for(t|=S='RIFF_oO_WAVEfmt '+atob('EAAAAAEAAQBAHwAAQB8AAAEACAA')+'data';++t<d;)S+=String.fromCharCode(f(t));return S}

// Generate once and return the song.
var song = null;
function get_song() {
    if (song == null) {
        song = new Audio( 'data:audio/wav;base64,'+ btoa( softSynth( get_wav_value, 76008, 0, "" ) ) );
        song.volume = 0.5;
    }
    return song;
}
var song = [get_song(), get_song()];

// Generate shoot sound
time = 0;
var v = 1;
function generate_shoot_sound(t) {
    time += 0.000125;
    v = (1 + ((v << 1) + ((v >> 2) + 1) * time * 13 * t) | 0) & 127;
    return 128 + ((0.4 - time) * v) & 127;
}
var shoot_sound = new Audio( 'data:audio/wav;base64,'+ btoa( softSynth( generate_shoot_sound, 3200, 0, "" ) ) );
shoot_sound.volume = 0.5;

// Generate finish sound
time = previous_section_start = current_section = current_section_time =  0;
notes = [[a4],0,[a4],0,[a4],0,[d5],0];
sections = [0.3,0.5,0.6,0.7,0.8,1,1.3,1.5];
var finish_sound = new Audio( 'data:audio/wav;base64,'+ btoa( softSynth( get_wav_value, 12000, 0, "" ) ) );
finish_sound.volume = 0.5;

// -------- Audio controls -------- //

var sound_on = false;
var current_song = 0;
var next_loop = null;
// Load sounds

// Turn on/off music
function toggle_music () {
    sound_on = !sound_on;
    var sound_button = document.getElementById("sound_button")
    sound_button.innerHTML = "Turn sound ";
    if (sound_on) {
        if (playing) {
            loop_song();
        }
        sound_button.innerHTML += "off";
    }
    else {
        stop_song();
        sound_button.innerHTML += "on";
    }
}

// Loops the song, alternates between two audio elements to avoid a silent gap between loops
function loop_song(){
    if (!sound_on) {
        return;
    }
    song[current_song].play();
    current_song = 1 - current_song;
    next_loop = setTimeout(loop_song, 9.501);
}

function play_sound(sound) {
    if (sound_on) {
        sound.play();
    }
}

// Stops the song
function stop_song() {
    song[0].pause();
    song[1].pause();
    song[0].currentTime = song[1].currentTime = 0;
    if (next_loop !== null) {
        clearTimeout(next_loop);
    }
}
