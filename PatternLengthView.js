/**
 * @param {Clip} cursorClip
 */
function PatternLengthView(cursorClip) {
    var patternLength = 0;
    var active = false;
    var color = 0;
    var exitCallBack = null;
    
    this.canEnter = function() {
        return true;    
    };
    
    this.enter = function() {
		active = true;
        applicationControl.getApplication().focusPanelBelow();
        applicationControl.getApplication().zoomToFit();
        update();
	};
	
	this.exit = function() {
		active = false;
		if(exitCallBack) {
			exitCallBack();
		}
	};

    this.setColor = function(col) {
        color = col;
        update();
    };
    
    this.setExitCallback = function(callback) {
    	exitCallBack = callback;
    };
    
    function update() {
        if(!active) {
            return;
        }
        for(var i=0;i<64;i++){
            if(patternLength > 0 && i < patternLength) {
                controls.buttonMatrix.sendValue(i, color, true, false);
            } else {
                controls.buttonMatrix.sendValue(i, 0, true, false);
            }
        }
    }
    
    cursorClip.getLoopLength().addRawValueObserver(function(len) {
        patternLength = len/4;
        update();
    });
    
    this.handleEvent = function(row, col, value) {
        if (value === 0) {
            return;
        }
        var len = row*8 + col;
        cursorClip.getLoopLength().setRaw((len+1)*4);
        applicationControl.getApplication().focusPanelBelow();
        applicationControl.getApplication().zoomToFit();
    };

}
