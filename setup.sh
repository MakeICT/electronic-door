#!/bin/bash

echo -e "\nSetting up CRON jobs..."
#appends line to /etc/crontab to run waUpdater automatically at 1:00am daily
sudo sed -i '$ a\0 1 * * *   www-data        php -f /home/pi/code/makeictelectronicdoor/web/include/waUpdater.php' /etc/crontab
sudo sed -i '$ a\0 2 * * *   www-data        /home/pi/code/makeictelectronicdoor/backup-database.sh' /etc/crontab

echo -e "\nAdding upstart services..."
sudo ln -s ~/code/makeictelectronicdoor/door-lock.conf /etc/init/door-lock.conf
sudo ln -s ~/code/makeictelectronicdoor/alerter/alarm-alerter.conf /etc/init/alarm-alerter.conf


# Setup Apache SSL
echo -e "\nSetup Apache SSL..."
sudo mkdir /etc/apache2/ssl
sudo openssl req -x509 -nodes -days 1095 -newkey rsa:2048 -out /etc/apache2/ssl/server.crt -keyout /etc/apache2/ssl/server.key
sudo a2enmod ssl
sudo ln -s /etc/apache2/sites-available/default-ssl /etc/apache2/sites-enabled/000-default-ssl
sudo sed -i '/ssl-cert-snakeoil.pem/c\\tSSLCertificateFile    /etc/apache2/ssl/server.crt' /tmp/default-ssl
sudo sed -i '/ssl-cert-snakeoil.key/c\\tSSLCertificateKeyFile    /etc/apache2/ssl/server.key' /tmp/default-ssl

sudo /etc/init.d/apache2 restart


# Setup EXIM4 to send emails
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

