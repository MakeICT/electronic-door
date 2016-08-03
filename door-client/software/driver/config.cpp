#include "config.h"

// Constants for NeoPixel ring
#define NUMPIXELS           16      // Number of NeoPixels in Ring
#define COLOR_IDLE          0,100,120
#define COLOR_SUCCESS1      0,60,20
#define COLOR_SUCCESS2      0,30,10
#define COLOR_FAILURE1      60,20,0
#define COLOR_FAILURE2      30,10,0
#define COLOR_WAITING       120,120,20
#define COLOR_ERROR1        120,30,0
#define COLOR_ERROR2        120,30,0
#define COLOR               Adafruit_NeoPixel::Color

Config::Config()  {

}

void Config::Init()  {
  defaultConfig.deviceAddress = 0xFE;
  defaultConfig.defaultLightSequence = (lightMode) {M_PULSE, COLOR(COLOR_IDLE), COLOR(COLOR_IDLE), 1000, 0};
  defaultConfig.unlockLightSequence = (lightMode) {M_PULSE, COLOR(COLOR_SUCCESS1), COLOR(COLOR_SUCCESS2), 500, 3000};
  defaultConfig.denyLightSequence = (lightMode) {M_FLASH, COLOR(COLOR_FAILURE1), COLOR(COLOR_FAILURE2), 200, 3000};
  uint8_t defaultTune[] = {NOTE_C4, NOTE_D4};
  uint8_t defaultDurations[] = {4,4};
  defaultConfig.startupTune = (tune) {2, defaultTune, defaultDurations};
    
  this->LoadSavedConfig();
  if(this->IsFirstRun() || currentConfig.configVersion != CONFIG_VERSION)  {
    if (this->IsFirstRun())  {
      LOG_DEBUG(F("First run detected; initializing configuration"));
    }
    else  {
      LOG_DEBUG(F("Saved configuration is outdated; reverting to default"));
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
  this->currentConfig = EEPROM.get(0, currentConfig);
}

void Config::LoadDefaults()  {
  this->currentConfig = this->defaultConfig;
}

void Config::SaveCurrentConfig()  {
  EEPROM.put(0, currentConfig);
}

void Config::SaveDefaults() {
  uint16_t addr = 1;
  EEPROM.put(addr, defaultConfig);
}

void Config::SetVersion(uint8_t version)  {
  EEPROM.update(0, version);
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
