var Constants = require('./constants.js');
var Sqlite3   = require('sqlite3').verbose();
var env       = require('node-env-file');
var login     = require("facebook-chat-api");

console.log('Game Board Size: ' + Constants.GAME_BOARD_SIZE);
console.log('Preferences File: ' + Constants.FILE_PREFS);
console.log('Database: ' + Constants.FILE_DB);
console.log("Ships: " + JSON.stringify(Constants.SHIPS));

env(__dirname + Constants.FILE_PREFS); // Load user preferences from a file.

var db    = new Sqlite3.Database(Constants.FILE_DB); // Load the games database from a file.
var token = { email: process.env.fbUser, password: process.env.fbPass }; // Facebook login information.
var prefs = { listenEvents: true, selfListen: false }; // Chat options
var games = { }; // A dictionary relating user id to game.

login(loginToken, onLogin); // Create a connection to Facebook.

function Game() {
  this.isStarted = false;
  this.opponentID = -1;
  this.gameID = -1;
  this.threadID = -1;
  this.playerGameBoard = createGameBoard();
  this.computerGameBoard = createGameBoard();
  this.api = null;
  this.carrier = false;
  this.battleship = false;
  this.cruiser = false;
  this.submarine = false;
  this.destroyer = false;
}

Game.prototype.beginGame = function() {
  this.addComputerShip(5);
  this.addComputerShip(4);
  this.addComputerShip(3);
  this.addComputerShip(3);
  this.addComputerShip(2);
  this.api.sendMessage('Please place your carrier.', this.threadID);
};


Game.prototype.tryPlaceShip = function(x, y, orientation, length, name, next) {
  var ship = addShip(this.playerGameBoard, length, x, y, orientation);
  if(ship) {
    if(next) {
      this.api.sendMessage('Please place your ' + next + '.', this.threadID);
    } else {
      this.api.sendMessage('You go first!', this.threadID);
      this.isStarted = true;
    }
  } else {
    this.api.sendMessage('Invalid coordinates, please place your ' + name + '.', this.threadID);
  }
  return ship;
}


Game.prototype.messageReceive = function(message) {
  var messageSplit = message.split(" ");
  var x = parseInt(messageSplit[0].charAt(0));
  var y = parseInt(messageSplit[0].charAt(1));
  var o = messageSplit[1] == "vertical";

  if(!this.carrier) {
    this.carrier = this.tryPlaceShip(x, y, o, 5, 'carrier', 'battleship');
  } else if(!this.battleship) {
    this.battleship = this.tryPlaceShip(x, y, o, 4, 'battleship', 'cruiser');
  } else if(!this.cruiser) {
    this.cruiser = this.tryPlaceShip(x, y, o, 3, 'cruiser', 'submarine');
  } else if(!this.submarine) {
    this.submarine = this.tryPlaceShip(x, y, o, 3, 'submarine', 'destroyer');
  } else if(!this.destroyer) {
    this.destroyer = this.tryPlaceShip(x, y, o, 2, 'destroyer', '');
    console.log(this.playerGameBoard);
  }
};

Game.prototype.addComputerShip = function(shipLength) {
  var added = false;
  var gameBoard = this.computerGameBoard;
  while(added == false) {
    var x = getRandomInt(0, Constants.GAME_BOARD_SIZE - 1);
    var y = getRandomInt(0, Constants.GAME_BOARD_SIZE - 1);
    var vertical = getRandomInt(0, 1) == 1;
    added = addShip(gameBoard, shipLength, x, y, vertical);
  }
}

/**
 * Checks if  (x, y) is valid for a ship of length shipLength.
 * @param  Number gameBoard  The board which will be checked.
 * @param  Number shipLength The length of the ship to be added.
 * @param  Number x          X coordinate of the ship.
 * @param  Number y          Y coordinate of the ship.
 * @return Boolean           True if the position is valid.
 */
function checkShipX(gameBoard, shipLength, x, y) {
  var valid = true;
  var max = Constants.GAME_BOARD_SIZE - 1;
  for(var i = 0; i < shipLength; i++) {
    if(y + i > max || gameBoard[x][y + i] > 0) {
      valid = false; // Position out of bounds or intersects another ship.
    }
  }
  return valid;
}

/**
 * Adds a ship to the gameBoard at (x, y) in a horizontal orientation.
 * @param Number gameBoard  The board to add the ship to.
 * @param Number shipLength The length of the ship.
 * @param Number x          X coordinate of the ship.
 * @param Number y          Y coordinate of the ship.
 */
function addShipX(gameBoard, shipLength, x, y) {
  for(var i = 0; i < shipLength; i++) {
    gameBoard[x][y + i] = shipLength;
  }
}

/**
 * Checks if  (x, y) is valid for a ship of length shipLength.
 * @param  Number gameBoard  The board which will be checked.
 * @param  Number shipLength The length of the ship to be added.
 * @param  Number x          X coordinate of the ship.
 * @param  Number y          Y coordinate of the ship.
 * @return Boolean           True if the position is valid.
 */
function checkShipY(gameBoard, shipLength, x, y) {
  var valid = true;
  var max = Constants.GAME_BOARD_SIZE - 1;
  for(var i = 0; i < shipLength; i++) {
    if(x + i > max || gameBoard[x + i][y] > 0) {
      valid = false; // Position out of bounds or intersects another ship.
    }
  }
  return valid;
}

/**
 * Adds a ship to the gameBoard at (x, y) in a vertical orientation.
 * @param Number gameBoard  The board to add the ship to.
 * @param Number shipLength The length of the ship.
 * @param Number x          X coordinate of the ship.
 * @param Number y          Y coordinate of the ship.
 */
function addShipY(gameBoard, shipLength, x, y) {
  for(var i = 0; i < shipLength; i++) {
    gameBoard[x + i][y] = shipLength;
  }
}

/**
 * Adds a ship to gameBoard at (x, y), if the position is valid.
 * @param  Number gameBoard  The board to add the ship to.
 * @param  Number shipLength The length of the ship.
 * @param  Number x          X coordinate of the ship.
 * @param  Number y          Y coordinate of the ship.
 * @param  Boolean vertical  If true, ship is placed vertically, horizontal otherwise.
 * @return Boolean           True if the ship was placed, false otherwise.
 */
function addShip(gameBoard, shipLength, x, y, vertical) {
  var valid = false;
  if(vertical) {
    valid = checkShipY(gameBoard, shipLength, x, y); // Check if location is valid.
    if(valid) {
      addShipY(gameBoard, shipLength, x, y); // If so, add the ship.
    }
  } else {
    valid = checkShipX(gameBoard, shipLength, x, y); // Check if location is valid.
    if(valid) {
      addShipX(gameBoard, shipLength, x, y); // If so, add the ship.
    }
  }
  return valid;
}

/**
 * Returns a random integer between min and max.
 * @param  Number min The lower bound of possible integers.
 * @param  Number max The upper bound of possible integers.
 * @return Number     A random integer between min and max.
 */
function getRandomInt(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

/**
 * Creates a new game board, and initializes all elements to zero.
 * @return Integer array representing a game board.
 */
function createGameBoard() {
  var x = new Array(Constants.GAME_BOARD_SIZE);
  for (var i = 0; i < x.length; i++) {
    x[i] = new Array(Constants.GAME_BOARD_SIZE);
    x[i].fill(0); // Fill the empty board with zeroes.
  }
  return x;
}

/**
 * [onLogin description]
 * @param  {[type]} err [description]
 * @param  {[type]} api [description]
 * @return {[type]}     [description]
 */
function onLogin(err, api) {
  if(err) {
    return console.error(err);
  }
  api.setOptions(loginPrefs);
  api.listen(function callback(err, message) {
    onEventReceived(api, err, message);
  });
}

/**
 * [onEventReceived description]
 * @param  {[type]} api     [description]
 * @param  {[type]} err     [description]
 * @param  {[type]} message [description]
 * @return {[type]}         [description]
 */
function onEventReceived(api, err, message) {
  if(err) {
    return console.log(err);
  }
  switch(message.type) {
    case 'message':

      var body = message.body.toLowerCase(); //Sanitize input

      if(body.startsWith("/begingame")){
        var g = new Game();
        g.isStarted = false;
        g.opponentID = message.senderID;
        g.gameID = 17;
        g.threadID = message.threadID;
        g.api = api;
        g.beginGame();
        //api.sendMessage("Your game ID is " + g.gameID + " and your board looks like " + g.playerGameBoard, message.threadID);

        games[message.senderID] = g;
      } else if(body.startsWith("/help")) {
        api.sendMessage('The command "/begingame" will start your battleship game!', message.threadID);
      } else {
        var g = games[message.senderID];
        g.messageReceive(message.body);
      }

      insertMessage(message);
      api.markAsRead(message.threadID, function(err) {
        if(err) {
          console.error(err);
        }
      });
      break;
    case 'event':
      console.log(message);
      break;
  }
}

/**
 * [insertMessage description]
 * @param  {[type]} message [description]
 * @return {[type]}         [description]
 */
function insertMessage(message) {
  db.serialize(function() {
    var stmt = db.prepare("INSERT INTO messages (threadID, messageID, body) VALUES (?, ?, ?)");
    stmt.run(message.threadID, message.messageID, message.body);
    stmt.finalize();
  });
}

process.on('exit', function() {
  console.log('Goodbye!');
  db.close(); // Cleanup resources we're using and close connections.
});
