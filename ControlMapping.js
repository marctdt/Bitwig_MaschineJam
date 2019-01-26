/**
 * 
 */
function ControlMapping() {
    this.controls = {};
    // Array Mapping 
    this.notemapping = {};

    /** @type {SliderModeHandler} */
    this.sliderBank = null;

    var fxNoteMapping = this.notemapping;
    var mapNoteMatrix = function(gridelement) {
        var mapping = null;
        if (!(gridelement.channel in fxNoteMapping)) {
            mapping = {};
            fxNoteMapping[gridelement.channel] = mapping;
        } else {
            mapping = fxNoteMapping[gridelement.channel];
        }
        var size = gridelement.size;
        for(var key=gridelement.basevalue; key < size+gridelement.basevalue;key++) {
            mapping[key] = gridelement; 
        }
    };
    
    this.buttonMatrix = new ButtonGrid("ButtonMatrix",GroupControlsId.BUTTON, ControlGroups.BUTTONMATRIX,0,8,8);

    this.sceneRow = new ButtonGrid("SceneRow",GroupControlsId.SCENE, ControlGroups.SCENE_ROW,1,1,8);
    this.groupRow = new ButtonGrid("GroupRow",GroupControlsId.GROUP,ControlGroups.GROUP_ROW,1,1,8);

    mapNoteMatrix(this.buttonMatrix); 
    mapNoteMatrix(this.sceneRow);
    mapNoteMatrix(this.groupRow);
    
    this.init = function() {
        this.buttonMatrix.init();
        this.sceneRow.init();
        this.groupRow.init();
    };
    
    this.exit = function() {
        //this.buttonMatrix.init(false);
        var midistatus = MIDI.NOTE << 4 | 0; 
        this.sliderBank.exit();
        for(var i=0;i<64;i++) {
            host.getMidiOutPort(0).sendMidi(midistatus, ControlGroups.BUTTONMATRIX+i, 0);
        }
        for(var key in this.controls) {
            if (this.controls.hasOwnProperty(key)) {
                this.controls[key].reset();
            } 
        }
    };

    this.createButton = function(ccNr) {
        var button = new Button(ccNr);
        this.controls[ccNr] = button;
        return button;
    };

    this.createSlider = function(ccNr) {
        var slider = new Slider(ccNr);
        this.controls[ccNr] = slider;
        return slider;
    };
    
    this.fullUpdate = function() {
        for(var ccNr in this.controls) {
            if (this.controls.hasOwnProperty(ccNr)) {
                this.controls[ccNr].resendLast();
            }
        }
        this.buttonMatrix.fullUpdate();
        this.sceneRow.fullUpdate();
        this.groupRow.fullUpdate();
    };

    /**
     * @param {function} callback receiving end of the MIDI Messages
     */
    this.setButtonMatrixCallback = function(callback) {
      this.buttonMatrixCallback = callback;
    };

    this.handleMidi = function(midistatus, midival1, midival2) {
        var channel = midistatus & 0xF;
        var type = midistatus >> 4;
        
        switch(type) {
            case MIDI.CC:
                if(channel === 0 && midival1 in this.controls) {
                   var button = this.controls[midival1];
                   button.doCallback(midival2, midival1);
                   return true;
               }
               break;
            case MIDI.NOTE:
                if(channel in this.notemapping && midival1 in this.notemapping[channel]) {
                    var gridelement = this.notemapping[channel][midival1];
                    if(gridelement) {
                        var coords = gridelement.toCoords(midival1);
                        if(this.buttonMatrixCallback !== undefined && typeof this.buttonMatrixCallback === 'function') {
                             this.buttonMatrixCallback(gridelement, coords[0], coords[1], midival2, midival1);
                        }
                        return true;
                    }
                }
                break;
        }
        return false;
    };
}

