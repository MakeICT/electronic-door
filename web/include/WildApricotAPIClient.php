<?php
	class WaApiClient{
		const AUTH_URL = 'https://oauth.wildapricot.org/auth/token';
				
		private $tokenScope = 'general_info contacts finances events event_registrations account membership_levels settings';

		private static $_instance;
		private $token;
		private $accountID;
		
		public function initTokenByContactCredentials($userName, $password, $scope = null){
			if ($scope) {
				$this->tokenScope = $scope;
			}

			$this->token = $this->getAuthTokenByAdminCredentials($userName, $password);
			if (!$this->token) {
				throw new Exception('Unable to get authorization token.');
			}
			$this->autoSetAccountID();
		}

		public function initTokenByApiKey($apiKey, $scope = null){
			if ($scope) {
				$this->tokenScope = $scope;
			}

			$this->token = $this->getAuthTokenByApiKey($apiKey);
			if (!$this->token) {
				throw new Exception('Unable to get authorization token.');
			}
			$this->autoSetAccountID();
		}

		public function autoSetAccountID(){
			$accounts = $this->makeRequest("https://api.wildapricot.org/v2/Accounts/");
			$this->accountID = $accounts[0]['Id'];
		}

		// this function makes authenticated request to API
		// -----------------------
		// $url is an absolute URL
		// $verb is an optional parameter.
		// Use 'GET' to retrieve data,
		//		'POST' to create new record
		//		'PUT' to update existing record
		//		'DELETE' to remove record
		// $data is an optional parameter - data to sent to server. Pass this parameter with 'POST' or 'PUT' requests.
		// ------------------------
		// returns object decoded from response json

		public function makeRequest($url, $verb = 'GET', $data = null){
			if (!$this->token) {
				throw new Exception('Access token is not initialized. Call initTokenByApiKey or initTokenByContactCredentials before performing requests.');
			}

			$ch = curl_init();
			$headers = array(
				'Authorization: Bearer ' . $this->token,
				'Content-Type: application/json'
			);
			curl_setopt($ch, CURLOPT_URL, $url);
			curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
			curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $verb);
			if ($data) {
				$jsonData = json_encode($data);
				curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
			}

			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			$jsonResult = curl_exec($ch);
			if ($jsonResult === false) {
				throw new Exception(curl_errno($ch) . ': ' . curl_error($ch));
			}
			$info = curl_getinfo($ch);
			if($info['http_code'] != 200){
				throw new Exception("cURL received '$info[http_code]' for $url");
			}

			// var_dump($jsonResult); // Uncomment line to debug response
			
			curl_close($ch);
			return json_decode($jsonResult, true);
		}

		private function getAuthTokenByAdminCredentials($login, $password){
			if ($login == '') {
				throw new Exception('login is empty');
			}

			$data = sprintf("grant_type=%s&username=%s&password=%s&scope=%s", 'password', $login, $password, $this->tokenScope);
			$authorizationHeader = "Authorization: Basic " . base64_encode( "MakeICTEventsList:open_wa_api_client");
			return $this->getAuthToken($data, $authorizationHeader);
		}

		private function getAuthTokenByApiKey($apiKey){
			$data = sprintf("grant_type=%s&scope=%s", 'client_credentials', $this->tokenScope);
			$authorizationHeader = "Authorization: Basic " . base64_encode("APIKEY:" . $apiKey);
			return $this->getAuthToken($data, $authorizationHeader);
		}

		private function getAuthToken($data, $authorizationHeader){
			$ch = curl_init();
			$headers = array(
				$authorizationHeader,
				'Content-Length: ' . strlen($data)
			);
			curl_setopt($ch, CURLOPT_URL, WaApiClient::AUTH_URL);
			curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
			curl_setopt($ch, CURLOPT_POST, true);
			curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			$result = json_decode(curl_exec($ch) , true);
			if ($result === false) {
				throw new Exception(curl_errno($ch) . ': ' . curl_error($ch));
			}

			//var_dump($result); // Uncomment line to debug response

			curl_close($ch);
			return $result['access_token'];
		}

		public static function getInstance(){
			if (!is_object(self::$_instance)) {
				self::$_instance = new self();
			}

			return self::$_instance;
		}

		public final function __clone(){
			throw new Exception('It\'s impossible to clone singleton "' . __CLASS__ . '"!');
		}

		private function __construct(){
			if (!extension_loaded('curl')) {
				throw new Exception('cURL library is not loaded');
			}
		}

		public function __destruct(){
			$this->token = null;
		}

		public function get($request, $accountID=null){
			if(empty($accountID)){
				$accountID = $this->accountID;
			}
			$request = "https://api.wildapricot.org/v2/Accounts/$accountID/$request";
			
			$data = $this->makeRequest($request);
			$keys = array_keys($data);
			return $data[$keys[0]];
		}
	}
