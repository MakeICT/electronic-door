
import logging

import datetime
import urllib.request
import urllib.response
import urllib.error
import urllib.parse

import json
import base64
import ssl


class McpApiClient(object):
	"""Wild apricot API client."""
	auth_endpoint = "https://security.makeict.org/api/login"
	api_endpoint = "https://security.makeict.org/api"

	session_cookie = None

	def __init__(self):
		pass 

	def authenticate_with_contact_credentials(self, username, password, scope=None):
		"""perform authentication by contact credentials and store result for execute_request method

		email -- MCP login email
		password -- MCP password
		"""
		data = {
			"email": username,
			"password": password,
		}
		encoded_data = urllib.parse.urlencode(data).encode()
		ssl._create_default_https_context = ssl._create_unverified_context
		request = urllib.request.Request(self.auth_endpoint, encoded_data, method="POST")
		request.add_header("ContentType", "application/x-www-form-urlencoded")

		# print(request.__dict__)
		response = urllib.request.urlopen(request)
		print(response)
		self.session_cookie = response.headers.get('Set-Cookie')
		# print(response.headers)
		# print(self.session_cookie)
		# print(response.code)

	@staticmethod
	def _parse_response(http_response):
		response = http_response.read().decode()
		decoded = json.loads(response)
		if isinstance(decoded, dict) and len(decoded.keys()) == 1:
			return decoded[list(decoded.keys())[0]]
		else:
			return decoded

	def execute_request(self, api_url, api_request_object=None, method=None):
		"""
		perform api request and return result as an instance of ApiObject or list of ApiObjects

		api_url -- absolute or relative api resource url
		api_request_object -- any json serializable object to send to API
		method -- HTTP method of api request. Default: GET if api_request_object is None else POST
		"""
		if not api_url.startswith("http"):
			api_url = self.api_endpoint + api_url

		if method is None:
			if api_request_object is None:
				method = "GET"
			else:
				method = "POST"

		request = urllib.request.Request(api_url, method=method)
		if api_request_object is not None:
			request.data = json.dumps(api_request_object).encode()

		request.add_header('Cookie', self.session_cookie)
		ssl._create_default_https_context = ssl._create_unverified_context

		try:
			response = urllib.request.urlopen(request)
			return McpApiClient._parse_response(response)
		except urllib.error.HTTPError as httpErr:
			if httpErr.code == 400:
				raise Exception(httpErr.read())
			else:
				raise

	def _make_api_request(self, request_string, api_request_object=None, method=None):
		try:	
			return self.execute_request(request_string, api_request_object, method)
		except urllib.error.HTTPError as e:
		    print('The server couldn\'t fulfill the request.')
		    print('Error code: ', e.code)
		except urllib.error.URLError as e:
		    print('We failed to reach a server.')
		    print('Reason: ', e.reason)
		return False

	def GetUsers(self):
		users = self.execute_request("https://security.makeict.org/api/users?q")
		return users

	def GetGroups(self):
		groups = self.execute_request("https://security.makeict.org/api/groups")
		return groups

	def GetUserGroups(self, userID):
		userGroups = self.execute_request("https://security.makeict.org/api/users/%s/groups" % userID)
		return userGroups

	def GetUserByNFC(self, nfcID):
		users = self.GetUsers()
		for user in users:
			if user['nfcID'] == nfcID:
				return user

		return None

	def IsUserInGroup(self, userID, groupID):
		userGroups = self.GetUserGroups(userID)
		groups = self.GetGroups()
		groupName = ''
		for group in groups:
			if group['groupID'] == groupID:
				groupName = group['name']

		if groupName:
			if groupName in [group["name"] for group in userGroups if group["enrolled"]]:
				return True
		
		return False

	def CheckAuthorization(self, nfcID, groupID):
		user = self.GetUserByNFC(nfcID)
		if user:
			if self.IsUserInGroup(user['userID'], groupID):
				return True

		return False
