load("MixerSliderControl.js");
load("SliderModeHandler.js");
load("SliderView.js");
load("DeviceSliderControl.js");

var _hexstr = "0123456789abcdef";

var ControlModes = {
    VOLUME: 0,
    PAN: 1,
    AUX: 2,
    DEVICE: 3,
    MACRO: 4,
    MIDI_CC: 5
};

var BarModes = {
    DUAL: "03",
    DOT: "01",
    PAN: "02",
    SINGLE: "00"
};

function toHex(value) {
    return _hexstr[Math.floor(value/16)] + _hexstr[value%16];
}

var TrackValue = function() {
    this.exists = false;
    this.volume = 0;
    this.pan = 0;
    this.sends = [];
    for(var i=0;i<8;i++) {
        this.sends.push(0);
    }
    this.color = "00";
};


function SliderControl() {
    this.isMixer = function() {
        return true;
    };
    this.values = function() {
        return;
    };
    this.setDisplay = function() {
    };
    this.hasSends = function() {
        return false;
    };
    this.getColor = function() {
        return;  
    };
}
