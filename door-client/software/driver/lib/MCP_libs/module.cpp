#include "module.h"

bool Module::Init()  {
  return true;
}

void Module::Update()  {
}

void Module::SetDebugPort(SoftwareSerial* dbg)  {
  this->debugPort = dbg;
}
