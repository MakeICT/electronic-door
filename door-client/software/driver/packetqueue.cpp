#include "packetqueue.h"


Message::Message()  {
  //Do Nothing
}

void Message::SetMsg(byte func, byte length, byte* payload)  {
  this->function = func;
  this->length = length;
  arrayCopy(payload, this->payload, length);
  this->length = length;
}

//initialize empty packet
Packet::Packet()  {
  //Do nothing
}

//Initialize packet based on function info
Packet::Packet(byte function, byte* payload, byte length)  {
  this->message.function = function;
  this->message.length = length;
  for (int i = 0; i < length; i++)  {
    this->message.payload[i] = payload[i];
  }
  this->size = this->message.length + P_H_F_LENGTH;
  this->escapedSize = this->size + this->Escapes();
}

//Convert packet to an array and return
byte Packet::ToArray(byte* array)  {
  byte index = 0;
  array[index++] = this->transactionID;
  array[index++] = this->sourceAddr;
  array[index++] = this->destAddr;
  array[index++] = this->message.function;
  array[index++] = this->message.length;
    
  for(int i = 0;i < this->message.length; i++)  {
    array[index++] = this->message.payload[i];
  }
  array[index++] = this->CRC() >> 8;
  array[index++] = this->CRC() & 0xFF;
  return this->message.length + P_H_F_LENGTH;
}

//Compute MODBUS CRC16 for the packet
void Packet::ComputeCRC()  {
  //this part is borrowed from somewhere....
  //TODO: implement 16 bit CRC
  this->crc = 0xFFFF;
  return;
  // Compute the MODBUS RTU CRC
  
  byte data[this->Size()-2];
  this->ToArray(data);
  uint16_t crc = 0xFFFF;
 
  for (byte pos = 0; pos < this->Size()-2; pos++) {
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
  this->crc = crc;  
}

//Calculate number of bytes in the packet that need escaping
byte Packet::Escapes()  {
  byte escapes = 0;
  byte unescapedArray[this->Size()];
  this->ToArray(unescapedArray);
  
  for (int i = 0; i < this->Size(); i++)  {
    if (unescapedArray[i] == ESCAPE || unescapedArray[i] == FLAG)  {
      escapes +=1; 
    }
  }
  return escapes;
}

//Insert escape bytes into the packet if necessary
byte Packet::ToEscapedArray(byte* array)  { 
  byte unescapedArray[this->Size()];
    this->ToArray(unescapedArray);
  if (this->EscapedSize() > this->Size())  {
    byte escapes = this->Escapes();
    byte escapedArray[this->Size() + escapes];
    for (int i=0 ,j = 0; i < this->Size(); i++, j++)  {
      if (unescapedArray[i] == ESCAPE || unescapedArray[i] == FLAG)  {
        escapedArray[i++] =  ESCAPE;
      }
      escapedArray[i] = unescapedArray[j];
    }
    arrayCopy(escapedArray, array, this->EscapedSize());
    this->escapedSize = this->Size() + escapes;
    return this->EscapedSize();
  }
  else  {
    arrayCopy(unescapedArray, array, this->Size());
    return this->Size();
  }
}

void Packet::SetMsg(byte func, byte* payload, byte length)  {
  this->message.function = func;
  this->message.length = length;
  arrayCopy(payload, this->message.payload, length);
  this->size = length + P_H_F_LENGTH;
}

void Packet::SetSrcAddr(byte addr)  {
  this->sourceAddr = addr;
}

void Packet::SetDestAddr(byte addr)  {
  this->destAddr = addr;
}

void Packet::SetTransID(byte transID)  {
  this->transactionID = transID;
}

uint16_t Packet::CRC()  {
  return crc;
}

byte Packet::Size()  {
  return this->size;
}

byte Packet::EscapedSize()  {
  this->escapedSize = this->Size() + this->Escapes();
  return this->escapedSize;
}
