#include "serial.h"

rs485::rs485 (uint8_t serial_rx, uint8_t serial_tx, uint8_t serial_dir) {
  ser_dir = serial_dir;
  RS485Serial = new SoftwareSerial(serial_rx, serial_tx);
   pinMode(serial_dir, OUTPUT);    
  
  digitalWrite(serial_dir, RS485Receive);  // Init Transceiver   
  
  // Start the software serial port, to another device
  RS485Serial->begin(9600);   // set the data rate 
}

int rs485::send(uint8_t* data, uint8_t len) {
  //Serial.println("serial::send() started");

  digitalWrite(ser_dir, RS485Transmit);  // Enable RS485 Transmit   

  delay(10);
  for (uint8_t sByte = 0; sByte < len; sByte ++)  {
    if (sByte == FLAG || sByte == ESCAPE)
      RS485Serial->write(ESCAPE);          // Send byte to Remote Arduino
    RS485Serial->write(data[sByte]);          // Send byte to Remote Arduino
  }

  digitalWrite(ser_dir, RS485Receive);  // Disable RS485 Transmit       

  delay(20);
  //Serial.println("serial::send() finished");
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

void rs485::get_packet() {
 // get_packet();
}

void rs485::send_packet(uint8_t source_addr, uint8_t dest_addr, uint8_t* payload, uint8_t len)  {
  //TODO: add byte stuffing
  //Serial.println("serial::send_packet() started");

  uint8_t flag = FLAG;
  uint8_t pos = 0;
  uint8_t packet_len = len + 5;
  uint8_t packet[packet_len];
  packet[pos++] = source_addr;
  packet[pos++] = dest_addr;
  packet[pos++] = len;    //TODO:Payload length or Packet Length

  for (uint8_t i = 0; i < len; i++)  {
    packet[pos++] =  payload[i];
  }
  packet[pos++] = compute_CRC(packet, packet_len);
  this->send(&flag);
  this->send(packet, packet_len);
  this->send(&flag);

  //Serial.println("serial::send_packet() finished"); 
}

uint8_t rs485::compute_CRC(uint8_t* data, uint8_t len)
{
  //TODO: implement 16 bit CRC
  return 0xFF;
}

