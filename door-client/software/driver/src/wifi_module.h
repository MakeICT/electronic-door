#ifndef WIFI_MODULE
#define WIFI_MODULE

#include "module.h"

class WiFi : public Module {
  public:
    WiFi(uint8_t pin);
    bool Init();
    void Update();
    void SendRaw(const char* c);
    bool ReceiveLn(char* line, uint8_t len);
    bool IsAlive();
    bool OK();

    int8_t GetWiFiMode();
    bool SetWiFiMode(uint8_t mode);
  private:
    uint8_t chpdPin;

};

#endif
