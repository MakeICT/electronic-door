#include "ring.h"


Ring::Ring (uint8_t LED_pin, uint8_t number_of_LEDs) {
  pin = LED_pin;
  num_LEDs = number_of_LEDs;
  pixels = Adafruit_NeoPixel(num_LEDs, pin, NEO_GRB + NEO_KHZ800);
  pixels.begin(); // This initializes the NeoPixel library.
  
}

Ring::~Ring() {
  
}

void Ring::lightSolid(int R, int G, int B) {
  for(int i=0;i<num_LEDs;i++){
  // pixels.Color takes RGB values, from 0,0,0 up to 255,255,255
  pixels.setPixelColor(i, pixels.Color(R,G,B)); // Moderately bright green color.
  pixels.show(); // This sends the updated pixel color to the hardware
  }
}

void Ring::Green(int brightness) {
  lightSolid(0, brightness, 0);
}

