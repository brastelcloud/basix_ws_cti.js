"use strict";

module.exports = (function(env) {
	var FULL_DICT_MODE = true;

	var mod = new Object();

	var Bert = require('./bert.js');

	var Utils = require('./utils.js');

	var info_fields = {};

	var create_entity_info = Utils.create_entity_info;

	var callbacks = {
		on_initial_chan_info: null,
		on_chan_info: null,
		on_park_info: null,
		on_unpark_info: null,
		on_mwi_info: null
	};

	var process_msg = function(msg) {
		var m = msg[0];
		if(m[0] == 'field_spec') {
			var entity = null;
			if(m[1] == 'chan_info') {
				entity = "chan";
			} else if(m[1] == 'park_info') {
				entity = "park";
			} else if(m[1] == 'unpark_info') {
				entity = "unpark";
			} else if(m[1] == 'mwi_info') {
				entity = "mwi";
			} else {
				return;
			}
			info_fields[entity] = [];
			var arr = m[2];
			for(var i=0; i<arr.length ; ++i) {
				info_fields[entity][i] = arr[i].value;
			}
		  	return;
		} else if( (m[0] == 'initial_chan_info') && (callbacks.on_initial_chan_info) ) {
			var chan_infos = {};
			if(m[1][0] == "bert" && m[1][1] == "nil") {
				console.log("Empty initial_chan_info");
			} else {
				var arr = m[1];
				arr.forEach(function(X) {
					var ci = create_entity_info("chan", X, info_fields, FULL_DICT_MODE);
					//console.log(new Date() + ": ")
					//console.dir(ci);
					chan_infos[ci.uuid] = ci;
				});
				callbacks.on_initial_chan_info(chan_infos);
			}
		} else if( (m[0] == 'chan_info') && (callbacks.on_chan_info) ) {
			var ci = create_entity_info("chan", m[1], info_fields, FULL_DICT_MODE);
			callbacks.on_chan_info(ci);
		} else if( (m[0] == 'park_info') && (callbacks.on_park_info) ) {
			var pi = create_entity_info("park", m[1], info_fields);
			callbacks.on_park_info(pi);
		} else if( (m[0] == 'unpark_info') && (callbacks.on_unpark_info) ) {
			var ui = create_entity_info("unpark", m[1], info_fields);
			callbacks.on_unpark_info(ui);
		} else if( (m[0] == 'mwi_info') && (callbacks.on_mwi_info) ) {
			var mi = create_entity_info("mwi", m[1], info_fields);
			callbacks.on_mwi_info(mi);
		} else {
			console.log("Unexpected m " + m[0]);
		}
	};

	var handle_message = function(evt, flags) { 
		//console.log("handle_message");
		//console.log(evt);
		var data = evt.toString('binary');
		var decoded = Bert.decode(data);
		process_msg(decoded);
	};

	var handle_message_in_browser = function(evt, flags) { 
		var reader = new FileReader();
		reader.addEventListener("loadend" ,function() {
			var decoded = Bert.decode(reader.result);
			//console.log(new Date() + ": CTI WebSocket msg received: " + decoded);
			//console.dir(decoded);
			process_msg(decoded);
		});
		reader.readAsBinaryString(evt.data)
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
