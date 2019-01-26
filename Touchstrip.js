/**
 * 
 */
function Slider(midivalue, channel) {
    this.midivalue = midivalue;
    this.channel = channel === undefined ? 0 : channel;
    this.messageCallback = undefined;
    this.midistatus = MIDI.CC << 4 | this.channel;
    this.lastValue = -1;
   
    this.sendValue = function(value, queued) {
        if(this.lastValue != value) {
            if(queued) {
                queueMidi(this.midistatus, this.midivalue, value);
            } else {
                host.getMidiOutPort(0).sendMidi(this.midistatus, this.midivalue, value);
            }
            this.lastValue = value;
        } 
    };
    
    this.reset = function() {
         host.getMidiOutPort(0).sendMidi(this.midistatus, this.midivalue, 0); 
    };
    
    this.resendLast = function() {
        if(this.lastValue >= 0) {
            queueMidi(this.midistatus, this.midivalue, this.lastValue);
        }
    };
    
    this.doCallback = function(value) {
      if(this.messageCallback !== undefined && typeof this.messageCallback === 'function') {
         this.messageCallback(value, this.midivalue);
      }
    };
    
    this.setCallback = function(callback) {
        this.messageCallback = callback;
    }; 
}



