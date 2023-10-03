# basix_ws_cti.js

## Overview

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

## Documentation


The basix_ws_cti is a library that permits to interact with Basix PBXes using WebSockets

For now the library provides a single object message_parser that converts received WebSocket messages into javascript objects.

You can connect to your Basix PBX using WebSockets and get notified of messages as they happen in it. 

For efficiency, message data is encoded in BERT format (http://bert-rpc.org/) so we provide this message_parser to decode this data into a javascript object.

Basically, the messages notifies you of changes in elements in your Basix PBX.

This includes channels being created/destroyed, being put into and put out of ring queues, being parked/unparked and notification of core database element changes (users, groups, group_members and terminals).

### Elements
  - channel: an ordinary channel. If you connect using you API token you will be notified of events in all channels in the PBX. If you connect using session authentication (meaning a user is identified), you will be notified only about channels related to that user (channel.user_id = SESSION_USER_ID) unless you specify ws_cti?full_events=true in the connection URL (restricted to pbx admins).
  - queued_channel: a channel that was put into a ring queue.
  - parked_channel: a channel that was parked on a parking slot.
  - user: a user in the pbx
  - group: a group in the pbx
  - group_member: a group membership relation in the pbx
  - terminal: a terminal in the pbx

### Messages
  - initial_info: notifies current state of all elements of the same category present in the PBX. It is an array of element objects. This is sent once immediately after the WS connection is established for each element category mentioned above.
  - info_event: notifies when an element is added/updated/removed.
  - system_msg: an internal message. It can be: 'connection_limit_reached' (maximum number of cti_connections for the user has been reached) or 'connection_replaced' (connection was closed because another connection was forced).
  - msg: a generic message (user level) sent by user/admin (not tested)

### Usage

The message_parser object should be initialized with callback functions that will handle each message like this:

```
var MessageParser = require('basix_cti').message_parser;

var callbacks = {
        on_initial_info: function(element_name, data) {
                console.log("on_initial_info for " + element_name);
                console.dir(data);
        },

        on_info_event: function(element_name, data, event_name) {
                console.log(`on_info_event for ${element_name} (${event_name})`);
                console.dir(data);
        },
        on_system_msg: function(msg) {
                console.log(`on_system_msg: ${msg}`);
        },
};

var opts = {
        base_url: "https://xyz.com"
};

MessageParser.init(callbacks, opts)

```

If you specify opts.base_url, avatar values will be prefixed with it in case of relative URLs.


Then, when a WS message is received, it should be passed to the method handle_message and it will call the callback functions as needed:
```
ws_client.on('message', function(message) {
        MessageParser.handle_message(message);
});
```

We don't enforce a WebSocket implementation: you can chose whichever one you prefer or is available in your javascript environment and then pass whatever message you receive to method handle_message.
So, you take care of connecting to the PBX server and handling disconnection/reconnection etc and just pass whatever data is received to our message_parser. 

### Element field specification

## channel
  * **uuid**: uuid of the channel (for calls created by the PBX, this is the same as the SIP Call-ID. For calls received by the PBX this is different from the SIP Call-ID).
  * **direction**: 'inbound' (call offered to PBX) or 'outbound' (call offered by PBX)
  * **peer_location**: 'internal' |
  * **calling_name**: diplay name of calling party
  * **calling_number**: calling number of calling party
  * **called_number**: called/destination number
  * **offer_timestamp**: timestamp in microseconds when the call was offered
  * **answer_timestamp**: timestamp in microseconds when the call was answered
  * **hangup_timestamp**: timestamp in microseconds when the call was terminated
  * **other_uuid**: if the channel.state is "bridged" (meaning, connected to another channel), this will contain the uuid of the other channel. Also if this channel was created as Leg2 of another channel, this will contain the uuid of the other leg.
  * **user_id**: id of user in this channel (if applicable).
  * **state**: current state of the channel (calling group, calling user, ivr, etc). Further details down below.
  * **group_id**: if of group that owns this channel (if applicable).
  * **target**: if direction is 'inbound' this will contain the target (user, group etc of the call).
  * **origination**: if this was craeted by Basix API call, it will contain details about the method call
  * **end_user**: if there is an end-user in this channel, this will contain its id, name, organization, avatar and prefecture (if provided by integrated HDS/CRM system).
  * **tags**: will contain things like indicators for call center operation like 'monitoring_required'
  * **last_bridged_user_id**: in case this is a channel for an end-user it will containg the id of the last user that was bridged to it.
  * **last_event**: last event that happened in the channel (just for basix deve internal troubleshooting).
  * **other_info**: summary data of the other channel this one is related to (due Leg2 origination or state 'bridged')

Ex:
```
{ uuid: '5714495a-b8a1-4fff-8420-78648863ecd1',
  direction: 'inbound',
  peer_location: 'external',
  calling_name: '0312341234',
  calling_number: '0312341234',
  called_number: '10001111',
  offer_timestamp: 1546839040024071,
  answer_timestamp: undefined,
  hangup_timestamp: undefined,
  other_uuid: undefined,
  user_id: undefined,
  state:
   { ts: 1546839040035125,
     name: 'calling',
     data:
      { target_location: 'int',
        target_type: 'group',
        group_type: 'ring',
        group_id: 10001111,
        group_queue_id: 'group1' } },
  group_id: undefined,
  target: undefined,
  origination: undefined,
  end_user: undefined,
  tags: undefined,
  last_bridged_user_id: undefined,
  last_event: 'STATE_CHANGE',
  other_info: undefined
}

```

## parked_channel 

(field descriptions are the same as element for channel)

  * **uuid**
  * **state**
  * **peer_number**
  * **end_user**
Ex:
```
{
  uuid: '5714495a-b8a1-4fff-8420-78648863ecd1',
  state:
   { ts: 1546839050549316,
     name: 'park',
     data: { slot: 901, parker_id: 10001001, parker_name: 'user1' } },
  peer_number: '0312341234',
  end_user: undefined 
}
```

## queued_channel

(field descriptions are the same as element for channel)

  * **uuid**
  * **state**
  * **peer_number**
  * **end_user**
Ex:
```
{ uuid: '5714495a-b8a1-4fff-8420-78648863ecd1',
  state:  { ts: 1546839040035125,
     name: 'calling',
     data:
      { target_location: 'int',
        target_type: 'group',
        group_type: 'ring',
        group_id: 10001111,
        group_queue_id: 'group1' } },
  peer_number: '0312341234',
  end_user: undefined
}
```

## user 

  * **id**
  * **name**
  * **fwd_always_status**
  * **do_not_disturb_status**
  * **language**
  * **main_extension**
  * **presence**
  * **role**
  * **park_group**
  * **mwi_target**
  * **flags**
  * **followme**
  * **email**
  * **avatar**
  * **label**
  * **mwi**: will contain counters of new/saved messages in user's voicemail box.

Ex:
```
{ 
  id: 10001000,
  name: 'admin',
  fwd_always_status: 0,
  do_not_disturb_status: 0,
  language: 0,
  main_extension: '1000',
  presence: 0,
  role: 100,
  park_group: 0,
  mwi_target: undefined,
  flags: 0,
  followme: undefined,
  email: 'admin@test1.com',
  avatar: undefined,
  label: 'ユーザ・10001000',
  mwi: ''
}
```
## group_info

  * **id**
  * **name**
  * **type**: 0 (ring) or 1 (hunt)
  * **language**
  * **main_extension**
  * **queue**
  * **label**,
  * **flags**,
  * **check_login_status**,
  * **mwi**: will contain counters of new/saved messages in group's voicemail box.

Ex:
```
{
  id: 10001111,
  name: 'group1',
  type: 0,
  language: 0,
  main_extension: '1111',
  queue: 0,
  label: 'グループ・10001111',
  flags: 4,
  mwi: '' 
},
```

## group_member

  * **id**
  * **group_id**
  * **user_id**
  * **priority**
  * **login_status**
  * **role**

Ex:
```
{ 
  id: 110001001,
  group_id: 10001111,
  user_id: 10001001,
  priority: 0,
  login_status: 0,
  role: 0
},
```

## terminal

This will permit to identify user's SIP terminals, their registration status and User-Agent
(obs: implementation pending)

  * **id**
  * **name**
  * **assoc_user_id**
  * **type**
  * **user_agent**
  * **registered**


### channel state specification

  The channel/queued_channel/parked_channel state field will inform the current state the channel is in. Based on it, it will be possible to know if a channel is ringing a user/group, or being processed by IVR, or accessing voicemail etc.
  Base data in the field is:
  * **name** (state name) 
  * **ts** (timestamp when the channel entered the state)

## state names and their specific data

  * **calling**
    - target_location: 'ext' or 'int'
    - target_type: 'user' or 'group' or 'pstn' or 'bridged_endpoint'
    - user_id: (if applicable)
    - group_id: (if applicable)
    - group_type: (if applicable)
    - address: in case of 'pstn' and 'bridged_endpoint'

  * **bridged** (no extra data (see field other_uuid))

  * **voicemail**
    - target_type: 'user' or 'group'
    - target_id: user/group id
    - target_name: user/group name
  
  * **checking_voicemail**
    - target_name: user or group name

  * **calling_siptermination**
    - url: URL being called

  * **ivr**
    - ivr_id

  * **system_operation**
    - operation

  * **conference**
    - room_id

  * **xml_ivr** (no extra data)

  * **park**
    - slot


### channel target field specification
  The channel/queued_channel/parked_channel target field contains data about the internal target of the channel (a target is a user or a group in the PBX):

  * **type**: 'user' or 'group'
  * **id**: user/group id
  * **name**: user/group name
  * **address**: address used to reach the user/group (usually the PSTN DID used to call the target).

### channel end_user field specification
  The channel/queued_channel/parked_channel end_user field contains data about the end-user (customer) in that channel (provided by HelpDesk/CRM system). Since more than one end_user might be identified by the HelpDesk/CRM system, the data will shou up as : 
  * **count**: number of end_users
  * **items**: array of end_user items with fields **id**, **name**, **organization**, **avatar**, **prefecture**

But if more than one end_user is identified by the HelpDesk/CRM system , instead we will have:


### channel other_info field specification (this will contain a summary of the info of the other related channel)
  * **type**: 'user' or 'end_user'
  * **direction**: 'inbound' or 'outbound'
  * **peer_location**: 'internal' or 'external'
  * **address**: Address of the peer in the other channel (PSTN Number or terminal name)
  * **offer_timestamp** (instant at the time the channel was created. If undefined, this means the channel was not created yet)

Then depending if type is 'user' or 'end_user' we will have:
  * **user_id**
or
  * **end_user** 
