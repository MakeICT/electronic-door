#include "superserial.h"
//#define DEBUG1


SuperSerial::SuperSerial (rs485* b, byte addr) {
  this->bus = b;
  this->deviceAddress = addr;
  this->newMessage = false;
  this->responsePacket.SetDestAddr(ADDR_MASTER);
  this->responsePacket.SetSrcAddr(this->deviceAddress);
}

void SuperSerial::SetDebugPort(SoftwareSerial* port)  {
  debugPort = port;
}

bool SuperSerial::NewMessage()  {
  return newMessage;
}

bool SuperSerial::DataQueued()  {
  return this->dataQueued;
}

void SuperSerial::Update()  {
  this->GetPacket();
}

Message SuperSerial::GetMessage()  {
  this->newMessage = false;
  return this->message;
}

byte SuperSerial::GetPacket() {
  LOG_DEBUG(F("SuperSerial::GetPacket()\r\n"));
  static uint8_t packetIndex = 0;
  static uint8_t escape_count = 0;
  static boolean escaping = false;
  for (int i = bus->Available(); i > 0; i--)  {
    byte byteReceived = bus->Receive();    // Read received byte
    if (byteReceived == ESCAPE && !escaping) {
      escaping = true;
      escape_count++;
    }
    else if(byteReceived == FLAG && !escaping)  {
      LOG_DEBUG(F("=============================="));
      byte receivedBytes = packetIndex;
      byte escapes = escape_count;
      escape_count = 0;
      packetIndex = 0;
      if (receivedBytes >= P_H_F_LENGTH)  {
        uint8_t transactionID = currentPacket[0];
        uint8_t srcAddress = currentPacket[1];
        uint8_t dstAddress = currentPacket[2];
  
        if (dstAddress == this->deviceAddress || dstAddress == ADDR_BROADCAST)  {
          LOG_DEBUG(F("Verifying new packet\r\n"));
          if (ComputeCRC(currentPacket, receivedBytes) == 0xFFFF  )  {    //verify CRC //TODO: this is fake
            this->currentTransaction = transactionID;   //TODO: fix this ugly hack
            if (currentPacket[3] == F_GET_UPDATE)   {
              if (this->DataQueued())  {
                LOG_INFO(F("Sending Update\r\n"));
                this->SendPacket(&this->queuedPacket);
                this->dataQueued = false;
              }
              else  {
                LOG_DEBUG(F("Sending NOP\r\n"));
                this->SendNOP(currentTransaction);
              }
              return false;
            }
            // Save message content from packet
            this->message.function = currentPacket[3];
            this->message.length = currentPacket[4];
            for (int i = 0; i < message.length; i++)  {
              message.payload[i] = currentPacket[i+P_H_LENGTH];
            }
            newMessage = true;
            SendACK(currentTransaction);
            LOG_INFO(F("Got valid packet\r\n"));
            return receivedBytes;
            }
          }
          else  {
            SendNAK(0);
          }
      }
    }
    else  {
      currentPacket[packetIndex++] = byteReceived;
      LOG_DEBUG(F("rcv: "));
      LOG_DEBUG(byteReceived);
      LOG_DEBUG(F("\r\n"));
      escaping = false; 
    }
  }
  return false;
}

void SuperSerial::QueueMessage(byte function, byte* payload, byte length)  {
  LOG_DEBUG(F("SuperSerial.QueueMessage() called\r\n"));
  LOG_INFO(F("Update Queued\r\n"));
  //TODO: Currently only supports queueing one message
  this->queuedPacket.SetMsg(function, payload, length);
  this->queuedPacket.SetDestAddr(ADDR_MASTER);
  this->queuedPacket.SetSrcAddr(this->deviceAddress);
  this->dataQueued = true;
}

void SuperSerial::ReplyToQuery(byte transID)  {
  queuedPacket.SetTransID(transID);
  SendPacket(&queuedPacket);
  this->dataQueued = false;
}

void SuperSerial::SendPacket(Packet* p)  {
  LOG_DEBUG(F("SuperSerial.SendPacket called"));
  p->ComputeCRC();
  byte array[p->EscapedSize()];
  p->ToEscapedArray(array);
  bus->Send(array, p->EscapedSize());
}

inline void SuperSerial::SendACK(byte transID)  {
  responsePacket.SetMsg(F_ACK, NULL, 0);
  responsePacket.SetTransID(transID);
  return SendPacket(&responsePacket);
}

inline void SuperSerial::SendNAK(byte transID)  {
  responsePacket.SetMsg(F_NAK, NULL, 0);
  responsePacket.SetTransID(transID);
  return SendPacket(&responsePacket);
}

inline void SuperSerial::SendNOP(byte transID)  {
  responsePacket.SetMsg(F_NOP, NULL, 0);
  responsePacket.SetTransID(transID);
  return SendPacket(&responsePacket);
}

uint16_t SuperSerial::ComputeCRC(uint8_t* data, uint8_t len)
{
  //this part is borrowed from somewhere....
  //TODO: implement 16 bit CRC
  //return 0xFFFF;
  // Compute the MODBUS RTU CRC
  uint16_t crc = 0xFFFF;
 
  for (int pos = 0; pos < len; pos++) {
    crc ^= (uint16_t)data[pos];          // XOR byte into least sig. byte of crc
 
    for (int i = 8; i != 0; i--) {    // Loop over each bit
      if ((crc & 0x0001) != 0) {      // If the LSB is set
        crc >>= 1;                    // Shift right and XOR 0xA001
        crc ^= 0xA001;
      }
      else                            // Else LSB is not set
        crc >>= 1;                    // Just shift right
    }
  }
  // Note, this number has low and high bytes swapped, so use it accordingly (or swap bytes)
  //return crc;
  return 0xFFFF;  
}


