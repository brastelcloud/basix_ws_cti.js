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
		var s = {};
		var name = arr[0];
		s.name = name;
		s.data = {}
		switch(name) {
		case 'voicemail':
			s.data.target_type = arr[1];
			s.data.target_id = arr[2];
			s.data.target_name = arr[3];	
			break;
		case 'checking_voicemail':
			s.data.target_name = arr[1];	
			break;
		case 'calling_siptermination':
			s.data.url = arr[1];
			break;
		case 'calling_external':
			s.data.address = arr[1];
			break;
		case 'calling':
			s.data.target_type = arr[1];
			s.data.target_id = arr[2];
			s.data.target_name = arr[3];
			break;
		case 'ivr':
			s.data.ivr_id = arr[1];
			break;
		case 'system_operation':
			s.data.operation = arr[1];
			break;
		case 'conference':
			s.data.room_id = arr[1];
			break;	
		case 'plivo':
			break
		case 'park':
			s.data.park_slot = arr[1];
			break;
		default:
			s['data'] = arr;		
		}

		return s;
	}

	mod.create_entity_info = function(entity, BertEntityInfo, info_fields, full_dict_mode) {
		var entity_info = {};
		var fields = info_fields[entity];
		for(var i=0; i<fields.length; ++i) {
			var key = fields[i];
			var data = normalize_data(BertEntityInfo[i]);
			entity_info[key] = data;
		}
		if(entity == "chan") {
			entity_info['offer_timestamp'] = parseInt(entity_info['offer_timestamp']);

			if(full_dict_mode == true) {
				entity_info['state'] = translate_state(entity_info['state']);
			}
		}
		return entity_info;
	};

	return mod;
})();
