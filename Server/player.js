const card = require('./card.js');
class Player {

	constructor(socket) {
		this.socket = socket;

		this.scopas = 0;
		this.score = 0;

		this.hand = [];
		this.cards = [];

		this.choosing = false;
	}

	set_name(name) {
		this.name = name;
	}

	add_scopa() {
		this.scopas += 1;
	}

	add_score(amt) {
		this.score += amt;
	}


	new_round() {
		//resets the player ready for a new round
		this.scopas = 0;
		this.hand = [];
		this.cards = [];
	}

	hand_empty() {
		return this.hand.length <= 0;
	}

	play_card(index) {
		//Moves cards from the hand to the played array	
		if(index == null) return;
		return this.hand.splice(index, 1); //copy values over and remove cards from hand
	}

	deal_cards(cards) {
		this.hand = cards;
	}

	collect_cards(cards) {
		this.cards.concat(cards);
	}

	calc_score() {
		var score = {};

		var prime = {
			"Suns": 0,
			"Feathers": 0,
			"Swords": 0,
			"Cups": 0
		};

		score["num_cards"] = this.cards.length;
		score["scopas"] = this.scopas;
		score["seven"] = 0;

		for(var c in this.cards) {
			if(this.cards[c].suit == "Suns") {
				score["suns"] += 1;
				if(this.cards[c].value == 7) {
					score["seven"] = 1;
				}
			}
			prime[this.cards[c].suit] = max(prime[this.cards[c].suit], this.cards[c].points);
		}

		score["prime"] = prime;

		return score;
	}
}

module.exports = Player;