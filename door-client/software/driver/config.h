#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>
#include <EEPROM.h>
#include <SoftwareSerial.h>

#include "utils.h"
#include "ring.h"
#include "audio.h"

#define CONFIG_VERSION 0x00

#define LS_DEFAULT  0
#define LS_UNLOCK   1
#define LS_DENY     2  

struct configuration  {
  uint8_t configVersion;
  uint8_t deviceAddress;
  struct lightMode defaultLightSequence;
  struct lightMode unlockLightSequence;
  struct lightMode denyLightSequence;
  struct tune startupTune;
};

class Config
{
  public:
    Config();
    
    void SetDebugPort(SoftwareSerial* dbgPort);
    bool IsFirstRun();
    
    void LoadSavedConfig();
    void LoadDefaults();
    void SaveCurrentConfig();
    void SaveDefaults();
    
    void SetVersion(uint8_t);
    uint8_t GetVersion();
        
    void SetAddress(uint8_t address);
    uint8_t GetAddress();
    
    void SetStartTune(struct tune newTune);
    struct tune GetStartTune();
    
    void SetDefaultLightSequence(struct lightMode sequence);
    struct lightMode GetDefaultLightSequence();

    void SetUnlockLightSequence(struct lightMode sequence);
    struct lightMode GetUnlockLightSequence();

    void SetDenyLightSequence(struct lightMode sequence);
    struct lightMode GetDenyLightSequence();
    
    void SaveLightSequence(uint8_t identifier, struct lightMode sequence);
    struct lightMode GetLightSequence(uint8_t identifier);
    
  private:
    SoftwareSerial* debugPort;
    uint8_t lightModeStructLength;
    struct configuration defaultConfig;
    struct configuration currentConfig;
};

#endif
