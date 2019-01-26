/**
 * @param {Clip} clip 
 * @param {NoteView2} noteview
 */

function StepGrid(stepIndex) {
	var states = [];

	(function () {
		for (var i = 0; i < 8; i++) {
			states.push(0);
		}
	})();

	this.states = states;

	this.index = function () {
		return stepIndex;
	};
}

function StepNote(rowindex) {
	this.index = function () {
		return rowindex;
	};
	this.isbaseNote = false;
	this.notevalue = 0;
}

/**
 * @param {Clip} clip
 * @param {NoteView2} noteview
 * 
 */
function StepView(clip, noteview, exitHandler) {
	var active = false;
	var baseColor = 0;
	var loopLen = 0;
	var playingPos = -1;
	/** @type {StepPositionView} */
	var stepLenView = null;
	var gateLength = 0.99;

	var exitHandler = null;

	var baseVelocity = 120;

	var monoMode = false;

	var straightMap = new StepMap(4, [4.0, 2.0, 1.0, 0.5, 0.25, 0.125], ["Full", "1/2", "1/4", "1/8", "1/16", "1/32"]);
	var tripletMap = new StepMap(2, [4 / 3, 2 / 3, 1 / 3, 1 / 6], ["1/2T", "1/4T", "1/8T", "1/16T"], [1.0, 0.5, 0.25, 0.125], 6);
	var str2trip = [0, 0, 1, 2, 3, 3];
	var trip2str = [1, 2, 3, 4];

	var gridMap = straightMap;

	// Represents State of Steps in current Grid
	var steps = [];
	// Represents Mapping of Notes to the 8 rows
	var notegrid = [];
	// Current Complete Scale Grid 
	var scalegrid = [];
	// Current Base Note Grid
	var basegrid = [];
	// Maps Note value to Grid Index
	var noteToIndex = {};
	// Remembers collumn note held for row in index
	var lastHoldDown = [];

	var fullNoteMapping = [];

	(function () {
		for (var i = 0; i < 8; i++) {
			steps.push(new StepGrid(i));
			notegrid.push(new StepNote(i));
			lastHoldDown.push(-1);
			var notesArray = [];
			for (var j = 0; j < 128; j++) {
				notesArray.push(0);
			}
			fullNoteMapping.push(notesArray);
		}
	})();

	var notePos = 60;

	var scale = noteview.getScale();
	var baseNote = noteview.getBaseNote() % 12;

	var scalegridindex = -1;
	var offset = 0;
	var headInView = false;
	var loopSteps = 0;

	noteview.setScaleChangedCallback(function (newscale) {
		scale = newscale;
		baseNote = noteview.getBaseNote() % 12;
		showCurrentScale();
		setScale(scale);
		refreshScaleIndex();
		resendColors();
	});

	function notePosToBaseNote(currentNotePos, pBaseNote) {
		var newPos = currentNotePos;
		while (newPos % 12 !== pBaseNote) {
			newPos++;
		}
		return newPos;
	}

	noteview.setBaseVelocityChangedCallback(function (newvelocity) {
		baseVelocity = newvelocity;
	});

	noteview.setBaseNoteChangedCallback(function (/*baseNoteIndex*/) {
		scale = noteview.getScale();
		baseNote = noteview.getBaseNote() % 12;
		notePos = scalegrid[scalegridindex];
		scalegridindex = scalegridindex - (scalegridindex % scale.notes.length);
		notePos = notePosToBaseNote(notePos, baseNote);
		setScale(scale);

		refreshScaleIndex();
		resendColors();
		showCurrentScale();
	});

	this.setExitHandler = function(callback) {
		exitHandler = callback;
	};

	clip.addStepDataObserver(function (x, y, state) {
		fullNoteMapping[x][y] = state;
		if (y in noteToIndex) {
			var noteindex = noteToIndex[y];
			steps[x].states[noteindex] = state;
			updateGrid(x, noteindex);
		}
	});

	clip.addPlayingStepObserver(function (playpos) {
		if (active) {
			setPlayPos(playpos);
			stepLenView.setPlayPos(playpos);
		}
	});

	clip.getLoopLength().addRawValueObserver(function (time) {
		loopLength = time;
		setLoopLen(time);
		stepLenView.setLoopLen(time);
		correctStepOffsetPosition();
	});

	var track = clip.getTrack();

	track.exists().addValueObserver(function (value) {
		if (!active) { return; }
		if (!value) {
			if(exitHandler) 
				exitHandler();
		}
	});

	track.addTrackTypeObserver(16, "EMPTY", function (type) {
		if (!active) { return; }
		if (type !== "Instrument") {
			if(exitHandler) 
				exitHandler();
		}
	});

	this.inMonoMode = function () {
		return monoMode;
	};

	function resetHold() {
		for (var i = 0; i < 8; i++) {
			lastHoldDown[i] = -1;
		}
	}

	this.notifyModifier = function (modifierState) {
		if (modifierState === 3) {
			// SHIFT + SELECT
			this.scrollNoteIntoView();
		}

		if(modifierState === 4) {
			clip.duplicate(); // Duplicate
		} else if (modifierState === 5) {
			clip.duplicateContent(); // Duplicate + Shift
		}
	};

	this.handleLockButton = function (value) {
		if (value === 0) {
			return;
		}
		if (monoMode) {
			monoMode = false;
			modifiers.setLockButtonState(false);
			host.showPopupNotification("Step Sequencer in Poly Mode");
		} else {
			monoMode = true;
			modifiers.setLockButtonState(true);
			host.showPopupNotification("Step Sequencer in Mono Mode");
		}
	};

	this.receiveNote = function (on, note, velocity) {
	};

	this.modifyGrid = function (incValue, touchModifier) {
		if (incValue === 0 && touchModifier) {
			host.showPopupNotification("Piano Roll Step Sequencer Grid set to " + gridMap.info());
		} else {
			gridMap.change(incValue);
			host.showPopupNotification("Piano Roll  Step Sequencer Grid set to " + gridMap.info());
			clip.setStepSize(gridMap.stepValue());
			loopSteps = (loopLength / gridMap.stepValue());
			stepLenView.setStepSize(gridMap.stepValue(), gridMap.nrOfSteps());
			correctStepOffsetPosition();
			resendColors();
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
		host.showPopupNotification("Piano Roll  Step Sequencer Grid set to " + gridMap.info());
		clip.setStepSize(gridMap.stepValue());
		loopSteps = (loopLength / gridMap.stepValue());
		stepLenView.setStepSize(gridMap.stepValue(), gridMap.nrOfSteps());
		resendColors();
		correctStepOffsetPosition();
	};


	function setBaseColor(color) {
		baseColor = color;
		resendColors();
	}

	clip.setStepSize(gridMap.stepValue());
	clip.addColorObserver(function (red, green, blue) {
		var color = convertColor(red, green, blue);
		setBaseColor(color);
		stepLenView.setBaseColor(color);
		globalClipView.clipColorChanged(color);
	});

	this.setStepLenView = function (view) {
		stepLenView = view;
	};

	/**
	 * @returns {StepMap}
	 */
	this.gridMap = function () {
		return gridMap;
	};

	function correctStepOffsetPosition() {
		if (offset === 0) {
			return;
		}
		var stepPosition = offset * gridMap.stepValue();
		if (stepPosition >= loopLength) {
			stepLenView.select(stepLenView.nrOfblocks() - 1, true);
		}
	}

	var updateGrid = function (pos, noteindex) {
		if (!active) {
			return;
		}

		var state = steps[pos].states[noteindex];
		color = 0;

		if (pos + offset >= loopSteps || pos >= gridMap.nrOfSteps()) {
			color = 0;
		} else if (pos === (playingPos - offset)) {
			color = 70;
		} else if (state === 0) {
			color = notegrid[noteindex].isbaseNote ? 69 : 0;
		} else if (state === 1) {
			color = baseColor;
		} else {
			color = baseColor + 2;
		}
		controls.buttonMatrix.sendValue((7 - noteindex) * 8 + pos, color, true, true);
	};

	function refreshScaleIndex() {
		noteToIndex = {};
		var nind = 0;
		for (nind = 0; nind < 8; nind++) {
			notegrid[nind].isbaseNote = basegrid[scalegridindex + nind];
			notegrid[nind].notevalue = scalegrid[scalegridindex + nind];
			noteToIndex[scalegrid[scalegridindex + nind]] = nind;
		}
		for (step = 0; step < 8; step++) {
			for (nind = 0; nind < 8; nind++) {
				steps[step].states[nind] = fullNoteMapping[step][notegrid[nind].notevalue];
			}
		}
		resetHold();
	}

	function setScale(scale) {
		scalegrid = [];
		basegrid = [];
		scalegridindex = -1;
		var octave = -1;
		var notevalue = 0;
		var i = 0;
		while (notevalue < 127) {
			notevalue = scale.notes[i] + 12 * octave + baseNote;
			if (notevalue >= 0 && notevalue < 128) {
				scalegrid.push(notevalue);
				basegrid.push(i === 0 ? true : false);
				if (notevalue === notePos) {
					scalegridindex = scalegrid.length - 1;
				} else if (scalegridindex === -1 && notePos < notevalue) {
					scalegridindex = scalegrid.length - 1;
					notePos = scalegrid[Math.max(0, scalegrid.length - 2)];
				}
			}
			if (notevalue > 127) {
				break;
			}
			i++;
			if (i >= scale.notes.length) {
				i = 0;
				octave++;
			}
		}
	}

	this.setOffset = function (offsetPos, macroOffset) {
		offset = offsetPos * gridMap.nrOfSteps() + macroOffset * gridMap.nrOfSteps() * 8;
		clip.scrollToStep(offset);
		resendColors();
	};

	function updatePlayPos(previous, newpos) {
		var pos = 0;
		var row = 0;
		if (previous >= 0) {
			pos = previous % gridMap.nrOfSteps();
			for (row = 0; row < 8; row++) {
				updateGrid(pos, row);
			}
		}
		if (newpos >= 0) {
			pos = newpos % gridMap.nrOfSteps();
			for (row = 0; row < 8; row++) {
				updateGrid(pos, row);
			}
		}
	}

	function setPlayPos(pos) {
		if (!active) {
			return;
		}
		var prev = playingPos;
		playingPos = pos;
		if (pos >= offset && pos < (offset + gridMap.nrOfSteps())) {
			updatePlayPos(prev, playingPos);
			headInView = true;
		} else if (headInView) {
			updatePlayPos(prev, -1);
			headInView = false;
		}
	}

	function setLoopLen(time) {
		loopLen = time;
		var maxOffset = Math.max(0, (loopLen / gridMap.baseStepValue()) - gridMap.nrOfSteps());
		loopSteps = (loopLength / gridMap.stepValue());
		prev = -1;
		if (offset > maxOffset) {
			offset = maxOffset;
			clip.scrollToStep(offset);
		}
		resendColors();
	}

	this.update = function () {
		resendColors();
	};

	var resendColors = function () {
		if (!active) {
			return;
		}
		for (var row = 0; row < 8; row++) {
			for (var col = 0; col < 8; col++) {
				updateGrid(row, col);
			}
		}
	};

	function showCurrentScale() {
		if (active) {
			host.showPopupNotification("Step Editor " + NoteStr[notePos % 12] + "  " + (Math.floor(notePos / 12) - 2) + "  Scale: " + NoteStr[baseNote % 12] + " " + scale.name);
		}
	}

	this.enter = function () {
		active = true;
		scale = noteview.getScale();
		baseNote = noteview.getBaseNote() % 12;
		stepLenView.setStepSize(gridMap.stepValue(), gridMap.nrOfSteps());
		showCurrentScale();
		setScale(scale);
		refreshScaleIndex();
		correctStepOffsetPosition();
		resendColors();
	};

	this.exit = function () {
		active = false;
	};

	this.navigate = function (direction) {
		switch (direction) {
			case DirectionPad.TOP:
				if (modifiers.isShiftDown()) {
					this.scrollNoteUp();
				} else {
					this.scrollOctaveUp();
				}
				break;
			case DirectionPad.DOWN:
				if (modifiers.isShiftDown()) {
					this.scrollNoteDown();
				} else {
					this.scrollOctaveDown();
				}
				break;
			case DirectionPad.LEFT:
				if (modifiers.isSelectDown()) {
					this.scrollBaseScaleDown();
				} else if (modifiers.isShiftDown()) {
					this.scrollScaleDown();
				} else {
					stepLenView.stepLeft();
				}
				break;
			case DirectionPad.RIGHT:
				if (modifiers.isSelectDown()) {
					this.scrollBaseScaleUp();
				} else if (modifiers.isShiftDown()) {
					this.scrollScaleUp();
				} else {
					stepLenView.stepRight();
				}
				break;
		}
	};

	this.scrollOctaveUp = function () {
		if (scalegridindex + scale.notes.length < scalegrid.length - 8) {
			scalegridindex += scale.notes.length;
			notePos = scalegrid[scalegridindex];
			showCurrentScale();
			refreshScaleIndex();
			resendColors();
		}
	};

	this.scrollOctaveDown = function () {
		if (scalegridindex - scale.notes.length > 0) {
			scalegridindex -= scale.notes.length;
			notePos = scalegrid[scalegridindex];
			showCurrentScale();
			refreshScaleIndex();
			resendColors();
		}
	};

	this.scrollNoteUp = function () {
		if (scalegridindex < scalegrid.length + 7) {
			scalegridindex += 1;
			notePos = scalegrid[scalegridindex];
			showCurrentScale();
			refreshScaleIndex();
			resendColors();
		}
	};

	this.scrollNoteDown = function () {
		if (scalegridindex > 0) {
			scalegridindex -= 1;
			notePos = scalegrid[scalegridindex];
			showCurrentScale();
			refreshScaleIndex();
			resendColors();
		}
	};

	/**
	 * Determines the grid index of a given Note. Returns the index of
	 * the first base note of current scale
	 * 
	 * @param {int} notevalue note value 
	 **/
	function getIndexOfNote(notevalue) {
		var lastBaseNote = -1;
		for (var i = 0; i < scalegrid.length; i++) {
			if (scalegrid[i] % 12 === baseNote) {
				lastBaseNote = i;
			}
			if (scalegrid[i] >= notevalue) {
				return lastBaseNote;
			}
		}
		return -1;
	}

	this.scrollNoteIntoView = function () {
		var lowestNote = -1;
		var highestNote = -1;
		for (var i = 0; i < 8; i++) {
			for (var j = 0; j < 127; j++) {
				var state = fullNoteMapping[i][j];
				if (state) {
					if (lowestNote === -1) {
						lowestNote = j;
						highestNote = j;
					} else {
						lowestNote = Math.min(lowestNote, j);
						highestNote = Math.max(highestNote, j);
					}
				}
			}
		}
		if (lowestNote !== -1) {
			var lowindex = getIndexOfNote(lowestNote);
			if (lowindex >= 0) {
				scalegridindex = lowindex;
				notePos = scalegrid[scalegridindex];
				refreshScaleIndex();
				resendColors();
			}
		}
	};

	this.scrollScaleUp = function () {
		noteview.changeScale(1);
	};

	this.scrollScaleDown = function () {
		noteview.changeScale(-1);
	};

	this.scrollBaseScaleDown = function () {
		noteview.changeBaseNote(-1);
	};

	this.scrollBaseScaleUp = function () {
		noteview.changeBaseNote(1);
	};

	function handleMono(col) {
		if (monoMode) {
			for (var i = 0; i < 127; i++) {
				if (fullNoteMapping[col][i] == 2 || fullNoteMapping[col][i] == 1) {
					clip.clearStep(col, i);
				}
			}
		}
	}

	this.handleEvent = function (row, col, value) {
		if (modifiers.isShiftDown()) {
			if (value > 0) {
				applicationControl.exec(row * 8 + col);
			}
			return;
		}

		var noteindex = 7 - row;
		if (col >= gridMap.nrOfSteps()) {
			return;
		}
		var state = steps[col].states[noteindex];

		if (value === 0) { // TODO Maybe Not
			if (lastHoldDown[row] === col) {
				lastHoldDown[row] = -1;
			}
			return;
		}

		if (lastHoldDown[row] >= 0) {
			if (col > lastHoldDown[row]) {
				clip.setStep(lastHoldDown[row], notegrid[noteindex].notevalue, baseVelocity, gridMap.stepValue() * (col - lastHoldDown[row] + 1));
				for (var xcol = lastHoldDown[row] + 1; xcol <= col; xcol++) {
					handleMono(xcol);
				}
			} else if (lastHoldDown[row] > col) {
				clip.setStep(col, notegrid[noteindex].notevalue, baseVelocity, gridMap.stepValue() * (lastHoldDown[row] - col + 1));
				handleMono(col);
			}
		} else if (state === 0) {
			clip.setStep(col, notegrid[noteindex].notevalue, baseVelocity, gridMap.stepValue() * gateLength);
			handleMono(col);
			lastHoldDown[row] = col;
		} else {
			clip.clearStep(col, notegrid[noteindex].notevalue);
		}
	};
}

