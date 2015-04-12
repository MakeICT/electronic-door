#!/bin/bash

#appends line to /etc/crontab to run waUpdater automatically at 1:00am daily

sudo sed -i '$ a\0  1    * * *   www-data        php -f /home/pi/code/makeictelectronicdoor/web/include/waUpdater.php' /etc/crontab

sudo sed -i '$ a\0  1    * * *   www-data        /home/pi/code/makeictelectronicdoor/backup-database.sh' /etc/crontab

sudo ln -s ~/code/makeictelectronicdoor/door-lock.conf /etc/init/door-lock.conf
sudo ln -s ~/code/makeictelectronicdoor/alerter/alarm-alerter.conf /etc/init/alarm-alerter.conf
