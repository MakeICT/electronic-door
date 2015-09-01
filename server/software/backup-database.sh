#!/bin/bash

codePath=/home/pi/code/makeictelectronicdoor/

sqlUser=$(cat $codePath/web/include/DB_CREDENTIALS | cut -f 1)
sqlPassword=$(cat $codePath/web/include/DB_CREDENTIALS | cut -f 2)

backupFile=key-backup$(date +"%Y-%m-%d_%H%M%S").sql
cd /tmp/

# create backup
echo -e "\nCreating backup..."
mysqldump -u$sqlUser -p$sqlPassword MakeICTMemberKeys > $backupFile

# zip it
echo -e "\nCompressing..."
mysqldump -u$sqlUser -p$sqlPassword MakeICTMemberKeys > $backupFile
tar -czf $backupFile.tar.gz $backupFile

# upload it
echo -e "\nUploading..."
/home/pi/bin/drive-linux-rpi -c /home/pi/.gdrive/ upload -f $backupFile.tar.gz -p "0BzlftvWCkom_fjJyNzhDNjJjS1IxdmVfcW45RjU3ZWxhdEQzTmdtT1g3LVVkWEIta2hFWkU"

# clean up
echo -e "\nCleaning up..."
rm $backupFile
rm $backupFile.tar.gz

echo -e "\nDone!"
