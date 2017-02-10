#include "glcd_module.h"

Adafruit_ILI9340 tft = Adafruit_ILI9340(8, 7, 6);  //TODO: make configurable

GLCD::GLCD(uint8_t cs, uint8_t dc, uint8_t rst)  {
  this->csPin = cs;
  this->dcPin = dc;
  this->rstPin = rst;
}

bool GLCD::Init()  {
  tft.begin();
  tft.setRotation(2);
  tft.fillScreen(ILI9340_BLACK);
  tft.setCursor(0, 0);
  tft.setTextColor(ILI9340_GREEN);  tft.setTextSize(1);
  return true;
}

void GLCD::Update()  {

}

bool GLCD::IsAlive()  {
  return true;
}

void GLCD::Clear()  {
  tft.fillScreen(ILI9340_BLACK);
  tft.setCursor(0, 0);
}

void GLCD::Print(char c)  {
  tft.print(c);
}

// void GLCD::Println  {
//   tft.print();
//   tft.print('\n');
// }
