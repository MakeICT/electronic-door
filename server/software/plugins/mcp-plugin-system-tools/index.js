var backend = require('../../backend.js');
var child_process = require('child_process');
var tmp = require('tmp');
var fs = require('fs');

var runningProcs = {};

function doCommand(cmd){
	setTimeout(function(){ child_process.exec(cmd); }, 1000);
}

module.exports = {
	name: 'System Tools',
	options: [],
	actions: [
		{
			'name': 'Download log',
			'parameters': [{
				'name': 'Log line limit',
				'type': 'number',
				'value': null,
			}],
			'execute': function(parameters, callback){
				backend.getPluginOptions(module.exports.name, function(settings){
					tmp.file(function(err, tmpFilePath, fd, cleanupCallback){
						var filename = encodeURIComponent(tmpFilePath.substring(tmpFilePath.lastIndexOf('/')+1));
						if(callback) callback({ 'url': '/api/plugins/' + encodeURIComponent(module.exports.name) + '/handler?f=' + filename });
						
						var args = '-u master-control-program --no-pager'.split(' ');
						if(parameters['Log line limit']){
							args.push('-n');
							args.push(parameters['Log line limit']);
						}
						var proc = child_process.spawn('journalctl', args);
						runningProcs[filename] = {
							'proc' : proc,
							'running': true,
							'size': 0,
							'cleanup': cleanupCallback,
						};
						proc.stdout.on('data', function(data) {
							runningProcs[filename].size += data.length;
							fs.appendFile(tmpFilePath, data);
						});
						proc.stdout.on('end', function(data){
							backend.log('Systemd Log Generated');
							backend.debug(filename);
							runningProcs[filename].running = false;
							fs.close(fd);
						});
						proc.stdin.end();
					});
				});
			},
		},{
			'name': 'Restart MCP',
			'parameters': [],
			'execute': function(parameters, callback){
				backend.log('MCP will now restart');
				doCommand('systemctl restart master-control-program');
				if(callback) callback();
			},
		},{
			'name': 'Reboot server',
			'parameters': [],
			'execute': function(parameters, callback){
				backend.log('System will now reboot');
				doCommand('reboot');
				if(callback) callback();
			},
		},{
			'name': 'Shutdown server',
			'parameters': [],
			'execute': function(parameters, callback){
				backend.log('System will now power off');
				doCommand('poweroff');
				if(callback) callback();
			},
		}
	],

	onInstall: function(){},
	onUninstall: function(){},
	onEnable: function(){},
	onDisable: function(){},
	
	handleRequest: function(request, response){
		var f = request.params.f;
		if(!runningProcs[f]){
			response.send(404, 'File not found :(');
			response.end();
		}else if(runningProcs[f].running){
			var size = runningProcs[f].size;
			response.write('<html><head><meta http-equiv="refresh" content="3" /></head><body><pre>[' + (new Date()) + '] Retreiving log... (' + size + ' bytes)</pre></body></html>');
			response.end();
		}else{
			fs.readFile('/tmp/' + f, 'utf8', function(err, file) {
				if (err) {
					backend.error('Systemd log failed :(');
					response.send(500);
				}else{
					response.write(file);
					runningProcs[f].cleanup();
					delete runningProcs[f];
				}
				response.end();
			});
		}
	},
};
