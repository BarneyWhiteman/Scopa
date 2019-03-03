var socket = io();

var hand = [];
var played = [];
var current_stats = "";
var pool = [];

var move = [];

var chat_width = 300 + 50;

var end_button;
var extra_button;

var max_card_width;

var choosing = false; //Variables for allowing players to choose cards (ie for "discard 4 cards");
var choose_value;
var choose_max;
var choose_min;
var total_value = 0;
var num_selected = 0;
var prev_button_state = true;

var revealed_cards = [];

var turn = false;


var tl = 10;

var started = false; //game has not begun
var in_game = false;
var over = false; //When the game ends naturally
var unexpected_over = false; //if people leave the game;

var paused = false;

var text_lrg = 30;
var text_med = 25;
var text_sml = 15;
var text_min = 12;

var spc = 10;

var icons = {};

var unexpected_button;

var width, height;

var screen;
var game;

var mouseX;
var mouseY;

var rect;

var setupRun = false;

function setup() {
	console.log("setup");
	screen = document.getElementById("game");

	screen.width = window.innerWidth - chat_width;
	screen.height = window.innerHeight - 50;
	screen.style.float = 'right';

	rect = screen.getBoundingClientRect();

	window.addEventListener("mouseup", mouseReleased);

	window.addEventListener("resize", windowResized);

	screen.addEventListener("mousemove", function(event) {
		mouseX = event.clientX - rect.left;
		mouseY = event.clientY - rect.top;
		draw();
	})

	game = screen.getContext("2d");
		//var cnv = createCanvas(window.innerWidth - chat_width, window.innerHeight - 50);
		//cnv.canvas.style.float = 'right';
	width = screen.width;
	height = screen.height;
	
	game.textAlign = "center";
	game.strokeStyle = "#323232";
	game.font = font(text_lrg);

	initialise();
	draw();
}

function initialise() {
	max_card_width = width/6;
	text_lrg = Math.min(width, height)/30;
	text_med = Math.min(width, height)/40;
	text_sml = Math.min(width, height)/50;
	text_min = Math.min(width, height)/60;

	end_button = new Button(width * 7/8, height * 3/4, width/8 - 1, height/4, "", "#ffffff", function() { //Used for ending a phase
		if(started && choosing) {
				end_choosing();
		}
	});
	end_button.disabled = true;
	unexpected_button = new Button(width/2 - 100, 2/3 * height - 50, 200, 100, "Back to game selection", 255, function() { //Returning to gameselection
		if(unexpected_over) {
			socket.emit('new', 'new game pls');
		}
	});

	icons = {
		"Suns": loadImage('/HTML/images/suns.png'),
		"Feathers": loadImage('/HTML/images/feathers.png'),
		"Cups": loadImage('/HTML/images/cups.png'),
		"Swords": loadImage('/HTML/images/swords.png')
	}
}

function windowResized() {
	//resizes cards, pools etc when the window is resized
	var ratio_x = (window.innerWidth - chat_width)/width;
	var ratio_y = (window.innerHeight - 50)/height;
	for(var c in hand) {
		hand[c].resize(ratio_x, ratio_y);
	}
	for(var c in pool) {
		pool[c].resize(ratio_x, ratio_y);
	}
	
	if(extra_button != null) { extra_button.resize(ratio_x, ratio_y); }
	end_button.resize(ratio_x, ratio_y);
	unexpected_button.resize(ratio_x, ratio_y);
	
	screen = document.getElementById("game");

	screen.width = window.innerWidth - chat_width
	screen.height = window.innerHeight - 50;
	screen.style.float = "right";

	game = screen.getContext("2d");

	rect = screen.getBoundingClientRect();

	width = screen.width;
	height = screen.height;

	max_card_width = width/6;
	text_lrg = Math.min(width, height)/30;
	text_med = Math.min(width, height)/40;
	text_sml = Math.min(width, height)/50;
	text_min = Math.min(width, height)/60;
	draw();
}

//setInterval(draw, 1000/30);

function draw() {
	game.fillStyle = "#ffffff";
	game.fillRect(0, 0, width, height);
	game.font = font(text_lrg);
	game.strokeStyle = "#323232";
	game.textAlign = "center";

	if(unexpected_over) {
		draw_unexpected();
	} else if(!started && !in_game) {
		game.fillStyle = "#323232";
		game.fillText("Joining Game", width/2, height/2);
	} else if(!started && in_game) {
		game.fillStyle = "#323232";
		game.fillText("Waiting for opponent...", width/2, height/2);
	} else {
		draw_grid();
		draw_cards();
	}
	if(started && !unexpected_over && !turn) {
		game.fillStyle = "#323232";
		game.globalAlpha = 0.2;
		game.fillRect(0, 0, width, height);
		game.globalAlpha = 1;
	}
}

function draw_grid() {
	game.strokeStyle = "#323232";
	//STATS
	line(width/4, height, width/4, height - height/4);
	//SEND/END
	line(7 * width/8, height, 7 * width/8, height - height/4);
	//HAND
	line(0, height - height/4, width, height - height/4);
	//PLAYED
	line(0, height/2, width, height/2);
	
	game.fillStyle = "#000000";
	game.font = font(text_med);
	game.fillText('Stats', width/16, height * 25/32);
	game.fillStyle = "#aaaaaa";
	game.fillText('Played Cards', width/2, 5 * height/8)
	game.fillStyle = "#000000";
	game.font = font(text_sml);
	game.textAlign = "left";
	for(var i in current_stats) {
		game.fillText(current_stats[i], 5, 13/16 * height + i * text_med);
	}
}

function draw_cards() {
	game.textAlign = "left";
	for(i in hand) {
		hand[i].show();
	}
	for(i in played) {
		played[i].show();
	}
	for(i in pool) {
		pool[i].show();
	}
	game.textAlign = "center";
	end_button.show();
}

function draw_unexpected() {
	//Display message for unexpected finish
	unexpected_button.show();
	game.fillStyle = "#ff0000";
	game.fillText("Player(s) unexpectedly left the server", width/2, height/2);
}

function mouseReleased(event) {

	if(started &&  end_button.pressed()) { end_button.func(); return; }

	if(unexpected_over) {
		if(unexpected_button.pressed()) { unexpected_button.func(); return; }
	}

	if(started) {
		for(i in hand) {
			if(hand[i].pressed() && !choosing) {
				make_move({type: "hand", index: i});
				return;
			}
		}
		for(i in pool) {
			if(pool[i].pressed() && choosing) {
				if(pool[i].selected) {
					pool[i].selected = false;
					total_value -= pool[i].value;
					num_selected --;
				} else if(!pool[i].selected && num_selected < choose_max) {
					pool[i].selected = true;
					total_value += pool[i].value;
					num_selected ++;
				}
				return;
			}
		}
	}
	draw();
}

function make_move(move) {
	socket.emit('move', move);
}

function end_current_phase() {
	socket.emit('end_phase', 'end_phase');
}

//Checks if point (x, y) is inside the box bounded by box with top left corner
//of (bx, by), with width bw and height bh
//Used to see if the mouse is inside a GUI element
function point_in_box(x, y, bx, by, bw, bh) {
	return(x > bx && x < bx + bw &&  y > by && y < by + bh);
}


//ALL SOCKET THINGS HERE
//listen on the socket for instructions
socket.on('test', function(message) {
	console.log(message);
	draw();
});

socket.on('pause', function(pause) {
    paused = pause;
	draw();
});

socket.on('unexpected', function() {
	//game ends unexpectedly
	unexpected_over = true;
	in_game = false;
	console.log("unexpected");
	draw();
});

socket.on('over', function() {
	//game is over
	over = true;
	in_game = false;
	console.log("over");
	draw();
});

socket.on('started', function() {
	//game has started
	started = true;
	console.log("started");
	draw();
});

socket.on('reset', function() {
	//client should be reset
	reset();
	console.log("reset");
	draw();
});

socket.on('turn', function(val) {
	turn = val;
	console.log("turn");
	draw();
});

socket.on('new', function() {
	//joined a game
	started = false;
	over = false;
	unexpected_over = false;
	in_game = true;
	document.getElementById("player_log").textContent = "";
	console.log("new");
	if(!setupRun) {
		setup();
	}
	draw();
});

socket.on('log', function(message) {
	//add message to player log
	document.getElementById("player_log").textContent = message + "\n" + document.getElementById("player_log").textContent;
	draw();
});

socket.on('hand', function(cards) {
	//player hand is being sent
	//Create card objects for each card in the hand
	var w = Math.min((6 * width/8 - spc)/cards.length, max_card_width);
	var temp = [];
	for(c in cards) {
		temp.push(new Card(width/4 + c * w + spc, height - (height/4 - spc), w - spc, height/4 - 20, cards[c].suit, cards[c].value, cards[c].colour));
	}
	hand = temp;
	draw();
});

socket.on('stats', function(stats) {
	//player stats are being sent
	current_stats = stats;
	draw();
});

socket.on('played', function(cards) {
	//player played cards are being sent
	var w = Math.min((width - spc)/cards.length, max_card_width);
	var temp = [];
	for(c in cards) {
		temp.push(new Card(c * w + spc, height/2 + spc, w - spc, height/4 - 20, cards[c].suit, cards[c].value, cards[c].colour));
	}
	played = temp;
	draw();
});

socket.on('pool', function(cards) {
	//game pools are being sent
	//Only need to display the top cards from each pool
	var n = Math.ceil(cards.length/2);
	var w = Math.min((width - spc)/n, max_card_width); //get card width
	var temp = [];
	var rows = [0, 0];
	var row = 0;
	var offset = 0;
	for(c in cards) {
		if(c * w < width-spc) {
			row = 0;
		} else {
			row = 1;
		}
		offset = rows[row] * w;
		temp.push(new Card(offset + spc, (height/4 * row) + spc, w - spc, height/4 - 20, cards[c].suit, cards[c].value, cards[c].colour));
		temp[temp.length - 1].num = cards[c].num;
		temp[temp.length - 1].pool = cards[c].pool;
		rows[row] += 1;
	}
	pool = temp;
	draw();
});

socket.on('choose', function(data) {
	//Allows the player to select a card for various reasons (discard/trash etc)
	deselect_all();
	choosing = true;
	prev_button_state = end_button.disabled;
	end_button.disabled = false;
	choose_value = data.value;
	choose_max = data.max;
	choose_min = data.min;
	total_value = 0;
	num_selected = 0;
	prev_phase = end_button.text;
	end_button.text = "End " + data.type;
	draw();
});


socket.on('disable', function() {
	//Disbales end_phase button when it's not the players turn
	end_button.disabled = true;
	end_button.text = "Not your turn";
	draw();
});

socket.on('alert', function(message) {
	//Alerts players (used for start/end of turn)
	alert(message);
	draw();
});

function end_choosing() {
	if(num_selected >= choose_min && num_selected <= choose_max && total_value == choose_value) {
		var selected = [];
		for(var c in pool) {
			if(pool[c].selected) {
				selected.push(c);
			}
		}
		make_move({ type: "choose", selected: selected});
		deselect_all();		
		choosing = false;
		end_button.text = prev_phase;
		end_button.disabled = prev_button_state;
		return true;
	} else {
		if(total_value != choose_value) {
			alert("Please choose card(s) that have a combined value of " + choose_value);
		}
		if(choose_min == choose_max) {
			alert("Please choose " + choose_min + " card(s) that have a combined value of " + choose_value);
		} else {
			alert("Please choose between " + choose_min + " and " + choose_max + " cards that have a combined value of " + choose_value);
		}
		return false;
	}
}

function deselect_all() {
	for(var c in pool) {
		pool[c].selected = false;
	}
}

class Card {

	constructor(x, y, w, h, suit, value, colour) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.selected = false;
		this.num = null;
		this.suit = suit;
		this.value = value

		if(colour == null) { 
			this.colour = "#ffffff";
		} else {
			this.colour = colour;
		}
	}

	resize(rx, ry) {
		this.x *= rx;
		this.w *= rx;
		this.y *= ry;
		this.h *= ry;
	}

	show() {
		game.textAlign = "center";
		if(this.selected && choosing) {
			game.strokeStyle = "#00ffff";
			game.fillStyle = "#00ffff";
			game.fillRect(this.x, this.y, this.w, this.h);
			game.strokeRect(this.x, this.y, this.w, this.h);
		} else {
			game.strokeStyle = "#32323232";
			game.fillStyle = this.colour;
			game.fillRect(this.x, this.y, this.w, this.h);
			game.strokeRect(this.x, this.y, this.w, this.h);
		}
		if(this.pressed()) {
			game.fillStyle = "#aaaaaa";
		} else {
			game.fillStyle = brighten(this.colour, 50);
		}
		
		game.fillRect(this.x + 5, this.y + 5, this.w - spc, this.h - spc);
		game.fillStyle = "#323232";
		game.font = font(text_med);
		game.fillText(this.value + " of " + this.suit, this.x + this.w/2, this.y + this.h/2);//, this.w - spc, this.h/2 - spc);
		var size = Math.min(this.w - (spc * 2), this.h/2 - (spc * 2));
		game.drawImage(icons[this.suit], this.x + this.w/2 - size/2, this.y + (this.h * 3/4) - size/2, size, size);
	}

	pressed() {
		return point_in_box(mouseX, mouseY, this.x, this.y, this.w, this.h);
	}
}

class Button {
	constructor(x, y, w, h, text, colour, func) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.text = text;
		this.colour = colour;
		this.disabled = false;
		this.func = func;
	}

	func() {
		this.func();
	}

	resize(rx, ry) {
		this.x *= rx;
		this.w *= rx;
		this.y *= ry;
		this.h *= ry;
	}

	show() {
		game.font = font(text_lrg);
		game.strokeStyle = "#323232";
		game.fillStyle = this.colour;
		if(this.disabled || this.pressed()) {
			game.fillStyle = "#aaaaaa";
		}
		game.fillRect(this.x, this.y, this.w, this.h);
		game.strokeRect(this.x, this.y, this.w, this.h);
		game.fillStyle = "#323232";
		game.fillText(this.text, this.x + this.w/2, this.y + this.h/2);
	}

	pressed() {
		return point_in_box(mouseX, mouseY, this.x, this.y, this.w, this.h) && !this.disabled;
	}
}

function reset() {
	document.getElementById("player_log").innerHTML = "";
	socket = io();
	hand = [];
	played = [];
	current_stats = "";
	pool = [];
	move = [];
	chat_width = 300 + 50;
	max_card_width;
	choosing = false; //Variables for allowing players to choose cards (ie for "discard 4 cards");
	total_value = 0;
	revealed_cards = [];
	started = false; //game has not begun
	selected = false;
	in_game = false;
	over = false; //When the game ends naturally
	unexpected_over = false; //if people leave the game;
	paused = false;
	open_games = false;

	initialise();
}

function font(size) {
	return size + "px Arial";
}

function line(x1, y1, x2, y2) {
	game.moveTo(x1, y1);
	game.lineTo(x2, y2);
	game.stroke();
}

function loadImage(path) {
	var image = new Image();
	image.src = path;
	return image;
}

function brighten(col, add) {
	col = col.substring(1);
	var rgb = parseInt(col, 16);
	var b = constrain((rgb & 255) + add, 0, 255);
	var g = constrain(((rgb >> 8) & 255) + add, 0, 255);
	var r = constrain(((rgb >> 16) & 255) + add, 0, 255);

	var final = ((r << 16) & 0xff0000) | ((g << 8) & 0xff00) | b;
	return "#" + final.toString(16);
}

function constrain(val, min, max) {
	if(val > max) {
		return max;
	}
	if(val < min) {
		return min;
	}
	return val;
}