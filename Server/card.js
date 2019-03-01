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
            deck.push(new Card(i, "Feathers", scores[i], colours["Feathers"]));
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
    "Suns": [255, 165, 0],
    "Cups": [0, 196, 3],
    "Feathers": [188, 28, 28],
    "Swords": [50, 50, 50]
}

module.exports = Card;