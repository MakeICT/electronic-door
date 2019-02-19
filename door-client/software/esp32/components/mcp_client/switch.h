#ifndef SWITCH_H
#define SWITCH_H

#include "driver/gpio.h"

class Switch {
    public:
        Switch(gpio_num_t);
        bool state();

    private:
        gpio_num_t switch_pin;
};

#endif