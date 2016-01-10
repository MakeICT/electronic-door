#include "superserial.h"
//#define DEBUG1


SuperSerial::SuperSerial (rs485* b, byte addr) {
  bus = b;
  deviceAddress = addr;
  queue = new PacketQueue;
  debugPort->println("SuperSerial Started");
}

void SuperSerial::SetDebugPort(SoftwareSerial* port)  {
  debugPort = port;
}

int SuperSerial::QueueLength()  {
  return queue->length;
}

byte SuperSerial::GetPacket() {
  debugPort->println("GetPacket");
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
      //debugPort->print(receivedBytes);
      //debugPort->print(" : ");
      //debugPort->println(currentPacket[0]);
      if (receivedBytes >= P_H_F_LENGTH && receivedBytes == currentPacket[0])  {
        uint8_t packet_length = currentPacket[0];
        uint8_t src_address = currentPacket[1];
        uint8_t dst_address = currentPacket[2];
  
        if (dst_address == this->deviceAddress || dst_address == ADDR_BROADCAST)  {
          //debugPort->println("THE PACKET IS MINE!");
          if (receivedBytes + escapes == packet_length &&     //verify length
              ComputeCRC(currentPacket, receivedBytes) == 0xFFFF  )  {    //verify CRC //TODO: this is fake
                
            currentPacket[0] = receivedBytes;
            SendACK(src_address, dst_address);
            return receivedBytes;
            //debugPort->println("GetPacket returns true");
            }
          }
          else  {
            SendNAK(src_address, dst_address);
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

boolean SuperSerial::GetMessage(byte* function, byte message[64], byte* length)  {
  //debugPort->println("GetMessage");
  if (this->GetPacket())  {
    //debugPort->println("Got Message");
    *function = currentPacket[4];
    *length = currentPacket[0] - P_H_F_LENGTH;
    for(int i = 0; i < *length; i++)  {
      message[i] = currentPacket[i+P_H_LENGTH + 1];
    }
    return true;
  }
  else  {
    return false;
  }
}

void SuperSerial::QueueMessage(byte function, byte* payload, byte length)  {
  Packet* newPacket = new Packet(function, payload, length);
  newPacket->sourceAddr = deviceAddress;
  newPacket->destAddr = ADDR_MASTER;
  queue->Push(newPacket);
}

void SuperSerial::ReplyToQuery(byte transID)  {
  Packet* queueHead = queue->Top();
  queueHead->transactionID = transID;
  queueHead->ComputeCRC();
  SendPacket(queueHead);
}

void SuperSerial::SendPacket(Packet* p)  {
  byte array[p->length];
  p->PacketToArray(array);
  bus->Send(array, p->length);
}

void SuperSerial::SendPacket(uint8_t sourceAddr, uint8_t destAddr, uint8_t function, uint8_t* payload, uint8_t len)  {
  //TODO: do all byte stuffing here / recalculate packet length
  uint8_t pos = 0;
  uint8_t packet_len = len + 6;
  uint8_t packet[packet_len];
  uint16_t CRC = ComputeCRC(packet, packet_len - 2);
  packet[pos++] = packet_len;
  packet[pos++] = sourceAddr;
  packet[pos++] = destAddr;
  packet[pos++] = function;

  for (uint8_t i = 0; i < len; i++)  {
    packet[pos++] =  payload[i];
  }
  packet[pos++] = CRC >> 8;
  packet[pos++] = CRC & 0xFF;
  bus->Send(packet, packet_len);
}

inline void SuperSerial::SendACK(uint8_t sourceAddr, uint8_t destAddr)  {
  uint8_t payload[] = {};
  return SendPacket(sourceAddr, destAddr, F_ACK, payload, 0);
}

inline void SuperSerial::SendNAK(uint8_t sourceAddr, uint8_t destAddr)  {
  uint8_t payload[] = {};
  return SendPacket(sourceAddr, destAddr, F_NAK, payload, 0);
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

