#include "light.h"


Light::Light(gpio_num_t pin) {
  this->light_pin = pin;
  gpio_pad_select_gpio(pin);
  /* Set the GPIO as a push/pull output */
  gpio_set_direction(pin, GPIO_MODE_OUTPUT);
}

void Light::on() {
  gpio_set_level(this->light_pin, 1);
}

void Light::off() {
  gpio_set_level(this->light_pin, 0);
}

// void Light::blink(void *pvParameter)
// {
//     while(1) {
//         /* Blink off (output low) */
//         gpio_set_level(BLINK_GPIO, 0);
//         vTaskDelay(1000 / portTICK_PERIOD_MS);
//         /* Blink on (output high) */
//         gpio_set_level(BLINK_GPIO, 1);
//         vTaskDelay(1000 / portTICK_PERIOD_MS);
//     }
// }