"use strict";

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
		case 'calling_siptermination':
			r.data.url = arr[2];
			break;
		case 'calling_external':
			r.data.address = arr[2];
			break;
		case 'calling':
			r.data.target_type = arr[2];
			r.data.target_id = arr[3];
			r.data.target_name = arr[4];
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
		case 'plivo':
			break;
		case 'park':
			r.data.park_slot = arr[2];
			break;
		case 'bridged':
			break;
		default:
			r = arr;
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

	mod.create_entity_info = function(entity, BertEntityInfo, info_fields, full_dict_mode) {
		var entity_info = {};
		var fields = info_fields[entity];
		for(var i=0; i<fields.length; ++i) {
			var key = fields[i];
			var data = normalize_data(BertEntityInfo[i]);
			entity_info[key] = data;
		}
		if(entity == "chan_info") {
			if(full_dict_mode == true) {
				if(entity_info.state) {
					entity_info.state = translate_state(entity_info.state);
				}
				if(entity_info.target) {
					entity_info.target = translate_target(entity_info.target);
				}
			}
		}
		return entity_info;
	};

	return mod;
})();
