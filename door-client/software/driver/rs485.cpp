#include "rs485.h"

#define RS485Transmit    HIGH
#define RS485Receive     LOW

rs485::rs485 (uint8_t serial_rx, uint8_t serial_tx, uint8_t serial_dir) {
  ser_dir = serial_dir;
  RS485Serial = new SoftwareSerial(serial_rx, serial_tx);
   pinMode(serial_dir, OUTPUT);    
  
  digitalWrite(serial_dir, RS485Receive);  // Init Transceiver   
  
  // Start the software serial port, to another device
  RS485Serial->begin(9600);   // set the data rate 
}

int rs485::send(uint8_t* data, uint8_t len) {
  digitalWrite(ser_dir, RS485Transmit);  // Enable RS485 Transmit   
  delay(10);
  RS485Serial->write(data, len);          // Send byte to Remote Arduino
  delay(20);
  digitalWrite(ser_dir, RS485Receive);  // Disable RS485 Transmit       
}

rs485::~rs485() {
  
}

char rs485::receive() {
  char byteReceived = RS485Serial->read();    // Read received byte
  return byteReceived;
}

int rs485::available() {
  return RS485Serial->available();
}

