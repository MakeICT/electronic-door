#!/bin/bash

if [ "$(id -u)" != "0" ]; then
	echo "Sorry, you are not root :("
	exit 1
fi

#########################
# Database configuration
#########################
read -p "Drop and install database? [Y/n]: " response
if [ "" = "$response" ] || [ "Y" = "$response" ] || [ "y" = "$response" ]; then
	##
	# Run this as the `postgres` user
	##

	db_name=MastercontrolProgram
	db_user=clu
	db_password=$(openssl rand -base64 32)
	credentials_file=DB_CREDENTIALS

	su postgres -c "dropdb \"$db_name\""
	su postgres -c "dropuser \"$db_user\""
	###createuser -S -D -R -e clu -P
	#cmd="psql -c \"CREATE USER \"$db_user\" WITH PASSWORD '$db_password'"\"
	su postgres -c "psql -c \"CREATE USER \"$db_user\" WITH PASSWORD '$db_password'"\" > /dev/null
	su postgres -c "createdb -O \"$db_user\" \"$db_name\""
	#### psql -U electronic-door-db-user -d ElectronicDoor -a -f schema.sql
	su postgres -c "psql -d \"$db_name\" -a -f schema.sql" > /dev/null
	
	echo "$db_user	$db_password" > $credentials_file
	echo -e "Generated new credentials in $credentials_file\n"
fi

#############################
# Setup EXIM4 to send emails
#############################
read -p "Install exim4 for email alerts? [Y/n]: " response
if [ "" = "$response" ] || [ "Y" = "$response" ] || [ "y" = "$response" ]; then
	echo -e "\nSetting up email for alerts..."
	echo -e "\n**** Configuration Notes ****"
	echo "		Type: mail sent by smarthost; received via SMTP or fetchmail"
	echo "		Hostname: whatever hostname you want"
	echo "		Allowed IPs: 127.0.0.1 ; ::1"
	echo "		Other destinations: type your hostname again"
	echo "		Machines for relay: (leave it blank)"
	echo "		Outgoing smarthost: smtp.gmail.com::587"
	echo "		Hide local name: No"
	echo "		DNS queries minimal: No"
	echo "		Delivery method for local: Maildir format in home directory"
	echo "		Split config: No"
	echo -e "\nCopy these notes real quick. You'll need them in a sec."
	read -p "Press [ENTER] when you're ready"

	sudo apt-get -y install exim4
	sudo dpkg-reconfigure exim4-config

	read -p "Email login: " EMAIL
	read -p "Password   : " PASSWORD

	sudo chmod o+w /etc/exim4/passwd.client
	echo "gmail-smtp.l.google.com:$EMAIL:$PASSWORD" > /etc/exim4/passwd.client
	echo "*.google.com:$EMAIL:$PASSWORD" >> /etc/exim4/passwd.client
	echo "smtp.gmail.com:$EMAIL:$PASSWORD" >> /etc/exim4/passwd.client
	sudo chmod o-w /etc/exim4/passwd.client

	sudo update-exim4.conf
	sudo /etc/init.d/exim4 restart
fi
