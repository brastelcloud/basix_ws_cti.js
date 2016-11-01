# basix_cti

Library to permit to interact with Basix PBXes.

## Overview

You can connect to your Basix PBX using WebSockets and get notified of events that happen in it.

Events:
  - initial_chan_info: notifies with current state of all channels present in the PBX. It is an array of chan_info objects. This is sent once immediately after the WS connection is established
  - chan_info: notifies when a channel event happens like CHANNEL_ANSWER, CHANNEL_HANGUP etc.
  - mwi_info (Message Waiting Indication): notifies when a message is added to a voicemail box

For efficiency, event data is encoded in BERT format (http://bert-rpc.org/) so we provide a message_parser to decode this data into a javascript object.

Here is sample code showing how to get CTI messages using WebSockets:

```
var server = 'qabcs.brastel.com';
var domain = 'test1.com';
var user = 'XXXXXXXXXXXX';
var token = 'YYYYYYYYYYYY';

var WebSocketClient = require('ws');

var MessageParser = require('basix_cti').message_parser;

MessageParser.init({
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
        MessageParser.handle_message(message);
});

```

Further details: https://github.com/brastelcloud/basix_cti/wiki/basix_cti
