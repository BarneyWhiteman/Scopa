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
    
    //New player, let them choose the game they want
    console.log(socket.id + " joined the server");
    
    setTimeout(function() {
        add_player_to_game(socket.id);
    }, 300);

    socket.on('test', function(message) {
        console.log(message);
    });
        
    socket.on('new', function() {
        //player has selected which games to play, add them to a game or create a new one
        remove_player_from_game(socket.id, get_players_game_index(socket.id));
        emit_to_player(socket.id, 'reset', 'new game');
        //add_player_to_game(socket.id);
    });


    socket.on('move', function(move) {
        //Player sends 'move' signal when attempting a move
        var index = get_players_game_index(socket.id);
        //Pass the move onto the game that the player is in
        if(index != -1) { games[index].make_move(socket.id, move); }
    });

    socket.on('disconnect', function() {
        //Remove player from game
        var index = get_players_game_index(socket.id);

        console.log(socket.id + " disconnected: " + index);
        
        remove_player_from_game(socket.id, index);
        
        console.log(players);

        if(index != -1 && games[index].players.length < games[index].min_players) {
            //If the game has too few people in it: remove it
            if(games[index].started) {
                //Too few people to continue the game
                //Let anyone still on the server know
                emit_to_each_player_in_game(index, 'unexpected', 'too few players');
                console.log("game" + games[index].game_id + " had too few players and is shutting");
            }
            //Remove game
            remove_game(index);
        }
    })
});

http.listen(port, function(){
    //Listen on specified port for connections
    console.log('listening on port:' + port);
});

function remove_player_from_game(id, index) {
    if(index != -1) {
        //remove from game object
        games[index].remove_player(id);
        players.splice(players.indexOf([id, games[index].game_id]), 1);
    }
}

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

function add_player_to_game(id) {
    //Add player to first open game, otherwise create a new one

    var added = false;

    for(g in games) {
        if(!games[g].full && !games[g].started) {
            games[g].add_player(id);
            players.push([id, games[g].game_id]);
            added = true;
            break;
        }
    }
    if(!added) {
        var game_id = 0;
        if(games.length != 0) { game_id = games[games.length - 1].game_id + 1; }
        games.push(new Game(game_id));
        games[games.length - 1].add_player(id);
        players.push([id, game_id]);
    }
    
}

function get_players_game_index(id) {
    //look through list of players searching for player with an id of 'id'. When found return the game id, otherwise -1
    game_id = -1;
    for(var p in players) {
        if(players[p][0] == id) { game_id = players[p][1]; }
    }
    for(var g in games) {
        if(games[g].game_id == game_id) { return g; }
    }
    return -1;
}

function remove_game(id) {
    //remove game from list of available games
    var game_id = games[id].game_id;
    games.splice(id, 1);
    
    console.log("game" + game_id + " has been removed");
}

exports.emit_to_player = emit_to_player;