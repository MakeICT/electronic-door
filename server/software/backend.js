var fs = require('fs');
var pg = require('pg');


var credentials = fs.readFileSync('DB_CREDENTIALS').toString().trim().split('\t');
var connectionParameters = {
	'user': credentials[0],
	'password': credentials[1],
	'host': 'localhost',
	'database': 'master_control_program',
};

function query(sql, params, cb, keepOpen){
	return pg.connect(connectionParameters, function(err, client, done) {
		if(err) {
			return console.error('Failed to connect', err);
		}
		client.query(sql, params, function(err, result) {
			if(!keepOpen){
				done();
			}
			
			if(err) {
				return console.error('Error executing query', err);
			}else{
				cb(result.rows, done);
			}
		});
	});
}

module.exports = {
	getUsers: function(q, isAdmin, keyActive, memberSince, cb) {
		var sql =
			'SELECT ' +
			'	"isAdmin", "firstName", "lastName", "email", "memberSince", "status", ' +
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
		if(memberSince !== undefined){
			params.push(memberSince);
			sql += '	AND "memberSince" >= $' + params.length;
		}
		if(q !== undefined){
			q = '%' + q.toLowerCase() + '%';
			params.push(q);
			sql += '	AND (LOWER("firstName") LIKE $' + params.length +
				'			OR LOWER("lastName") LIKE $' + params.length +
				'			OR LOWER("email") LIKE $' + params.length +
				'		)';
		}
		return query(sql, params, cb);
	},
};
