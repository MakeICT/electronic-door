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

byte rs485::Send(uint8_t* data, uint8_t len) {
  //TODO: check time since last data seen on bus
  //      if time is greater than x attempt to send data
  //      check that same data is read after sending
  //      if not, wait rand(y) ms before attempting
  //      repeat these steps, doubling y after each collision
  //      finished when send is successful
  LOG_DEBUG(F("rs485::Send()\r\n"));
//  if (this->lastRcv - millis() > T_MIN_WAIT && !this->Available())  {
  if (this->lastRcv - millis() > T_MIN_WAIT)  {
    while (Serial.available())  {
      Serial.read();    //flush buffer
    }
    digitalWrite(serDir, RS485Transmit);  // Enable RS485 Transmit   
    delay(20);
    if(Serial.available())  {
      LOG_DEBUG(F("Bus is busy, aborting send to avoid collision"));
      return ERR_BUSY_BUS;
    }
    Serial.write(B_START);
    LOG_DEBUG(F("Sending: "));
    LOG_DEBUG(B_START);
    LOG_DEBUG(' ');
    for (uint8_t sByte = 0; sByte < len; sByte ++)  {
        Serial.write(data[sByte]);          // Send byte to bus
        LOG_DEBUG(data[sByte]);
        LOG_DEBUG(' ');
    }
    Serial.write(B_STOP);
    LOG_DEBUG(B_STOP);
    LOG_DEBUG(F("\r\n"));
    delay(20);
    digitalWrite(serDir, RS485Receive);  // Disable RS485 Transmit 
    
    //Check for collisions
    if(Serial.available() == len + 2)  {
      if (this->Receive() != B_START)  {
          LOG_ERROR(F("ERROR: Collision1\r\n"));
          return ERR_COLLISION;
      }
      for (int i = 0; i < len; i++)  {
        if(data[i] != this->Receive())  {
          LOG_ERROR(F("ERROR: Collision2\r\n"));
          return ERR_COLLISION;
        }
      }
      if (this->Receive() != B_STOP)  {
          LOG_ERROR(F("ERROR: Collision3\r\n"));
          return ERR_COLLISION;
      }
      LOG_INFO(F("Successfully sent packet\r\n"));
      return 0;
    }
    else if (Serial.available() > len + 2)  {
      LOG_ERROR(F("ERROR: Collision4\r\n"));
      return ERR_COLLISION;
    }
    
    else  {
      LOG_DEBUG(Serial.available());
      LOG_DEBUG(F(" bytes read is less than "));
      LOG_DEBUG(len + 2);
      LOG_DEBUG(F(" bytes written"));
      LOG_DEBUG(F("\r\n"));
      LOG_ERROR(F("ERROR: Lost Data\r\n"));
      return ERR_LOSTDATA;
    }
  }
  else  {
    LOG_DEBUG("NOT SENDING PACKET!!!/r/n");
    return ERR_BUSY_BUS;
  }
}

inline int rs485::Send(uint8_t data) {
  LOG_DEBUG(F("rs485::Send()\r\n"));
  this->Send(&data);
}

byte rs485::Receive() {
  LOG_DUMP(F("rs485::Receive\r\n"));
  this->lastRcv = millis();
  byte byteReceived;
  Serial.readBytes(&byteReceived, 1);    // Read received byte
  return byteReceived;
}

int rs485::Available() {
  LOG_DUMP(F("rs485::Available()\r\n"));
  return Serial.available();
}
