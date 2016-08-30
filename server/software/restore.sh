#!/bin/bash

#########################
# Database configuration
#########################
if [ "$1" = "" ]; then
	echo "Nah."
	exit 1
fi

db_name=master_control_program
db_user=clu
db_password=$(openssl rand -base64 32)
credentials_file=credentials/DB_CREDENTIALS

sudo su postgres -c "dropdb $db_name"
sudo su postgres -c "psql -c \"DROP OWNED BY $db_user\"" > /dev/null
sudo su postgres -c "dropuser $db_user"
sudo su postgres -c "psql -c \"CREATE USER $db_user WITH PASSWORD '$db_password'\"" > /dev/null
sudo su postgres -c "createdb -O $db_user $db_name"
sudo su postgres -c "psql -d $db_name -a < $1" > /dev/null
sudo su postgres -c "psql -d $db_name -c 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $db_user'" > /dev/null
sudo su postgres -c "psql -d $db_name -c 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $db_user'" > /dev/null

mkdir credentials >/dev/null 2>&1
echo "$db_user	$db_password" > $credentials_file
echo -e "Generated new credentials in $credentials_file\n"
