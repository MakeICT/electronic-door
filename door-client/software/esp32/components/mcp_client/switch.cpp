#include "switch.h"


Switch::Switch(gpio_num_t pin) {
  this->switch_pin = pin;
  gpio_pad_select_gpio(pin);
  /* Set the GPIO as a push/pull output */
  gpio_set_direction(pin, GPIO_MODE_INPUT);
}

bool Switch::state() {
  return gpio_get_level(this->switch_pin);
}