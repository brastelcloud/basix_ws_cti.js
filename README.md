# basix_cti
Library to permit to interact with Basix


Here is sample code on how to get CTI events using WebSockets:

```
var server = 'qabcs.brastel.com';
var domain = 'test1.com';
var user = 'XXXXXXXXXXXX';
var token = 'YYYYYYYYYYYY';

var WebSocketClient = require('ws');

var EventParser = require('basix_cti').event_parser;

EventParser.init({
        on_initial_chan_info: function(data) {
                console.log("initial_chan_info:");
                console.dir(data);
                console.log();
        },
        on_chan_info: function(data) {
                console.log("chan_info:");
                console.dir(data);
        },
        on_mwi_info: function(data) {
                console.log("mwi_info:");
                console.dir(data);
                console.log();
        }
});
 
var opts = {
  rejectUnauthorized: false,
  perMessageDeflate: false,
};

var client = WebSocketClient('wss://' + server + '/basix/api/ws_cti?domain=' + domain + '&api_user=' + user + '&api_token=' + token, "", opts);
 
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
        EventParser.handle_message(message);
});


