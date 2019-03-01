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
		
		this.deck = card.get_deck();
		this.table = [];
		this.played = [];

		this.first_turn = 0;
		this.turn = 0;
	}

	update_game_state() {
		if(this.started && this.game_over()) {
			console.log("game over");
			console.log(this.get_winner_text());
			this.alert_all_players("Game over. The Winners are:\n" + this.get_winner_text() + "\n\nOnce this window is closed you will be taken to the game selection screen");
			server.game_over(this.game_id);
			this.emit_to_all_players("over", "gameover");
		}
		// if(this.turn_structure[this.phase] == "clear") {
		// 	this.curr_player().new_round();
		// 	this.inc_phase();
		// 	this.send_cards_to_player(this.turn);
		// }
		// if(this.turn_structure[this.phase] != "action" && this.curr_player().current_round_stats[this.turn_structure[this.phase]] === 0) {
		// 	//If player has no moves for current phase (not if in action phase since players should still be allowed to play money)
		// 	this.inc_phase(); //Go to next phase automatically
		// }
	}

	inc_turn(removed) {
		//Go to next players turn
		this.played = [];
		if(removed == null) {
			this.send_to_log(this.turn, ": turn has ended");
			this.emit_to_player(this.turn, 'disable', '');
			this.curr_player().end_round();
			this.send_cards_to_player(this.turn);
			this.alert_player(this.turn, 'Your turn has ended'); //let the player know their turn is over
		}
		this.turn = (this.turn + 1) % this.players.length;
		if(this.turn == 0) this.round += 1;
		this.apply_permanent_cards(this.turn);
		this.alert_player(this.turn, 'It is now your turn!'); //let new player know their turn started
		this.send_to_log(this.turn, ": turn has begun");
	}

	new_round() {
		//inital deal etc
		this.turn = this.first_turn;
		this.first_turn = (this.first_turn + 1) % this.players.length;
		this.table = this.deck.splice(0, 4);
		console.log(this.table);
		for(var p in this.players) {
			this.players[p].new_round();
		}
		this.new_hand();
		this.send_cards_to_all();
	}

	new_hand() {
		//deal throughout the game
		for(var p in this.players) {
			this.players[p].deal_cards(this.deck.splice(0, 3));
		}
	}

	game_over() {
		for(var p in this.players) {
			if(this.players[p].score >= this.winning_score) {
				return true;
			}
		}
		return false;
	}

	start_game() {
			this.started = true;

			this.emit_to_all_players('reset', 'the game has now begun');
			this.emit_to_all_players('started', 'the game has now begun');
			
			this.send_to_all_log("A new game has started");

			this.send_to_log(this.turn, ": gets first move")
			this.new_round();

			this.alert_player(this.turn, 'It is now your turn!');
			this.for_each_other_player(this.turn, function(game, player) {
				game.alert_player(player, "You are player " + player + ".\n\nPlayer " + game.turn + 
				" is starting the game. It will be your turn in just a moment!");
			});
			console.log('Game is ready to begin!');

			this.update_game_state();
		
	}

	add_player(socket) {
		if(this.players.length < this.max_players) {
			this.players.push(new player(socket));
			var name = "Player" + (this.players.length - 1);
			this.players[this.players.length -1 ].set_name(name);
			server.emit_to_player(socket, 'new', 'new game beginning');
		}
		
		console.log(socket + ' has joined game' + this.game_id);
		this.send_to_log(this.players.length - 1, ": joined the game");
	
		if(this.players.length >= this.max_players) {
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

	send_cards_to_player(player) {
		//Sends the players hand and pool info to the specified player
		this.emit_to_player(player, 'hand', this.hand_to_send(player));
		this.emit_to_player(player, 'stats', this.stats_to_send(player));
		this.emit_to_player(player, 'pool', this.pool_to_send());
		this.emit_to_player(player, 'pool', this.played_to_send());
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
			var card = this.players[player].hand[move.index];

			this.played.concat(this.players[player].play_card(move.index));
			
			this.send_to_log(player, ": played the " + this.get_card_name(card));
			this.send_cards_to_all();
			
			this.check_for_matches(player, card);
		} else if(move.type == "choose") {
			this.handle_choose(player, move);
		}
		this.update_game_state();
	}

	check_for_matches(player) {
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
			this.players[player].collect_cards([this.table[exact_matches[0]], this.played[0]]); //give player cards
			this.table.splice(exact_matches[0], 1); //remove card from table
			return;
		} else if(exact_matches.length > 1) {
			//player can choose which of the two cards they want
		}

		//check for scoopas
	}

	validate_move(socket, move) {
		//Check to ensure the player with id SOCKET can make the move MOVE
		if(this.started) {
			//not the players turn
			if(socket != this.curr_player().socket) return false;
		}
		return true;
	}

	purchase_from_pool(player, pool, free) {
		if(this.pools[pool].cards.length > 0) { //check if there are enough cards
			var card = this.pools[pool].cards[0]; //get the top card from the selected pool
			var card_cost = this.cards[card].cost
			var location = "discard";
			if(this.cards[card].discount) {
				var discount = this.game_functions[this.cards[card].function + "_discount"](this, player);
				if(discount == "hand") {
					location = "hand";
				} else {
					card_cost -= discount;
				}
			}
			var card_currency = this.cards[card].currency;
			var player_value = this.players[player].current_round_stats[card_currency]; //players money
			if(free || player_value >= card_cost) {
				if(!this.pools[pool].permanent) { //if the pool is not a permanent card
					this.pools[pool].cards.splice(0, 1); //remove the top card
					if(this.cards[card].discard == true) {
						this.pools.trash.cards.push(card);
					} else {
						if(location == "discard") {
							this.players[player].add_card_to_discard(card);
						} else if(location == "hand") {
							this.players[player].add_card_to_hand(card);
						} else if(location == "deck") {
							this.players[player].add_card_to_deck(card);
						}
					}
				}
				if(this.cards[card].discard == true) {
					this.apply_card_stats(player, card);
				}
				if(this.pools[pool].type == "dealt") {
					if(this.pools[pool].cards.length == 0) {
						this.draw_pool_card(pool);
					}
				}
				this.players[player].add_to_round_stats(card_currency, -1 * card_cost);
				this.players[player].add_to_round_stats("buy", -1);
				this.players[player].run_callbacks(this, player, card, "acquired");
				return true;//successfully purchased
			}
		}
		return false;//did not purchase
	}

	add_card(player, price, currency, callback) {
		this.players[player].add_card_price = price;
		this.players[player].add_card_currency = currency;
		var message = "You may gain a card costing up to " + price + " " + currency + " from one of the pools";
		this.player_choose(player, "pool", 0, 1, "gain", callback, message, price);
	}

	player_choose(player, place, min, max, type, callback, message, price) {
		//place should either be "hand" or "pool". num is the number of cards to choose. 
		//type is what will be done with the selected cards (ie discard, trash, etc)
		this.players[player].choosing = true;
		this.players[player].choose_type = type;
		this.players[player].callback = callback;
		this.players[player].place = place;
		this.players[player].min = min;
		this.players[player].max = max;
		var choose = { place: place, min: min, max: max, type: type, price: price};
		this.emit_to_player(player, 'choose', choose);
		this.emit_to_player(player, 'alert', message);
	}

	handle_choose(player, choices) {
		var place = choices.place; //"hand" or "pool" (where the cards have been selected);
		var cards = choices.selected; //indecies of chosen cards within the place of selection
		if(!this.players[player].choosing || place != this.players[player].place || 
			cards.length < this.players[player].min || cards.length > this.players[player].max) return; //check if the player should be making a choice.

		var card_names = [];
		cards.sort(function (a, b) { return a - b; });  //indicies of cards selected (sorted into ascending order);
		var type = this.players[player].choose_type;
		if(place == "hand" || place == "played") {
			for(var c in cards) {
				if(place == "hand") card_names.push(this.players[player].hand[cards[c] - c]);
				if(place == "played") card_names.push(this.players[player].played[cards[c] - c]);
				if(type == "discard") {
					this.send_to_log(player, ": discarded a " + this.get_card_name(card_names[card_names.length - 1]));
					this.players[player].discard_card(cards[c] - c); //offset by num of previously removed cards
				} else if(type == "trash") {
					this.send_to_log(player, ": trashed a " + this.get_card_name(card_names[card_names.length - 1]));
					this.pools.trash.cards.push(this.players[player].trash_card(cards[c] - c)); //offset by num of previously removed cards
				}
			}
		} else if(place == "pool") {
			if(type == "gain" && cards.length == 1) { //if the player is gaining a card
				var card = this.pools[cards[0]].cards[0];
				if(this.get_card_cost(card) <= this.players[player].add_card_price && this.get_card_currency(card) == this.players[player].add_card_currency) {
					card_names.push(this.pools[cards[0]].cards[0]);
					this.send_to_log(player, ": gained a " + this.get_card_name(this.pools[cards[0]].cards[0]));
					this.players[player].add_card_to_discard(this.pools[cards[0]].cards[0]);
					this.pools[cards[0]].cards.splice(0, 1); //remove the top card
					if(this.pools[cards[0]].type == "dealt") {
						if(this.pools[cards[0]].cards.length == 0) {
							this.draw_pool_card(cards[0]);
						}
					}

				}
			}
		} else if(place == "any") {
			card_names.push("any");
		}
		this.players[player].choosing = false;
		if(this.players[player].callback) {
			try {
				this.game_functions[this.players[player].callback](this, player, card_names);
			} catch(e) {
				console.log(e);
			}
		}
		this.send_cards_to_player(player);
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
		//Gets the players round stats (how many actions, buys etc) into a format that is good for the client
		return "Scopas: " + this.players[player].scopas;
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

	get_pool_names() {
		var names = [];
		for(var p in this.game_data.pools.random) {
			names.push(this.game_data.pools.random[p].name);
		}
		return names;
	}

	deal_damage(player, amount) {
		//deals damage to all players except "player";
		for(var p in this.players) {
			if(p == player) continue;
			this.players[p].deal_damage(amount);
		}
	}

	draw_pool_card(pool) {
		//draws from the pool deck into the specified pool (if eligable);
		if(this.pools[pool].type != "dealt") return;
		var num = this.pools[pool].size;
		if(num > this.pools.deck.cards.length) {
			var temp = [];
			var len = this.pools.deck.cards.length;
			//draw all cards left in the deck
			temp = temp.concat(this.pools.deck.cards.splice(0, len));
			this.refresh_pool_deck();
			//draw remaining cards from new deck
			this.pools[pool].cards = temp.concat(this.pools.deck.cards.splice(0, num - len));
		} else {
			//take the top cards from the deck
			this.pools[pool].cards = this.pools.deck.cards.splice(0, num);
		}
	}

	refresh_pool_deck() {
		//Shuffles the discard into the deck;
		this.pools.deck.cards = helper.shuffle(this.pools.trash.cards);
	}

	initiate_pools() {
		//Each pool is an Object with fields: name, cards, type, permanent. 
		//Type is either random or constant based on where it is in the config
		//Perminant is whether a card remains in the pools or is put in the hand when purchased
		this.pools["trash"] = { "cards": [], type: "constant" };
		//Pools that are constant (always the same set of cards)
		if(this.game_data.pools.const != null) {
			for(var p in this.game_data.pools.const) {
				var single_pool = this.get_pool_array(this.game_data.pools.const[p].cards, this.game_data.pools.const[p].shuffled);
				this.pools[this.game_data.pools.const[p].name] = { "cards": single_pool, "type": "constant" };
				if(this.game_data.pools.const[p].permanent == true) {
					this.pools[this.game_data.pools.const[p].name].permanent = true;
				}
			}
		}
		//Changeable, either picked by the player or random
		if(this.game_data.pools.random != null) {
			//Get indicies of pools to use from the random pools
			if(this.pools_selection == "random") {
				var random = [];
				while (random.length < this.game_data.pools.num_random) {
					var n = helper.rand_int(this.game_data.pools.random.length);
					if(random.indexOf(n) == -1) {
						random.push(n);
					}
				}
				//sort random indicies
				random.sort(function (a, b) { return a - b; });
				this.pools_selection = random;
			}
			//Random pools (choose n pools from the set)
			for(var p = 0; p < this.pools_selection.length; p++) {
				var single_pool = this.get_pool_array(this.game_data.pools.random[this.pools_selection[p]].cards, this.game_data.pools.random[this.pools_selection[p]].shuffled);
				this.pools[this.game_data.pools.random[this.pools_selection[p]].name] = { "cards": single_pool, "type": "random" };
				if(this.game_data.pools.random[this.pools_selection[p]].permanent == true) {
					this.pools[this.game_data.pools.random[this.pools_selection[p]].name].permanent = true;
				}
			}
		}

		if(this.game_data.pools.deck != null) {
			var single_pool = this.get_pool_array(this.game_data.pools.deck.cards, this.game_data.pools.deck.shuffled);
			this.pools.deck = { "cards": single_pool, "type": "deck" };
			if(this.game_data.pools.deck.permanent == true) {
				this.pools.deck.permanent = true;
			}
		}
		if(this.game_data.pools.dealt != null) {
			for(var p = 0; p < this.game_data.pools.dealt.num; p ++) {
				var key = "Dealt" + p;
				this.pools[key] = { "cards": [], "type": "dealt", "size": this.game_data.pools.dealt.size };
				this.draw_pool_card(key);
			}
		}
	}

	get_pool_array(cards, shuffled) {
		//Generates an array used for a single pool
		var single_pool = [];
		for(var n = 0; n < cards.length; n++) {
			var num_cards = cards[n].count;
			if(num_cards == null) {
				//Used if it changes based on the number of people playing
				num_cards = cards[n].values[this.players.length];
			}
			for(var i = 0; i < num_cards; i++) {
				single_pool.push(cards[n].name);
			}
		}
		if(shuffled) {
			single_pool = helper.shuffle(single_pool);
		}
		return single_pool;
	}

	get_dealt_cards() {
		var cards = [];
		for(var p in this.pools) {
			if(this.pools[p].type == "dealt") {
				cards.push(this.pools[p].cards[0]);
			}
		}
		return cards;
	}

	cards_JSON_to_array(cards) {
		var temp = []; //Holds card values
		for(var c in cards) {
			for(var n = 0; n < cards[c].count; n++) {
				temp.push(cards[c].name); //Add the required number of cards
			}
		}
		return temp;
	}

	get_winners() {		
		var order = []; //variable to hold all players
		
		//winner is based on points scored
		for(var p in this.players) {
			order.push([p, this.players[p].score]);
		}

		order.sort(function (a, b) { return b[1] - a[1] }); //sort players in descending order based on score
		return order;
	}

	get_winner_text() {
		var win = this.get_winners();
		var text = "";
		for(var w = 0; w < win.length; w ++) {
			text += (w + 1) + ". Player" + win[w][0] + " has " + win[w][1] + " points\n";
		}
		return text;
	}

	curr_player() {
		return this.players[this.turn];
	}

	pool_empty(name) {
		return this.pools[name].cards.length == 0;
	}

	player_has_zero_health() {
		for(var p in this.players) {
			if(this.players[p].health <= 0) return true;
		}
		return false;
	}

	num_pool_empty() {
		var num = 0;
		for(var p in this.pools) {
			if(this.pools[p].cards.length == 0) num++;
		}
		return num;
	}

	total_additional_points() {
		var num = 0;
		for(var p in this.players) {
			num += this.players[p].points;
		}
		return num;
	}
};

module.exports = Game;