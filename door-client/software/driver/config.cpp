#include "config.h"

void Config::SaveAddress(uint8_t addr)  {
  EEPROM.update(0, addr);
}

uint8_t Config::GetAddress()  {
  return EEPROM.read(0);
}
