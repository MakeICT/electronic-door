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

Ring::~Ring() {
  
}

void Ring::lightAll(int R, int G, int B) {
  for(int i=0;i<num_LEDs;i++){
  // pixels.Color takes RGB values, from 0,0,0 up to 255,255,255
  pixels.setPixelColor(i, pixels.Color(R,G,B));
  }
  pixels.show(); // This sends the updated pixel color to the hardware
}

void Ring::Green(int brightness) {
  lightAll(0, brightness, 0);
}

void Ring::SetMode(byte m, byte c[], int p, int d)  {
   if (d > 0)  {
     tempMode = m;
     tempDuration = d;
     tempStarted = millis();
     tempColor[0] = c[0];
     tempColor[1] = c[1];
     tempColor[2] = c[2];
     tempPeriod = p;
   }
   else {
     mode = m;
     SetColor(c[0], c[1], c[2]);
     SetPeriod(p);
   }

}

void Ring::SetColor(uint8_t r, uint8_t g, uint8_t b)  {
  color[0] = r;
  color[1] = g;
  color[2] = b;
}

void Ring::SetBackground(byte r, byte g, byte b)  {
  color2[0] = r;
  color2[1] = g;
  color2[2] = b;
}

void Ring::SetPeriod(int p)  {
  period = p;
}

void Ring::Update()  {
  long currentMillis = millis();
  uint8_t currentMode;
  byte* currentColor;
  byte* currentBackground;
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
    case M_SAME:
      //Do not change mode
      break;
    case M_SOLID:
      lightAll(currentColor[0], currentColor[1], currentColor[2]);
      break;
    case M_FLASH:
      pixels.setBrightness(255);
      if (currentMillis - last_change > currentPeriod) {
        last_change = currentMillis;
        if (state == 1)
          lightAll(currentBackground[0],currentBackground[1],currentBackground[2]);
        else
          lightAll(currentColor[0], currentColor[1], currentColor[2]);
        state = !state;
      }
      break;
    
      case M_PULSE:
        lightAll(currentColor[0], currentColor[1], currentColor[2]);

      if (currentMillis - last_change > currentPeriod / 200) {
        last_change = currentMillis;
        int test = (dim[0]) - (2* (dim[0]%100) * (dim[0] /100));
        pixels.setBrightness(test*2 +55);
        dim[0] = (dim[0]+1)%200;
        
//        last_change = currentMillis;
//        lightAll(currentColor[0]-dim[0]*0,
//                 currentColor[1]-dim[1], 
//                 currentColor[2]-dim[2]);
//        dim[0] = (dim[0] + 1)%currentColor[0];
//        dim[1] = (dim[1] + 1)%currentColor[1];
//        dim[2] = (dim[2] + 1)%currentColor[2];

      }
     
      break;
      
      
    case M_CHASE:
      if (currentMillis - last_change > currentPeriod)  {
        byte length = 3;    //TODO: make this configurable
        last_change = currentMillis;
        index = (index + 1)%num_LEDs;
        pixels.setPixelColor(num_LEDs-1 -(((index + num_LEDs)-length)%num_LEDs), pixels.Color(currentBackground[0],currentBackground[1],currentBackground[2]));
        pixels.setPixelColor(num_LEDs-1 -(index), pixels.Color(currentColor[0],currentColor[1],currentColor[2]));

      }

      // 
      break;  
  }
  
  pixels.show();
}

