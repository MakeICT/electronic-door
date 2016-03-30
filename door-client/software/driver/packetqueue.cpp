#include "packetqueue.h"

//Initialize empty message
Message::Message()  {
  //Do Nothing
}

Message::Message(byte f, byte l, byte* p)  {
  this->SetMsg(f, l, p);
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
Packet::Packet(byte f, byte* p, byte l)  {
  this->SetMsg(f, p, l);
}

void Packet::SetDebugPort(SoftwareSerial* port)  {
  LOG_DUMP(F("Packet::SetDebugPort()\r\n"));
  debugPort = port;
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
uint16_t Packet::ComputeCRC()  {
  //this part is borrowed from somewhere....
  //TODO: implement 16 bit CRC
  //return 0xFFFF;
  
  // Compute the MODBUS RTU CRC
  
  byte data[this->Size()-2];
  this->ToArray(data);
  uint16_t crc = 0xFFFF;
 
  for (byte pos = 0; pos < this->Size()-2; pos++) {
    LOG_DUMP(F("CRC'ing byte: "));
    LOG_DUMP(data[pos]);
    LOG_DUMP("\r\n");
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
  LOG_DUMP(F("Computed CRC: "));
  LOG_DUMP(crc);
  LOG_DUMP(F("\r\n"));
  return crc;
}

bool Packet::VerifyCRC()  {
  LOG_DUMP(F("Checking CRC\r\n"));
  LOG_DUMP(F("Packet CRC: "));
  LOG_DUMP(this->CRC());
  LOG_DUMP(F("\r\n"));
  if (this->CRC() == this->ComputeCRC())  {
    //LOG_DEBUG(F("CRC verified\r\n"));   //THIS CODE CAUSES CRASH??!!??
    return true;
  }
  else {
    //LOG_ERROR(F("CRC incorrect!\r\n"));
    return false;
  }
}

//Calculate number of bytes in the packet that need escaping
byte Packet::Escapes()  {
  byte escapes = 0;
  byte unescapedArray[this->Size()];
  this->ToArray(unescapedArray);
  
  for (int i = 0; i < this->Size(); i++)  {
    if (unescapedArray[i] == B_ESCAPE || unescapedArray[i] == B_START || unescapedArray[i] == B_STOP)  {
      escapes +=1; 
    }
  }
  return escapes;
}

//Insert escape bytes into the packet if necessary
byte Packet::ToEscapedArray(byte* array)  { 
  byte unescapedArray[this->Size()];
  this->ToArray(unescapedArray);
  LOG_DUMP(F("Unescaped Array: "));
  for (int i=0; i < this->Size(); i++)  {
    LOG_DUMP(unescapedArray[i]);
    LOG_DUMP(F(" "));
  }
  LOG_DEBUG(F("\r\n"));
  if (this->EscapedSize() > this->Size())  {
    byte escapes = this->Escapes();
    LOG_DUMP(F("Escapes: "));
    LOG_DUMP(escapes);
    LOG_DUMP(F("\r\n"));
    byte escapedArray[this->EscapedSize()];
    for (int i=0 ,j = 0; i < this->Size(); i++, j++)  {
      if (unescapedArray[i] == B_START || unescapedArray[i] == B_STOP || unescapedArray[i] == B_ESCAPE)  {
        escapedArray[j++] =  B_ESCAPE;
      }
      escapedArray[j] = unescapedArray[i];
    }
    LOG_DUMP(F("Escaped Array: "));
    for (int i=0; i < this->EscapedSize(); i++)  {
      LOG_DUMP(escapedArray[i]);
      LOG_DUMP(F(" "));
    }
    LOG_DUMP(F("\r\n"));
    LOG_DUMP(F("Unescaped Size: "));
    LOG_DUMP(this->Size());
    LOG_DUMP(F("\r\n"));
    LOG_DUMP(F("Escaped Size: "));
    LOG_DUMP(this->EscapedSize());
    LOG_DUMP(F("\r\n"));
    arrayCopy(escapedArray, array, this->EscapedSize());
    this->escapedSize = this->Size() + escapes;
    return this->EscapedSize();
  }
  else  {
    arrayCopy(unescapedArray, array, this->Size());
    return this->Size();
  }
}

/*==========( Set Functions )==========*/
void Packet::SetMsg(byte function, byte* payload, byte length, byte offset)  {
  this->message.function = function;
  this->message.length = length;
  arrayCopy(payload, this->message.payload, length, offset);
  this->size = length + P_H_F_LENGTH;
  this->escapedSize = this->size + this->Escapes();
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

void Packet::SetCRC(uint16_t crc)  {
  this->crc = crc;
}

/*==========( Get Functions )==========*/
Message Packet::Msg()  {
  return this->message;
}

byte Packet::DestAddr()  {
  return this->destAddr;
}

byte Packet::SrcAddr()  {
  return this->sourceAddr;
}

byte Packet::TransID()  {
  return this->transactionID;
}

uint16_t Packet::CRC()  {
  return this->crc;
}

byte Packet::Size()  {
  return this->size;
}

byte Packet::EscapedSize()  {
  this->escapedSize = this->Size() + this->Escapes();
  return this->escapedSize;
}
