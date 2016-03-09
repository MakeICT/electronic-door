#include "rs485.h"
//#define DEBUG1


// initialize the serial port connected to the RS485 adapter
rs485::rs485 (uint8_t serial_dir) {
  LOG_DUMP(F("rs485::rs485()\r\n"));
  this->serDir = serial_dir;
  pinMode(serial_dir, OUTPUT);    
  digitalWrite(serial_dir, RS485Receive);  // Init Transceiver   
  Serial.begin(RS485_BAUD);   // set the data rate 
  this->queueLength = 0;
  this->queueMax =1;
}

void rs485::SetDebugPort(SoftwareSerial* port)  {
  LOG_DUMP(F("rs485::SetDebugPort()\r\n"));
  debugPort = port;
}

byte rs485::Queue(uint8_t* data, uint8_t len)  {
  for(int i = 0; i < len; i++)
    this->queuedPacket[i] = data[i];
  this->queueLength +=1; 
  this->Send(queuedPacket, len);
}

byte rs485::Send(uint8_t* data, uint8_t len) {
  //TODO: check time since last data seen on bus
  //      if time is greater than x attempt to send data
  //      check that same data is read after sending
  //      if not, wait rand(y) ms before attempting
  //      repeat these steps, doubling y after each collision
  //      finished when send is successful
  LOG_DUMP(F("rs485::Send()\r\n"));
  if (this->lastRcv - millis() > T_MIN_WAIT && !this->Available())  {
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
    
    //Check for collisions
    if(Serial.available() == len + 2)  {
      if (this->Receive() != FLAG)  {
          LOG_ERROR(F("ERROR: Collision1\r\n"));
          return ERR_COLLISION;
      }
      for (int i = 0; i < len; i++)  {
        if(data[i] != this->Receive())  {
          LOG_ERROR(F("ERROR: Collision2\r\n"));
          return ERR_COLLISION;
        }
      }
      if (this->Receive() != FLAG)  {
          LOG_ERROR(F("ERROR: Collision3\r\n"));
          return ERR_COLLISION;
      }
      this->queueLength -= 1;
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
      LOG_DEBUG(F("bytes written"));
      LOG_DEBUG(F("\r\n"));
      LOG_ERROR(F("ERROR: Lost Data\r\n"));
      return ERR_LOSTDATA;
    }

  }
}

inline int rs485::Send(uint8_t data) {
  LOG_DUMP(F("rs485::Send()\r\n"));
  Send(&data);
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

bool rs485::QueueFull()  {
  if (this->queueLength < this->queueMax)
    return false;
  else
    return true;
}
