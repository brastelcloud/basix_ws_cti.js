"use strict";

var utf8 = require('./utf8.js');

module.exports = (function(env) {
	var mod = new Object();

	var normalize_data = function(data) {
		if(typeof data === 'object') {
			if(data.type == "Atom") {
				if(data.value == "undefined") {
					return undefined;
				} else {
					return data.value;
				}
			} else if(data.type == "Tuple") {
				var arr = [];
				for(var i=0 ; i<data.length ; ++i) {
					arr[i] = normalize_data(data[i]);
				}
				return arr;
			} else {
				return data.value;
			}
		} else {
			return data;
		}
	};


	var utf8_decode = function(x) {
		if(!x) return x;
		return utf8.decode(x);
	};

	var translate_state = function(arr) {
		var r = {};
		r.ts = arr[0];

		var name = arr[1];
		r.name = name;

		r.data = {}

		switch(name) {
		case 'voicemail':
			r.data.target_type = arr[2];
			r.data.target_id = arr[3];
			r.data.target_name = arr[4];	
			break;
		case 'checking_voicemail':
			r.data.target_name = arr[2];	
			break;
		case 'calling':
			var target_location = arr[2];
			var target_type = arr[3];
			var target_data = arr[4];

			r.data.target_location = target_location;
			r.data.target_type = target_type;

			if(target_type == 'user') {
				r.data.user_id = target_data[0];
			} else if(target_type == 'group') {
				r.data.group_type = target_data[0];
				r.data.group_id = target_data[1];
				if(r.data.group_type == 'ring') {
					r.data.group_queue_id = target_data[4];
				}
			} else if(target_type == 'pstn') {
				r.data.address = target_data[0];
			} else if(target_type == 'bridged_endpoint') {
				r.data.address = target_data[0] + "@" + target_data[1];
			}
			break;
		case 'calling_siptermination':
			r.data.url = arr[2];
			break;
		case 'ivr':
			r.data.ivr_id = arr[2];
			break;
		case 'system_operation':
			r.data.operation = arr[2];
			break;
		case 'conference':
			r.data.room_id = arr[2];
			break;	
		case 'xml_ivr':
			break;
		case 'park':
			r.data.slot = arr[2];
			r.data.parker_id = arr[4];
			r.data.parker_name = arr[5];
			break;
		case 'bridged':
			break;
		case 'eavesdrop':
			r.data.uuid = arr[2];
			r.data.eavesdrop_state = arr[3];
		default:
			break;
		}

		return r;
	};

	var translate_target = function(arr) {
		var r = {}
		r.type = arr[0];
		r.id = arr[1];
		r.name = arr[2];
		r.address = arr[3];

		return r;
	};

	var adjust_avatar = function(avatar, is_user, base_url) {
		if(!avatar || avatar == "") {
			return base_url + (is_user ? "static/icons/user.png" : "static/icons/end_user.png");
		} else if(avatar.startsWith("https:") || avatar.startsWith("http://")) {
			return avatar;
		} else {
			return base_url + "basix/avatars/" + avatar;
		}
	};

	var translate_end_user_single = function(s, opts) {
		var tokens = s.split("*");
		tokens = tokens.map(function(token) {
			return decodeURIComponent(token.replace(/\+/g, '%20'));
		})
		var avatar = tokens[3];
		if(opts && opts.base_url) {
			avatar = adjust_avatar(avatar, false, opts.base_url);
		}
		return {
			id: tokens[0],
			name: tokens[1],
			organization: tokens[2],
			avatar: avatar,
			prefecture: tokens[4],
		};
	}

	var translate_end_user = function(s, opts) {
		if ([...s].every((char) => char === '*')) {
			return null
		} else if (s.startsWith("_MANY_:")) {
			var tokens = s.split("|")
			var arr = tokens[0].split(":")
			var count = parseInt(arr[1])
			return {
				count: count,
				items: tokens.slice(1).map(token => {
					return translate_end_user_single(token, opts)
				})
			}
		} else {
			return {
				count: 1,
				items: [
					translate_end_user_single(s, opts)
				]
			}
		}
	}

	mod.create_entity_info = function(entity_name, BertEntityInfo, info_fields, opts) {
		var entity_info = {};
		var fields = info_fields[entity_name];
		for(var i=0; i<fields.length; ++i) {
			var key = fields[i];
			var data = normalize_data(BertEntityInfo[i]);
			entity_info[key] = data;
		}

		if(entity_name == 'channel') {
			if(entity_info.other_info) {
				var data = entity_info.other_info
				var type = data[0]
				entity_info.other_info = {
					type: type,
					direction: data[2],
					peer_location: data[3],
					address: data[4],
					offer_timestamp: data[5],
					answer_timestamp: data[7],
				}
				if(type == 'user') {
					entity_info.other_info.user_id = data[1]
					entity_info.other_info.group_id = data[6]
				} else {
					entity_info.other_info.end_user = data[1] ? translate_end_user(data[1], opts) : null
				}
			}
		}

		if(['channel', 'queued_channel', 'parked_channel'].includes(entity_name)) {
			if(entity_info.state) {
				entity_info.state = translate_state(entity_info.state);
			}
			if(entity_info.target) {
				entity_info.target = translate_target(entity_info.target);
			}
			if(entity_info.end_user) {
				entity_info.end_user = translate_end_user(entity_info.end_user, opts);
			}
			if(entity_info.origination) {
				entity_info.origination = entity_info.origination.split("*").map(decodeURIComponent);
			}
		} else if(entity_name == 'user') {
			entity_info.label = utf8_decode(entity_info.label);
			if(opts && opts.base_url) {
				entity_info.avatar = adjust_avatar(entity_info.avatar, true, opts.base_url);
			}
		} else if(entity_name == 'group') {
			entity_info.label = utf8_decode(entity_info.label);
		}

		return entity_info;
	};

	return mod;
})();
