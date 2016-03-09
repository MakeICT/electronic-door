var backend = require('../../backend.js');
var broadcaster = require('../../broadcast.js');
var ad2usb = require('./node_modules/ad2usb');

var alarm;

var ARM_ALARM = 0x06;

module.exports = {
	name: 'Alarm Decoder',
	options: {
		'IP': 'number',
		'Port': 'number',
		'Code': 'password',
	},
	
	actions: {
		'Arm away': function(callback){
			backend.getPluginOptions(module.exports.name, function(settings){
				alarm.armAway(settings['Code']);
			});
		},
		'Arm stay': function(callback){
			backend.getPluginOptions(module.exports.name, function(settings){
				alarm.armStay(settings['Code']);
			});
		},
		'Disarm': function(callback){
			backend.getPluginOptions(module.exports.name, function(settings){
				alarm.disarm(settings['Code']);
			});
		},
	},
	
	onInstall: function(){
	},

	onUninstall: function(){
	},
	
	onEnable: function(){
		backend.getPluginOptions(module.exports.name, function(settings){
			try{
				ad2usb.errorHandler = function(error){
					backend.error('Alarm Decoder failed: ' + error.code);
				};
				
				alarm = ad2usb.connect(settings['IP'], settings['Port'], function() {
					backend.log('Alarm Decoder connected');
					broadcaster.subscribe(module.exports);
					
					alarm.on('alarm', function(status) {
						if(status){
							broadcaster.broadcast(module.exports, "alarm-triggered", {});
						}
					});
					
					alarm.on('fireAlarm', function(status) {
						if(status){
							broadcaster.broadcast(module.exports, "fire-alarm-triggered", {});
						}
					});
					
					alarm.on('armedAway', function() {
						broadcaster.broadcast(module.exports, "alarm-armed-away", {});
					});
					
					alarm.on('armedStay', function() {
						broadcaster.broadcast(module.exports, "alarm-armed-stay", {});
					});
					
					alarm.on('disarmed', function() {
						broadcaster.broadcast(module.exports, "alarm-disarmed", {});
					});
				});
			}catch(exc){
				backend.log('Failed to start AlarmDecoder Plugin', null, null, 'error');
				console.log(exc);
			}
		});
	},
	
	onDisable: function(){
		alarm.socket.destroy();
		alarm = null;
		broadcaster.unsubscribe(module.exports);
	},
	
	receiveMessage: function(source, message, data){
		if(message == "door-unlocked"){
			backend.getPluginOptions(module.exports.name, function(settings){
				alarm.disarm(settings['Code']);
			});
		}else if(message == 'serial-data-received'){
			if(data['to'] == 0){
				if(data['function'] == ARM_ALARM){
					backend.getPluginOptions(module.exports.name, function(settings){
						alarm.arm(settings['Code']);
					});
				}
			}
		}
	},
};
