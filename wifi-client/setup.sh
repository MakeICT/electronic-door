#/bin/bash

#############################
# Enable service
#############################
read -p "Install and enable service [Y/n]: " response
if [ "" = "$response" ] || [ "Y" = "$response" ] || [ "y" = "$response" ]; then
	f=mcp-wifi-client.service
	sudo systemctl disable 'mcp-wifi-client' > /dev/null 2>&1
	echo "
		[Unit]
		Description=MCP WiFi Client
		
		[Service]
		ExecStart=`which python3` `pwd`/wifi-client.py
		WorkingDirectory=`pwd`
		Restart=always

		[Install]
		WantedBy=multi-user.target
	" | awk '{$1=$1};1' > $f

	sudo systemctl enable `pwd`/$f
	echo ""
	echo "    To start the service, use"
	echo "        sudo systemctl start $f"
	echo "    or reboot"
	echo "    To run manually, use"
	echo "        sudo node ./server-app.js"
fi
echo "Done!"
