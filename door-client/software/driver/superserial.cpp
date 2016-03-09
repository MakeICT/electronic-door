#include "superserial.h"
//#define DEBUG1


SuperSerial::SuperSerial (rs485* b, byte addr) {
  LOG_DUMP(F("SuperSerial::SuperSerial()\r\n"));
  this->bus = b;
  this->deviceAddress = addr;
  this->newMessage = false;
  this->responsePacket.SetDestAddr(ADDR_MASTER);
  this->responsePacket.SetSrcAddr(this->deviceAddress);
  this->currentTransaction = 124;
  
  //TODO: make this configurable
  this->retryTimeout = 100;
  this->maxRetries = 3;
}

void SuperSerial::SetDebugPort(SoftwareSerial* port)  {
  LOG_DUMP(F("SuperSerial::SetDebugPort()\r\n"));
  debugPort = port;
  queuedPacket.SetDebugPort(debugPort);
  receivedPacket.SetDebugPort(debugPort);
  responsePacket.SetDebugPort(debugPort);
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
  if (this->dataQueued && this->lastPacketSend > this->retryTimeout)  {
    if (this->retryCount < this->maxRetries)  {  
      LOG_DEBUG(F("Timed out waiting for response: resending last packet\r\n"));
      this->retryCount++;
      this->SendPacket(&queuedPacket);
    }
    else  {
      LOG_ERROR(F("Failed to receive response after max retries\r\n"));
      this->retryCount = 0;
      this->dataQueued = false;
    }
  }
  //TODO: check if any messages have failed to send
}

Message SuperSerial::GetMessage()  {
  LOG_DUMP(F("SuperSerial::GetMessage()\r\n"));
  this->newMessage = false;
  return this->receivedPacket.Msg();
}

bool SuperSerial::GetPacket() {
  LOG_DUMP(F("SuperSerial::GetPacket()\r\n"));
  static byte dataBuffer[MAX_PACKET_SIZE];
  static uint8_t bufferIndex = 0;
  static boolean escaping = false;
  for (int i = this->bus->Available(); i > 0; i--)  {
    byte byteReceived = this->bus->Receive();    // Read received byte
    if (byteReceived == ESCAPE && !escaping) {
      escaping = true;
    }
    else if (byteReceived == FLAG && !escaping)  {
      LOG_DEBUG(F("==============================\r\n"));
      byte receivedBytes = bufferIndex;
      bufferIndex = 0;
      LOG_DEBUG(F("Received bytes: "));
      LOG_DEBUG(receivedBytes);
      LOG_DEBUG(F("\r\n"));
      if (receivedBytes >= P_H_F_LENGTH)  {
        this->receivedPacket.SetTransID(dataBuffer[0]);
        this->receivedPacket.SetSrcAddr(dataBuffer[1]);
        this->receivedPacket.SetDestAddr(dataBuffer[2]);
        this->receivedPacket.SetMsg(dataBuffer[3], dataBuffer , dataBuffer[4], P_H_LENGTH);
        LOG_DUMP(F("CRC hbyte: "));
        LOG_DUMP(((uint16_t)dataBuffer[receivedBytes - 2]) << 8);
        LOG_DUMP(F("\r\n"));
        LOG_DUMP(F("CRC lbyte: "));
        LOG_DUMP(dataBuffer[receivedBytes - 1]);
        LOG_DUMP(F("\r\n"));
        LOG_DUMP(F("CRC Full: "));
        LOG_DUMP((uint16_t)(dataBuffer[receivedBytes - 2]) << 8 | (uint16_t)dataBuffer[receivedBytes - 1]);
        LOG_DUMP(F("\r\n"));
        this->receivedPacket.SetCRC((uint16_t)(dataBuffer[receivedBytes - 2]) << 8 | (uint16_t)dataBuffer[receivedBytes - 1]);

        if (this->receivedPacket.DestAddr() == this->deviceAddress ||
            this->receivedPacket.DestAddr() == ADDR_BROADCAST)  {
          LOG_DEBUG(F("Verifying new packet\r\n"));
          if (receivedPacket.VerifyCRC())  {    //verify CRC
            LOG_DEBUG(F("CRC verified\r\n"));
            this->currentTransaction = receivedPacket.TransID();
            if (dataBuffer[3] == F_GET_UPDATE)   {
              if (this->DataQueued())  {
                LOG_INFO(F("Sending Update\r\n"));
                this->SendPacket(&this->queuedPacket);
              }
              else  {
                LOG_DEBUG(F("Sending NOP\r\n"));
                this->SendNOP(this->receivedPacket.TransID());
              }
              return false;
            }
            this->newMessage = true;
            LOG_INFO(F("Got valid packet\r\n"));
            if ( this->receivedPacket.Msg().function == F_NAK)  {
              LOG_DEBUG(F("Received NAK\r\n"));
              this->SendPacket(&queuedPacket);
            }
            else if (this->receivedPacket.Msg().function == F_ACK)  {
              LOG_DEBUG(F("Received ACK\r\n"));
              if (this->receivedPacket.TransID() == currentTransaction)  {
                this->dataQueued = false;   //TODO:  this should go here-ish
                this->retryCount = 0;
              }
              else
              {
                LOG_ERROR(F("Received ack for non-current transaction"));
              }
            }
            else  {
              LOG_DEBUG(F("Sending ACK.\r\n"));
              SendACK(this->receivedPacket.TransID());
              return true;
            }
          }
          else  {
            LOG_ERROR(F("CRC does not match\r\n"));
            LOG_DEBUG(F("Sending NAK.\r\n"));
            SendNAK(0);
          }
        }
        else  {
          //Ignore packets not sent to this device's address
          LOG_DEBUG(F("Ignoring packet sent to different address\r\n"));
        }
      }
      else  {
        if (receivedBytes != 0)
          LOG_DEBUG(F("Packet too short, discarding\r\n"));
      }
    }
    else  {
      // add received byte to data buffer
      dataBuffer[bufferIndex++] = byteReceived;
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
  if (!bus->QueueFull())  {
    this->SendPacket(&queuedPacket);
  }
}

void SuperSerial::SendPacket(Packet* p)  {
  LOG_DUMP(F("SuperSerial::SendPacket()\r\n"));
  
  currentTransaction = (currentTransaction + 1) % 255;
  p->SetTransID(currentTransaction);
  p->SetCRC(p->ComputeCRC());
  byte array[p->EscapedSize()];

  p->ToEscapedArray(array);

  bus->Queue(array, p->EscapedSize());
  this->lastPacketSend = millis();
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
