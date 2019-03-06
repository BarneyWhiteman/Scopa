var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var config = require('./GameFiles/config.json');
var port = config.port;
var root = __dirname.split('\Server')[0]; //Get the base directory for the project

//directories for use:
app.use('/JavaScript', express.static(root + '/JavaScript'));
app.use('/images', express.static(root + '/images'));
app.use('/HTML', express.static(root + '/HTML'));
app.use('/CSS', express.static(root + '/CSS'));
app.use('/', express.static(root + '/'));
//Default page to send when somone connects to the server
app.get('/', function(req, res){
  res.sendFile(root + '/HTML/client.html');
});

//Classes
const Game = require('./game.js');
const helper = require('./helper_functions');

var players = []; //Keep track of current players
var games = []; //Keep track of current games


io.on('connection', function(socket) {
    // Listen on the connection event for incoming sockets and write to console
    console.log(socket.id + " has joined");
    emit_to_player(socket.id, 'connected', 'ur connected now brah');

    //New player, let them choose the game they want
    socket.on('test', function(message) {
        console.log(message);
    });
        
    socket.on('new', function(name) {
        //player has selected which games to play, add them to a game or create a new one
        //remove_player_from_game(socket.id, get_players_game_index(socket.id));
        if(name.toLowerCase().indexOf("kristen") != -1) name = "Old Girl";
        add_player_to_game(socket.id, name);
    });

    socket.on('move', function(move) {
        //Player sends 'move' signal when attempting a move
        var index = get_players_game_index(socket.id);
        //Pass the move onto the game that the player is in
        if(index != -1) { games[index].make_move(socket.id, move); }
    });

    socket.on('chat', function(message) {
        var index = get_players_game_index(socket.id);
        if(index != -1) {
            games[index].chat(socket.id, message);
        }
    });

    socket.on('reconnect', function() {
        emit_to_player(socket.id, 'connected', 'yeet brah, gotchu fam');
    })

    socket.on('disconnect', function() {
        //Remove player from game
        var index = get_players_game_index(socket.id);
        if(index != -1) { games[index].remove_player(socket.id); } //remove from game object

        console.log(socket.id + " disconnected: " + index);
        
        if(index != -1 && games[index].players.length < games[index].min_players) {
            //If the game has too few people in it: remove it
            if(games[index].started) {
                //Too few people to continue the game
                //Let anyone still on the server know
                emit_to_each_player_in_game(index, 'unexpected', 'too few players');
                console.log("game" + games[index].game_id + " had too few players and is shutting");
            }
            //Remove game
            game_over(index);
        }
    })
});

http.listen(port, function(){
    //Listen on specified port for connections
    console.log('listening on port:' + port);
});

function emit_to_each_player_in_game(game, topic, msg) {
    //Sends a message to all the players in a given game
    //Sends message 'msg' on topic 'topic' to all players in the game with index 'game'
    for(var p in games[game].players) {
        emit_to_player(games[game].players[p].socket, topic, msg);
    }
}

var emit_to_player = function(id, topic, msg) {
    //Sends a message to a player
    io.to(id).emit(topic, msg);
}

function add_player_to_game(id, name) {
    //Add player to first open game, otherwise create a new one

    var added = false;

    for(g in games) {
        if(!games[g].full && !games[g].started) {
            games[g].add_player(id, name);
            players.push({id: id, game_id: games[g].game_id, name: name});
            added = true;
            break;
        }
    }
    if(!added) {
        var game_id = 0;
        if(games.length != 0) { game_id = games[games.length - 1].game_id + 1; }
        
        console.log("adding new game with id: " + game_id);
        games.push(new Game(game_id));
        games[games.length - 1].add_player(id, name);
        players.push({id: id, game_id: game_id, name: name});
        added = true;
    }

    if(!added) {
        console.log("Error adding " + name + "(" + id + ") to a game");
    }

    console.log(players);
}

function get_players_game_index(id) {
    //look through list of players searching for player with an id of 'id'. When found return the game id, otherwise -1
    game_id = -1;
    for(var p in players) {
        if(players[p].id == id) { game_id = players[p].game_id; }
    }
    for(var g in games) {
        if(games[g].game_id == game_id) { return g; }
    }
    return -1;
}

function remove_game(index) {
    //remove game from list of available games
    games.splice(index, 1);
    
    console.log("game" + game_id + " has been removed");
    console.log(games);
    console.log(players);
}

var game_over = function(game_id) {
    //game is over, remove players from players list
    console.log(players);
    for(var p = players.length - 1; p >= 0; p --) {
        console.log(p);
        console.log(players[p].game_id, game_id);
        if(players[p].game_id == game_id) {
            var id = players[p].id;
            players.splice(p, 1);
            emit_to_player(id, 'reset', 'game over');
            emit_to_player(id, 'connected', 'new game');
        }
    }
    remove_game(game_id);
}

function print_games() {
    for(var g in games) {
        for(var p in games[g].players) {
            console.log(games[g].players[p].socket);
        }
        console.log("");
    }
}

exports.emit_to_player = emit_to_player;
exports.game_over = game_over;