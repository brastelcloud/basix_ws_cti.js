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

## chan_info field specification

  *uuid: Channel UUID (unique identifier)
  *direction: 'inbound' or 'outbound'
  *peer_location: 'internal' (peer from INSIDE the PBX, like in station to station calls) or 'external' (peer is at PSTN)
  *calling_name: name of caller (if available: usually, in station to station calls) 
  *calling_number: number of caller
  *called_number: number of callee
  *offer_timestamp: timestamp from epoch in microseconds when the channel was created
  *answer_timestamp: timestamp from epoch in microseconds when the channel was answered
  *hangup_timestamp: timestamp from epoch in microseconds when the channel was hangup
  *other_uuid: in case this channel is bridged to another channel, this field will contain the UUID of the other channel
  *user_name: in case the peer in this channel is a user, this field will contain its user name
  *user_id: in case the peer in this channel is a user, this field will contain its user id
  *state: undefined or STATE_INFO
  *group_id: in case this channel was generated as part of a group call, this field will contain the group id
  *group_name: in case this channel was generated as part of a group call, this field will contain the group name
  *target: undefined or TARGET_INFO
  *last_event: last event that happened in this channel causing this event: NEW_CHANNEL (incoming channel created), CHANNEL_ORIGINATE (outgoing channel created), CHANNEL_ANSWER, CHANNEL_HANGUP, CHANNEL_BRIDGE, CHANNEL_PARK (channel was parked in the PBX. This is not Park/Unpark in park slots), CHANNEL_APPLICATION (channel state has changed)

### chan_info.state field specification

  The chan_info.state field will inform the current state the channel is in. Based on it, it will be possible to know if a channel is ringing a user/group, or being processed by IVR, or accessing voicemail etc.
  Basic data in the fieds are: name (state name) and ts (timestamp when the channel entered the states)
  Possible states and data:

  *calling:
    *target_type: 'user' or 'group'
    *target_id: user/group id
    *target_name: user/group name

  *bridged:
    no extra data (see field other_uuid)

  *voicemail:
    *target_type: 'user' or 'group'
    *target_id: user/group id
    *target_name: user/group name
  
  *checking_voicemail:
    *target_name: user or group name

  *calling_siptermination:
    *url: URL being called

  *calling_external:
    *address: PSTN number

  *ivr:
    *ivr_id

  *system_operation:
    *operation: 

  *conference:
    *room_id

  *plivo:

  *park:
    *park_slot


### chan_info.target field specification
  type: 'user' or 'group'
  id: user/group id
  name: user/group name
  address: address used to reach the user/group (usually the PSTN DID used to call the target).

