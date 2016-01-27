#include "rs485.h"
//#define DEBUG1


// initialize the serial port connected to the RS485 adapter
rs485::rs485 (uint8_t serial_dir) {
  LOG_DUMP(F("rs485::rs485()\r\n"));
  this->serDir = serial_dir;
  pinMode(serial_dir, OUTPUT);    
  digitalWrite(serial_dir, RS485Receive);  // Init Transceiver   
  Serial.begin(RS485_BAUD);   // set the data rate 
}

void rs485::SetDebugPort(SoftwareSerial* port)  {
  LOG_DUMP(F("rs485::SetDebugPort()\r\n"));
  debugPort = port;
}

int rs485::Send(uint8_t* data, uint8_t len) {
  LOG_DUMP(F("rs485::Send()\r\n"));

  //TEST
  //delay(1500);
  digitalWrite(serDir, RS485Transmit);  // Enable RS485 Transmit   
  delay(20);
  Serial.write(FLAG);
  LOG_DEBUG(F("Sending: "));
  LOG_DEBUG(FLAG);
  LOG_DEBUG(' ');
  for (uint8_t sByte = 0; sByte < len; sByte ++)  {
      Serial.write(data[sByte]);          // Send byte to bus
      LOG_DEBUG(data[sByte]);
      LOG_DEBUG(' ');
  }
  Serial.write(FLAG);
  LOG_DEBUG(FLAG);
  LOG_DEBUG(F("\r\n"));
  delay(20);
  digitalWrite(serDir, RS485Receive);  // Disable RS485 Transmit       
}

inline int rs485::Send(uint8_t data) {
  LOG_DUMP(F("rs485::Send()\r\n"));
  Send(&data);
}

byte rs485::Receive() {
  LOG_DUMP(F("rs485::Receive\r\n"));
  byte byteReceived;
  Serial.readBytes(&byteReceived, 1);    // Read received byte
  return byteReceived;
}

int rs485::Available() {
  LOG_DUMP(F("rs485::Available()\r\n"));
  return Serial.available();
}
