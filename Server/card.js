const helper = require('./helper_functions.js');

class Card {

    constructor(value, suit, score, colour) {
        this.value = value;
        this.suit = suit;
        this.score = score;
        this.colour = colour;
    }

    static get_deck() {
        var deck = [];

        for(var i = 1; i <= 10; i ++) {
            deck.push(new Card(i, "Suns", scores[i], colours["Suns"]));
            deck.push(new Card(i, "Cups", scores[i], colours["Cups"]));
            deck.push(new Card(i, "Clubs", scores[i], colours["Clubs"]));
            deck.push(new Card(i, "Swords", scores[i], colours["Swords"]));
        }

        return helper.shuffle(deck);
    }
}

scores = {
    7: 21,
    6: 18,
    1: 16,
    5: 15,
    4: 14,
    3: 13,
    2: 12,
    8: 10,
    9: 10,
    10: 10
};

colours = {
    "Suns": "#ffa500",
    "Cups": "#00c403",
    "Clubs": "#bc1c1c",
    "Swords": "#0065ff"
}

module.exports = Card;