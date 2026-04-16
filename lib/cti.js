"use strict";

const EventEmitter = require('events');

module.exports = (function(env) {
  var mod = new EventEmitter();

	var mediaplug = null;

	var store = {
    domain: {},
		channel: {},
    channel_waiting: {},

		queued_channel: {}, // deprecated
		parked_channel: {}, // deprecated

		user: {},
		group: {},
		group_member: {},
		terminal: {},
	};

	var MessageParser = require('./message_parser');

	var flush_object = function(o) {
		for (var member in o) delete o[member];
	}

	var callbacks = {
		on_initial_info: function(element_name, data) {
			console.log("cti.js: on_initial_info for " + element_name);

			var element_store = store[element_name];
			if (!element_store) return;

			console.dir(data);
			flush_object(element_store);

			if(element_name == 'channel') {
				for(var key in data) { // key can be uuid or id
					var channel = data[key]
					if(channel.calling_number == 'media_plug' || channel.called_number == 'media_plug') {
						if(mediaplug) {
							mediaplug.process_media_plug_channel_event(channel)
						}
					}
					element_store[key] = channel
				}
			} else {
				const items = Array.isArray(data) ? data : Object.values(data);
				items.forEach(item => {
					const id = item.id || item.uuid || (element_name === 'group_member' ? `${item.user_id}:${item.group_id}` : (item.name || item.id));
					if (id) element_store[id] = item;
				});
			}

			mod.emit('initial_info', {element_name, data})
		},

		on_info_event: function(element_name, info, event_name) {
			//console.log(`cti.js: on_info_event for ${element_name} ${info.uuid ? info.uuid : info.id} event: ${event_name}`);

			if(element_name == 'domain') {
				var domain = info
				if(event_name != 'removed') {
					store.domain = domain
				}
			}

			// Generic store update
			if (store[element_name] && element_name !== 'domain') {
				const id = info.id || info.uuid || (element_name === 'group_member' ? `${info.user_id}:${info.group_id}` : (info.name || info.id));
				if (id) {
					if (event_name === 'removed') {
						delete store[element_name][id];
					} else {
						store[element_name][id] = info;
					}
				}
			}

			if(element_name == 'channel') {
				var channel = info;

				if(channel.calling_number == 'media_plug' || channel.called_number == 'media_plug') {
					if(mediaplug) {
						mediaplug.process_media_plug_channel_event(channel)
					}
				}

				if(channel.last_event == "CHANNEL_HANGUP") {
					if(mod.media_plug_uuid == channel.uuid) {
						mod.media_plug_uuid = null;
					}
					delete store.channel[channel.uuid];
				}

				if(channel.last_event == "CHANNEL_ANSWER") {
					if(mod.media_plug_uuid && mod.media_plug_uuid.constructor == Array) {
						if(channel.calling_number == 'media_plug') {
							console.dir(mod.media_plug_uuid);
							if(_.includes(mod.media_plug_uuid, channel.uuid)) {
								console.log("consolidated media_plug_uuid");
								mod.media_plug_uuid = channel.uuid;
								if(mod.pending_media_plug_cmd) {
									console.log("sending pending_media_plug_cmd");
									mod.sendMediaPlugCommand(mod.media_plug_uuid, mod.pending_media_plug_cmd);
								}
							} else {
								console.log("channel.uuid not in media_plug_uuid");
							}
						}
					}
				}
			}

			mod.emit('info_event', {element_name, info, event_name})
		},

		on_system_msg: function(msg) {
			console.log("Received system_msg: " + msg);
			if(msg == 'logout') {
				window.location.href = "/basix/login";
			}
		},
	};

	var opts = {
		base_url: "/",
	};

	MessageParser.init(callbacks, opts);

	mod._prepare_conn = async function() {
    if(mod.ws) return;

    let ws_url = await mod.args.ws_url()
  	mod.ws = new WebSocket(ws_url);

		mod.ws.onopen = function()
		{
			console.log("cti.js: WebSocket connection opened");
      mod.emit('open')
			return;
		};

		mod.ws.onmessage = function (msg)
		{
			MessageParser.handle_message(msg);
		};

		mod.ws.onclose = function()
		{
			// websocket is closed.
			console.log("cti.js: WebSocket connection closed");
      mod.emit('closed')

			flush_object(store.channel);
			delete mod.ws;

      setTimeout(async () => {
		    await mod._prepare_conn();
      }, 20000)
		};

		mod.ws.onerror = function(err)
		{
			// websocket error.
			console.log("cti.js: WebSocket connection error");
      mod.emit('error', err)
			flush_object(store.channel);
			delete mod.ws;

      setTimeout(async () => {
		    await mod._prepare_conn();
      }, 20000)
		};
	}

	mod.eavesdrop = function(uuid, subcommand) {
		console.log("cti.js: eavesdrop " + subcommand);
		var cmd = ["eavesdrop", uuid, subcommand];
		if(!mod.media_plug_uuid) {
			$.post("/basix/api/call_user", JSON.stringify({user_id: mod.args.user.id, destination: "media_plug"})
			).done(function(data) {
				if(data.result_code != 0) {
					if(data.error.id == 'authentication_required') {
						console.log("authentication_required");
						console.log("cti.js: not logged in");

            mod.ws.close();
            delete mod.ws
            setTimeout(async () => {
              await mod._prepare_conn();
            }, 20000)
					}
				} else {
					mod.media_plug_uuid = data.uuids;
					console.log("cti.js: ajax got media_plug_uuid=[" + mod.media_plug_uuid + "]");
					mod.pending_media_plug_cmd = cmd;
				}
			}).fail(function(data) {
				console.log("cti.js: failed with ");
				console.dir(data);
			})
			mod.media_plug_uuid = "pending"
		} else if(mod.media_plug_uuid == "pending") {
			console.log("media_plug_uuid=pending");
			mod.pending_media_plug_cmd = cmd;
		} else if(mod.media_plug_uuid && mod.media_plug_uuid.constructor == Array) {
			console.log("media_plug_uuid is [" + mod.media_plug_uuid + "]");
			mod.pending_media_plug_cmd = cmd;
		} else {
			console.log("sending command");
			mod.sendMediaPlugCommand(mod.media_plug_uuid, cmd);
		}
	};

	mod.park = function(uuid, timeout) {
		console.log("cti.js park " + uuid);

		var cmd = ["park", uuid, timeout];

		if(mod.ws) {
			var o = {
				cmd: "park",
				uuid: uuid,
				timeout: timeout
			};
			var s = JSON.stringify(o);
			mod.ws.send(s);
			console.log("msg sent: " + s);
		}
	};

	mod.hangup = function(uuid) {
		console.log("cti.js hangup " + uuid);
		if(mod.ws) {
			var o = {
				cmd: "hangup",
				uuid: uuid
			};
			var s = JSON.stringify(o);
			mod.ws.send(s);
			console.log("msg sent: " + s);
		}
	};

	mod.transfer = function(uuid, user_id, user_name, destination) {
		console.log("cti.js transfer " + uuid);
		if(mod.ws) {
			var o = {
				cmd: "transfer",
				uuid,
        user_id,
        user_name,
        destination,
			};
			var s = JSON.stringify(o);
			mod.ws.send(s);
			console.log("msg sent: " + s);
		}
	};

	mod.sendMediaPlugCommand = function(media_plug_uuid, data) {
		var cmd_name = data[0];
		if(cmd_name == 'eavesdrop') {
			var o = {
				cmd: cmd_name,
				uuid: media_plug_uuid,
				target_uuid: data[1],
				subcommand: data[2]
			};
			var s = JSON.stringify(o);
			mod.ws.send(s);
			console.log("msg sent: " + s);
		} else {
			console.log('sendMediaPlugCommand: unsupported command')
		}
	};

	mod.init = async function(args) {
		console.log("cti.js init");
		console.dir(args);
		if (! ("WebSocket" in window) )
		{
			// The browser doesn't support WebSocket
			alert("WebSocket NOT supported by your Browser!");
			return;
		}

		mod.args = args;
		mod.media_plug_uuid = null;
		mod.pending_media_plug_cmd = null;

		await mod._prepare_conn();
	};

	mod.set_mediaplug = function(mp) {
		mediaplug = mp
	};

	mod.get_store = function() {
		return store;
	};

  mod.get_domain = function() {
    return store.domain;
  }

	mod.get_initial_channels = function() {
		return store.channel;
	};

	mod.get_initial_waiting_channels = function() {
		return store.waiting_channel;
	}

	mod.get_initial_users = function() {
		return store.user;
	};

	mod.get_initial_groups = function() {
		return store.group;
	};

	mod.get_initial_group_members = function() {
		return store.group_member;
	};

	mod.get_media_plug_uuid = function() {
		return mod.media_plug_uuid;
	};

	mod.disconnect_media_plug = function() {
		if(mod.media_plug_uuid) {
			mod.hangup(mod.media_plug_uuid);
		}
	};

	return mod;
})();
