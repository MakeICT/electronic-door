/**
 *  Description:
 * Project Name:
 * 
 * 
 **/ 

//~ mastercontrol program.
//~ what exaclty the whole bloody thing does


var fs = require('fs');
var pg = require('pg');


var credentials = fs.readFileSync('DB_CREDENTIALS').toString().trim().split('\t');
var connectionParameters = {
	'user': credentials[0],
	'password': credentials[1],
	'host': 'localhost',
	'database': 'master_control_program',
};

function query(sql, params, onSuccess, onError, keepOpen){
	return pg.connect(connectionParameters, function(err, client, done) {
		if(err) {
			return console.error('Failed to connect', err);
		}
		client.query(sql, params, function(err, result) {
			if(!keepOpen){
				done();
			}
			
			if(err){
				if(onError){
					onError(err);
				}else{
					console.error('Error executing query', err);
				}
			}else{
				if(onSuccess){
					onSuccess(result.rows, done);
				}
			}
		});
	});
}

module.exports = {
	getUsers: function(q, isAdmin, keyActive, joinDate, onSuccess, onFailure) {
		var sql =
			'SELECT ' +
			'	"isAdmin", "firstName", "lastName", "email", "joinDate", "status", ' +
			'	"nfcID" IS NOT NULL AS "keyActive" ' +
			'FROM users ' +
			'WHERE 1=1 ';

		var params = [];
		if(isAdmin !== undefined){
			params.push(isAdmin);
			sql += '	AND "isAdmin" = $' + params.length;
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
				'		)';
		}
		
		return query(sql, params, onSuccess, onFailure);
	},
	
	/**
	 * Requires: { firstName, lastName, email, joinDate }
	 **/
	addUser: function(user, onSuccess, onFailure){
		var sql = 'INSERT INTO users ("email", "firstName", "lastName", "joinDate") VALUES ($1, $2, $3, $4)';
		var params = [user.email, user.firstName, user.lastName, user.joinDate];
		
		return query(sql, params, onSuccess, onFailure);
	}
};
