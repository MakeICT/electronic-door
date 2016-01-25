#include "rs485.h"
//#define DEBUG1

rs485::rs485 (uint8_t serial_dir) {
  serDir = serial_dir;
  pinMode(serial_dir, OUTPUT);    
  
  digitalWrite(serial_dir, RS485Receive);  // Init Transceiver   
  
  // Start the serial port, to another device
  Serial.begin(RS485_BAUD);   // set the data rate 
}

void rs485::SetDebugPort(SoftwareSerial* port)  {
  debugPort = port;
}

int rs485::Send(uint8_t* data, uint8_t len) {
  LOG_DEBUG(F("rs485.send called"));
  digitalWrite(serDir, RS485Transmit);  // Enable RS485 Transmit   
  delay(10);
  Serial.write(FLAG);
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
  Send(&data);
}

byte rs485::Receive() {
  byte byteReceived;
  Serial.readBytes(&byteReceived, 1);    // Read received byte
  return byteReceived;
}

int rs485::Available() {
  return Serial.available();
}
