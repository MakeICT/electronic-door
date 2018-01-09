from MCP_API import McpApiClient

API = McpApiClient()

API.authenticate_with_contact_credentials('mcpapiuser@makeict.org', 'AC66WfVYUyw4')

# result = API.execute_request("https://security.makeict.org/api/groups/888", method="DELETE")

# groups = API.execute_request("https://security.makeict.org/api/groups")
# for group in groups:
# 	print(group['name'], group['groupID'])

# users = API.execute_request("https://security.makeict.org/api/users?q")
# for user in users:
# 	if user['nfcID']:
# 		print(user['firstName'],user['lastName'],':',user['nfcID'])
# print(len(users))

# print(API.GetUserGroups(100))
# print(API.GetUserByNFC('aa853ac4000000'))

# print(API.IsUserInGroup(100, 21))

print(API.CheckAuthorization('7cc09089', 5))
print(API.CheckAuthorization('7cc09089', 21))