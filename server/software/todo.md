# Server software todo's

Here's a list of todos for the server software. These are in no specific order.

1. WildApricot Plugin
	* On install, add "WildApricot" to Proxy system list
	* On sync, users in our system should have corresponding record in "proxyUsers" table
1. Automated backup plugin
	* Dump SQL
	* Zip it up
	* Upload to MakeICT drive (see https://github.com/MakeICT/electronic-door/blob/master/backup-database.sh)
1. Alarm system plugin for integration with VistaICM from Honeywell
	* For messages TO Vista, see: https://github.com/MakeICT/electronic-door/blob/master/vista
	* For messages FROM Vista, see: https://github.com/MakeICT/electronic-door/blob/master/alerter
1. Messaging system
	* Primary system and plugins should be able to broadcast and listen for messages
	* atmosphere.js maybe?
1. Email alert system
	* Example: If the alarm system plugin pumps an "alarm!" message on the messaging system, email alert system should listen for that and shoot out an email.
	* Note: Would be nice if the email alert included the last couple of door entries from the log and contact details
1. Clients
	* How to represent clients in the system:
		* clients table
			* clientID
			* clientTypeID
			* clientName
		* clientPluginOptions Table
			* clientID
			* optionID -> what does this point to? pluginOptions.pluginOptionID?
			* optionValue
		* clientTypes
			* clientTypeID
			* pluginID
			* name
		* (exists) plugins
			* pluginID
			* name
		* (exists) pluginOptions -> how to distinguish between a pluginOption and one that can be configured per client of that plugin type? Separate table? Also need this for per-user settings.
			* pluginOptionID
			* pluginID
			* name
			* data type
	* Figure out how to add / register clients to the system?
	* Client Types / Protocols / plugins
		* Note: all clients send/receive client ID along with message
		* Unlocker
			* Sends: NFC ID, door status changes
			* Receives: command to open
			* Manual actions: Unlock now
			* Options (per client):
				* (int) how long to keep door unlocked
				* (bool) auto-relock as soon after door triggered open
		* Chime
			* Receives: command to play tune / lights
			* Manual actions: test
			* Options (per client):
				* (string/blob?) default tone
				* (string/blob?) default light sequence
		* Unlock and chime
			* Combines unlocker and chime
		* Locker opener (low priority)
			* Sends: NFC ID
			* Receives: locker ID
		* Device / machine (low priority)
			* Sends: NFC ID to unlock, close command to lock back up
			* Receives: confirmation
1. Add ability to edit user details on the front-end
1. Add user login/authentication
