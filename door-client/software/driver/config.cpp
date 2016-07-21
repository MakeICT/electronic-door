#include "config.h"

void Config::SaveAddress(uint8_t addr)  {
  EEPROM.update(0, addr);
}

uint8_t Config::GetAddress()  {
  return EEPROM.read(0);
}

bool Config::IsFirstRun()  {
  if (EEPROM.read(1022) != 0b10101010 || EEPROM.read(1023) != 0b01010101)  {
    EEPROM.update(1022, 0b10101010);
    EEPROM.update(1023, 0b01010101);
    return true;
  }
  else  {
    return false;
  } 
}
