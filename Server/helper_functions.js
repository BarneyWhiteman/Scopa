var shuffle = function(cards) {
    var shuffled_cards = [];
    var len = cards.length;
    for(var i = 0; i < len; i++) {
        //get random index of remaining cards
        var j = rand_int(cards.length);
        //add to shuffled cards
        shuffled_cards.push(cards[j]);
        //remove from cards to choose
        cards.splice(j, 1);
    }
    return shuffled_cards;
}

//return a random float from 0 to n
function random(n) {
    return Math.random() * n;
}

//return a random int from 0 to n
var rand_int = function(n) {
    return Math.floor(random(n));
}

exports.shuffle = shuffle;
exports.rand_int = rand_int;
