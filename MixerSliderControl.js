 /**
 * @classdesc Represents a Touchstrip View that controls Mixer Values
 * @class
 * @augments SliderControl
 * 
 * @param {TrackBankContainer} trackBankContainer
 * @param {boolean} hasSends
 */
function MixerSliderControl(name, trackBankContainer, sendBank) {
    SliderControl.call(this);
    /** @type {TrackValue} */
    var trackValues = [];
    var sendIndex = 0;
    var sendExsits = [];
    /** @type {SliderView} */
    var display = null;
    var mode = ControlModes.VOLUME;
    var vuActive = true;
    var numOfSends = 0;
    
    var sendsToZeroListener = null;
  
    this.setDisplay = function(asliderdisplay) {
        display = asliderdisplay;
    };
    
    /**
     * @param {function} listener a function that is invoke as soon as the number of
     * sends is reduced > 0 to 0
     **/
    this.setSendsToZeroListener = function(listener) {
        sendsToZeroListener = listener;
    };
    
    this.hasSends = function() {
        return sendBank !== undefined;
    };
    
    this.values = function() {
        return trackValues;
    };

    this.setMode = function(ctrlMode) {
        mode = ctrlMode;
        vuActive = ctrlMode === ControlModes.VOLUME;
    };
    
    this.getVolume = function(index) {
        return trackValues[index].volume;
    };
    
    this.getPan = function(index) {
        return trackValues[index].pan;
    };
    
    this.setSendLevel = function(index, value) {
        trackBankContainer.getTrack(index).getSend(sendIndex).set(value,128);
    };
    
    this.getSendValue = function(index) {
        return trackValues[index].sends[sendIndex];
    };
    
    this.setVolume = function(index, value) {
        if(value >= 0 && value < 128) {
            trackBankContainer.getTrack(index).getVolume().set(value,128);
        }
    };
    
    this.cleanUpView = function(index , lastvalue) {
        display.setStripValue(lastvalue, index);
    };
    
    this.numberOfSends = function() {
        return numOfSends;
    };

    this.setPan= function(index, value) {
        if(value >= 0 && value < 128) {
            trackBankContainer.getTrack(index).getPan().set(value,128);
        }
    };
    
    this.getColor = function(index) {
        return trackValues[index].color;
    };
    
    this.incrementSendIndex = function() {
        var nextIndex = (sendIndex+1) % numOfSends;
        if(nextIndex !== sendIndex) {
            sendIndex = nextIndex;
            this.showSendIndex();
            if(display &&  mode === ControlModes.AUX) {
                display.updateValues(this.getSendValue);
            }
        }
    };

    this.showSendIndex = function(){
        host.showPopupNotification("Touchstrip controls Send S"+(sendIndex+1));        
    };
   
    // For internal use in the following closure situation
    var getSendValue = this.getSendValue;
    
    function assignSends(sendTrack, index) {
        sendTrack.exists().addValueObserver(function(exists) {
            sendExsits[index] = exists;
            maxSends = 0;
            for(var i=0;i<8;i++) {
                maxSends += sendExsits[i] ? 1 : 0; 
            }
            if(numOfSends > 0 && maxSends === 0) {
                if(sendsToZeroListener) {
                     sendsToZeroListener();
                }
            }
            numOfSends = maxSends;
            var nextIndex = Math.min(sendIndex,Math.max(numOfSends-1,1));
            if(nextIndex !== sendIndex) {
                sendIndex = nextIndex;
                if(display &&  mode === ControlModes.AUX) {
                    display.updateValues(getSendValue);  
                } 
            }
        });
    }
    
    if(sendBank) {
        (function(){
            for(var i=0;i<8;i++) { 
                var sendTack = sendBank.getChannel(i);
                sendExsits.push(false);
                assignSends(sendTack, i);
            }
        })();   
    }
    
    function registerSend(track, tindex, sndIndex) {
        var send = track.getSend(sndIndex);
        send.addValueObserver(128, function(value) { 
            trackValues[tindex].sends[sndIndex] = value;
            if(display && mode === ControlModes.AUX && sendIndex === sndIndex) {
                display.updateValue(value, tindex); 
            }
        });
     }
    
    /**
     * @param {Track} track
     * @param {int} tindex
     */
    function registerTrack(track, index) {

        if(sendBank) {
            for(var sndIndex=0;sndIndex<8;sndIndex++) {
                registerSend(track, index, sndIndex);
            }
        }
        
        track.exists().addValueObserver(function(exists) {
            trackValues[index].exists = exists;
            if(display) {
               display.setTrackModes(trackValues);                
            } 
        });
         
        track.addColorObserver(function( red, green, blue) {
            trackValues[index].color = toHex(convertColor(red,green,blue));
            if(display) {
                display.setSliderColor(trackValues[index].color, index);
            }
         });
        
        track.getVolume().addValueObserver (128,function(value) { 
            trackValues[index].volume = value;
            if(display && mode === ControlModes.VOLUME) {
                display.setStripValue(value, index);
            } 
        });
        track.addVuMeterObserver (128,-1, true, function(value) { 
            if (!vuActive) {
                return;  
            }
            if(display) {
                display.updateVu(value, index);
            }
        });
        track.getPan().addValueObserver (128,function(value) {
            trackValues[index].pan = value;
            if(display && mode === ControlModes.PAN) {
                display.updateValue(value, index); 
            } 
        });
    }
    
    (function() {
        for(var i=0;i<trackBankContainer.size;i++) {
            trackValues.push(new TrackValue());
            registerTrack(trackBankContainer.getTrack(i),i);
        }
    })();

}
