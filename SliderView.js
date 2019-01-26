

function SliderView(numTracks) {
    var stripStat =  [ "f000210915004d50000105", "00", "00", "00", "00","00", "00","00", "00","00", "00", "00", "00","00", "00","00", "00","f7" ];
    var stripValue =  [ "f000210915004d50000104","00", "00", "00", "00","00", "00","00", "00","f7" ];
    var hiddenStat = stripStat.join("");
    var barmode = BarModes.DUAL;
    var sliders = [];
    var sliderTouch = [];
    var touchCallback = null;
    
    function updateStrips() {
        for(var tindex=0;tindex<numTracks;tindex++) {
            stripStat[tindex*2+1] = sliders[tindex].mode;
            stripStat[tindex*2+2] = sliders[tindex].color;
        }
        host.getMidiOutPort(0).sendSysex(stripStat.join("")); 
    }
   
    this.setSliderColor = function(color ,index) { 
        sliders[index].color = color;
        stripStat[index*2+1] = sliders[index].mode;
        stripStat[index*2+2] = sliders[index].color;
        host.getMidiOutPort(0).sendSysex(stripStat.join("")); 
    };
    
    this.refresh = function() {
        host.getMidiOutPort(0).sendSysex(hiddenStat);
    };
    
    this.setStripValues = function(mode, values, trackValues) {
        barmode = mode;
        var tindex = 0;
        host.getMidiOutPort(0).sendSysex(hiddenStat);
        if(barmode === BarModes.DUAL) {
            host.getMidiOutPort(0).sendSysex(hiddenStat); 
            for(tindex=0;tindex<8;tindex++) {
                var volume = values(tindex);
                stripValue[tindex+1] = toHex(volume, true);                    
                sliders[tindex].sendValue(0, true);
            } 
            setTrackModes(BarModes.DUAL, trackValues);
            host.getMidiOutPort(0).sendSysex(stripValue.join("")); 
        } else {
            for(tindex=0;tindex<8;tindex++) {
                sliders[tindex].sendValue(values(tindex), true);
            }
           setTrackModes(barmode, trackValues);
         }
    };
    
    function setTrackModes(newmode, trackValues) {
        for(var tindex=0;tindex<numTracks;tindex++) { 
            if(trackValues[tindex].exists) {
                sliders[tindex].color = trackValues[tindex].color;
                sliders[tindex].mode = newmode;
            } else {
                sliders[tindex].color = trackValues[tindex].color;
                sliders[tindex].mode = BarModes.SINGLE;
            }
        }
        updateStrips();
    }
    
    this.setStripValue = function(value, index) {
        stripValue[index+1] = toHex(value);
        host.getMidiOutPort(0).sendSysex(stripValue.join("")); 
     };
 
    this.updateVu = function(value, index) {
        if(value < 127) {
            sliders[index].sendValue(value, true);
        }
    };
    
    this.updateValue = function(value, index) {
        sliders[index].sendValue(value, true);
    };
    
    this.updateValues = function(valueSource) {
        for(var i=0;i<numTracks;i++) {
            sliders[i].sendValue(valueSource(i), true);
        }
    };
    
    this.setTrackModes = function(modelArray, newmode)  {
        var mode = newmode !== undefined ? newmode : barmode;
        barmode = mode;
        for(var tindex=0;tindex<numTracks;tindex++) { 
            if(modelArray[tindex].exists) {
                sliders[tindex].color = modelArray[tindex].color;
                sliders[tindex].mode = mode;
            } else {
                sliders[tindex].color = modelArray[tindex].color;
                sliders[tindex].mode = BarModes.SINGLE;
            }
        }
        updateStrips();        
    };
    
    this.setTrackModeColor = function(color, newmode) {
        var mode = newmode !== undefined ? newmode : barmode;
        barmode = mode;
        for(var tindex=0;tindex<numTracks;tindex++) { 
            sliders[tindex].color = color;
            sliders[tindex].mode = barmode;
        }
        updateStrips();        
    };
    
    function registerSliderCallback(callback, index) {
        sliders[index].setCallback( function(value) {
            callback(value, sliders[index], index);    
        });        
    }
    
    this.assignSliderCallback = function(callback, touchcallback) {
        for(var i=0;i<numTracks;i++) {
            registerSliderCallback(callback, i);
        }
        touchCallback = touchcallback;
    };
   
    function registerTouch(touch, index) {
        var sliderIndex = index;
        touch.setCallback(function(value) {
            if(value > 0) {
                sliders[sliderIndex].touched = true;
            }
            if(touchCallback) {
                touchCallback(index, value);
            }
        });
    }
    
    (function() {
        for(var i=0;i<numTracks;i++) {
            var slider = controls.createSlider(ControlGroups.ENCODERS+i);
            slider.mode = BarModes.DUAL;
            slider.color = "00";
            slider.index = i;
            sliders.push(slider);
            sliderTouch.push(controls.createButton(ControlGroups.ENCODERS_TOUCH+i));
            sliders[i].touched = true;
            sliders[i].downValue = 0;
            registerSliderCallback(null, i);
            registerTouch(sliderTouch[i],i);
        }
    })();

}