#!/bin/bash

if [ "$(id -u)" != "0" ]; then
	echo "Sorry, you are not root :("
	echo "Lemme help you out..."
	sudo $0 $@
	exit $?
fi

#########################
# Database configuration
#########################
read -p "Drop and install database? [Y/n]: " response
if [ "" = "$response" ] || [ "Y" = "$response" ] || [ "y" = "$response" ]; then
	apt-get install postgresql
	
	db_name=master_control_program
	db_user=clu
	db_password=$(openssl rand -base64 32)
	credentials_file=DB_CREDENTIALS

	su postgres -c "dropdb $db_name"
	su postgres -c "psql -c \"DROP OWNED BY $db_user\"" > /dev/null
	su postgres -c "dropuser $db_user"
	su postgres -c "psql -c \"CREATE USER $db_user WITH PASSWORD '$db_password'\"" > /dev/null
	su postgres -c "createdb -O $db_user $db_name"
	su postgres -c "psql -d $db_name -a < schema.sql" > /dev/null
	su postgres -c "psql -d $db_name -c 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $db_user'" > /dev/null
	su postgres -c "psql -d $db_name -c 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $db_user'" > /dev/null
	
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
