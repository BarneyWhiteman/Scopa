//Classes
const player = require('./player.js');
const helper = require('./helper_functions.js');
const server = require('./index.js');
const card = require('./card.js');

class Game {

	constructor(game_id) {
		
		this.players = [];
		
		this.full = false;
		this.started = false;
		this.game_id = game_id;

		this.max_players = 2;
		this.min_players = 2;

		this.winning_score = 11;
		
		this.deck = [];
		this.table = [];
		this.played = [];

		this.first_turn = 0;
		this.turn = 0;

		this.last_collected = -1;
		this.last_message = -1;
	}

	update_game_state() {
		if(this.started && this.game_over()) {
			console.log("game over");
			console.log(this.get_winner_text());
			this.alert_all_players("Game over. The Winners are:<br/>" + this.get_winner_text() + "<br/>Once this window is closed you will be taken to the game selection screen");
			server.game_over(this.game_id);
			return;
		}

		if(this.all_hands_empty() && ! this.player_choosing()) {
			if(this.deck.length == 0) {
				if(this.table.length != 0) {
					console.log("last cards collected by " + this.players[this.last_collected].name);
					this.players[this.last_collected].collect_cards(this.table);
					this.send_to_log(this.last_collected, ": last to pick-up and gets the remaining cards\n");
					for(var c in this.table) {
						this.send_to_log(this.last_collected, ": collected " + this.get_card_name(this.table[c]));
					}
					this.table = [];
					this.send_cards_to_all();
				}
				
				this.calc_scores();
				if(this.game_over()) {
					this.update_game_state();
				}
				this.new_round();
			} else {
				this.new_hand();
			}
		}
	}

	inc_turn() {
		//Go to next players turn
		this.table = this.table.concat(this.played);
		this.played = [];
		this.send_cards_to_all();

		this.emit_to_player(this.turn, 'turn', false);
		this.emit_to_player(this.turn, 'disable', '');
		
		this.turn = (this.turn + 1) % this.players.length;
		this.emit_to_player(this.turn, 'turn', true);
	}

	new_round() {
		//inital deal etc
		this.deck = card.get_deck();
		this.turn = this.first_turn;
		this.first_turn = (this.first_turn + 1) % this.players.length;
		this.table = this.deck.splice(0, 4);
		this.emit_to_player(this.turn, 'turn', true);
		this.emit_to_player((this.turn + 1) % this.players.length, 'turn', false);

		for(var p in this.players) {
			this.players[p].new_round();
		}

		this.send_to_all_log("---New Round---");

		this.new_hand();
	}

	new_hand() {
		//deal throughout the game
		for(var p in this.players) {
			this.players[p].deal_cards(this.deck.splice(0, 3));
		}
		if(this.deck.length == 0) {
			this.send_to_all_log("---Last Cards!---");
		}
		this.send_cards_to_all();
	}

	all_hands_empty() {
		for(var p in this.players) {
			if(!this.players[p].hand_empty()) {
				return false;
			}
		}
		return true;
	}

	player_choosing() {
		for(var p in this.players) {
			if(this.players[p].choosing) {
				return true;
			}
		}
		return false;
	}

	game_over() {
		for(var p in this.players) {
			if(this.players[p].score >= this.winning_score) {
				return true;
			}
		}
		return false;
	}

	calc_scores() {
		var stats = [];
		var text = [];
		for(var p in this.players) {
			stats.push(this.players[p].calc_score());
			text.push(this.players[p].get_score_text());
		}
		var scores = [stats[0].scopas, stats[1].scopas];
		//Num Cards
		if(stats[0].num_cards > stats[1].num_cards && stats[0].num_cards != stats[1].num_cards) scores[0] += 1;
		else if(stats[0].num_cards != stats[1].num_cards) scores[1] += 1;
		//Seven
		if(stats[0].seven) scores[0] += 1;
		else scores[1] += 1;
		//Suns
		if(stats[0].suns > stats[1].suns && stats[0].suns != stats[1].suns) scores[0] += 1;
		else if(stats[0].suns != stats[1].suns) scores[1] += 1;
		//Prime
		if(stats[0].prime > stats[1].prime && stats[0].prime != stats[1].prime) scores[0] += 1;
		else if(stats[0].prime != stats[1].prime) scores[1] += 1;

		this.players[0].add_score(scores[0]);
		this.players[1].add_score(scores[1]);
		this.alert_all_players("Round over.<br/>Scores:<br/>" + this.players[0].name + ": " + scores[0] + "<br/>" + this.players[1].name + ": " + scores[1] + "<br/><br/>Details:<br/><div>" + text[0] + text[1] + "</div>");
	}

	start_game() {
			this.started = true;

			this.emit_to_all_players('started', 'the game has now begun');
			
			this.send_to_all_log("A new game has started");

			this.send_to_log(this.turn, ": gets first move")
			this.new_round();

			this.alert_player(this.turn, 'It is now your turn!');
			this.for_each_other_player(this.turn, function(game, player) {
				console.log("alerted" + player);
				game.alert_player(player, this.players[game.turn].name + " is starting the game. It will be your turn in just a moment!");
			});
			console.log('Game is ready to begin!');		
	}

	add_player(socket, name) {
		if(socket == null || socket == undefined) { return; }
		if(this.players.length < this.max_players) {
			this.players.push(new player(socket));
			this.players[this.players.length -1 ].set_name(name);
			server.emit_to_player(socket, 'test', 'game' + this.game_id);
			server.emit_to_player(socket, 'new', this.players.length - 1);
		}
		
		console.log(name + "(" + socket + ') has joined game' + this.game_id);
		this.send_to_log(this.players.length - 1, ": joined game" + this.game_id);
	
		if(this.players.length == this.max_players) {
			this.full = true;
			if(this.players.length >= this.min_players) { this.start_game(); }
		}
	}

	remove_player(socket) {
		var index = this.index_of_player(socket);
		this.players.splice(index, 1);
		if(this.players.length < this.min_players) return;
		this.send_to_all_log("Player" + index + " has left the game");
		if(this.turn == index) {
			this.turn -= 1;
			this.inc_turn(true);
		}
		this.full = false;
	}

	get_player_index(id) {
		for(var p in this.players) {
			if(this.players[p].socket == id) return p;
		}
		return -1;
	}

	get_player_name(id) {
		return this.players[this.get_player_index(id)].name;
	}

	send_cards_to_player(player) {
		//Sends the players hand and pool info to the specified player
		this.emit_to_player(player, 'hand', this.hand_to_send(player));
		this.emit_to_player(player, 'stats', this.stats_to_send(player));
		this.emit_to_player(player, 'pool', this.pool_to_send());
		this.emit_to_player(player, 'played', this.played_to_send());
	}

	send_cards_to_all() {
		//Sends every player their hand and pool info
		for(var p in this.players) {
			this.send_cards_to_player(p);
		}
	}

	emit_to_player(player, topic, msg) {
		try {
			server.emit_to_player(this.players[player].socket, topic, msg);
		} catch (e) {
			console.log("Could not emit to player.", player, topic, msg);
		}
	}

	emit_to_all_players(topic, msg) {
		for(var p in this.players) {
			this.emit_to_player(p, topic, msg);
		}
	}

	make_move(socket, move) {
		//validate that the player can make that move
		var player = this.index_of_player(socket);
		if(!this.validate_move(socket, move)) {
			return;
		}
		server.emit_to_player(socket, 'valid', 'valid move'); //obsolete
		if(move.type == "hand") {
			var card = this.players[player].play_card(move.index);

			this.send_to_log(player, ": played the " + this.get_card_name(card) + "\n");

			
			this.played.push(card);
			this.send_cards_to_all();
			
			this.check_for_matches(player, card);
		} else if(move.type == "choose") {
			if(!this.handle_choose(player, move)) {
				//chose invalid cards, try again;
				this.player_choose(player, this.players[player].min, this.players[player].max, this.players[player].value, "Chosen card(s) are invalid, please try again!");
			} else {
				this.inc_turn();
			}
		}
		this.send_cards_to_all();
		this.update_game_state();
	}

	check_for_matches(player, card) {
		//checks to see if there are any cards on the table that add up to the value.
		//if more than one option exists, let the player choose
		//if only one option exists, force the play
		//if there is a card of exactly the same value, force the play

		var exact_matches = [];

		for(var c in this.table) {
			if(this.table[c].value == card.value) {
				//exact match
				exact_matches.push(c);
			}
		}

		if(exact_matches.length == 1) {
			//force player's choice
			this.send_to_log(player, ": collected the " + this.get_card_name(this.table[exact_matches[0]]));
			this.players[player].collect_cards([this.table[exact_matches[0]], this.played[0]]); //give player cards
			this.table.splice(exact_matches[0], 1); //remove card from table
			this.played = [];
			this.check_for_scopas(player);
			this.last_collected = player;
			this.inc_turn();
			return;
		} else if(exact_matches.length > 1) {
			this.player_choose(player, 1, 1, card.value, "Please choose a card to collect with a value of " + card.value);
			return;
		} else {
			//no exact matches, need to check for additions
			var number_set = [];
			for(var c in this.table) {
				number_set.push({value: this.table[c].value, index: c});
			}
			var additions = this.subset_sum(number_set, card.value) || [];		
			
			
			if(additions.length == 1) {
				//only one addition -> force it;
				additions[0].sort(function(a, b) {
					return b.index - a.index;
				});
				var collected = [];
				for(var i in additions[0]) {
					collected = collected.concat(this.table.splice(additions[0][i].index, 1));
					this.send_to_log(player, ": collected the " + this.get_card_name(collected[collected.length - 1]));
				}
				collected.push(this.played[0]);
				this.players[player].collect_cards(collected);
				this.played = [];
				this.check_for_scopas(player);
				this.last_collected = player;
				this.inc_turn();
				return;
			} else if(additions.length > 1){
				//more than one -> let the player choose;
				this.player_choose(player, 2, this.table.length, card.value, "Please choose cards that add up to a value of " + card.value);
				return;
			}
		}
		this.inc_turn();
	}

	subset_sum(number_set, target, partial, result) {
		var s, n, remaining;
	  
		partial = partial || [];
		result = result || [];

		var vals = [];
		for(var i in partial) {
			vals.push(partial[i].value);
		}
	  
		// sum partial
		s = vals.reduce(function (a, b) {
			return a + b;
		}, 0);
	  
		// check if the partial sum is equals to target
		if (s === target) {
			result.push(partial);
			return result;
		}
	  
		if (s >= target) {
		  	return result;  // if we reach the number why bother to continue
		}
	  
		for (var i = 0; i < number_set.length; i++) {
		  	n = number_set[i];
		  	remaining = number_set.slice(i + 1);
		  	result = result.concat(this.subset_sum(remaining, target, partial.concat([n])));
		}
		return result;
	  }
	  

	check_for_scopas(player) {
		if(!(this.all_hands_empty() && this.deck.length == 0) && this.table.length == 0) {
			this.players[player].add_scopa();
			this.send_to_log(player, ": got a Scopa!");
		}
	}

	validate_move(socket, move) {
		//Check to ensure the player with id SOCKET can make the move MOVE
		if(this.started) {
			//not the players turn
			if(socket != this.curr_player().socket) return false;
		}
		return true;
	}

	player_choose(player, min, max, value, message) {
		//place should either be "hand" or "pool". num is the number of cards to choose. 
		//type is what will be done with the selected cards (ie discard, trash, etc)
		this.players[player].choosing = true;
		this.players[player].min = min;
		this.players[player].max = max;
		this.players[player].value = value;
		var choose = {min: min, max: max, value: value};
		this.emit_to_player(player, 'choose', choose);
		if(message != null) { this.emit_to_player(player, 'alert', message); }
	}

	handle_choose(player, move) {
		var cards = move.selected; //indecies of chosen cards within the place of selection
		if(!this.players[player].choosing || cards.length < this.players[player].min || cards.length > this.players[player].max) return false; //check if the player should be making a choice.

		var card_names = [];
		cards.sort(function (a, b) { return b - a; });  //indicies of cards selected (sorted into ascending order);

		//get total value;
		var total_value = 0;
		for(var i in cards) {
			total_value += this.table[cards[i]].value;
		}
		if(total_value > this.players[player].value) return false;

		//cards add up to total and there are the correct number, give cards to the player;
		var collected = this.played.splice(0);
		for(var i in cards) {
			collected = collected.concat(this.table.splice(cards[i], 1));
			this.send_to_log(player, ": collected the " + this.get_card_name(collected[collected.length - 1]));
		}
		
		this.players[player].collect_cards(collected);
		this.last_collected = player;
		this.players[player].choosing = false;
		this.check_for_scopas(player);
		this.send_cards_to_all();
		this.update_game_state();
		return true;
	}

	handle_pool_choose(selection) {
		this.pools_selection = selection;
	}

	for_each_other_player(player, func) {
		//Carries out the function "func" for every player excluding the player specified
		for(var p in this.players) {
			if(p == player) continue;
			try {
				func(this, p);
			} catch(e) {}
		}
	}

	index_of_player(socket) {
		for(var p in this.players) {
			if(this.players[p].socket == socket) {
				return p;
			}
		}
		return -1;
	}

	get_card_name(card) {
		//Use the variable name to get the cards proper name
		return card.value + " of " + card.suit;
	}
	

	hand_to_send(player) {
		//Converts the cards object array into a format to send to the client (less data intensive)
		return this.players[player].hand;
	}

	stats_to_send(player) {
		//Gets the players round stats (how many actions, buys etc) into a format that is good for the
		var stats = ["Scopas: " + this.players[player].scopas];
		stats.push("No. cards collected: " + this.players[player].cards.length);
		stats.push("No. hands remaining: " + this.deck.length/(this.players.length * 3));
		stats.push("Score so far: " + this.players[player].score);
		stats.push("Opp. score  : " + this.players[1 - player].score);
		return stats;
	}

	pool_to_send() {
		return this.table;
	}
	
	played_to_send() {
		return this.played;
	}

	send_to_log(player, message) {
		var person = "";
		for(var p in this.players) {
			if(p == player) person = "You";
			else if(player != null) person = this.players[player].name;
			this.emit_to_player(p, 'log', person + message);
		}
	}

	send_to_all_log(message) {
		for(var p in this.players) {
			this.emit_to_player(p, 'log', message);
		}
	}

	alert_all_players(message) {
		for(var p in this.players) {
			this.alert_player(p, message);
		}
	}

	alert_player(player, message) {
		this.emit_to_player(player, 'alert', message);
	}

	get_winners() {		
		var order = []; //variable to hold all players
		
		//winner is based on points scored
		for(var p in this.players) {
			order.push([this.players[p].name, this.players[p].score]);
		}

		order.sort(function (a, b) { 
			return b[1] - a[1]
		}); //sort players in descending order based on score
		return order;
	}

	get_winner_text() {
		var win = this.get_winners();
		var text = "";
		for(var w = 0; w < win.length; w ++) {
			text += (w + 1) + ". " + win[w][0] + " has " + win[w][1] + " points<br/>";
		}
		return text;
	}

	curr_player() {
		return this.players[this.turn];
	}

	pool_empty(name) {
		return this.pools[name].cards.length == 0;
	}

	chat(id, message) {
		var player = this.get_player_index(id);
		var person = "";
		for(var p in this.players) {
			if(p == player) person = "You";
			else if(player != null) person = this.players[player].name;
			if(player != this.last_message) {
				this.emit_to_player(p, 'chat', "\n" + person + ":");
			}
			this.emit_to_player(p, 'chat', "> " + message);
		}
		this.last_message = player;
	}
};

module.exports = Game;