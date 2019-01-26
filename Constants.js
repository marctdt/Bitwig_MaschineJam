function _ci(colorIndex) {
//    return [((colorIndex << 2) + 2), (colorIndex << 2)];
    return (colorIndex << 2);
}

var _fixColorTable = {
    13016944 : 16,
    5526612: 72,
    8026746: 72,
    13224393: 72,
    8817068 : 72,
    10713411 : 12,
    5726662 : 44,
    8686304 : 48,
    9783755 : 52,
    14235761 : 60,
    14233124 : 4,
    16733958 : 8,
    14261520 : 16,
    7575572 : 24,
    40263 : 28, // <*>
    42644 : 32,
    39385 : 40,
    12351216 : 52,
    14771857 : 60,
    15491415 : 64,
    16745278 : 12,
    14989134 : 16,
    10534988 : 24,
    4111202 : 32,
    4444857 : 36,
    4507903 : 40,
    8355711: 72
};

var _colorTable = {};

var ModifierMask = {
  Shift: 0x1,
  Select: 0x2,
  Duplicate: 0x4
};

var NoteStr = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];

function convertColor(red, green, blue) {
    if(red === 0 && green === 0 && blue === 0) {
        return 0;
    }
    var rv = Math.floor(red*255);
    var gv = Math.floor(green*255);
    var bv = Math.floor(blue*255);
    var lookupIndex = rv << 16 | gv << 8 | bv;
      
    if (lookupIndex in _fixColorTable){
        return _fixColorTable[lookupIndex];
    }
    if (lookupIndex in _colorTable) {
       return _colorTable[lookupIndex];
    }

    var hsb = rgbToHsb(rv,gv,bv);
    var hue = hsb[0];
    var sat = hsb[1];
    var bright = hsb[2];
    
    if (bright < 1 || sat < 3) {
        println(lookupIndex + ": " + 68 + ",");
        _colorTable[lookupIndex] = 68;
        return _colorTable[lookupIndex];
    }
    var off = 0;
    if ((bright+sat) < 22) {
        off = 1;
    }
    if (2 <= hue && hue <= 6 && bright < 13) {
        off = 2;
    }
    var color_index = Math.min(hue+off+1,16);
    var color = _ci(color_index);
    _colorTable[lookupIndex] = color;
    println(lookupIndex+" : " + color +",");
    return color;
}

function rgbToHsb(rv, gv, bv) {
    var rgb_max = Math.max(Math.max(rv, gv), bv);
    var rgb_min = Math.min(Math.min(rv, gv), bv);
    var bright = rgb_max;
    if (bright === 0) {
        return [0,0,0]; // Dark Dark Black
    }
    var sat = 255 * (rgb_max - rgb_min) / bright;
    if (sat ===  0){
        return [0,0,0]; // White
    }
    var hue = 0;
    if (rgb_max === rv) {
        hue = 0 + 43 * (gv - bv) / (rgb_max - rgb_min);
    }
    else if (rgb_max === gv) {
        hue = 85 + 43 * (bv - rv) / (rgb_max - rgb_min);
    }
    else {
        hue = 171 + 43 * (rv - gv) / (rgb_max - rgb_min);
    }
    if (hue < 0) {
        hue = 256 + hue;
    }
    return [Math.floor(hue / 16.0 + 0.3), sat >> 4, bright >> 4];   
}


var Pattern1 = [    0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 7, 7, 7, 7, 0, 0,
                    0, 0, 7, 7, 7, 7, 0, 0,
                    0,11,11,11,11,11,11, 0,
                    0,15,15, 0, 0,15,15, 0,
                    0,7,7, 0, 0,7,7, 0,
                    0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0, 0, 0, 0, 0
                    ];


var DirectionPad = {
    TOP: 40,
    LEFT: 42,
    RIGHT: 43,
    DOWN: 41
};

var ORIENTATION = {
   TrackBased : 1,
   SceneBased : 2
};

var ControlGroups = {
    BUTTONMATRIX :  22,
    SCENE_ROW: 0,  // These are Channel 2
    GROUP_ROW: 8,  // These are Channel 2
    ENCODERS: 8 ,
    ENCODERS_TOUCH: 20
};

var MIDI =  {
    CC: 11,
    NOTE: 9
};

var TRANSPORT_SECTION = {
    PLAY: 108,
    REC: 109,
    LEFT: 107,
    RIGHT: 104,
    TEMPO: 110,
    GRID: 113,
    SOLO: 111,
    MUTE: 112
};

var ENCODERBUTTON =  {
    MACRO: 90,
    LEVEL: 91,
    AUX: 92,
    CONTROL: 97,
    AUTO: 98
};

var MAIN_BUTTONS =  {
    ARRANGE: 30,
    STEP: 31,
    PAD: 32,
    CLEAR: 95,
    DUPLICATE: 96,
    NOTE_REPEAT: 94,
    SELECT: 80,
    BROWSE: 44,
    LOCK: 47,
    IN_BUTTON: 62,
    PERFORM: 45,
    SWING: 49,
    TUNE: 48
};

var MASTER_SECTION = {
    MST: 60,
    GRP: 61,
    CUE: 63,
    ENCODER: 86,
    ENCODER_BUTTON: 87,
    ENCODER_TOUCH: 88
};

var GroupControlsId = {
    BUTTON:1,
    SCENE:2,
    GROUP:3,
    CONTROLS: 4
};

var JAMColor = {
    OFF:0,
    RED:1,
    ORANGE:2,
    LIGHT_ORANGE:3,
    WARM_YELLOW:4,
    YELLOW:5,
    LIME:6,
    GREEN:7,
    MINT:8,
    CYAN:9,
    TURQUOISE:10,
    BLUE:11,
    PLUM:12,
    VIOLET:13,
    PURPLE:14,
    MAGENTA:15,
    FUCHSIA:16,
    WHITE:30
};

var JAMColorBase = {
    OFF:0,
    RED:4,
    ORANGE:8,
    LIGHT_ORANGE:12,
    WARM_YELLOW:16,
    YELLOW:20,
    LIME:24,
    GREEN:28,
    MINT:32,
    CYAN:36,
    TURQUOISE:40,
    BLUE:44,
    PLUM:48,
    VIOLET:52,
    PURPLE:56,
    MAGENTA:60,
    FUCHSIA:64,
    WHITE:68
};

var JAMColorVars = {
    DIM:0,
    DIMFL:1,
    BRIGHT:2,
    BRIGHTFL:3
};