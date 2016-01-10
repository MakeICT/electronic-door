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

void Ring::SetMode(byte m, uint32_t c, int p, int d)  {
   if (d > 0)  {
     tempMode = m;
     tempDuration = d;
     tempStarted = millis();
     tempColor = c;
     tempPeriod = p;
   }
   else {
     mode = m;
     SetColor(c);
     SetPeriod(p);
   }
   if (m == M_SOLID)  {
      lightAll(c);
      pixels.show();
   }
}

void Ring::SetColor(uint32_t c)  {
  color = c;
}

void Ring::SetBackground(uint32_t c)  {
  color2 = c;
}

void Ring::SetPeriod(int p)  {
  period = p;
}

// Update pixels in animated modes
void Ring::Update()  {
  uint32_t currentMillis = millis();
  uint8_t currentMode;
  uint32_t currentColor;
  uint32_t currentBackground;
  int currentPeriod;
  if (currentMillis - tempStarted > tempDuration)
    tempMode = false;
  if (tempMode)  {
    currentMode = tempMode;
    currentColor = tempColor;
    currentBackground = color2;
    currentPeriod = tempPeriod;
  }    
  else  {
    currentMode = mode;
    currentColor = color;
    currentBackground = color2;
    currentPeriod = period;
  }
    
  switch (currentMode)
  {
    case M_FLASH:
      if (currentMillis - last_change > currentPeriod) {
        pixels.setBrightness(255);
        last_change = currentMillis;
        if (state == 1)
          lightAll(currentBackground);
        else
          lightAll(currentColor);
        state = !state;
        pixels.show();
      }
      break;
    
    case M_PULSE:
      if (currentMillis - last_change > currentPeriod / 200) {
        lightAll(currentColor);
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
        pixels.setPixelColor(num_LEDs-1 -(((index + num_LEDs)-length)%num_LEDs), currentBackground);
        pixels.setPixelColor(num_LEDs-1 -(index), currentColor);
        pixels.show();
      }
      break;  
  }
}

