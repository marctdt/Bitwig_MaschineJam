/**
 *  ButtonGrid
 *
 *  **/

function ButtonGrid(name, id, basevalue, channel, rows, columns) {
    this.name = name;
    this.id = id;
    this.basevalue = basevalue;
    this.channel = channel;
    this.rows = rows;
    this.columns = columns;
    this.size = rows * columns;
    this.last_sent = [];
    this.basecolor = 0;
    for(var i=0;i<this.size;i++) {
        this.last_sent.push(0);
     }
    this.midistatus = MIDI.NOTE << 4 | this.channel;

    this.init = function(queued) {
        for(var i=0;i<this.size;i++) {
            this.sendValue(i,0,queued, true);
        }   
    };
    
    this.sendValue = function(index, value, queue, force ) {
      
        if(this.last_sent[index] != value || force) {
            if(queue) {
                queueMidi(this.midistatus, this.basevalue+index, value);
            } else {
                host.getMidiOutPort(0).sendMidi(this.midistatus, this.basevalue+index, value);
            }
            this.last_sent[index] = value;       
        }
    };
    
    this.fullUpdate = function() {
       
        for(var i=0;i<this.size;i++) {
            queueMidi(this.midistatus, this.basevalue+i, this.last_sent[i]);
        }
    };
    
    this.inRow = function(channel, midi1) {
        if(this.channel === channel && this.basevalue <= midi1 && midi1 < (this.basevalue + this.columns)) {
            return midi1-this.basevalue;
        }
        return undefined;
    };
    
    this.toCoords = function(midival) {
        var gridval = midival-this.basevalue;
        return [Math.floor(gridval/ this.rows), gridval%this.columns ];
    };
    
    this.showPattern = function(pattern, offset) {
        if(pattern.length != this.size) {
            return;
        }
        var port =  host.getMidiOutPort(0);
        var status = MIDI.NOTE << 4 | this.channel;
        for(var i = 0;i<this.size;i++) {
            var index = (i-(offset%8)*8);
            index = index >= 0 ? index : this.size+index;
            port.sendMidi(status, this.basevalue+i, pattern[index%this.size]); 
        }
    };    
}
