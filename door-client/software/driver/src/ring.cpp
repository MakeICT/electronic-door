#include "ring.h"


Ring::Ring (uint8_t LED_pin, uint8_t number_of_LEDs) {
  pin = LED_pin;
  num_LEDs = number_of_LEDs;
  pixels = Adafruit_NeoPixel(num_LEDs, pin, NEO_GRB + NEO_KHZ800);
  pixels.begin(); // This initializes the NeoPixel library.
  last_change = millis();
  state = 0;
  index = 0;
}

void Ring::lightAll(uint32_t c) {
  for(int i=0;i<num_LEDs;i++){
  pixels.setPixelColor(i, c);
  }
}

void Ring::SetMode(struct lightMode newMode)  {
  this->SetMode(newMode.mode, newMode.color1, newMode.color2, newMode.period, newMode.duration);
}

void Ring::SetMode(byte m, uint32_t c1, uint32_t c2, int p, int d)  {
   if (d > 0)  {
     tempMode = m;
     tempDuration = d;
     tempStarted = millis();
     tempColor1 = c1;
     tempColor2 = c2;
     tempPeriod = p;
   }
   else {
     mode = m;
     SetColor1(c1);
     SetColor2(c2);
     SetPeriod(p);
   }
   if (m == M_SOLID)  {
      lightAll(c1);
      pixels.show();
   }
}

void Ring::SetColor1(uint32_t c)  {
  color1 = c;
}

void Ring::SetColor2(uint32_t c)  {
  color2 = c;
}

void Ring::SetPeriod(int p)  {
  period = p;
}

// Update pixels in animated modes
void Ring::Update()  {
  uint32_t currentMillis = millis();
  uint8_t currentMode;
  uint32_t currentColor1;
  uint32_t currentColor2;
  uint16_t currentPeriod;
  if (currentMillis - tempStarted > tempDuration)
    tempMode = false;
  if (tempMode)  {
    currentMode = tempMode;
    currentColor1= tempColor1;
    currentColor2 = tempColor2;
    currentPeriod = tempPeriod;
  }    
  else  {
    currentMode = mode;
    currentColor1= color1;
    currentColor2 = color2;
    currentPeriod = period;
  }
    
  switch (currentMode)
  {
    case M_FLASH:
      if (currentMillis - last_change > currentPeriod) {
        pixels.setBrightness(255);
        last_change = currentMillis;
        if (state == 1)
          lightAll(currentColor2);
        else
          lightAll(currentColor1);
        state = !state;
        pixels.show();
      }
      break;
    
    case M_PULSE:
      if (currentMillis - last_change > currentPeriod / 200) {
        lightAll(currentColor1);
        last_change = currentMillis;
        int test = (dim[0]) - (2* (dim[0]%100) * (dim[0] /100));
        pixels.setBrightness(test*2 +55);
        dim[0] = (dim[0]+1)%200;
        pixels.show();
      }
      break;
      
    case M_CHASE:
      if (currentMillis - last_change > currentPeriod)  {
        pixels.setBrightness(255);
        byte length = 3;    //TODO: make this configurable
        last_change = currentMillis;
        index = (index + 1)%num_LEDs;
        pixels.setPixelColor(num_LEDs-1 -(((index + num_LEDs)-length)%num_LEDs), currentColor2);
        pixels.setPixelColor(num_LEDs-1 -(index), currentColor1);
        pixels.show();
      }
      break;  
      
    case M_HEART:
      if (currentMillis - last_change > currentPeriod) {
        pixels.setBrightness(255);
        last_change = currentMillis;
        if (state == 1)
          lightAll(currentColor2);
        else
          lightAll(currentColor1);
        state = !state;
        pixels.show();
      }
      break; 
  }
}

