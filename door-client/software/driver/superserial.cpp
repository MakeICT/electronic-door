#include "superserial.h"
//#define DEBUG1


SuperSerial::SuperSerial (rs485* b, byte addr) {
  LOG_DUMP(F("SuperSerial::SuperSerial()\r\n"));
  this->bus = b;
  this->deviceAddress = addr;
  this->newMessage = false;
  this->responsePacket.SetDestAddr(ADDR_MASTER);
  this->responsePacket.SetSrcAddr(this->deviceAddress);
}

void SuperSerial::SetDebugPort(SoftwareSerial* port)  {
  LOG_DUMP(F("SuperSerial::SetDebugPort()\r\n"));
  debugPort = port;
}

bool SuperSerial::NewMessage()  {
  LOG_DUMP(F("SuperSerial::NewMessage()\r\n"));
  return newMessage;
}

bool SuperSerial::DataQueued()  {
  LOG_DUMP(F("SuperSerial::DataQueued()\r\n"));
  return this->dataQueued;
}

void SuperSerial::Update()  {
  LOG_DUMP(F("SuperSerial::Update()\r\n"));
  this->GetPacket();
}

Message SuperSerial::GetMessage()  {
  LOG_DUMP(F("SuperSerial::GetMessage()\r\n"));
  this->newMessage = false;
  return this->receivedPacket.Msg();
}

bool SuperSerial::GetPacket() {
  LOG_DUMP(F("SuperSerial::GetPacket()\r\n"));
  static uint8_t packetIndex = 0;
  static boolean escaping = false;
  for (int i = bus->Available(); i > 0; i--)  {
    byte byteReceived = bus->Receive();    // Read received byte
    if (byteReceived == ESCAPE && !escaping) {
      escaping = true;
    }
    else if(byteReceived == FLAG && !escaping)  {
      LOG_DEBUG(F("==============================\r\n"));
      byte receivedBytes = packetIndex;
      packetIndex = 0;
      if (receivedBytes >= P_H_F_LENGTH)  {
        this->receivedPacket.SetTransID(currentPacket[0]);
        this->receivedPacket.SetSrcAddr(currentPacket[1]);
        this->receivedPacket.SetDestAddr(currentPacket[2]);
  
        if (this->receivedPacket.DestAddr() == this->deviceAddress || 
            this->receivedPacket.DestAddr() == ADDR_BROADCAST)  {
          LOG_DEBUG(F("Verifying new packet\r\n"));
          if (receivedPacket.VerifyCRC())  {    //verify CRC
            if (currentPacket[3] == F_GET_UPDATE)   {
              if (this->DataQueued())  {
                LOG_INFO(F("Sending Update\r\n"));
                this->SendPacket(&this->queuedPacket);
                this->dataQueued = false;
              }
              else  {
                LOG_DEBUG(F("Sending NOP\r\n"));
                this->SendNOP(this->receivedPacket.TransID());
              }
              return false;
            }
            // Save message content from packet
            this->receivedPacket.SetMsg(currentPacket[3], currentPacket ,currentPacket[4], P_H_LENGTH);
            this->newMessage = true;
            SendACK(this->receivedPacket.TransID());
            LOG_INFO(F("Got valid packet\r\n"));
            return true;
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
  LOG_DUMP(F("SuperSerial::QueueMessage()\r\n"));
  LOG_INFO(F("Update Queued\r\n"));
  //TODO: Currently only supports queueing one message
  this->queuedPacket.SetMsg(function, payload, length);
  this->queuedPacket.SetDestAddr(ADDR_MASTER);
  this->queuedPacket.SetSrcAddr(this->deviceAddress);
  this->dataQueued = true;
}

void SuperSerial::ReplyToQuery(byte transID)  {
  LOG_DUMP(F("SuperSerial::ReplyToQuery()\r\n"));
  queuedPacket.SetTransID(transID);
  SendPacket(&queuedPacket);
  this->dataQueued = false;
}

void SuperSerial::SendPacket(Packet* p)  {
  LOG_DUMP(F("SuperSerial::SendPacket()\r\n"));
  p->SetCRC();
  byte array[p->EscapedSize()];
  p->ToEscapedArray(array);
  bus->Send(array, p->EscapedSize());
}

inline void SuperSerial::SendControl(byte function, byte transID)  {
  LOG_DUMP(F("SuperSerial::SendACK()\r\n"));
  responsePacket.SetMsg(function, NULL, 0);
  responsePacket.SetTransID(transID);
  return SendPacket(&responsePacket);
}

inline void SuperSerial::SendACK(byte transID)  {
  LOG_DUMP(F("SuperSerial::SendACK()\r\n"));
  return SendControl(F_ACK, transID);
}

inline void SuperSerial::SendNAK(byte transID)  {
  LOG_DUMP(F("SuperSerial::SenNAK()\r\n"));
  return SendControl(F_NAK, transID);
}

inline void SuperSerial::SendNOP(byte transID)  {
  LOG_DUMP(F("SuperSerial::SendNOP()\r\n"));
  return SendControl(F_NOP, transID);
}
