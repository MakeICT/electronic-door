#ifndef LIGHT_H
#define LIGHT_H

#include "driver/gpio.h"

class Light {
    public:
        Light(gpio_num_t);
        void on();
        void off();
        void blink(uint8_t, uint8_t);

    private:
        gpio_num_t light_pin;
};

#endif