#ifndef ILI9340_MODULE
#define ILI9340_MODULE

#include "module.h"
#include "Adafruit_ILI9340.h"

class GLCD : public Module {
  public:
    GLCD(uint8_t cs, uint8_t dc, uint8_t rst);
    bool Init();
    void Update();
    bool IsAlive();

    void Clear();
    void Print(char c);
    //void Println();
  private:
    uint8_t csPin;
    uint8_t dcPin;
    uint8_t rstPin;
};

#endif
