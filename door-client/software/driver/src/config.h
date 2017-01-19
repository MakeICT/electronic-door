#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>
#include <EEPROM.h>
#include <SoftwareSerial.h>

#include "utils.h"
#include "ring.h"
#include "audio.h"

#define CONFIG_VERSION  0x04
#define MEM_ADDR_CONFIG 0x00

struct configuration  {
  uint8_t configVersion;
  uint8_t deviceAddress;
  struct lightMode defaultLightSequence;
  struct lightMode waitLightSequence;
  struct lightMode errorLightSequence;
  struct lightMode unlockLightSequence;
  struct lightMode denyLightSequence;
  struct tune startupTune;
};

class Config
{
  public:
    Config();
    
    void Init();
    void SetDebugPort(SoftwareSerial* dbgPort);
    bool IsFirstRun();
    
    void LoadSavedConfig();
    void LoadDefaults();
    void SaveCurrentConfig();
    
    uint8_t GetVersion();
        
    void SetAddress(uint8_t address);
    uint8_t GetAddress();
    
    void SetStartTune(struct tune newTune);
    struct tune GetStartTune();
    
    void SetDefaultLightSequence(struct lightMode sequence);
    struct lightMode GetDefaultLightSequence();
    
    void SetWaitLightSequence(struct lightMode sequence);
    struct lightMode GetWaitLightSequence();
    
    void SetErrorLightSequence(struct lightMode sequence);
    struct lightMode GetErrorLightSequence();

    void SetUnlockLightSequence(struct lightMode sequence);
    struct lightMode GetUnlockLightSequence();

    void SetDenyLightSequence(struct lightMode sequence);
    struct lightMode GetDenyLightSequence();
    
    void SaveLightSequence(uint8_t identifier, struct lightMode sequence);
    struct lightMode GetLightSequence(uint8_t identifier);
    
  private:
    void SetVersion(uint8_t);
  
    SoftwareSerial* debugPort;
    struct configuration currentConfig;
};

#endif
