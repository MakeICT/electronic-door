/**
 * Project Name: Master Control System
 *  Description: abstraction to the database.
 * @TODO: create a consistent interface to these functions (some have onSuccess/failure, some don't)
 * @TODO: transactions with commits/rollbacks
 **/ 
 
var fs = require('fs');
var pg = require('pg');
var path = require('path');
var bcrypt = require('bcrypt');
var broadcaster = require('./broadcast.js')

var credentials = fs.readFileSync('credentials/DB_CREDENTIALS').toString().trim().split('\t');
var connectionParameters = {
	'user': credentials[0],
	'password': credentials[1],
	'host': 'localhost',
	'database': 'master_control_program',
};

// @TODO: use this one every query that is looking for just one row or value
function getOneOrNone(callback){
	return function(data){
		if(data && data.length > 0){
			data = data[0];
		}else{
			data = null;
		}
		
		if(callback){
			return callback(data);
		}else{
			return data;
		}
	}
}

function query(sql, params, onSuccess, onFailure, keepOpen){
	return pg.connect(connectionParameters, function(err, client, done) {
		if(err) {
			return backend.error('Failed to connect', err);
		}
		return client.query(sql, params, function(err, result) {
			if(!keepOpen){
				done();
			}
			
			if(err){
				if(onFailure){
					return onFailure(err);
				}else{
					backend.debug('SQL ERROR');
					backend.debug(err);
					backend.debug(params);
				}
			}else if(onSuccess){
				return onSuccess(result.rows, done);
			}
		});
	});
}

function generateFailureCallback(msg, failCallback){
	return function(err){
		module.exports.log(msg);
		if(failCallback) failCallback();
	};
}

var plugins = [];
var clients = [];
module.exports = {
	connectionParameters: connectionParameters,
	regroup: function(array, keyName, valueName){
		var data = {};
		for(var i=0; i<array.length; i++){
			data[array[i][keyName]] = array[i][valueName];
		}
		return data;
	},

	// Synchronous
	getPluginByName: function(name){
		for(var i=0; i<plugins.length; i++){
			if(plugins[i].name == name){
				return plugins[i];
			}
		}
		return null;
	},
	
	// Synchronous
	getClientByID: function(id){
		for(var i=0; i<clients.length; i++){
			if(clients[i].clientID == id){
				return clients[i];
			}
		}
		return null;
	},
	
	addClient: function(id, name, onSuccess, onFailure){
		console.log('AAAAAAAAAAAAAA');
		if(!name) name = 'Unknown client';
		
		var sql = 'INSERT INTO clients ("clientID", name) VALUES ($1, $2)';
		console.log('BBBBBBBBBBBBB');
		console.log(sql);
		var doReload = function(){
		console.log('DDDDDDDDDDDD');
			backend.log('Added client ' + id + ' ' + name);
			module.exports.reloadClients(onSuccess);
		}
		console.log('CCCCCCCCCCCCC');
		
		return query(sql, [id, name], doReload, generateFailureCallback('Failed to add client', onFailure));
	},
	
	getPlugins: function(){
		return plugins;
	},
	
	getClients: function(){
		return clients;
	},
	
	getUsers: function(q, isAdmin, keyActive, joinDate, onSuccess, onFailure) {
		try{
			var sql =
				'SELECT DISTINCT  ' +
				'	users."userID",   ' +
				'	"firstName", "lastName", "email", "joinDate", "status",   ' +
				'	"nfcID" IS NOT NULL AS "keyActive" ' +
				'FROM users ' +
				'WHERE TRUE ';	

			var params = [];
			if(isAdmin !== undefined){
				sql +=
					'	AND (SELECT 0 < COUNT(0) FROM "userGroups" JOIN "groups" ON "userGroups"."groupID" = groups."groupID"  ' +
					'		WHERE groups.name = \'administrators\' ' +
					'			AND "userGroups"."userID" = users."userID" ' +
					'	)';
			}
			if(keyActive !== undefined){
				sql += '	AND "nfcID" IS ' + (keyActive ? 'NOT ': '') + 'NULL';
			}
			if(joinDate !== undefined){
				params.push(joinDate);
				sql += '	AND "joinDate" >= $' + params.length;
			}

			if(q !== undefined){
				q = '%' + q.toLowerCase() + '%';
				params.push(q);
				sql += '	AND (LOWER("firstName") LIKE $' + params.length +
					'			OR LOWER("lastName") LIKE $' + params.length +
					'			OR LOWER("email") LIKE $' + params.length +
					'			OR LOWER("nfcID") LIKE $' + params.length +
					'		)';
			}
			
			return query(sql, params, onSuccess, onFailure);
		}catch(exc){
			backend.error(exc);
		}
	},
	
	getGroups: function(onSuccess, onFailure){
		try{
			var sql = 
				'SELECT ' +
				'	groups.*, ' +
				'	"authorizationTags".name AS "tagName", ' +
				'	"groupAuthorizationTags"."groupID" IS NOT NULL AS enrolled ' +
				'FROM groups ' +
				'	CROSS JOIN "authorizationTags" ' +
				'	LEFT JOIN "groupAuthorizationTags" ON "groups"."groupID" = "groupAuthorizationTags"."groupID" ' +
				'		AND "authorizationTags"."tagID" = "groupAuthorizationTags"."tagID" ' +
				'ORDER BY groups.name, "authorizationTags".name';
				
			var process = function(data){
				var groups = [];
				for(var i=0; i<data.length; i++){
					if(i == 0 || groups[groups.length-1].groupID != data[i].groupID){
						groups.push({
							'groupID': data[i].groupID,
							'name': data[i].name,
							'description': data[i].description,
							'authorizations': []
						});
					}
					groups[groups.length-1].authorizations.push({
						'name': data[i].tagName,
						'authorized': data[i].enrolled,
					});
				}
				
				onSuccess(groups);
			};
			return query(sql, [], process, onFailure);

		}catch(exc){
			backend.error(exc);
		}
	},
	
	getGroupByName: function(name, onSuccess, onFailure){
		var sql = 'SELECT * FROM groups WHERE name = $1';
		return query(sql, [name], getOneOrNone(onSuccess), onFailure);
	},
	
	// sends the groupID to the success callback
	addGroup: function(groupName, description, onSuccess, onFailure){
		try{
			var sql = 'INSERT INTO GROUPS (name, description) VALUES ($1, $2)';
			var findGroupID = function(){
				backend.log('Group added (' + groupName + ')');
				sql = 'SELECT "groupID" FROM groups WHERE name = $1';
				return query(sql, [groupName], getOneOrNone(onSuccess), onFailure);
			};
			return query(sql, [groupName, description], findGroupID, onFailure);
		}catch(exc){
			onFailure(exc);
		}
	},
	
	// @TODO: Grrrrroooooooossssss - the callback has to be wrapped in an object because of the calling function (WildApricot plugin)
	getUserByProxyID: function(proxySystem, proxyUserID, transaction) {
		var sql =
			'SELECT ' +
			'   users."userID", ' + 
			'	"firstName", "lastName", "email", "joinDate", "status", ' +
			'	"nfcID" IS NOT NULL AS "keyActive" ' +
			'FROM users ' +
			'	JOIN "proxyUsers" ON users."userID" = "proxyUsers"."userID" ' +
			'	JOIN "proxySystems" ON "proxyUsers"."systemID" = "proxySystems"."systemID" ' +
			'WHERE "proxySystems".name = $1 ' +
			'	AND "proxyUsers"."proxyUserID" = $2';

		var huh = function(data){
			transaction.callback(getOneOrNone()(data));
		}
			
		return query(sql, [proxySystem, proxyUserID], huh);
	},
	
	getUserByEmail: function(email, onSuccess, onFailure) {
		var sql = 'SELECT * FROM users WHERE email = $1';
		return query(sql, [email], getOneOrNone(onSuccess), onFailure);
	},
	
	getUserByNFC: function(nfcID, onSuccess, onFailure) {
		var sql = 'SELECT * FROM users WHERE "nfcID" = $1';
		return query(sql, [nfcID], getOneOrNone(onSuccess), onFailure);
	},
	
	getUserByID: function(id, onSuccess, onFailure) {
		var sql = 'SELECT * FROM users WHERE "userID" = $1';
		return query(sql, [id], getOneOrNone(onSuccess), onFailure);
	},
	
	/**
	 * Requires: { firstName, lastName, email, joinDate }
	 **/
	addUser: function(user, onSuccess, onFailure){
		var sql = 'INSERT INTO users ("email", "firstName", "lastName", "joinDate") VALUES ($1, $2, $3, $4)';
		var params = [user.email, user.firstName, user.lastName, user.joinDate];
		var log = function(){
			var sql = 'SELECT "userID" FROM users WHERE email = $1';
			return query(sql, function(data){
				module.exports.log('Create user', data[0].userID);
				if(onSuccess) onSuccess(data[0].userID);
			});
		};
		return query(sql, params, onSuccess, onFailure);
	},
		
	addProxyUser: function(proxySystem, proxyUserID, user, onSuccess, onFailure){
		var attachProxyUser = function(){
			backend.debug('attaching proxy user!');
			var systemSQL = 'SELECT "systemID" FROM "proxySystems" WHERE name = $1 LIMIT 1';
			var userSQL = 'SELECT "userID" FROM "users" WHERE "email" = $2 LIMIT 1';
			var sql = 'INSERT INTO "proxyUsers" ("systemID", "userID", "proxyUserID") ' +
				'VALUES ((' + systemSQL + '), (' + userSQL + '), $3)';
				
			var params = [proxySystem, user.email, proxyUserID];
			
			return query(sql, params, onSuccess, onFailure);
		};

		this.getUserByEmail(user.email, function(existingUser){
			if(existingUser){
				backend.debug('user exists!');
				attachProxyUser();
			}else{
				backend.debug('creating user!');
				var sql = 'INSERT INTO users ("email", "firstName", "lastName", "joinDate") VALUES ($1, $2, $3, $4)';
				backend.debug(user);
				var params = [user.email, user.firstName, user.lastName, user.joinDate];
				backend.debug('flag b');
				return query(sql, params, attachProxyUser, onFailure);
			}
		});
	},
		
	updateUser: function(user, onSuccess, onFailure){
		var sql = 'UPDATE users SET ';
		var counter = 0;
		var params = [];
		for(var key in user){
			if(key != 'userID' && key != 'keyActive'){
				counter++;
				sql += '"' + key + '"=$' + counter + ',';
				params.push(user[key]);
			}
		}
		if(counter > 0){
			sql = sql.substring(0, sql.length-1);
			sql += ' WHERE "userID" = $' + (counter+1);
			params.push(user.userID);
			var log = function(){
				module.exports.log('Update user', user.userID);
				if(onSuccess) onSuccess();
			}
			return query(sql, params, log, onFailure);
		}
	},

	updateUserPassword: function(userID, password, onSuccess, onFailure){
		var sql = 'UPDATE users SET "passwordHash" = $1 WHERE "userID" = $2';
		var log = function(){
			module.exports.log('Update user', userID);
			if(onSuccess) onSuccess();
		};
		
		bcrypt.hash(password, 8, function(err, hash){
			if(err){
				backend.error('Password hashing error');
				onFailure(err);
			}else{
				return query(sql, [hash, userID], log, onFailure);
			}
		});
	},

	enablePlugin: function(pluginName, onSuccess, onFailure){
		var updateRAM = function(){
			module.exports.getPluginByName(pluginName).enabled = true;
			if(onSuccess) onSuccess();
		};
		return query('UPDATE plugins SET enabled = TRUE WHERE name = $1', [pluginName], updateRAM, onFailure);
	},
	
	disablePlugin: function(pluginName, onSuccess, onFailure){
		var updateRAM = function(){
			module.exports.getPluginByName(pluginName).enabled = false;
			if(onSuccess) onSuccess();
		};
		return query('UPDATE plugins SET enabled = FALSE WHERE name = $1', [pluginName], updateRAM, onFailure);
	},
	
	addPluginOption: function(pluginName, optionName, type, onSuccess, onFailure){
		return query(
			'SELECT "pluginID" FROM plugins WHERE name = $1',
			[pluginName],
			function(rows){
				var sql = 'INSERT INTO "pluginOptions" (name, type, ordinal, "pluginID") VALUES ($1, $2, 999, $3)';
				var params = [optionName, type, rows[0].pluginID];
				return query(sql, params, onSuccess, onFailure);
			}
		);
	},
	
	removePluginOption: function(pluginName, optionName, onSuccess, onFailure){
		return query(
			'SELECT "pluginID" FROM plugins WHERE name = $1',
			[pluginName],
			function(rows){
				var sql = 'DELETE FROM "pluginOptions" WHERE "pluginID" = $1 AND name = $2';
				var params = [rows[0].pluginID, optionName];
				return query(sql, params, onSuccess, onFailure);
			}
		);
	},
	
	installPlugin: function(plugin, onSuccess, onFailure){
		var logAndFail = function(msg){
			backend.error("Failed to install plugin (" + plugin + "): " + msg);
			if(onFailure) onFailure();
		};

		return query(
			'INSERT INTO plugins (name) VALUES ($1)',
			[plugin.name],
			function(){
				return query(
					'SELECT "pluginID" FROM plugins WHERE name = $1',
					[plugin.name],
					function(rows){
						plugin.pluginID = rows[0].pluginID;
						if(plugin.options.length > 0){
							var sql = 'INSERT INTO "pluginOptions" (name, type, ordinal, "pluginID") VALUES ';
							var params = [];
							for(var i=0; i<plugin.options.length; i++){
								var option = plugin.options[i];
								sql += '($' + (i*4+1) + ', $' + (i*4+2) + ', $' + (i*4+3) + ', $' + (i*4+4) + '), ';
								params.push(option.name);
								params.push(option.value);
								params.push(i);
								params.push(plugin.pluginID);
							}
							sql = sql.substring(0, sql.length-2);
							return query(sql, params, function(){onSuccess(plugin);}, logAndFail);
						}else{
							onSuccess(plugin);
						}
					},
					logAndFail
				);
			},
			logAndFail
		);
	},
	
	installClientPlugin: function(plugin, onSuccess, onFailure){
		this.installPlugin(plugin, function(){
			return query(
				'SELECT "pluginID" FROM plugins WHERE name = $1',
				[plugin.name],
				function(rows){
					var pluginID = rows[0].pluginID;
					var sql = 'INSERT INTO "clientPluginOptions" (name, type, ordinal, "pluginID") VALUES ';
					var ordinal = 0;
					var params = [];
					for(var key in plugin.clientDetails['options']){
						sql += '($' + (ordinal*4+1) + ', $' + (ordinal*4+2) + ', $' + (ordinal*4+3) + ', $' + (ordinal*4+4) + '), ';
						params.push(key);
						params.push(plugin.clientDetails['options'][key]);
						params.push(ordinal);
						params.push(pluginID);
						
						ordinal++;
					}
					if(params.length > 0){
						sql = sql.substring(0, sql.length-2);
						return query(sql, params, function(){onSuccess(plugin);}, onFailure);
					}
				},
				onFailure
			);
			
		}, onFailure);
	},
	
	addProxySystem: function(systemName, onSuccess, onFailure){
		return query('INSERT INTO "proxySystems" (name) VALUES ($1)', [systemName], onSuccess, onFailure);
	},
	
	getInstalledPlugins: function(onSuccess, onFailure){
		return query('SELECT * FROM plugins', null, onSuccess, onFailure);
	},
	
	getPluginOptions: function(pluginName, onSuccess, onFailure){
		return this._getPluginOptions(pluginName, false, onSuccess, onFailure);
	},
	
	getOrderedPluginOptions: function(pluginName, onSuccess, onFailure){
		return this._getPluginOptions(pluginName, true, onSuccess, onFailure);
	},
	
	_getPluginOptions: function(pluginName, leaveOrdered, onSuccess, onFailure){
		var sql = 
			'SELECT ' +
			'	"pluginOptions"."name", ' +
			'	type, ' +
			'	value ' +
			'FROM plugins ' +
			'	JOIN "pluginOptions" ON plugins."pluginID" = "pluginOptions"."pluginID" ' +
			'	LEFT JOIN "pluginOptionValues" ON "pluginOptions"."pluginOptionID" = "pluginOptionValues"."pluginOptionID" ' +
			'WHERE plugins.name = $1 ' +
			'ORDER BY ordinal ';
		
		var self = this;
		var process = onSuccess;
		
		if(!leaveOrdered){
			process = function(data){
				onSuccess(self.regroup(data, 'name', 'value'));
			};
		}
		return query(sql, [pluginName], process, onFailure);
	},
	
	setPluginOption: function(pluginName, optionName, value, onSuccess, onFailure){
		// @TODO: collapse into a single query or find a better sequential execution method (async module?)
		console.log('setting plugin option');
		var sendUpdateToPlugin = function(){
			var plugin = module.exports.getPluginByName(pluginName);
			for(var i=0; i<plugin.options.length; i++){
				if(plugin.options[i].name == optionName){
					plugin.options[i].value = value;
					break;
				}
			}
			onSuccess();
		};
		return query(
			'SELECT "pluginID" FROM plugins WHERE name = $1',
			[pluginName],
			function(plugin){
				var pluginID = plugin[0].pluginID;
				
				return query(
					'SELECT "pluginOptionID" FROM "pluginOptions" WHERE "pluginID" = $1 AND name = $2',
					[pluginID, optionName],
					function(pluginOption){
						var optionID = pluginOption[0].pluginOptionID;
						return query(
							'SELECT value FROM "pluginOptionValues" WHERE "pluginOptionID" = $1',
							[optionID],
							function(rows){
								return query(
									'DELETE FROM "pluginOptionValues" WHERE "pluginOptionID" = $1',
									[optionID],
									function(){
										var sql = 'INSERT INTO "pluginOptionValues" ("pluginOptionID", value) VALUES ($1, $2)';
										return query(sql, [optionID, value], sendUpdateToPlugin, onFailure);
									},
									onFailure
								);
							},
							onFailure
						);
					},
					onFailure
				);
			},
			onFailure
		);
	},
	
	getInstalledClients: function(onSuccess, onFailure){
		var sql = 
			'SELECT ' +
			'	clients."clientID", ' + 
			'	clients.name AS "clientName", ' + 
			'	plugins.name AS "pluginName", ' + 
			'	"clientPluginOptions".name AS "optionName", ' + 
			'	"clientPluginOptions".type AS "optionType", ' + 
			'	"clientPluginOptionValues"."optionValue" AS "optionValue" ' + 
			'FROM clients ' + 
			'	LEFT JOIN "clientPluginAssociations" ON clients."clientID" = "clientPluginAssociations"."clientID" ' +
			'	LEFT JOIN "plugins" ON "clientPluginAssociations"."pluginID" = "plugins"."pluginID" ' + 
			'	LEFT JOIN "clientPluginOptions" ON "plugins"."pluginID" = "clientPluginOptions"."pluginID" ' + 
			'	LEFT JOIN "clientPluginOptionValues" ON "clientPluginOptions"."clientPluginOptionID" = "clientPluginOptionValues"."clientPluginOptionID" ' + 
			'		AND clients."clientID" = "clientPluginOptionValues"."clientID" ' +
			'ORDER BY clients.name, plugins.name, "clientPluginOptions".name';
		return query(
			sql,
			null,
			function(rows){
				var clients = [];
				var currentClient = null;
				var currentPlugin = null;
				
				// There is an individual row for each client/plugin/option-value. Collapse these
				// (boy, an ORM might be nice here...)
				for(var i=0; i<rows.length; i++){
					if(!currentClient || currentClient.clientID != rows[i].clientID){
						currentClient = {
							'clientID' : rows[i].clientID,
							'name' : rows[i].clientName,
							'plugins': {},
						};
						clients.push(currentClient);
						
						currentPlugin = null;
					}
					if(rows[i].pluginName){
						if(!currentPlugin || currentPlugin.name != rows[i].pluginName){
							currentPlugin = {
								'name': rows[i].pluginName,
								'options': [],
							};
							currentClient['plugins'][currentPlugin.name] = currentPlugin;
						}
					}
					if(rows[i].optionName){
						currentPlugin.options.push({
							'name': rows[i].optionName,
							'type': rows[i].optionType,
							'value': rows[i].optionValue,
						});
					}
				}
				onSuccess(clients);
			},
			onFailure)
		;
	},
		
	associateClientPlugin: function(clientID, pluginName, onSuccess, onFailure){
		var plugin = module.exports.getPluginByName(pluginName);
		var client = module.exports.getClientByID(clientID);
		
		var sql = 'INSERT INTO "clientPluginAssociations" ("clientID", "pluginID") VALUES ($1, $2)';
		
		var addOptions = function(){
			module.exports.reloadClients();
			if(onSuccess) onSuccess();
		}
		
		return query(sql, [clientID, plugin.pluginID], addOptions, onFailure);
	},
	
	setClientPluginOption: function(clientID, pluginName, option, value, onSuccess, onFailure){
		var plugin = module.exports.getPluginByName(pluginName);
		var params = [clientID, plugin.pluginID, option];
		
		var oldValue;
		var allOptions = module.exports.getClientByID(clientID).plugins[pluginName].options;
		for(var i=0; i<allOptions.length; i++){
			if(allOptions[i].name == option){
				oldValue = allOptions[i].value;
				break;
			}
		};
		
		var subquery = 
			'SELECT "clientPluginOptionID" FROM "clientPluginOptions" ' +
			'		WHERE "pluginID" = $2 AND "name" = $3';
			
		var deleteSQL = 
			'DELETE FROM "clientPluginOptionValues" ' +
			'WHERE "clientID" = $1 ' +
			'	AND "clientPluginOptionID" IN (' + subquery + ')';
			
		var insertSQL = 'INSERT INTO "clientPluginOptionValues" ("clientID", "clientPluginOptionID", "optionValue") ' +
			'VALUES ($1, (' + subquery + '), $4)';
			
		var updateRAM = function(){
			var updatePlugin = function(){
				if(plugin.clientDetails.optionUpdated){
					var client = module.exports.getClientByID(clientID);
					// @TODO: this should probably be first (update the plugin and let it update the backend?)
					plugin.clientDetails.optionUpdated(client, option, value, oldValue);
				}
			};
			
			module.exports.reloadClients(updatePlugin);
			if(onSuccess) onSuccess();
		};
		
		var insert = function(){
			params.push(value);
			return query(insertSQL, params, updateRAM, onFailure);
		};
		
		return query(deleteSQL, params, insert, onFailure);
	},
	
	reloadPlugins: function(){
		var pluginFolders = fs.readdirSync('./plugins').filter(function(file) {
			return fs.statSync(path.join('./plugins', file)).isDirectory();
		});
		module.exports.getInstalledPlugins(function(pluginList){
			var loadedPluginCount = 0;
			// load plugins
			for(var i=0; i<pluginFolders.length; i++){
				var plugin = require('./plugins/' + pluginFolders[i] + '/index.js');
				plugin.actionNames = Object.keys(plugin.actions);
				var found = false;
				for(var j=0; j<pluginList.length; j++){
					if(pluginList[j].name == plugin.name){
						for(var propertyName in pluginList[j]){
							plugin[propertyName] = pluginList[j][propertyName];
						}
						found = true;
						
						break;
					}
				}
				if(!found){
					var onInstalled = function(plugin){
						plugin.onInstall();
					};
					if(plugin.clientDetails){
						module.exports.installClientPlugin(plugin, onInstalled);
					}else{
						module.exports.installPlugin(plugin, onInstalled);
					}
				}
				plugins.push(plugin);
				
				var setOptions = function(options){
					for(var optionName in options){
						var value = options[optionName];
						for(var i=0; i<this.options.length; i++){
							if(this.options[i].name == optionName){
								this.options[i].value = value;
								break;
							}
						}
					}
						
					if(++loadedPluginCount >= pluginFolders.length){
						module.exports.reloadClients(function(){
							for(var i=0; i<plugins.length; i++){
								if(plugins[i].enabled){
									plugins[i].onEnable();
								}
							}
						});
					}else{
						backend.debug('Loaded plugin ' + this.name);
					}
				};
				
				module.exports.getPluginOptions(plugin.name, setOptions.bind(plugin));
			}
		});
	},
	
	reloadClients: function(callback){
		module.exports.getInstalledClients(function(clientList){
			clients.length = 0;
			
			for(var i=0; i<clientList.length; i++){
				var client = clientList[i];
				
				for(var pluginName in client.plugins){
					try{
						client.plugins[pluginName].actions = Object.keys(module.exports.getPluginByName(pluginName).clientDetails.actions);
					}catch(exc){
						backend.error('Failed to load plugin (' + pluginName + ') for client (' + client.clientID + ')');
						backend.error(exc);
					}
				}
				clients.push(client);
			}
			if(callback) callback(clients);
		});
	},
	
	registerAuthorizationTag: function(name, description, sourcePluginName, onSuccess, onFailure){
		var pluginID = module.exports.getPluginByName(sourcePluginName).pluginID;
		var sql = 'INSERT INTO "authorizationTags" (name, description, "sourcePluginID") VALUES ($1, $2, $3)';
		query(sql, [name, description, pluginID], onSuccess, onFailure);
	},
	
	updateAuthorizationTag: function(oldTag, newTag, sourcePluginName, onSuccess, onFailure){
		var pluginID = module.exports.getPluginByName(sourcePluginName).pluginID;
		var sql = 'UPDATE "authorizationTags" SET name = $2 WHERE name = $1 AND "sourcePluginID" = $3';
		query(sql, [oldTag, newTag, pluginID], onSuccess, onFailure);
	},
	
	deleteAuthorizationTag: function(name, sourcePluginName, onSuccess, onFailure){
		var pluginID = module.exports.getPluginByName(sourcePluginName).pluginID;
		var sql = 'DELETE FROM "authorizationTags" WHERE name = $1 AND "sourcePluginID" = $2';
		query(sql, [name, pluginID], onSuccess, onFailure);
	},
		
	setGroupAuthorization: function(who, what, authorized, onSuccess, onFailure){
		var sql;
		var tagSQL = 'SELECT "tagID" FROM "authorizationTags" WHERE name = $2';
		
		if(authorized){
			sql = 
				'INSERT INTO "groupAuthorizationTags" ("groupID", "tagID") ' +
				'VALUES ($1, (' + tagSQL + '))';
		}else{
			sql = 
				'DELETE FROM "groupAuthorizationTags" WHERE "groupID" = $1 ' +
				'AND "tagID" = (' + tagSQL + ')';
		}
		
		var log = function(){
			module.exports.log((authorized ? 'Authorize ' : 'Forbid ') + ' group(' + who + ') for ' + what);
			if(onSuccess) onSuccess();
		};
		return query(sql, [who, what], log, onFailure);
	},
	
	checkAuthorization: function(userID, what, onAuthorized, onUnauthorized, idIsNFC){
		backend.debug("Checking authorization " + userID + " for " + what);
		var sql =
			'SELECT COUNT(0) > 0 AS authorized ' + 
			'FROM "groupAuthorizationTags" ' + 
			'	JOIN "userGroups" ON "groupAuthorizationTags"."groupID" = "userGroups"."groupID" ' + 
			'	JOIN users ON "userGroups"."userID" = "users"."userID" ' + 
			'WHERE users."userID" = $1 ' + 
			'	AND users.status = \'active\'' +
			'	AND "tagID" = (SELECT "tagID" FROM "authorizationTags" WHERE name = $2)';
		
		var process = function(data){
			if(data[0]['authorized']){
				onAuthorized();
			}else{
				onUnauthorized();
			}
		};
		
		return query(sql, [userID, what], process, onUnauthorized);
	},
	
	/**
	 * onAuthorized(user)
	 * onUnauthorized(user, reason)
	 **/
	checkAuthorizationByNFC: function(nfcID, what, onAuthorized, onUnauthorized){
		backend.debug("checking NFC ID " + nfcID + " for authorization on " + what);
		var unauthed = function(){
			onUnauthorized(null, 'System error');
		};
		
		module.exports.getUserByNFC(nfcID, function(user){
			if(!user){
				onUnauthorized(null, 'Could not find user');
			}else if(user.status != 'active'){
				onUnauthorized(user, 'User not active');
			}else{
				var authed = function(){
					onAuthorized(user);
				};
				var unauthed = function(){
					onUnauthorized(user, 'Not authorized');
				};
				module.exports.checkAuthorization(user.userID, what, authed, unauthed, true);
			}
		}, unauthed);
	},
	
	checkPassword: function(login, password, goodCallback, badCallback){
		var sql = 'SELECT "userID", "passwordHash" FROM users WHERE email = $1';
		
		var process = function(data){
			if(data.length > 0 && bcrypt.compareSync(password, data[0].passwordHash || '')){
				goodCallback(data[0].userID);
			}else{
				badCallback();
			}
		};

		return query(sql, [login], process);
	},
	
	getUserGroups: function(who, onSuccess, onFailure){
		var sql =
			'SELECT ' +
			'	name, ' +
			'	"userGroups"."userID" IS NOT NULL AS enrolled ' +
			'FROM "groups" ' +
			'	LEFT JOIN "userGroups" ON "groups"."groupID" = "userGroups"."groupID" ' +
			'		AND "userID" = $1 ' +
			'WHERE "userID" = $1 OR "userID" IS NULL ' +
			'GROUP BY name, "userID" ' +
			'ORDER BY name';
		return query(sql, [who], onSuccess, onFailure);
	},
	
	setGroupEnrollment: function(who, group, enrolled, onSuccess, onFailure){
		var sql;
		var groupSQL = 'SELECT "groupID" FROM "groups" WHERE name = $2';
		
		if(enrolled){
			sql = 
				'INSERT INTO "userGroups" ("userID", "groupID") ' +
				'VALUES ($1, (' + groupSQL + '))';
		}else{
			sql = 
				'DELETE FROM "userGroups" WHERE "userID" = $1 ' +
				'AND "groupID" = (' + groupSQL + ')';
		}
		
		var log = function(){
			module.exports.log((enrolled ? 'Add user to' : 'Remove user from') + ' group: ' + group, who);
			if(onSuccess) onSuccess();
		};
		return query(sql, [who, group], log, onFailure);
	},

	log: function(message, userID, code, logType, skipBroadcast){
		if(!logType) logType = 'message';
		
		console.log(logType, message, userID ? userID : '', ',', code ? code : '');
		
		sql =
			'INSERT INTO logs (timestamp, "message", "logType", "userID", "code") ' +
			'VALUES (EXTRACT(\'epoch\' FROM current_timestamp), $1, $2, $3, $4)';
		params = [message, logType, userID, code];
		
		if(!skipBroadcast){
			var lookupFunction, lookupValue;
			if(userID){
				lookupFunction = module.exports.getUserByID;
				lookupValue = userID;
			}else if(code){
				lookupFunction = module.exports.getUserByNFC;
				lookupValue = code;
			}else{
				lookupFunction = function(callback){
					if(callback) return callback();
				};
			}
			lookupFunction(lookupValue, function(user){
				if(user) message += ' (' + user.firstName + ' ' + user.lastName + ')';
				if(code) message += ' (' + code + ')';
				broadcaster.broadcast(module.exports, 'log', message);
			});
		}
		
		return query(sql, params);
	},
	
	error: function(message){
		backend.log(message, null, null, 'error', true);
		broadcaster.broadcast(module.exports, 'error', message);
	},
	
	debug: function(message){
		console.log(message);
		//broadcaster.broadcast(module.exports, 'debug', message);
	},
	
	getLog: function(type, onSuccess, onFailure){
		// @TODO: time range? Paging? Something
		var sql;
		if(type == 'nfc'){
			sql = 
				'SELECT * FROM logs LEFT JOIN users ON logs.code = users."nfcID" ' +
				'WHERE code IS NOT NULL ' +
				'	AND users."userID" IS NULL ' +
				'ORDER BY timestamp DESC LIMIT 5';
		}else{
			sql = 
				'SELECT ' +
				'	logs.*, ' +
				'	users.* ' +
				'FROM logs ' +
				'	LEFT JOIN users ON logs."userID" = users."userID" ' +
				'ORDER BY timestamp DESC';
		}
		return query(sql, [], onSuccess, onFailure);
	},
	
	enrollUser: function(userID, nfcID, onSuccess, onFailure){
		var sql = 'UPDATE users SET "nfcID" = $1 WHERE "userID" = $2';
		
		var log = function(){
			backend.log('', userID, nfcID, 'assign');
			if(onSuccess) onSuccess();
		};

		return query(sql, [nfcID, userID], log, onFailure);
	},

};
var backend = module.exports;
module.exports.reloadPlugins();
