var env     = require('node-env-file');
var login   = require("facebook-chat-api");
var sqlite3 = require('sqlite3').verbose();

env(__dirname + '/secrets.env'); // Load secret variables from a file.

var db = new sqlite3.Database('games.sqlite'); // Initialize the games database.
var loginToken = { email: process.env.fbUser,
  password: process.env.fbPass }; // Holds Facebook login information.
var options = { listenEvents: true,
  selfListen: false }; // Holds Facebook chat options.

// Create simple echo bot
login(loginToken, function callback (err, api) {
  if(err) return console.error(err);
  api.setOptions(options);
  api.listen(function callback(err, message) {
      if(err) return console.log(err);

      switch(message.type) {
        case "message":
          api.markAsRead(message.threadID, function(err) {
            if (err) console.log(err);
          });
          api.sendMessage(message.body, message.threadID);
          console.log(message);
          break;
        case "event":
          console.log(message);
          break;
      }
  });
});

db.close(); // Cleanup resources we're using and close connections.
