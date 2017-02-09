#include "module.h"

void Module::SetDebugPort(SoftwareSerial* dbg)  {
  this->debugPort = dbg;
}
