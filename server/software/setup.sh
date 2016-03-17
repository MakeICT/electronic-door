#!/bin/bash

#########################
# Database configuration
#########################
read -p "Drop and install database? [Y/n]: " response
if [ "" = "$response" ] || [ "Y" = "$response" ] || [ "y" = "$response" ]; then
	sudo apt-get install postgresql
	
	db_name=master_control_program
	db_user=clu
	db_password=$(openssl rand -base64 32)
	credentials_file=credentials/DB_CREDENTIALS

	sudo su postgres -c "dropdb $db_name"
	sudo su postgres -c "psql -c \"DROP OWNED BY $db_user\"" > /dev/null
	sudo su postgres -c "dropuser $db_user"
	sudo su postgres -c "psql -c \"CREATE USER $db_user WITH PASSWORD '$db_password'\"" > /dev/null
	sudo su postgres -c "createdb -O $db_user $db_name"
	sudo su postgres -c "psql -d $db_name -a < schema.sql" > /dev/null
	sudo su postgres -c "psql -d $db_name -c 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $db_user'" > /dev/null
	sudo su postgres -c "psql -d $db_name -c 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $db_user'" > /dev/null
	
	mkdir credentials >/dev/null 2>&1
	echo "$db_user	$db_password" > $credentials_file
	echo -e "Generated new credentials in $credentials_file\n"
fi

#############################
# Node dependencies
#############################
read -p "Install node dependencies [Y/n]: " response
if [ "" = "$response" ] || [ "Y" = "$response" ] || [ "y" = "$response" ]; then
	npm install
	for plugin in plugins/*; do
		cd $plugin
		npm install
		cd ../../
	done
	cd plugins/mcp-plugin-alarm-decoder/node_modules/ad2usb
	npm install
fi

#############################
# HTTPS cert and key
#############################
read -p "Generate new SSL cert and key [y/N]: " response
if [ "Y" = "$response" ] || [ "y" = "$response" ]; then
	mkdir credentials >/dev/null 2>&1
	openssl req -x509 -newkey rsa:2048 -keyout credentials/key.pem -out credentials/cert.pem -days XXX -nodes
fi
