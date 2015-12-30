// Flag	Packet Length	Transaction ID	From Address	To Address	Function	Data		CRC		Flag
// 0x7E	8-bit			8-bit			8-bit			8-bit		8-bit		variable	16-bit	0x7E


var serialPort;
var transactionCount = 0;

module.exports = {
	name: 'Super Serial',
	options: {
		'Port': 'text',
		'Baud': 'number',
		'Data bits': 'number',
		'Stop bits': 'number',
		//'Parity': 'selection list',
		'xon': 'boolean',
		'xoff': 'boolean',
		'xany': 'boolean',
		'flowControl': 'boolean',
		'bufferSize': 'number',
	},

	actions: {
		'Connect': function(callback){
			serialPort = new require("serialport").SerialPort(
				options['Port'], { baudrate: options['Baud'] }, true, callback
			);
		},
		'Disconnect': function(){
		}
	},
	
	onInstall: function(){
	},

	onUninstall: function(){
		
	},
	
	onEnable: function(){
	},
	
	onDisable: function(){
	},
	
	send: function(clientID, command, payload, callback){
		// @TODO: figure out auto-reconnect
		if(!serialPort || !serialPort.isOpen()){
			console.err('Not connected');
		}else{
			var packet = [0x7e, 7 + length(payload), transactionCount++, 0x0, clientID, command, 0xFFFF, 0x7e];
			serialPort.write(packet, callback);
		}
	}

	
};
