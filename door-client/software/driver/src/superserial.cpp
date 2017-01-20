#include "superserial.h"
//#define DEBUG1


SuperSerial::SuperSerial (rs485* b, byte addr) {
  LOG_DUMP(F("SuperSerial::SuperSerial()\r\n"));
  this->bus = b;
  this->deviceAddress = addr;
  this->newMessage = false;
  this->responsePacket.SetDestAddr(ADDR_MASTER);
  this->responsePacket.SetSrcAddr(this->deviceAddress);
  this->currentTransaction = 0;
  this->retryCount = 0;
  this->lastPacketSend = 0;

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

void SuperSerial::SetAddress(byte addr)  {
  this->deviceAddress = addr;
  this->responsePacket.SetSrcAddr(this->deviceAddress);
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
  if (this->dataQueued && millis() - this->lastPacketSend > this->retryTimeout)  {
    LOG_DEBUG(F("Current transaction: "));
    LOG_DEBUG(currentTransaction);
    LOG_DEBUG(F("\r\n"));
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
}

Message SuperSerial::GetMessage()  {
  LOG_DUMP(F("SuperSerial::GetMessage()\r\n"));
  this->newMessage = false;
  return this->receivedPacket.Msg();
}


//TODO: this function is a mess.  make it better
bool SuperSerial::GetPacket() {
  LOG_DUMP(F("SuperSerial::GetPacket()\r\n"));
  static byte dataBuffer[MAX_PACKET_SIZE];
  static uint8_t bufferIndex = 0;
  static boolean escaping = false;
  for (int i = this->bus->Available(); i > 0; i--)  {
    byte byteReceived = this->bus->Receive();    // Read received byte
    if (byteReceived == B_ESCAPE && !escaping) {
      escaping = true;
    }
    else if (byteReceived == B_START && !escaping)  {
      LOG_DEBUG(F("Received start byte\r\n"));
      if (bufferIndex)  {
        //Log bytes from buffer
        LOG_DEBUG(F("Received: "));
        for (int i = 0; i < bufferIndex; i++)  {
          LOG_DEBUG(dataBuffer[i]);
          LOG_DEBUG(F(" "));
        }
        LOG_DEBUG(F("\r\n"));
        //
        LOG_DEBUG(F("Ignoring "));
        LOG_DEBUG(bufferIndex);
        LOG_DEBUG(F(" bytes left in buffer\r\n"));
        bufferIndex = 0;
      }
    }
    else if (byteReceived == B_STOP && !escaping)  {
      LOG_DUMP(F("==============================\r\n"));
      byte receivedBytes = bufferIndex;
      //Log bytes from buffer
      LOG_DEBUG(F("Received: "));
      for (int i = 0; i < bufferIndex; i++)  {
        LOG_DEBUG(dataBuffer[i]);
        LOG_DEBUG(F(" "));
      }
      LOG_DEBUG(F("\r\n"));
      //
      bufferIndex = 0;
      LOG_DEBUG(F("Received bytes: "));
      LOG_DEBUG(receivedBytes);
      LOG_DEBUG(F("\r\n"));
      if (receivedBytes >= P_H_F_LENGTH)  {
        this->receivedPacket.SetTransID(dataBuffer[0]);
        this->receivedPacket.SetSrcAddr(dataBuffer[1]);
        this->receivedPacket.SetDestAddr(dataBuffer[2]);
        this->receivedPacket.SetMsg(dataBuffer[3], dataBuffer, dataBuffer[4], P_H_LENGTH);
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
          LOG_DEBUG(F("Verifying new packet sent to this device\r\n"));
          if (receivedPacket.VerifyCRC())  {    //verify CRC
            LOG_DEBUG(receivedBytes - P_H_F_LENGTH);
            if (this->receivedPacket.MsgLength() == (receivedBytes - P_H_F_LENGTH)) {
              LOG_INFO(F("Got valid packet\r\n"));
              if (this->receivedPacket.DestAddr() == ADDR_BROADCAST)  {
                LOG_DEBUG(F("Received Broadcast packet\r\n"));
                this->newMessage = true;
                return true;
              }
              else if (this->receivedPacket.TransID() == this->currentTransaction)  {
                if (this->receivedPacket.Msg().function == F_ACK)  {
                  LOG_DEBUG(F("Received ACK\r\n"));
                  this->dataQueued = false;
                  this->retryCount = 0;
                }
                else  {
                  LOG_DEBUG(F("Received duplicate packet. Sending ACK and ignoring.\r\n"));
                  SendACK(this->receivedPacket.TransID());
                }
              }
              else  {
                if (this->receivedPacket.Msg().function == F_ACK)  {
                  LOG_ERROR(F("Received ack for non-current transaction\r\n"));
                }
                else  {
                LOG_DEBUG(F("Sending ACK.\r\n"));
                  this->currentTransaction = this->receivedPacket.TransID();
                  SendACK(this->receivedPacket.TransID());
                  this->newMessage = true;
                  return true;
                }
              }
            }
            else  {
              LOG_DEBUG(F("Length of message is "));
              LOG_DEBUG(this->receivedPacket.MsgLength());
              LOG_DEBUG("\r\n");
              LOG_ERROR(F("Received Packet of incorrect length\r\n"));
            }
          }
          else  {
            LOG_ERROR(F("CRC does not match\r\n"));
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
      if  (bufferIndex >= MAX_PACKET_SIZE - 1)  {
        LOG_ERROR(F("Serial recieve buffer overflow!"));
      }
      dataBuffer[bufferIndex++] = byteReceived;
      LOG_DUMP(F("rcv: "));
      LOG_DUMP(byteReceived);
      LOG_DUMP(F("\r\n"));
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
  this->SendPacket(&queuedPacket);
}

void SuperSerial::SendPacket(Packet* p)  {
  LOG_DUMP(F("SuperSerial::SendPacket()\r\n"));

  if (!this->dataQueued)  {
    currentTransaction = (currentTransaction + 1) % 255;
    this->dataQueued = true;
  }
  p->SetTransID(currentTransaction);
  p->SetCRC(p->ComputeCRC());       // @BUG: sometimes program crashes here.
  byte array[p->EscapedSize()];

  p->ToEscapedArray(array);

  bus->Send(array, p->EscapedSize());
  this->lastPacketSend = millis();
}

inline void SuperSerial::SendControl(byte function, byte transID)  {
  LOG_DUMP(F("SuperSerial::SendACK()\r\n"));
  responsePacket.SetMsg(function, NULL, 0);
  responsePacket.SetTransID(transID);
  responsePacket.SetCRC(responsePacket.ComputeCRC());

  byte array[responsePacket.EscapedSize()];

  responsePacket.ToEscapedArray(array);
  int result = bus->Send(array, responsePacket.EscapedSize());
  //~ while (result != 0)  {
    //~ result = bus->Send(array, responsePacket.EscapedSize());
  //~ }
}

inline void SuperSerial::SendACK(byte transID)  {
  LOG_DUMP(F("SuperSerial::SendACK()\r\n"));
  return SendControl(F_ACK, transID);
}
