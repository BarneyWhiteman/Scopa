const card = require('./card.js');
class Player {

	constructor(socket) {
		this.socket = socket;

		this.scopas = 0;
		this.score = 0;

		this.hand = [];
		this.cards = [];

		this.choosing = false;
		this.name = "";
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
		return this.hand.length == 0;
	}

	play_card(index) {
		//Moves cards from the hand to the played array	
		if(index == null) return;
		return this.hand.splice(index, 1)[0];
	}

	deal_cards(cards) {
		this.hand = cards;
	}

	collect_cards(cards) {
		this.cards = this.cards.concat(cards);
	}

	calc_score() {
		var score = {};

		var prime = {
			"Suns": 0,
			"Clubs": 0,
			"Swords": 0,
			"Cups": 0
		};

		score["num_cards"] = this.cards.length;
		score["scopas"] = this.scopas;
		score["seven"] = false;
		score["suns"] = 0;

		for(var c in this.cards) {
			if(this.cards[c].suit == "Suns") {
				score["suns"] += 1;
				if(this.cards[c].value == 7) {
					score["seven"] = true;
				}
			}
			prime[this.cards[c].suit] = Math.max(prime[this.cards[c].suit], this.cards[c].score);
		}

		var total_prime = 0;
		for(var p in prime) {
			total_prime += prime[p];
		}
		score["prime"] = total_prime;
		score["raw"] = prime;

		return score;
	}

	get_score_text() {
		var score = this.calc_score();
		var text = "<div style=\"float:left; width:50%\"><b>" + this.name + "</b><br/>";
		text +=  "Cards: " + score.num_cards + "<br/>Suns: " + score.suns + "<br/>Seven of Suns: ";
		if(!score.seven) {
			text += "No<br/>";
		} else {
			text += "Yes<br/>";
		}
		text += "Primiera:" + score.prime + "<ul><li>Suns: " + score.raw.Suns + "</li><li>Clubs: " + score.raw.Clubs + "</li><li>Swords: " + score.raw.Swords + "</li><li>Cups: " + score.raw.Cups + "</li></ul>";
		text += "<br/>Scopas: " + score.scopas + "</div>"; 

		return text;
	}

}

module.exports = Player;