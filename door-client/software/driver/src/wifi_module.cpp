#include "wifi_module.h"

WiFi::WiFi(uint8_t pin)  {
  this->chpdPin = pin;
}

bool WiFi::Init()  {
  digitalWrite(this->chpdPin, LOW);
  delay(500);
  digitalWrite(this->chpdPin, HIGH);
  delay(500);
  Serial.begin(115200);
  while(!Serial);
  return true;
}

void WiFi::Update()  {

}

bool WiFi::IsAlive()  {
  Serial.print("AT\r\n");
  while (!Serial.available());
  return this->OK();
}

bool WiFi::ReceiveLn(char* line, uint8_t len=64)  {
  if (Serial.available())  {
    Serial.readBytesUntil('\n', line, len);
    return true;
  }
  else
    return false;
}

bool WiFi::OK()  {
  char buffer[64] = {'\0'};
  while (!this->ReceiveLn(buffer))
    this->ReceiveLn(buffer);
  if (buffer[0] == 'O' && buffer[1] == 'K')
    return true;
  return false;
}

void WiFi::SendRaw(const char* c)  {
  Serial.print(c);
}

int8_t WiFi::GetWiFiMode()  {
  this->SendRaw("AT+CWMODE?\r\n");
  char buffer[64] = {'\0'};
  delay(10);
  while (!this->ReceiveLn(buffer))
    this->ReceiveLn(buffer);
  while (!this->ReceiveLn(buffer))
    this->ReceiveLn(buffer);
  uint8_t mode = buffer[8] - '0';
  if (this->OK())
    return mode;
  else
    return -1;
}

bool WiFi::SetWiFiMode(uint8_t mode)  {
  switch (mode)
  {
    case 1: this->SendRaw("AT+CWMODE=1\r\n"); break;
    case 2: this->SendRaw("AT+CWMODE=2\r\n"); break;
    case 3: this->SendRaw("AT+CWMODE=3\r\n"); break;
  }

  return (this->OK());
}
