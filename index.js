var env     = require('node-env-file');
var login   = require("facebook-chat-api");
var sqlite3 = require('sqlite3').verbose();

//Push for Isaac

env(__dirname + '/secrets.env'); // Load secret variables from a file.

var db = new sqlite3.Database('games.sqlite'); // Initialize the games database.
var loginToken = { email: process.env.fbUser,
  password: process.env.fbPass }; // Holds Facebook login information.
var options = { listenEvents: true,
  selfListen: false }; // Holds Facebook chat options.

process.on('exit', function() {
  console.log('Goodbye!');
  db.close(); // Cleanup resources we're using and close connections.
});

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
          db.serialize(function() {
            var stmt = db.prepare("INSERT INTO messages VALUES (?)");
            stmt.run(message);
            stmt.finalize();
          });
          console.log(message);
          break;
        case "event":
          console.log(message);
          break;
      }
  });
});
