#ifndef MCP_API_H
#define MCP_API_H

#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"

#include "esp_http_client.h"
#include <jsmn.h>

static const char *MCP_API_TAG = "mcp_api";

#define WEB_SERVER CONFIG_SERVER ":" CONFIG_PORT
#define WEB_URL "https://" WEB_SERVER
#define AUTH_ENDPOINT WEB_URL "/api/login"

extern const char server_root_cert_pem[] asm("_binary_server_root_cert_pem_start");

char auth_cookie[77];
esp_http_client_handle_t client;
esp_http_client_config_t config = {};


    esp_err_t _http_event_handle(esp_http_client_event_t *evt)
    {
        switch(evt->event_id) {
            case HTTP_EVENT_ERROR:
                ESP_LOGD(MCP_API_TAG, "HTTP_EVENT_ERROR");
                break;
            case HTTP_EVENT_ON_CONNECTED:
                ESP_LOGD(MCP_API_TAG, "HTTP_EVENT_ON_CONNECTED");
                break;
            case HTTP_EVENT_HEADER_SENT:
                ESP_LOGD(MCP_API_TAG, "HTTP_EVENT_HEADER_SENT");
                break;
            case HTTP_EVENT_ON_HEADER:
                ESP_LOGD(MCP_API_TAG, "HTTP_EVENT_ON_HEADER, key=%s, value=%s", evt->header_key, evt->header_value);
                if (strcmp(evt->header_key,"Set-Cookie")==0) {
                    strcpy(auth_cookie, evt->header_value);
                }
                break;
            case HTTP_EVENT_ON_DATA:
                ESP_LOGD(MCP_API_TAG, "HTTP_EVENT_ON_DATA, len=%d", evt->data_len);
                // if (!esp_http_client_is_chunked_response(evt->client)) {
                //     printf("%.*s", evt->data_len, (char*)evt->data);
                // }

                break;
            case HTTP_EVENT_ON_FINISH:
                ESP_LOGD(MCP_API_TAG, "HTTP_EVENT_ON_FINISH");
                break;
            case HTTP_EVENT_DISCONNECTED:
                ESP_LOGD(MCP_API_TAG, "HTTP_EVENT_DISCONNECTED");
                break;
        }
        return ESP_OK;
    }

void client_init() {
    config.event_handler = _http_event_handle;
    config.cert_pem = server_root_cert_pem;
    config.url = WEB_URL;

    client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Connection", "keep-alive");

}


int execute_request(char* api_url, char* api_request_object, esp_http_client_method_t method)
{
    char url[strlen(api_url) + strlen(WEB_URL) + 1] = {'\0'};
    strcat(url, WEB_URL);
    strcat(url, api_url);
    ESP_LOGI(MCP_API_TAG, "Request URL: %s",url);

    esp_http_client_set_url(client, url);

    // esp_http_client_config_t config = {
    //     url : url,
    //     event_handler : _http_event_handle,
    //     // .query = ""
    //     cert_pem : server_root_cert_pem,
    // };


    esp_http_client_set_method(client, method);
    esp_http_client_set_header(client, "Content-Type", "application/x-www-form-urlencoded");
    esp_http_client_set_header(client, "Host", WEB_SERVER);
    esp_http_client_set_header(client, "Cookie", auth_cookie);



    esp_err_t err = esp_http_client_perform(client);

    if (err == ESP_OK) {
        ESP_LOGI(MCP_API_TAG, "Request OK");
        if (method == HTTP_METHOD_GET) {
        int content_length = esp_http_client_get_content_length(client);
        ESP_LOGI(MCP_API_TAG, "Status = %d, content_length = %d",
                esp_http_client_get_status_code(client),
                content_length);
        return content_length+2;
        }
        else {
            return 0;
        }
    }
    return -1;
}

void get_response(char* buffer, int len) {
    int read_status = esp_http_client_read(client, buffer, len);
    ESP_LOGI(MCP_API_TAG, "%s",buffer);
    // esp_http_client_cleanup(client);
}

void cleanup() {
    esp_http_client_cleanup(client);
}

static void authenticate_with_contact_credentials()
{
    execute_request("/api/login?email=" CONFIG_USERNAME "&password=" CONFIG_PASSWORD, "test", HTTP_METHOD_POST);
    ESP_LOGI(MCP_API_TAG, "Auth Cookie: %s", auth_cookie);
    // cleanup();
}

static void get_users()
{
    execute_request("/api/users?q","", HTTP_METHOD_GET);
    // cleanup();
}

int get_user_by_NFC(char* nfcID)
{
    char* base_url = "/api/users?q=";
    char url[strlen(base_url) + strlen(nfcID) + 1] = {'\0'};
    strcpy(url, base_url);
    // ESP_LOGI(MCP_API_TAG, "%s",url);
    strcat(url, nfcID);
    // ESP_LOGI(MCP_API_TAG, "%s",url);
    return execute_request(url,"", HTTP_METHOD_GET);
}

static void post_log(char* message, char* userID, char* nfcID, char* type) {
    // char* base_url = "/api/log?message=test&userID=14&nfcID=04D76B1A8F4980&type=deny";
    char* base_url = "/api/log?";
    char url[strlen(base_url) + strlen(message) + strlen(userID) + strlen(nfcID) + strlen(type) + 30] = {'\0'};
    strcpy(url, base_url);
    // // ESP_LOGI(MCP_API_TAG, "%s",url);
    if(strlen(message) > 0) {
        strcat(url,"message=");
        strcat(url, message); 
    }
    if(strlen(userID) > 0) {
        strcat(url, "&userID=");
        strcat(url, userID);    
    }
    if(strlen(nfcID) > 0) {
        strcat(url, "&nfcID=");
        strcat(url, nfcID);       
    }
    if(strlen(type) > 0) {
        strcat(url, "&type=");
        strcat(url, type);
    }
    // // ESP_LOGI(MCP_API_TAG, "%s",url);
    // int len = execute_request(url,"", HTTP_METHOD_POST);
    // esp_http_client_close(client);
    // cleanup();
}

#endif
