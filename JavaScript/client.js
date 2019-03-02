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

var alert_display = false;
var alert_message = "";

var tl = 10;

var started = false; //game has not begun
var ready = false;
var selected = false;
var over = false; //When the game ends naturally
var unexpected_over = false; //if people leave the game;

var paused = false;
var open_games = false;

var text_lrg = 30;
var text_med = 25;
var text_sml = 15;
var text_min = 12;

var spc = 10;

var icons = {};

var unexpected_button;

var width, height;

function setup() {
	try {
		var cnv = createCanvas(window.innerWidth - chat_width, window.innerHeight - 50);
		cnv.canvas.style.float = 'right';
		width = cnv.width;
		height = cnv.height;
		stroke(51);
		noFill();
		textAlign(CENTER, CENTER);
		textSize(text_lrg);
	} catch (e) {}
	max_card_width = width/6;
	text_lrg = minimum(width, height)/30;
	text_med = minimum(width, height)/40;
	text_sml = minimum(width, height)/50;
	text_min = minimum(width, height)/60;

	end_button = new Button(width * 7/8, height * 3/4, width/8 - 1, height/4, "", "#ffffff", function() { //Used for ending a phase
		if(started) {
			if(choosing) {
				end_choosing();
			} else {
				end_current_phase();
			}
			return;
		}
	});
	end_button.disabled = true;
	unexpected_button = new Button(width/2 - 100, 2/3 * height - 50, 200, 100, "Back to game selection", 255, function() { //Returning to gameselection
		if(unexpected_over || !ready) {
			socket.emit('new', 'new game pls');
		}
	});

	icons = {
		"Suns": loadImage('/HTML/images/suns.png'),
		"Feathers": loadImage('/HTML/images/feathers.png'),
		"Cups": loadImage('/HTML/images/cups.png'),
		"Swords": loadImage('/HTML/images/swords.png')
	}

	loop();
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
	
	resizeCanvas(window.innerWidth - chat_width, window.innerHeight - 50);
	max_card_width = width/6;
	text_lrg = minimum(width, height)/30;
	text_med = minimum(width, height)/40;
	text_sml = minimum(width, height)/50;
	text_min = minimum(width, height)/60;
}

function draw() {
	background(255);
	textSize(text_lrg);
	stroke(51);
	noFill();
	textAlign(CENTER, CENTER);
	if(unexpected_over) {
		draw_unexpected();
	} else if(!started) {
		fill(200, 200, 200);
		noStroke();
		text("Waiting for opponent...", width/2, height/2);
	} else {
		draw_grid();
		draw_cards();
	}
	if(started && !unexpected_over && !turn) {
		fill(50, 50);
		noStroke();
		rect(0, 0, width, height);
	}
	if(alert_display) {
		display_alert();
	}
}

function draw_grid() {
	stroke(51);
	fill(255);
	//STATS
	line(width/4, height, width/4, height - height/4);
	//SEND/END
	line(7 * width/8, height, 7 * width/8, height - height/4);
	//HAND
	line(0, height - height/4, width, height - height/4);
	//PLAYED
	line(0, height/2, width, height/2);
	
	noStroke();
	fill(0);
	textSize(text_med);
	text('Stats', width/16, height * 25/32);
	fill(150);
	text('Played Cards', width/2, 5 * height/8)
	fill(0)
	textSize(text_sml);
	textAlign(LEFT, TOP);
	text(current_stats, 5, 13/16 * height, width/2 - spc, height/4 - spc);
}

function draw_cards() {
	textAlign(LEFT, TOP);
	for(i in hand) {
		hand[i].show();
	}
	for(i in played) {
		played[i].show();
	}
	for(i in pool) {
		pool[i].show();
	}
	textAlign(CENTER, CENTER);
	end_button.show();
}

function draw_unexpected() {
	//Display message for unexpected finish
	unexpected_button.show();
	fill(255, 0, 0);
	noStroke();
	text("Player(s) unexpectedly left the server", width/2, height/2);
}

function mouseReleased() {
	
	if(started &&  end_button.pressed()) { end_button.func(); return; }

	if(alert_display &&  extra_button.pressed()) { extra_button.func(); return; }

	if(unexpected_over) {
		if(unexpected_button.pressed()) { unexpected_button.func(); return; }
	}

	if(started && !alert_display) {
		for(i in hand) {
			if(hand[i].pressed() && !choosing) {
				make_move({type: "hand", index: i});
				return;
			}
		}
		for(i in pool) {
			if(pool[i].pressed() && choosing) {
				if(pool[i].selected) {
					pool[i].selected = !pool[i].selected;
					total_value -= pool[i].value;
					num_selected --;
				} else if(!pool[i].selected && num_selected < max_selected) {
					pool[i].selected = !pool[i].selected;
					total_value += pool[i].value;
					num_selected ++;
				}
				return;
			}
		}
	}
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
});

socket.on('pause', function(pause) {
    paused = pause;
});

socket.on('unexpected', function() {
	//game ends unexpectedly
	unexpected_over = true;
	alert_display = false;
});

socket.on('over', function() {
	//game is over
	over = true;
});

socket.on('started', function() {
	//game has started
	started = true;
});

socket.on('reset', function() {
	//client should be reset
	reset();
});

socket.on('turn', function(val) {
	turn = val;
});

socket.on('new', function() {
	//joined a game
	started = false;
	ready = false;
	over = false;
	unexpected_over = false;
	document.getElementById("player_log").textContent = "";
});

socket.on('log', function(message) {
	//add message to player log
	document.getElementById("player_log").textContent = message + "\n" + document.getElementById("player_log").textContent;
});

socket.on('hand', function(cards) {
	//player hand is being sent
	//Create card objects for each card in the hand
	console.log(cards.length);
	var w = minimum((6 * width/8 - spc)/cards.length, max_card_width);
	var temp = [];
	for(c in cards) {
		temp.push(new Card(width/4 + c * w + spc, height - (height/4 - spc), w - spc, height/4 - 20, cards[c].suit, cards[c].value, cards[c].colour));
	}
	hand = temp;
});

socket.on('stats', function(stats) {
	//player stats are being sent
	current_stats = stats;
});

socket.on('played', function(cards) {
	//player played cards are being sent
	console.log("Played:");
	console.log(cards);
	var w = min((width - spc)/cards.length, max_card_width);
	var temp = [];
	for(c in cards) {
		temp.push(new Card(c * w + spc, height/2 + spc, w - spc, height/4 - 20, cards[c].suit, cards[c].value, cards[c].colour));
	}
	played = temp;
});

socket.on('pool', function(cards) {
	//game pools are being sent
	//Only need to display the top cards from each pool
	var n = ceil(cards.length/2);
	var w = minimum((width - spc)/n, max_card_width); //get card width
	var temp = [];
	var rows = [0, 0];
	var row = 0;
	var offset = 0;
	for(c in cards) {
		if(c < n) {
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
});

socket.on('choose', function(data) {
	//Allows the player to select a card for various reasons (discard/trash etc)
	deselect_all();
	choosing = true;
	prev_button_state = end_button.disabled;
	end_button.disabled = false;
	choose_place = data.place;
	choose_value = data.value;
	choose_max = data.max;
	choose_min = data.min;
	total_value = 0;
	num_selected = 0;
	prev_phase = end_button.text;
	end_button.text = "End " + data.type;
});


socket.on('disable', function() {
	//Disbales end_phase button when it's not the players turn
	end_button.disabled = true;
	end_button.text = "Not your turn";
});

socket.on('alert', function(message) {
	//Alerts players (used for start/end of turn)
	custom_alert(message);
});

function display_alert() {
	textSize(text_lrg);
	fill(100, 100);
	noStroke();
	rect(0, 0, width, height);
	fill(250);
	stroke(51);
	rect(width/8, height/8, 3/4 * width, 3/4 * height);
	line(width/8, 3/16 * height, 7/8 * width, 3/16 * height);
	fill(51);
	noStroke();

	text("Alert!", width/2, 5/32 * height);
	extra_button.show();
	textSize(text_med);
	textAlign(CENTER, TOP);
	text(alert_message, width/8, 1/4 * height, 3/4 * width, 5/8 * height);
	textAlign(CENTER, CENTER);
}

function custom_alert(message) {
	end_button.disabled = true;
	alert_display = true;
	alert_message = message;
	extra_button = new Button(width/8, height/8, width/8, height/16, "Close", "#ffaaaa", function() { //Used for closing the reveal panel
		end_button.disabled = false;
		alert_display = false;
		if(over) {
			socket.emit('new', 'reset');
		}
	});
}

function end_choosing() {
	if(num_selected >= min_selected && num_selected <= max_selected && total_value == choose_value) {
		var selected = [];
		for(var c in pool) {
			if(pool[c].selected) {
				selected.push(pool[c].pool);
			}
		}
		deselect_all();		
		choosing = false;
		end_button.text = prev_phase;
		end_button.disabled = prev_button_state;
		return true;
	} else {
		if(total_value != choose_value) {
			custom_alert("Please choose card(s) that have a combined value of " + choose_value);
		}
		if(min_selected == max_selected) {
			custom_alert("Please choose " + min_selected + " card(s) that have a combined value of " + choose_value);
		} else {
			custom_alert("Please choose between " + min_selected + " and " + max_selected + " cards that have a combined value of " + choose_value);
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

		console.log(this.suit, this.value);

		if(colour == null) { 
			this.colour =[255, 255, 255];
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
		textAlign(CENTER, CENTER);
		if(this.selected && choosing) {
			stroke(0, 255, 255);
			fill(0, 255, 255);
			rect(this.x, this.y, this.w, this.h);
		} else {
			stroke(51);
			fill(this.colour[0], this.colour[1], this.colour[2]);
			rect(this.x, this.y, this.w, this.h);
		}
		if(this.pressed() && !alert_display) {
			fill(200, 200, 200);
		} else {
			fill(this.colour[0] + 100, this.colour[1] + 100, this.colour[2] + 100);
		}
		noStroke();
		
		rect(this.x + 5, this.y + 5, this.w - spc, this.h - spc);
		fill(51);
		noStroke();
		textSize(text_med);
		text(this.value + " of " + this.suit, this.x + 5, this.y + 5, this.w - spc, this.h/2 - spc);
		var size = minimum(this.w - (spc * 2), this.h/2 - (spc * 2));
		image(icons[this.suit], this.x + this.w/2 - size/2, this.y + (this.h * 3/4) - size/2, size, size);
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
		this.colour = color(colour);
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
		textSize(text_lrg);
		stroke(51)
		fill(this.colour);
		if(this.disabled || this.pressed()) {
			fill(red(this.colour) - 50, green(this.colour) - 50, blue(this.colour) - 50);
		}
		rect(this.x, this.y, this.w, this.h);
		fill(51);
		
		noStroke();
		text(this.text, this.x, this.y, this.w, this.h);
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
	alert_display = false;
	alert_message = "";
	started = false; //game has not begun
	ready = false;
	selected = false;
	over = false; //When the game ends naturally
	unexpected_over = false; //if people leave the game;
	paused = false;
	open_games = false;

	setup();
}

function minimum(a, b) {
	if(a < b) {
		return a;
	}
	return b;
}