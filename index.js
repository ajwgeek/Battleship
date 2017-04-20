var env     = require('node-env-file');
var login   = require("facebook-chat-api");
var sqlite3 = require('sqlite3').verbose();

env(__dirname + '/secrets.env'); // Load secret variables from a file.
var db = new sqlite3.Database('games.sqlite'); // Initialize the games database.

// Create simple echo bot
login({email: process.env.fbUser, password: process.env.fbPass}, function callback (err, api) {
  if(err) return console.error(err);

  api.setOptions({listenEvents: true});
  api.setOptions({selfListen: false});

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
