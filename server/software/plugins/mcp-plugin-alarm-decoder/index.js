var backend = require('../../backend.js');
var broadcaster = require('../../broadcast.js');
var ad2usb = require('./node_modules/ad2usb');

var alarm;

var ARM_ALARM = 0x06;

module.exports = {
	name: 'Alarm Decoder',
	options: [
		{
			'name': 'IP',
			'type': 'number',
			'value': null,
		},{	
			'name': 'Port',
			'type': 'number',
			'value': 10000,
		},{	
			'name': 'Code',
			'type': 'password',
			'value': null,
		},
	],
	
	actions: [
		{
			'name': 'Arm away',
			'parameters': [],
			'execute': function(callback){
				backend.getPluginOptions(module.exports.name, function(settings){
					backend.log(module.exports.name + ': Sending *arm away*');
					alarm.armAway(settings['Code']);
				});
			},
		},{
			'name': 'Arm stay',
			'parameters': [],
			'execute': function(callback){
				backend.getPluginOptions(module.exports.name, function(settings){
					backend.log(module.exports.name + ': Sending *arm stay*');
					alarm.armStay(settings['Code']);
				});
				
			},
		},{
			'name': 'Disarm',
			'parameters': [],
			'execute': function(callback){
				backend.getPluginOptions(module.exports.name, function(settings){
					backend.log(module.exports.name + ': Sending *disarm*');
					alarm.disarm(settings['Code']);
				});
			},
		}
	],
	
	onInstall: function(){},

	onUninstall: function(){},
	
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
							backend.error(module.exports.name + ': alarm triggered!');
							backend.getRecentLog(20, function(log){
								broadcaster.broadcast(module.exports, "alarm-triggered", log);
							});
						}
					});
					
					alarm.on('fireAlarm', function(status) {
						if(status){
							backend.error(module.exports.name + ': fire alarm triggered!');
							broadcaster.broadcast(module.exports, "fire-alarm-triggered", {});
						}
					});
					
					alarm.on('armedAway', function() {
						backend.error(module.exports.name + ': alarm armed (away)');
						broadcaster.broadcast(module.exports, "alarm-armed-away", {});
					});
					
					alarm.on('armedStay', function() {
						backend.error(module.exports.name + ': alarm armed (stay)');
						broadcaster.broadcast(module.exports, "alarm-armed-stay", {});
					});
					
					alarm.on('disarmed', function() {
						backend.error(module.exports.name + ': alarm disarmed');
						broadcaster.broadcast(module.exports, "alarm-disarmed", {});
					});
					
					alarm.on('fault', function(zone) {
						backend.debug('Fault in zone: ' + zone);
					});
					
					alarm.on('raw', function(sec1, sec2, sec3, sec4) {
						// These are LCD status updates usually
						/*
						backend.debug(module.exports.name + ' (raw): ' + sec1);
						backend.debug(module.exports.name + ' (raw): ' + sec2);
						backend.debug(module.exports.name + ' (raw): ' + sec3);
						backend.debug(module.exports.name + ' (raw): ' + sec4);
						*/
					});
					
					alarm.on('error', function() {
						backend.error(module.exports.name + ': socket error. Attempting to reconnect');
						module.exports.onDisable();
						module.exports.onEnable();
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
				if(data['command'] == ARM_ALARM){
					backend.getPluginOptions(module.exports.name, function(settings){
						alarm.armAway(settings['Code']);
					});
				}
			}
		}
	},
};
