"use strict";

module.exports = (function(env) {
	var FULL_DICT_MODE = true;

	var mod = new Object();

	var Bert = require('./bert.js');

	var Utils = require('./utils.js');

	var info_fields = {};

	var create_entity_info = Utils.create_entity_info;

	var msg_queue = [];

	var callbacks = {
		on_initial_info: null,

		on_info_event: null,

		on_system_msg: null,

		on_msg: null,
	};

	var process_msg = function(m) {
		// console.log("message_parser.js got " + m);
		if(m[0] == 'field_spec') {
			var entity_name = m[1];
			info_fields[entity_name] = [];
			var arr = m[2];
			for(var i=0; i<arr.length ; ++i) {
				info_fields[entity_name][i] = arr[i].value;
			}
		  	return;
		} else if(m[0] == 'initial_info') {
			var entity_name = m[1];

			var infos = {};

			if (!callbacks.on_initial_info) return;

			if(m[2][0] == "bert" && m[2][1] == "nil") {
				// console.log("message_parser.js: Empty initial_info");
			} else {
				var arr = m[2];
				var key = 'uuid';
				if(['user', 'group', 'group_member', 'terminal'].includes(entity_name)) {
					key = 'id';
				}
				arr.forEach(function(X) {
					var info = create_entity_info(entity_name, X, info_fields, FULL_DICT_MODE);
					infos[info[key]] = info;
				});
			}
			callbacks.on_initial_info(entity_name, infos);
		} else if(m[0] == 'info_event') {
			if (!callbacks.on_info_event) return;
			var entity_name = m[1];
			var info = create_entity_info(entity_name, m[2], info_fields, FULL_DICT_MODE);
			var event_name = m[3];
			callbacks.on_info_event(entity_name, info, event_name);
		} else if(m[0] == 'system_msg') {
			if (!callbacks.on_system_msg) return;
			callbacks.on_system_msg(m[1]);
		} else if(m[0] == 'msg') {
			if (!callbacks.on_msg) return;
			callbacks.on_system_msg(m[1]);
		} else {
			console.log("message_parser.js: Unknown message type '" + m[0] + "'");
		}
	};

	var handle_message = function(evt, flags) { 
		//console.log("message_parser.js: handle_message");
		//console.log(evt);
		var data = evt.toString('binary');
		var decoded = Bert.decode(data);
		process_msg(decoded);
	};

	var startMsgAsyncRead = function(data) {
		var reader = new FileReader();
		reader.addEventListener("loadend" ,function() {
			var decoded = Bert.decode(reader.result);
			//console.log(new Date() + " message_parser.js: xxx CTI WebSocket msg received: " + decoded);
			//console.dir(decoded);
			process_msg(decoded);

			var new_data = msg_queue.shift();
			if(new_data) {
				startMsgAsyncRead(new_data);
			}
		});
		reader.readAsBinaryString(data)
	};

	var handle_message_in_browser = function(evt, flags) {
		if(msg_queue.length == 0) {
			startMsgAsyncRead(evt.data);
		} else{
			msg_queue.push(evt.data);
		}
	};

	mod.handle_message = null;

	mod.init = function(cbs) {
		callbacks = cbs
		if (typeof window === 'undefined') {
			mod.handle_message = handle_message;
		} else {
			mod.handle_message = handle_message_in_browser;
		}
	}

	return mod;
})();
