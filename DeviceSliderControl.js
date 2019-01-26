function ParameterPageValue(index) {
    this.name = "";
    this.id = "";
    this.value = 0.0;
    this.empty = true;
    this.index = function() {
        return index;
    };
    this.intVal = function() {
        if(isNaN(this.value)) {
            return 0;
        }
        return Math.floor(127*this.value);
    };
}

/**
 * @classdesc Represents the Device Control
 * @class
 * @augments SliderControl
 * 
 * @param {Device} cursorDevice
 * @param {TrackHandler} trackHandler
 * */
function DeviceSliderControl(cursorDevice) {
    SliderControl.call(this);
    this.vuActive = false;
    var macrovalues = [];
    var mode;
    /** @type {SliderView} */
    var display = null;
    var currentTrackColor = "00";
    
    /** @type {ParameterPageValue[]} */
    var parameterSelection = [];
    var parameterNames = {};
    var parameterValues = {};
    var parameterOffset = 0;
    var parameterIds = [];
    var idToPageValue = {};
    var deviceName ="/NODEVICE/";
    var macroVisible = false;
    var maxOffset = 0;
    
    var deviceToOffsetMap = {};
        
    this.updateTrackColor = function(color) {
        currentTrackColor = toHex(color);
        if(display && (mode === ControlModes.DEVICE || mode === ControlModes.MACRO)) {
            display.setTrackModeColor(currentTrackColor, BarModes.SINGLE);
        }        
    };
        
    this.showParamAssignments = function() {
        if(mode !== ControlModes.DEVICE) {
            return;
        }
        var s = "";
        for(var i=0;i<parameterSelection.length;i++) {
            if(!parameterSelection[i].empty) {
               s += (i+1) + " [" + parameterSelection[i].name + "] ";
            }
        }
        host.showPopupNotification(deviceName + " :   " + s);
    };
    
    var showAssignments = this.showParamAssignments;
    
    this.updateSliders = function() {
        if(display) {
            display.setTrackModeColor(currentTrackColor, BarModes.SINGLE);
            var i;
            if(mode === ControlModes.MACRO) {
                for(i=0;i<8;i++) {
                    display.updateValue(macrovalues[i], i);
                }
            } else if(mode === ControlModes.DEVICE) {
                for( i=0;i<8;i++) {
                    if(parameterSelection[i].empty) {
                        display.updateValue(0, i);
                   } else {
                        display.updateValue(parameterSelection[i].intVal(), i);
                   }
                 }
            }
        }
    };
    
    this.setMacroValue = function(index, value)  {
        cursorDevice.getMacro(index).getAmount().set(value,128);
    }; 
    
    this.getMacroValue = function(index) {
        return macrovalues[index];
    };

    this.values = function() {
        return macrovalues;
    };

    this.setDisplay = function(asliderdisplay) {
        display = asliderdisplay;
    };
    
    this.canGoRight = function() {
        return parameterOffset < maxOffset;
    };
    
    this.canGoLeft = function() {
        return parameterOffset >= 8;
    };
    
    function updateSliderValues() {
        if(display && mode === ControlModes.DEVICE) {
            for( i=0;i<8;i++) {
                if(parameterSelection[i].empty) {
                    display.updateValue(0, i);
               } else {
                    display.updateValue(parameterSelection[i].intVal(), i);
               }
            }
        }
    }
    
    this.navigateParameter = function(dir) {
        if(mode === ControlModes.DEVICE) {
            if(dir > 0 && parameterOffset < maxOffset) {
                parameterOffset += 8;
                assignParameterPage();
                updateSliderValues();
                showAssignments();
                transport.updateNavButton();
            } else if(dir < 0 && parameterOffset >= 8) {
                parameterOffset -= 8;
                assignParameterPage();
                updateSliderValues();
                showAssignments();
                transport.updateNavButton();
            }
        }
    };
    
    cursorDevice.isMacroSectionVisible().addValueObserver(function(visible){
        macroVisible = visible;
    });
        
    this.hasDevice = function() {
        return deviceName !== "/NODEVICE/";
    };
    
    this.setMode = function(ctrlMode) {
        mode = ctrlMode;
        if(deviceName === "/NODEVICE/") {
            // println(" No Device Selected ");
        }
        if(mode === ControlModes.MACRO) {
            cursorDevice.isMacroSectionVisible().set(true);
        } else {
            cursorDevice.isMacroSectionVisible().set(false);
        }
        if(mode === ControlModes.DEVICE) {
            transport.activateParameterNavMode();
        } else {
            transport.deactivateParameterNavMode();
        }
    };
    
    this.isMixer = function() {
        return false;
    };  

    this.setDeviceValue = function(index, value) {
        if(!parameterSelection[index].empty) {
           cursorDevice.setDirectParameterValueNormalized(parameterSelection[index].id, value, 128);            
        }
    };
    
    function assignParameterPage() {
        idToPageValue = {};
        for(var i=0;i<8;i++) {
            if((i+parameterOffset) < parameterIds.length) {
                var id = parameterIds[i+parameterOffset];
                parameterSelection[i].empty = false;
                parameterSelection[i].id = id;
                parameterSelection[i].name= parameterNames[id];
                parameterSelection[i].value= parameterValues[id];
                idToPageValue[id] = parameterSelection[i];
             } else {
                parameterSelection[i].empty = true;
                parameterSelection[i].id = null; 
            }
        }
    }
    
    cursorDevice.addNameObserver(16, "/NODEVICE/", function(name){
        //println(" ###### " + name + " ######### ");
        if(deviceName !== "/NODEVICE/") {
            deviceToOffsetMap[deviceName] = parameterOffset;
        }
        deviceName = name;
        if(deviceName !== "/NODEVICE/") {
            parameterOffset = deviceToOffsetMap[deviceName] !== undefined ? deviceToOffsetMap[deviceName]:0;
        }
    });
    
    cursorDevice.addDirectParameterIdObserver(function(ids){
        parameterIds = ids;
        maxOffset = Math.max(ids.length - 8,0);
        assignParameterPage();
        parameterNames = {};
        parameterValues = {};
        if(display && mode === ControlModes.DEVICE) {
            updateSliderValues();
            transport.updateNavButton();
        }
    });
    
    cursorDevice.addDirectParameterNameObserver(20, function(id,name) {
        parameterNames[id] = name;
        if(id in idToPageValue) {
            idToPageValue[id].name = name;
        }
    });
    
    cursorDevice.addDirectParameterNormalizedValueObserver(function(id,value){
        parameterValues[id] = value;
        if(id in idToPageValue) {
            var paramSel = idToPageValue[id];
            paramSel.value = value;
            //println(" ["+idToPageValue[id].name+"] = " + idToPageValue[id].value);
            if(display && mode === ControlModes.DEVICE) {
                display.updateValue(paramSel.intVal(), paramSel.index());
            }
        }
    });
    
   /**
     * @param {int} macroindex
     * @param {Macro} macro
     */
    function registerMacro(macroindex, macro) {
        macro.getAmount().addValueObserver(128,
            function(value) {
                macrovalues[macroindex] = value;
                if(display && mode === ControlModes.MACRO) {
                     display.updateValue(value, macroindex);
                } 
            });
    }
    
    (function() {
        for(var i=0;i<8;i++) {
            macrovalues.push(0);
            parameterSelection.push(new ParameterPageValue(i));
            registerMacro(i,cursorDevice.getMacro(i));
        }
    })();
}
