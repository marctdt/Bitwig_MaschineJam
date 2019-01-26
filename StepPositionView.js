function StepPositionView() {
	var active = false;
	var loopLen = 0;
	var playingPos = -1;
	var blocks = 0;
	var mBlocks = 0;
	var baseColor = 0;
	var selPos = 0;
	var mSelPos = 0;
	var offsetListener = null;
    var stepsShown = 8;
	var stepSize = 0.25;
	var zoomOut = false;
		
	this.enter = function() {
		active = true;
		update();
	};
	
	this.notifyShift = function(shift) {
		if(!active) {
			return;
		}
		if(shift) {
			zoomOut = true;
			update();
		} else {
			zoomOut = false;
			update();
		}
	};
	
	this.setBaseColor = function(color) {
		baseColor = color;
		update();
	};
    
    this.setSteps = function(val) {
        stepsShown = val;
        this.setLoopLen(loopLen);
    };
	
	this.setOffsetListener = function(listener) {
		offsetListener = listener;
	};
	
	this.stepLeft = function() {
		if(selPos > 0) {
			this.select(selPos-1);
		} else {
			this.select(blocks-1);
		}
	};
	
	this.stepRight = function() {
		if(selPos+1 < blocks) {
			this.select(selPos+1);
		} else {
			this.select(0);
		}
	};
	
	this.handleEvent = function(index, value) {
		if(value === 0) {
			return;
		}
		if(zoomOut) {
			if(index < mBlocks && index !== mSelPos) {
				mSelPos = index;
				offsetListener.setOffset(selPos,mSelPos);
				update();
			}
		} else {
			if(index < blocks && index !== selPos) {
				selPos = index;
				offsetListener.setOffset(selPos,mSelPos);
				update();
			}
		}
	};
	
	this.select = function(index, force) {
		if(index < blocks && (index !== selPos || force)) {
			selPos = index;
			offsetListener.setOffset(selPos, mSelPos);
			update();
		}
	};
	
	this.nrOfblocks = function() {
		return blocks;
	};
	
	var update = function() {
		var i = 0;
		if(zoomOut) {
			for(i=0;i<8;i++) {
				if(i<mBlocks) {
					sendToJam(i, 72 + (Math.ceil(playingPos/8)===(i+1) ? 3: (i===mSelPos) ? 2 : 0));
				} else {
					sendToJam(i, 0);
				}
			}
		} else {
			var viewBlocks = Math.min(blocks - mSelPos*8,8);
			var viewPos = playingPos - mSelPos*8;
			
			for(i=0;i<8;i++) {
				if(i<viewBlocks) {
					sendToJam(i, baseColor + (viewPos===(i+1) ? 3: (i===selPos) ? 2 : 0));
				} else {
					sendToJam(i, 0);
				}
			}
		}
	};
	
	this.update = update;
	
	this.setPlayPos = function(playpos) {
		if(playpos < 0) {
			playingPos = -1;
			update();
		} else { 
			playingPos = Math.ceil((playpos+1) / stepsShown);
			update(); 
		}
	};
	
	this.setStepSize = function(size, pstepPerView) {
		stepSize = size;
		stepsShown = pstepPerView !== undefined ? pstepPerView : 8;
		this.setLoopLen(loopLen);
	};
	
	this.setLoopLen = function(time) {
		loopLen = time;
		if(time === 0) {
			blocks = 0;
			mBlocks = 0;
		} else {
			blocks = Math.ceil(time * (1/stepSize) / stepsShown);
			mBlocks =  Math.ceil(time * (1/stepSize) / (stepsShown*8));
		}
		if(selPos >= blocks) {
			selPos = Math.max(0,blocks-1);
		}
		if(mSelPos >= mBlocks) {
			mSelPos = Math.max(0,mBlocks-1);
		}
		update();
	};

	this.exit = function() {
		active = false;
	};

	var sendToJam = function(index, color) {
		if (!active) {
			return;
		}
		controls.sceneRow.sendValue(index, color);
	};
}