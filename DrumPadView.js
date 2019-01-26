
/**
 * @param {NoteInput} noteInput
 * @param {Track} cursorTrack
 */

var _color_drums = [
	{ expr: /kick|bd/i, color: 4 },
	{ expr: /snare|sn|sd/i, color: 40 },
	{ expr: /tom|tm|strike/i, color: 12 },
	{ expr: /crash|crsh/i, color: 52 },
	{ expr: /ride|rd/i, color: 48 },
	{ expr: /hit|strike|metal/i, color: 44 },
	{ expr: /rim|rm|stick/i, color: 28 },
	{ expr: /shaker|tamb/i, color: 12 },
	{ expr: /glitch|fx|noise/i, color: 60 },
	{ expr: /clp|clap|hand|slap/i, color: 36 },
	{ expr: /(perc|cong|bong|ag)/i, color: 24 },
	{ expr: /(hat|hh|cl|closed|click)/i, color: 32 },
];

function nameToColor(name) {
	for (i = 0; i < _color_drums.length; i++) {
		if (_color_drums[i].expr.test(name)) {
			return _color_drums[i].color;
		}
	}
	return 74;
}

var DrumStepMode = {
	Single: { lanes: 1, steps: 32, factor: 4 },
	Quad: { lanes: 4, steps: 16, factor: 2 },
	Oct: { lanes: 8, steps: 8, factor: 1 },
};

function StepMap(initialIndex, values, labels, _baselength, _step) {
	var index = initialIndex;
	var basegrid = _baselength === undefined ? values : _baselength;
	var steps = _step === undefined ? 8 : _step;

	//println(" STEP MAP  <"+steps+"> "  + basegrid + " <= " + values);

	this.index = function () {
		return index;
	};

	this.setIndex = function (ind) {
		index = ind;
	};

	this.stepValue = function () {
		return values[index];
	};

	this.baseStepValue = function () {
		return basegrid[index];
	};

	this.nrOfSteps = function () {
		return steps;
	};

	this.change = function (inc) {
		if (index + inc >= 0 && index + inc < values.length) {
			index = index + inc;
			return true;
		}
		return false;
	};

	this.info = function () {
		return labels[index] + " Note";
	};
}


function DrumLane() {
	this.data = [];
	for (var i = 0; i < 32; i++) {
		this.data.push(0);
	}
}

function DrumPadView(noteInput, cursorTrack) {
	var active = false;

	var straightMap = new StepMap(4, [4.0, 2.0, 1.0, 0.5, 0.25, 0.125], ["Full", "1/2", "1/4", "1/8", "1/16", "1/32"]);
	var tripletMap = new StepMap(2, [4 / 3, 2 / 3, 1 / 3, 1 / 6], ["1/2T", "1/4T", "1/8T", "1/16T"], [1.0, 0.5, 0.25, 0.125], 6);

	var str2trip = [0, 0, 1, 2, 3, 3];
	var trip2str = [1, 2, 3, 4];

	var exitHandler = null;

	var gridMap = straightMap;

	var velMap = [1, 5, 10, 15,
		20, 30, 40, 50,
		60, 70, 80, 90,
		100, 110, 120, 127];
	var noteTable = [];
	var velTable = [];
	var fixedNotesOffTable = [];
	var colortable = []; // Base Note Color
	var colortableOffset = [];
	var noteToIndex = {};
	var nameMapping = {};
	var baseColor = 0;
	var pitchNamesSize = 0;
	var baseNote = 36;
	var selectedNoteIndex = 0;
	var selectedVelocityIndex = 15;
	var viewModifierStates = 0;
	var inStepMode = true;
	var playPos = -1;
	var stepData = [];
	var selectedColor = 0;
	/** @type {StepPositionView} */
	var stepLenView = null;

	var stepOffset = 0;

	var stepsEditor = 32;
	var stepsPerView = 32;

	var stepMode = DrumStepMode.Single;

	function initData() {
		for (var i = 0; i < 32; i++) {
			//stepData.push(0);
			stepData.push(new DrumLane());
		}
	}

	initData();

	/**
	 * @param {function} callback callback that exits the Step Mode
	 */
	this.setExitHandler = function (callback) {
		exitHandler = callback;
	};

	this.setOffset = function (offsetPos, macroOffset) {
		if (active) {
			stepOffset = offsetPos * stepsPerView + (macroOffset * 8 * stepsPerView);
			clip.scrollToStep(stepOffset);
		}
	};

	/**
	 * @returns {StepMap}
	 */
	this.gridMap = function () {
		return gridMap;
	};

	this.setStepLenView = function (view) {
		stepLenView = view;
	};

	this.setStepMode = function (active) {
		inStepMode = active;
	};

	this.modifyGrid = function (incValue, pressedModifier) {
		if (incValue === 0 && pressedModifier) {
			host.showPopupNotification("Drum Step Sequencer Grid set to " + gridMap.info());
		} else {
			gridMap.change(incValue);
			host.showPopupNotification("Drum Step Sequencer Grid set to " + gridMap.info());
			clip.setStepSize(gridMap.stepValue());
			stepsPerView = gridMap.nrOfSteps() * stepMode.factor;
			stepLenView.setStepSize(gridMap.stepValue(), stepsPerView);
			correctStepOffsetPosition();
		}
	};

	this.pushAction = function (value) {
		if (value === 0) {
			return;
		}
		if (gridMap === tripletMap) {
			gridMap = straightMap;
			gridMap.setIndex(trip2str[tripletMap.index()]);
		} else {
			gridMap = tripletMap;
			gridMap.setIndex(str2trip[straightMap.index()]);
		}
		host.showPopupNotification("Drum Step Sequencer Grid set to " + gridMap.info());
		clip.setStepSize(gridMap.stepValue());
		stepsPerView = gridMap.nrOfSteps() * stepMode.factor;
		stepLenView.setStepSize(gridMap.stepValue(), stepsPerView);
		correctStepOffsetPosition();
		updateStepArea();
	};

	var clip = host.createCursorClip(32, 4);
	clip.setStepSize(gridMap.stepValue());
	clip.addStepDataObserver(function (x, y, state) {
		stepData[y].data[x] = state;
		if (y === 0) {
			if (inStepMode && active) {
				updateStep(x);
			}
		}
	});

	clip.addPlayingStepObserver(function (newpos) {
		if (inStepMode && active) {
			// var pos = wrapPos(newpos);
			stepLenView.setPlayPos(newpos);
			if (playPos >= 0) {
				updateStep(playPos);
			}
			if (newpos >= stepOffset && newpos < stepOffset + stepsPerView) {
				controls.buttonMatrix.sendValue(wrapPos(newpos - stepOffset), 78, true);
			}
			playPos = newpos - stepOffset;
		}
	});

	clip.getLoopLength().addRawValueObserver(function (time) {
		loopLength = time;
		if (inStepMode && active) {
			stepLenView.setLoopLen(time);
			correctStepOffsetPosition();
		}
	});

	clip.getTrack().exists().addValueObserver(function (value) {
		if (!active || !inStepMode) { return; }
		if (!value) {
			if(exitHandler) 
				exitHandler();
		}
	});

	clip.getTrack().addTrackTypeObserver(16, "EMPTY", function (type) {
		if (!active || !inStepMode) { return; }
		if (type !== "Instrument") {
			if(exitHandler) 
				exitHandler();
		}
	});

	function initTables() {
		for (var i = 0; i < 128; i++) {
			noteTable.push(-1);
			fixedNotesOffTable.push(-1);
			velTable.push(120);
			colortable.push(0);
			colortableOffset.push(0);
		}
	}
	initTables();

	this.update = function () {
		updateColors();
		updateJam();
	};

	this.updateTrackColor = function (color) {
		baseColor = color;
		updateColors();
		updateJam();
	};

	this.updatePitchNames = function (size, mapping, key, name) {
		pitchNamesSize = size;
		nameMapping = mapping;
		var index = key - baseNote;
		if (index >= 0 && index < 16) {
			assigneNameToPadColor(index, name);
		}
	};

	function assigneNameToPadColor(padIndex, name) {
		var index = (7 - Math.floor(padIndex / 4)) * 8 + padIndex % 4 + 4;
		if (name) {
			colortable[index] = nameToColor(name);
		} else {
			colortable[index] = baseColor;
		}
		if (padIndex === selectedNoteIndex) {
			selectedColor = colortable[index];
		}
		if (active) {
			controls.buttonMatrix.sendValue(index, colortable[index] + colortableOffset[index], true);
		}
	}

	this.notifyShift = function (/*shiftDown*/) {
	};

	this.notifyModifier = function (modifierState) {
		if (active) {
			if (modifierState === 5) {
				globalClipView.duplicateContent(); // Duplicate + Shift
			} else if (viewModifierStates === 0 && modifierState > 0) {
				noteInput.setKeyTranslationTable(fixedNotesOffTable);
			} else if (viewModifierStates > 0 && modifierState === 0) {
				noteInput.setKeyTranslationTable(noteTable);
			}
		}
		viewModifierStates = modifierState;
	};

	this.enter = function () {
		active = true;
		stepsPerView = gridMap.nrOfSteps() * stepMode.factor;
		stepLenView.setStepSize(gridMap.stepValue(), stepsPerView);
		correctStepOffsetPosition();
		assignPads();
	};

	function correctStepOffsetPosition() {
		if (!inStepMode || stepOffset === 0) {
			return;
		}
		var stepPosition = stepOffset * gridMap.stepValue();
		if (stepPosition >= loopLength) {
			stepLenView.select(stepLenView.nrOfblocks() - 1, gridMap.nrOfSteps() * stepMode.factor);
			clip.scrollToStep(stepOffset);
		}
	}

	function updateColors() {
		var index = 0;
		var col = 0;
		for (row = 4; row < 8; row++) {
			for (col = 4; col < 8; col++) {
				index = row * 8 + col;
				var gridIndex = (7 - row) * 4 + col - 4;
				if (gridIndex === selectedNoteIndex) {
					colortableOffset[index] = 1;
				} else {
					colortableOffset[index] = 0;
				}
				var note = baseNote + gridIndex;
				if (nameMapping.hasOwnProperty(note)) {
					colortable[index] = nameToColor(nameMapping[note]);
				} else {
					colortable[index] = baseColor;
				}
				if (gridIndex === selectedNoteIndex) {
					selectedColor = colortable[index];
				}
			}
			for (col = 0; col < 4; col++) {
				index = row * 8 + col;
				colortable[index] = 0;
			}
		}
	}

	function assignPads() {
		noteToIndex = {};
		var noteIndex = 0;
		for (row = 4; row < 8; row++) {
			for (col = 4; col < 8; col++) {
				var noteRep = (7 - row) * 4 + col - 4 + baseNote;
				noteIndex = row * 8 + col + 22;
				noteTable[noteIndex] = noteRep;
				noteToIndex[noteRep] = noteIndex - 22;
				if (nameMapping.hasOwnProperty(noteRep)) {
					colortable[row * 8 + col] = nameToColor(nameMapping[noteRep]);
				}
			}
		}
		velTable[127] = velMap[selectedVelocityIndex];
		clip.scrollToKey(baseNote + selectedNoteIndex);
		if (active) {
			noteInput.setKeyTranslationTable(noteTable);
			noteInput.setVelocityTranslationTable(velTable);
		}
		updateJam();
	}
//hier mal schaun
	this.receiveNote = function (on, note /*, velocity */) {
		if (active) {
			if (note in noteToIndex) {
				var index = noteToIndex[note];

				var color = colortable[index];
				if (color === 0) {
					return;
				}
                                
				if (on) {
					controls.buttonMatrix.sendValue(index, color + 3);
				} else {
					controls.buttonMatrix.sendValue(index, color + colortableOffset[index]);
				}
			}
		}
	};

	this.exit = function () {
		active = false;
		for (var i = 22; i < 86; i++) {
			noteTable[i] = -1;
		}
		noteInput.setKeyTranslationTable(noteTable);
	};


	function fullUpdate() {
		assignPads();
		updateColors();
		updateJam();
		host.showPopupNotification("Drum Pad Mode Base Note " + NoteStr[baseNote % 12] + "  " + (Math.floor(baseNote / 12) - 1));
	}

	this.navigate = function (direction) {
		var newBaseNote = 0;
		switch (direction) {
			case DirectionPad.TOP:
				if (modifiers.isShiftDown()) {
					newBaseNote = baseNote + 4;
				} else {
					newBaseNote = baseNote + 16;
				}
				if (newBaseNote < 110) {
					baseNote = newBaseNote;
					fullUpdate();
				}
				break;
			case DirectionPad.DOWN:
				if (modifiers.isShiftDown()) {
					newBaseNote = baseNote - 4;
				} else {
					newBaseNote = baseNote - 16;
				}
				if (newBaseNote >= 0) {
					baseNote = newBaseNote;
					fullUpdate();
				}
				break;
			case DirectionPad.LEFT:
				if (modifiers.isShiftDown() || !inStepMode) {
					if (baseNote !== 36) {
						baseNote = 36;
						fullUpdate();
					}
				} else {
					stepLenView.stepLeft();
				}
				break;
			case DirectionPad.RIGHT:
				if (modifiers.isShiftDown() || !inStepMode) {
					if (baseNote !== 36) {
						baseNote = 36;
						fullUpdate();
					}
				} else {
					stepLenView.stepRight();
				}
				break;
		}
	};

	this.handleEvent = function (row, col, value) {
		if (!active) {
			return;
		}
		if (modifiers.isShiftDown()) {
			if (value === 0) {
				return;
			}
			applicationControl.exec(row * 8 + col);
			return;
		}
		if (row > 3 && col < 4) {
			var i = (7 - row) * 4 + col;
			velTable[127] = velMap[i];
			noteInput.setVelocityTranslationTable(velTable);
			if (i !== selectedVelocityIndex) {
				var index = row * 8 + col;
				var prevIndex = (7 - Math.floor(selectedVelocityIndex / 4)) * 8 + selectedVelocityIndex % 4;
				controls.buttonMatrix.sendValue(prevIndex, 40, true);
				controls.buttonMatrix.sendValue(index, 43, true);
				selectedVelocityIndex = i;
			}
			if (viewModifierStates > 0) {

			} else {
				if (value > 0) {
					noteInput.sendRawMidiEvent(0x90, baseNote + selectedNoteIndex, velMap[i]);
				} else {
					noteInput.sendRawMidiEvent(0x90, baseNote + selectedNoteIndex, 0);
				}
			}
		} else if (row > 3) {
			if (value === 0) {
				return;
			}
			var noteIndex = (7 - row) * 4 + (col - 4);
			if (selectedNoteIndex !== noteIndex) {
				var nindex = row * 8 + col;
				var nprevIndex = (7 - Math.floor(selectedNoteIndex / 4)) * 8 + selectedNoteIndex % 4 + 4;
				colortableOffset[nindex] = 1;
				colortableOffset[nprevIndex] = 0;
				selectedColor = colortable[nindex];
				controls.buttonMatrix.sendValue(nprevIndex, colortable[nprevIndex] + colortableOffset[nprevIndex], true);
				controls.buttonMatrix.sendValue(nindex, colortable[nindex] + colortableOffset[nindex], true);
				selectedNoteIndex = noteIndex;
				clip.scrollToKey(baseNote + selectedNoteIndex);
				updateAllSteps();
			}
		} else {
			if (inStepMode) {
				if (value > 0 && col < gridMap.nrOfSteps()) {
					var step = row * gridMap.nrOfSteps() + col;
					var loopLengthSteps = Math.floor(loopLength / gridMap.stepValue());

					if (step + stepOffset < loopLengthSteps) {
						if (stepData[0].data[row * gridMap.nrOfSteps() + col] === 0) {
							clip.setStep(step, 0, velMap[selectedVelocityIndex], gridMap.stepValue() * 0.99);
						} else {
							clip.clearStep(step, 0);
						}
					}
				}
			}
		}
	};

	function wrapPos(pos) {
		if (gridMap.nrOfSteps() === 6) {
			return Math.floor(pos / 6) * 8 + pos % 6;
		}
		return pos;
	}

	function updateStep(step) {
		if (stepMode.lanes === 1) {
			if (step >= stepMode.steps) {
				return;
			}
			var idx = wrapPos(step);
			if (idx > 31) {
				return;
			} else if (stepData[0].data[step] === 0) {
				controls.buttonMatrix.sendValue(idx, 0, true);
			} else if (stepData[0].data[step] === 1) {
				controls.buttonMatrix.sendValue(idx, selectedColor, true);
			} else if (stepData[0].data[step] === 2) {
				controls.buttonMatrix.sendValue(idx, selectedColor + 1, true);
			}
		}
	}

	function updateAllSteps() {
		if (!inStepMode) {
			return;
		}
		for (var i = 0; i < stepsEditor; i++) {
			updateStep(i);
		}
	}

	function updateStepArea() {
		for (var row = 0; row < 4; row++) {
			for (var col = 0; col < 8; col++) {
				var i = row * 8 + col;
				if (inStepMode) {
					updateStep(row * 8 + col);
					if (col >= gridMap.nrOfSteps()) {
						controls.buttonMatrix.sendValue(i, 0, true);
					}
				} else {
					controls.buttonMatrix.sendValue(i, 0, true);
				}
			}
		}
	}

	function updateJam() {
		if (active) {
			for (var row = 0; row < 8; row++) {
				for (var col = 0; col < 8; col++) {
					var i = row * 8 + col;
					if (row < 4) {
						if (inStepMode) {
							updateStep(i);
						} else {
							controls.buttonMatrix.sendValue(i, 0, true);
						}
					} else if (col < 4) {
						var velIndex = (7 - row) * 4 + col;
						if (velIndex === selectedVelocityIndex) {
							controls.buttonMatrix.sendValue(i, 43, true);
						} else {
							controls.buttonMatrix.sendValue(i, 40, true);
						}
					} else {
						controls.buttonMatrix.sendValue(i, colortable[i] + colortableOffset[i], true);
					}
				}
			}
		}
	}
}