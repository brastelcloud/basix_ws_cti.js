# basix_ws_cti.js

This is a library to permit to interact with Basix PBXes.

You can connect to your Basix PBX using WebSockets and get notified of events that happen in it.

Here is sample node.js code showing how to get Basix CTI messages using WebSockets:

```
var server = 'bcs.brastel.com';
var domain = 'YOUR_BASIX_DOMAIN';
var token = 'YOUR_API_TOKEN';
var app_name = 'YOUR_APP_NAME';

var WebSocketClient = require('ws');

var MessageParser = require('basix_ws_cti').message_parser;

MessageParser.init({
        on_initial_info: function(element_name, data) {
                console.log("on_initial_info for " + element_name);
                console.dir(data);
                console.log();
        },
         on_info_event: function(element_name, data, event_name) {
                console.log(`on_info_event for ${element_name} (${event_name})`);
                console.dir(data);
        },
});
 
var opts = {
  perMessageDeflate: false,
};

var client = new WebSocketClient(`wss://${domain}:${token}@${server}/basix/api/ws_cti?app_name=${app_name}`, opts);
 
client.on('open', function() {
    console.log("Connection Opened");
});
 
client.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
});

client.on('close', function() {
        console.log('Connection Closed');
});

client.on('message', function(message) {
        MessageParser.handle_message(message);
});

```
