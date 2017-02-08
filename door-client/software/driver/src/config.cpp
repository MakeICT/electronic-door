#include "config.h"

#define COLOR_IDLE          0,100,120
#define COLOR_SUCCESS1      0,80,20
#define COLOR_SUCCESS2      0,40,10
#define COLOR_FAILURE1      60,0,0
#define COLOR_FAILURE2      30,0,0
#define COLOR_WAITING       120,120,20
#define COLOR_ERROR1        120,30,0
#define COLOR_ERROR2        120,30,0

Config::Config()  {

}

void Config::Init()  {
  this->LoadSavedConfig();

  //uint8_t* testPointer = (uint8_t*) &currentConfig;
  //LOG_DEBUG(F("\r\n"));
  //for (uint8_t i = 0; i < sizeof(struct configuration); i++)  {
    //LOG_DEBUG(*(testPointer + i));
    //LOG_DEBUG(F("\r\n"));
  //}

  if(this->IsFirstRun() || currentConfig.configVersion != CONFIG_VERSION)  {
    if (this->IsFirstRun())  {
      LOG_DEBUG(F("First run detected; initializing configuration\r\n"));
    }
    else  {
      //LOG_DEBUG(currentConfig.configVersion);
      LOG_DEBUG(F("Saved configuration is outdated; reverting to default\r\n"));
    }
    this->LoadDefaults();
    this->SetVersion(CONFIG_VERSION);
    this->SaveCurrentConfig();
  }
}

void Config::SetDebugPort(SoftwareSerial* dbgPort)  {
  this->debugPort = dbgPort;
}

bool Config::IsFirstRun()  {
  if (EEPROM.read(1021) != 'm' || EEPROM.read(1022) != 'c' || EEPROM.read(1023) != 'p')  {
    EEPROM.update(1021, 'm');
    EEPROM.update(1022, 'c');
    EEPROM.update(1023, 'p');
    return true;
  }
  else  {
    return false;
  }
}

void Config::LoadSavedConfig()  {
  EEPROM.get(MEM_ADDR_CONFIG, currentConfig);
}

void Config::LoadDefaults()  {
  currentConfig.deviceAddress = 0xFE;
  currentConfig.defaultLightSequence = (struct lightMode) {M_PULSE, COLOR(COLOR_IDLE), COLOR(COLOR_IDLE), 1000, 0};
  currentConfig.waitLightSequence = (struct lightMode) {M_SOLID, COLOR(COLOR_WAITING), COLOR(COLOR_WAITING), 0, 3000};
  currentConfig.errorLightSequence = (struct lightMode) {M_SOLID, COLOR(COLOR_ERROR1), COLOR(COLOR_ERROR2), 100, 0};
  currentConfig.unlockLightSequence = (struct lightMode) {M_FLASH, COLOR(COLOR_SUCCESS1), COLOR(COLOR_SUCCESS2), 500, 3000};
  currentConfig.denyLightSequence = (struct lightMode) {M_FLASH, COLOR(COLOR_FAILURE1), COLOR(COLOR_FAILURE2), 200, 3000};
  currentConfig.startupTune.length = 2;
  currentConfig.startupTune.notes[0] = NOTE_C4;
  currentConfig.startupTune.notes[1] = NOTE_D4;
  currentConfig.startupTune.durations[0] = 4;
  currentConfig.startupTune.durations[1] = 4;
}

void Config::SaveCurrentConfig()  {
  EEPROM.put(MEM_ADDR_CONFIG, currentConfig);
}

void Config::SetVersion(uint8_t version)  {
  currentConfig.configVersion = version;
}

uint8_t Config::GetVersion()  {
  return currentConfig.configVersion;
}

void Config::SetAddress(uint8_t addr)  {
  currentConfig.deviceAddress = addr;
}

uint8_t Config::GetAddress()  {
  return currentConfig.deviceAddress;
}

void Config::SetStartTune(struct tune newTune)  {
  this->currentConfig.startupTune = newTune;
}

struct tune Config::GetStartTune()  {
  return this->currentConfig.startupTune;
}

void Config::SetDefaultLightSequence(struct lightMode sequence)  {
  this->currentConfig.defaultLightSequence = sequence;
}

struct lightMode Config::GetDefaultLightSequence()  {
  return this->currentConfig.defaultLightSequence;
}

void Config::SetWaitLightSequence(struct lightMode sequence)  {
  this->currentConfig.waitLightSequence = sequence;
}

struct lightMode Config::GetWaitLightSequence()  {
  return this->currentConfig.waitLightSequence;
}

void Config::SetErrorLightSequence(struct lightMode sequence)  {
  this->currentConfig.errorLightSequence = sequence;
}

struct lightMode Config::GetErrorLightSequence()  {
  return this->currentConfig.errorLightSequence;
}

void Config::SetUnlockLightSequence(struct lightMode sequence)  {
  this->currentConfig.unlockLightSequence = sequence;
}

struct lightMode Config::GetUnlockLightSequence()  {
  return this->currentConfig.unlockLightSequence;
}

void Config::SetDenyLightSequence(struct lightMode sequence)  {
  this->currentConfig.denyLightSequence = sequence;
}

struct lightMode Config::GetDenyLightSequence()  {
  return this->currentConfig.denyLightSequence;
}
