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

  digitalWrite(serDir, RS485Transmit);  // Enable RS485 Transmit   

  delay(10);
  Serial.write(FLAG);
  //debugPort->print(FLAG);
  //debugPort->print(' ');
  for (uint8_t sByte = 0; sByte < len; sByte ++)  {
      if (data[sByte] == FLAG || data[sByte] == ESCAPE)
      {
          Serial.write(ESCAPE);            // Add escape byte
          //debugPort->print(ESCAPE);
          //debugPort->print(' ');

      }
      Serial.write(data[sByte]);          // Send byte to bus
      //debugPort->print(data[sByte]);
      //debugPort->print(' ');
  }
  Serial.write(FLAG);
  //debugPort->println(FLAG);
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
