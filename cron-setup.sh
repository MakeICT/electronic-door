#!/bin/bash

#appends line to /etc/crontab to run waUpdater automatically at 1:00am daily

sudo sed -i '$ a\0  1    * * *   www-data        php -f /home/pi/code/makeictelectronicdoor/web/include/waUpdater.php' /etc/crontab
