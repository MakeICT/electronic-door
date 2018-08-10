#ifndef MCP_API_H
#define MCP_API_H

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"

static const char *MCP_API_TAG = "mcp_api";

#define WEB_SERVER CONFIG_SERVER ":" CONFIG_PORT
#define WEB_URL "https://" WEB_SERVER
#define AUTH_ENDPOINT WEB_URL "/api/login"


// char* PROTOCOL = "https://"; 
// char* ENDPOINT = "/api/login";


extern const uint8_t server_root_cert_pem_start[] asm("_binary_server_root_cert_pem_start");
extern const uint8_t server_root_cert_pem_end[]   asm("_binary_server_root_cert_pem_end");

static const char *REQUEST = "POST " AUTH_ENDPOINT "?email=" CONFIG_USERNAME "&password=" CONFIG_PASSWORD "\r\n"
    "Host: " WEB_SERVER "\r\n"
    "Content-Type: application/x-www-form-urlencoded\r\n"
    "\r\n";


static void authenticate_with_contact_credentials()
{
    char buf[512];
    int ret, len;

    while(1) {
        esp_tls_cfg_t cfg = {
            .cacert_pem_buf  = server_root_cert_pem_start,
            .cacert_pem_bytes = server_root_cert_pem_end - server_root_cert_pem_start,
        };
        
        struct esp_tls *tls = esp_tls_conn_http_new(WEB_URL, &cfg);
        
        if(tls != NULL) {
            ESP_LOGI(MCP_API_TAG, "Connection established...");
        } else {
            ESP_LOGE(MCP_API_TAG, "Connection failed...");
            goto exit;
        }
        
        size_t written_bytes = 0;
        do {
            ret = esp_tls_conn_write(tls, 
                                     REQUEST + written_bytes, 
                                     strlen(REQUEST) - written_bytes);
            ESP_LOGI(MCP_API_TAG, "REQUEST");
            for(int i = 0; i < strlen(REQUEST); i++) {
                putchar(REQUEST[i]);
            }
            if (ret >= 0) {
                ESP_LOGI(MCP_API_TAG, "%d bytes written", ret);
                written_bytes += ret;
            } else if (ret != MBEDTLS_ERR_SSL_WANT_READ  && ret != MBEDTLS_ERR_SSL_WANT_WRITE) {
                ESP_LOGE(MCP_API_TAG, "esp_tls_conn_write  returned 0x%x", ret);
                goto exit;
            }
        } while(written_bytes < strlen(REQUEST));

        ESP_LOGI(MCP_API_TAG, "Reading HTTP response...");

        do
        {
            len = sizeof(buf) - 1;
            bzero(buf, sizeof(buf));
            ret = esp_tls_conn_read(tls, (char *)buf, len);

            if(ret == MBEDTLS_ERR_SSL_WANT_WRITE  || ret == MBEDTLS_ERR_SSL_WANT_READ)
                continue;
            
            if(ret < 0)
           {
                ESP_LOGE(MCP_API_TAG, "esp_tls_conn_read  returned -0x%x", -ret);
                break;
            }

            if(ret == 0)
            {
                ESP_LOGI(MCP_API_TAG, "connection closed");
                break;
            }

            len = ret;
            ESP_LOGD(MCP_API_TAG, "%d bytes read", len);
            /* Print response directly to stdout as it is read */
            for(int i = 0; i < len; i++) {
                putchar(buf[i]);
            }
        } while(1);

    exit:
        esp_tls_conn_delete(tls);    
        putchar('\n'); // JSON output doesn't have a newline at end

        static int request_count;
        ESP_LOGI(MCP_API_TAG, "Completed %d requests", ++request_count);

        // for(int countdown = 10; countdown >= 0; countdown--) {
        //     ESP_LOGI(MCP_API_TAG, "%d...", countdown);
        //     vTaskDelay(1000 / portTICK_PERIOD_MS);
        // }
        vTaskDelete(NULL);
        ESP_LOGI(MCP_API_TAG, "Starting again!");
    }
}

#endif
