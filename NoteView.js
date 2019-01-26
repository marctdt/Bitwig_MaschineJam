/**
 * @param {NoteInput} noteInput
 */
function NoteView (noteInput) {
	var active = false;
	var noteTable = [];
	var velTable = [];
	var fixedNotesOffTable = [];
	var colortable = [];
	var oncolortable = [];
	var noteToIndex = {};

	var scales = [];
	scales.push({
		notes : [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ],
		name : "Chromatic"
	});
	scales.push({
		notes : [ 0, 2, 4, 5, 7, 9, 11 ],
		name : "Ionian/Major"
	});
	scales.push({
		notes : [ 0, 2, 3, 5, 7, 8, 10 ],
		name : "Aeolian/Minor"
	});
	scales.push({
		notes : [ 0, 2, 4, 7, 9 ],
		name : "Pentatonic"
	});
	scales.push({
		notes : [ 0, 3, 5, 7, 10 ],
		name : "Pentatonic Minor"
	});
	scales.push({
		notes : [ 0, 2, 3, 5, 7, 9, 10 ],
		name : "Dorian (B/g)"
	});
	scales.push({
		notes : [ 0, 1, 3, 5, 7, 8, 10 ],
		name : "Phrygian (A-flat/f)"
	});
	scales.push({
		notes : [ 0, 2, 4, 6, 7, 9, 11 ],
		name : "Lydian (D/e)"
	});
	scales.push({
		notes : [ 0, 2, 4, 5, 7, 9, 10 ],
		name : "Mixolydian (F/d)"
	});
	scales.push({
		notes : [ 0, 1, 3, 5, 6, 8, 10 ],
		name : "Locrian (D-flat/b-flat)"
	});
	scales.push({
		notes : [ 0, 2, 3, 5, 6, 8, 9, 10 ],
		name : "Diminished"
	});
	scales.push({
		notes : [ 0, 3, 4, 7, 9, 10 ],
		name : "Major Blues"
	});
	scales.push({
		notes : [ 0, 3, 4, 6, 7, 10 ],
		name : "Minor Blues"
	});
	scales.push({
		notes : [ 0, 2, 4, 6, 8, 10 ],
		name : "Whole"
	});
	scales.push({
		notes : [ 0, 2, 4, 5, 6, 8, 10 ],
		name : "Arabian"
	});
	scales.push({
		notes : [ 0, 2, 5, 7, 10 ],
		name : "Egyptian"
	});
	scales.push({
		notes : [ 0, 2, 3, 6, 7, 8, 11 ],
		name : "Gypsi"
	});
	scales.push({
		notes : [ 0, 1, 3, 4, 5, 7, 8, 10 ],
		name : "Spanish Scale"
	});

	var scaleIndex = 0;

	var baseNote = 12;
	var baseColor = 40;
	var baseNoteColor = 74;
	var baseNoteOnColor = 75;

    var documentState = host.getDocumentState();
	
	var blockTransposeChange = false;
	
    var docScales;
    var docBaseNote;
    var docVelocity;
	
    (function() {
		var scaleList = [];
       
		var i = 0;
	   
		for(i=0;i<scales.length;i++) {
			 scaleList.push(scales[i].name);
		}
		docScales = documentState.getEnumSetting("Scale", "Scale" , scaleList, scaleList[0]);
		docBaseNote = documentState.getEnumSetting("Base Note", "Scale", NoteStr, NoteStr[0]);
		docVelocity = documentState.getNumberSetting("Pad Velocity","Scale",1,127,1,"",120);
	 
		for (i = 0; i < 128; i++) {
			noteTable.push(-1);
			fixedNotesOffTable.push(-1);
			velTable.push(120);
			colortable.push(0);
			oncolortable.push(0);
		}
	})();
	
	noteInput.setShouldConsumeEvents(false);
	noteInput.setKeyTranslationTable(noteTable);
	noteInput.setVelocityTranslationTable(velTable);
	
    function findScaleByName(name) {
       for(var i=0;i<scales.length;i++) {
            if(scales[i].name === name) {
                return  { scale: scales[i] , index : i };
            }
       }
    }
    
    function findBaseNoteIndex(name) {
       for(var i=0;i<scales.length;i++) {
            if(NoteStr[i] === name) {
                return  i;
            }
       }
    }
    
    this.setScaleChangedCallback = function(callback) {
        scaleChangeListener = callback;
    };
    
    this.setBaseNoteChangedCallback = function(callback) {
        baseNoteChangedListener = callback;
    };
    
    docScales.addValueObserver(function(scalename) {
        var scale = findScaleByName(scalename);
        if(scale) {
            scaleIndex = scale.index;
            if(scaleChangeListener) {
                scaleChangeListener(scale.scale);
            }
            transpose(0);
        }
    });
    
    this.setBaseVelocityChangedCallback = function(callback) {
        baseVelocityChangedListener = callback;
    };
    
    docVelocity.addRawValueObserver(function(vel) {
        baseVelocity = vel;
        for (i = 0; i < 128; i++) {
			velTable[i] = baseVelocity;
        }
        noteInput.setVelocityTranslationTable(velTable);
        if(baseVelocityChangedListener) {
            baseVelocityChangedListener(vel);
        }
    });
    
    docBaseNote.addValueObserver(function(noteStr) {
        noteIndex = findBaseNoteIndex(noteStr);
        if(noteIndex >= 0) {
            baseNoteIndex = noteIndex;
            if(baseNote%12 !== baseNoteIndex) {
                if(!blockTransposeChange) {
                    transpose((noteIndex-baseNote%12));
                }
                if(baseNoteChangedListener) {
                    baseNoteChangedListener(noteIndex);
                }
               blockTransposeChange = false;
            }
        }
    });
    
    this.selectionModAction = function() {
    };
    		
	this.updatePitchNames = function(/*size, mapping*/) {
		
	};
	
	this.navigate = function(direction) {
		switch (direction) {
		case DirectionPad.TOP:
			if (modifiers.isShiftDown()) {
				this.doTranspose(1);
			} else {
				this.doTranspose(12);
			}
			break;
		case DirectionPad.DOWN:
			if (modifiers.isShiftDown()) {
				this.doTranspose(-1);
			} else {
				this.doTranspose(-12);
			}
			break;
		case DirectionPad.LEFT:
			this.changeScale(-1);
			break;
		case DirectionPad.RIGHT:
			this.changeScale(1);
			break;
		}
	};

	this.getScale = function() {
		return scales[scaleIndex];
	};
	
	this.getBaseNote = function() {
		return baseNote;
	};

	this.notifyModifier = function (modifierState) {
		if (active) {
			if (modifierState === 5) {
				globalClipView.duplicateContent(); // Duplicate + Shift
			} 
		}
	};

	this.notifyShift = function(shiftDown) {
		if (active) {
			if (shiftDown) {
				noteInput.setKeyTranslationTable(fixedNotesOffTable);
			} else {
				noteInput.setKeyTranslationTable(noteTable);
			}
		}
	};

    this.changeBaseNote = function(dir) {
        if(Math.abs(dir) !== 12 && dir !== 0) {
            var newBaseNote = baseNote + dir;
            if(newBaseNote >= 0 && newBaseNote < 128) {
               docBaseNote.set(NoteStr[newBaseNote%12]);
            }
        }
    };
    
    this.doTranspose = function(semitones) {
        if(Math.abs(semitones) !== 12 && semitones !== 0) {
            var newBaseNote = baseNote + semitones;
            if(newBaseNote >= 0 && newBaseNote < 128) {
                blockTransposeChange = true;
                docBaseNote.set(NoteStr[newBaseNote%12]);
            }
        }
		transpose(semitones);
		showCurrentScaleInfo();
	};

	function showCurrentScaleInfo() {
		host.showPopupNotification("Scale " + NoteStr[baseNote % 12] + "  " + (Math.floor(baseNote / 12) - 1) + " " + scales[scaleIndex].name);
	}

	this.scaleInfo = showCurrentScaleInfo;
	
	this.changeScale = function(dir) {
		if (dir > 0 && scaleIndex < scales.length - 1) {
			scaleIndex = scaleIndex + 1;
            docScales.set(scales[scaleIndex].name);
			if(active)
				showCurrentScaleInfo();
		} else if (dir < 0 && scaleIndex > 0) {
			scaleIndex = scaleIndex - 1;
            docScales.set(scales[scaleIndex].name);
            if(active)
                showCurrentScaleInfo();
		}
	};

	function transpose(semitones) {
		var tmpScale = scales[scaleIndex].notes;

		var newbase = baseNote + semitones;
		if (newbase < 0 || newbase + 64 > 127) {
			//println(" NOT Transposing Out of Range");
			return;
		}

		baseNote = newbase;
		noteToIndex = {}; 

		for (i = 0; i < 64; i++) {
			var octOffset = Math.floor((i + 4) / tmpScale.length);
			var index = (i + 4) % tmpScale.length;
			var notevalue = baseNote + tmpScale[index] + octOffset * 12;


			var rowIndex = Math.floor(i / 8);
			var colIndex = i % 8;
			var noteIndex =  (7 - rowIndex) * 8 + colIndex;


			if (notevalue > 127) {
				noteTable[22 + noteIndex] = -1;
			} else {
				noteTable[22 + noteIndex] = notevalue;
				noteToIndex[notevalue] = noteIndex; // probably needs to be list
			}

			if (notevalue > 127) {
				colortable[noteIndex] = 0;
				oncolortable[noteIndex] = 0;
			} else if (index === 0) {
				colortable[noteIndex] = baseNoteColor;
				oncolortable[noteIndex] = baseNoteOnColor;
			} else {
				colortable[noteIndex] = baseColor;
				oncolortable[noteIndex] = baseColor + 2;
			}
			if(active)
				controls.buttonMatrix.sendValue(noteIndex, colortable[noteIndex], true);
		}
		if(active)
			noteInput.setKeyTranslationTable(noteTable);
	}

   this.update = function () {
      this.updateJam();
   };

   this.updateJam = function() {
		for (var i = 0; i < 64; i++) {
			if (colortable[i] !== 0 && colortable[i] !== baseNoteColor) {
				colortable[i] = baseColor;
				oncolortable[i] = baseColor + 2;
			}
		}
		if (active) {
			for (i = 0; i < 64; i++) {
				if (colortable[i] !== 0 && colortable[i] !== baseNoteColor) {
					controls.buttonMatrix.sendValue(i, colortable[i], true);
				}
			}
		}
	};

	this.exit = function() {
		active = false;
		for (var i = 22; i < 86; i++) {
			noteTable[i] = -1;
		}
		noteInput.setKeyTranslationTable(noteTable);
	};

	this.updateTrackColor = function(color) {
		baseColor = color;
		this.updateJam();
	};

	this.receiveNote = function(on, note /*, velocity*/ ) {
		if (active) {
			if (note in noteToIndex) {
				var index = noteToIndex[note];

				var color = colortable[index];
				if (color === 0) {
					return;
				}
                                
				if (on) {
					controls.buttonMatrix.sendValue(index, oncolortable[index]);
				} else {
					controls.buttonMatrix.sendValue(index, color);
				}
			}
		}
	};

	this.enter = function() {
		active = true;
		showCurrentScaleInfo();
		transpose(0);
	};

	this.handleEvent = function(row, col, value) {
		var index = row * 8 + col;
		if(value === 0) {
			return;
		}

		if (modifiers.isShiftDown()) {
			applicationControl.exec(row * 8 + col);
			return;
		}

		var color = colortable[index];
		if (color === 0) {
			return;
		}
	};
}