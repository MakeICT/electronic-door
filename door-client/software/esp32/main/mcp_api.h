#ifndef MCP_API_H
#define MCP_API_H

#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"

#include "esp_http_client.h"

static const char *MCP_API_TAG = "mcp_api";

#define WEB_SERVER CONFIG_SERVER ":" CONFIG_PORT
#define WEB_URL "https://" WEB_SERVER
#define AUTH_ENDPOINT WEB_URL "/api/login"

extern const char server_root_cert_pem[] asm("_binary_server_root_cert_pem_start");

static const char *REQUEST = "POST " AUTH_ENDPOINT "?email=" CONFIG_USERNAME "&password=" CONFIG_PASSWORD "\r\n"
    "Host: " WEB_SERVER "\r\n"
    "Content-Type: application/x-www-form-urlencoded\r\n"
    "\r\n";

char auth_cookie[77];

void execute_request(char* api_url, char* api_request_object, int method)
{
    char url[strlen(api_url) + strlen(WEB_URL)];
    strcat(url, WEB_URL);
    strcat(url, api_url);
    ESP_LOGI(MCP_API_TAG, "Request URL: %s",url);

    esp_err_t _http_event_handle(esp_http_client_event_t *evt)
    {
        switch(evt->event_id) {
            case HTTP_EVENT_ERROR:
                ESP_LOGI(MCP_API_TAG, "HTTP_EVENT_ERROR");
                break;
            case HTTP_EVENT_ON_CONNECTED:
                ESP_LOGI(MCP_API_TAG, "HTTP_EVENT_ON_CONNECTED");
                break;
            case HTTP_EVENT_HEADER_SENT:
                ESP_LOGI(MCP_API_TAG, "HTTP_EVENT_HEADER_SENT");
                break;
            case HTTP_EVENT_ON_HEADER:
                ESP_LOGI(MCP_API_TAG, "HTTP_EVENT_ON_HEADER, key=%s, value=%s", evt->header_key, evt->header_value);
                if (strcmp(evt->header_key,"Set-Cookie")==0) {
                    strcpy(auth_cookie, evt->header_value);
                }
                break;
            case HTTP_EVENT_ON_DATA:
                ESP_LOGI(MCP_API_TAG, "HTTP_EVENT_ON_DATA, len=%d", evt->data_len);
                if (!esp_http_client_is_chunked_response(evt->client)) {
                    printf("%.*s", evt->data_len, (char*)evt->data);
                }

                break;
            case HTTP_EVENT_ON_FINISH:
                ESP_LOGI(MCP_API_TAG, "HTTP_EVENT_ON_FINISH");
                break;
            case HTTP_EVENT_DISCONNECTED:
                ESP_LOGI(MCP_API_TAG, "HTTP_EVENT_DISCONNECTED");
                break;
        }
        return ESP_OK;
    }

    esp_http_client_config_t config = {
        .url = url,
        .event_handler = _http_event_handle,
        // .query = ""
        .cert_pem = server_root_cert_pem,
    };
    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_method(client, method);
    esp_http_client_set_header(client, "Content-Type", "application/x-www-form-urlencoded");
    esp_http_client_set_header(client, "Host", WEB_SERVER);
    esp_http_client_set_header(client, "Cookie", auth_cookie);


    esp_err_t err = esp_http_client_perform(client);

    if (err == ESP_OK) {
        int response_length = esp_http_client_get_content_length(client);
        ESP_LOGI(MCP_API_TAG, "Status = %d, content_length = %d",
                esp_http_client_get_status_code(client),
                esp_http_client_get_content_length(client));
        char response[response_length];
        int read_status = esp_http_client_read(client, response, response_length);
        ESP_LOGI(MCP_API_TAG, "read returned: %d",read_status);
        if (response_length > 0) {
            ESP_LOGI(MCP_API_TAG, "%s",response);
        }
    }
    esp_http_client_cleanup(client);
}

static void authenticate_with_contact_credentials()
{
    execute_request("/api/login?email=" CONFIG_USERNAME "&password=" CONFIG_PASSWORD, "test", HTTP_METHOD_POST);
    ESP_LOGI(MCP_API_TAG, "Auth Cookie: %s", auth_cookie);
}

static void get_users()
{
    execute_request("/api/users?q","", HTTP_METHOD_GET);
}

#endif
