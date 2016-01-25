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
  //debugPort->println("GetPacket");
  static uint8_t packetIndex = 0;
  static uint8_t escape_count = 0;
  static boolean escaping = false;
  for (int i = bus->Available(); i > 0; i--)  {
    //debugPort->print("Free RAM 2: ");
    //debugPort->println(freeRam());
    byte byteReceived = bus->Receive();    // Read received byte
    if (byteReceived == ESCAPE && !escaping) {
      escaping = true;
      escape_count++;
    }
    else if(byteReceived == FLAG && !escaping)  {
      //debugPort->println("=====================");
      byte receivedBytes = packetIndex;
      byte escapes = escape_count;
      escape_count = 0;
      packetIndex = 0;
      if (receivedBytes >= P_H_F_LENGTH)  {
        uint8_t transactionID = currentPacket[0];
        uint8_t srcAddress = currentPacket[1];
        uint8_t dstAddress = currentPacket[2];
  
        if (dstAddress == this->deviceAddress || dstAddress == ADDR_BROADCAST)  {
          debugPort->println("THE PACKET IS MINE!");
          if (ComputeCRC(currentPacket, receivedBytes) == 0xFFFF  )  {    //verify CRC //TODO: this is fake
            this->currentTransaction = transactionID;   //TODO: fix this ugly hack
            if (currentPacket[3] == F_GET_UPDATE)   {
              if (this->DataQueued())  {
                D("Send Update");
                this->SendPacket(&this->queuedPacket);
                this->dataQueued = false;
              }
              else  {
                D("Send NOP");
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
            debugPort->println("GetPacket returns true");
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
      //debugPort->print("rcv: ");
      //debugPort->println(byteReceived);
      escaping = false; 
    }
  }
  return false;
  //debugPort->println("GetPacket returns false");
}

void SuperSerial::QueueMessage(byte function, byte* payload, byte length)  {
  debugPort->println("SuperSerial.QueueMessage called");
 //D(length);
  //TODO: Currently only supports queueing one message
  this->queuedPacket.SetMsg(function, payload, length);
  this->queuedPacket.SetDestAddr(ADDR_MASTER);
  this->queuedPacket.SetSrcAddr(this->deviceAddress);
  this->dataQueued = true;
  //TEMPORARY TEST CODE
  //this->SendPacket(&queuedPacket);
}

void SuperSerial::ReplyToQuery(byte transID)  {
  queuedPacket.SetTransID(transID);
  SendPacket(&queuedPacket);
  this->dataQueued = false;
}

void SuperSerial::SendPacket(Packet* p)  {
  debugPort->println("SuperSerial.SendPacket called");
  p->ComputeCRC();
  byte array[p->EscapedSize()];
  p->ToEscapedArray(array);
  bus->Send(array, p->EscapedSize());
}

//~ //TODO: get rid of this function.  Use new send function.
//~ void SuperSerial::SendPacket(uint8_t sourceAddr, uint8_t destAddr, uint8_t function, uint8_t* payload, uint8_t len)  {
  //~ //TODO: do all byte stuffing here / recalculate packet length
  //~ uint8_t pos = 0;
  //~ uint8_t packet_len = len + P_H_F_LENGTH;
  //~ uint8_t packet[packet_len];
  //~ uint16_t CRC = ComputeCRC(packet, packet_len - 2);
  //~ packet[pos++] = currentTransaction;
  //~ packet[pos++] = sourceAddr;
  //~ packet[pos++] = destAddr;
  //~ packet[pos++] = function;
  //~ packet[pos++] = len;
//~ 
//~ 
  //~ for (uint8_t i = 0; i < len; i++)  {
    //~ packet[pos++] =  payload[i];
  //~ }
  //~ packet[pos++] = CRC >> 8;
  //~ packet[pos++] = CRC & 0xFF;
  //~ bus->Send(packet, packet_len);
//~ }

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


