/**
 * Remote Control Script for Maschine JAM and Bitwig Studio
 *
 * One main principle of this script is that it tries to stay as close as possible to
 * the workflow of Maschine JAM in the Maschine Software. This also means that every label on
 * the controller is assigned to an appropriate function in Bitwig.
 *
 * i.e. SHIFT + Group G = Save Project
 * 		SHIFT + Button Matrix Button (1,1) = Undo etc.
 *
 * The REC Button is not assigned to the Arrange View Record Button but tries to emulate the way the REC Button works in Maschine.
 * 
 * @author Eric Ahrens 
 */

loadAPI(1);
var versionController = "5.14";
host.defineController("Native Instruments", "Maschine Jam Marc Version", versionController, "ca344330-d262-4b84-97ce-20a02c55312e");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Maschine Jam - 1"], ["Maschine Jam - 1"]);
host.addDeviceNameBasedDiscoveryPair(["Maschine Jam - 2"], ["Maschine Jam - 2"]);
host.addDeviceNameBasedDiscoveryPair(["Maschine Jam - 3"], ["Maschine Jam - 3"]);
host.addDeviceNameBasedDiscoveryPair(["Maschine Jam - 4"], ["Maschine Jam - 4"]);
host.addDeviceNameBasedDiscoveryPair(["Maschine Jam - 1 Input"], ["Maschine Jam - 1 Output"]);
host.addDeviceNameBasedDiscoveryPair(["Maschine Jam - 2 Input"], ["Maschine Jam - 2 Output"]);
host.addDeviceNameBasedDiscoveryPair(["Maschine Jam - 3 Input"], ["Maschine Jam - 3 Output"]);
host.addDeviceNameBasedDiscoveryPair(["Maschine Jam - 4 Input"], ["Maschine Jam - 4 Output"]);

load("Constants.js");
load("JamMode.js");

load("ClipMode.js");
load("PadMode.js");
load("StepMode.js");
load("StepView.js");
load("ModifierBank.js");
load("Button.js");
load("ButtonGrid.js");
load("Touchstrip.js");
load("StepPositionView.js");
load("ControlMapping.js");
load("ApplicationControl.js");
load("TrackHandler.js");
load("MainKnobControl.js");
load("TrackView.js");
load("SceneLaunchView.js");
load("ClipLaunchView.js");
load("NoteLayoutManager.js");
load("TransportHandler.js");
load("DrumPadView.js");
load("PatternLengthView.js");

load("TouchView.js");


/**
 *
 *	TODO 
 *	1. Combine Drum Pad View to Step Mode an make it switchable
 *	2. Fix Sends Assingment bug
 *	3. Consider setting Selection INdex to 1 upon entering drum Mode again
 **/

var updateQueue = []; //Queue for updating MIDI in batches, so controller doesn't get stuck
var shiftReceivers = [];

var shutdown = false;
var controls = new ControlMapping();
var modifiers = new ModifierBank();
/** @type {GlobalClipView} */
var globalClipView = null;


var selectAndLaunch = true;

/** @type{ApplicationControl}*/
var applicationControl = null;
var transport = null;

var gGlipOrientation = ORIENTATION.TrackBased;
var knobControl = null;

function init() {
	var numTracks = 8;
	var numScenes = 8;
	var numSends = 8;

	host.getMidiInPort(0).setMidiCallback(onMidi);
	host.getMidiInPort(0).setSysexCallback(onSysex);
	noteInput = host.getMidiInPort(0).createNoteInput("Maschine Jam - 1", "80????", "90????");
	initLeftButtons();

	/** @type {Track} */
	var cursorTrack = host.createArrangerCursorTrack(2, 16);
	/** @type {Device} */
	/** @type {CursorDevice} */
	var cursorDevice = cursorTrack.createCursorDevice();

	var clip = host.createCursorClip(8, 128);
        
	applicationControl = new ApplicationControl(clip);
	patternLengthView = new PatternLengthView(clip);
	globalClipView = new GlobalClipView(patternLengthView, clip);
	var trackHandler = new TrackHandler(cursorTrack, 16, cursorDevice); // Handler for Cursor Track
	transport = new TransportHandler(trackHandler, cursorDevice);

	var trackBank = host.createMainTrackBank(numTracks, numSends, numScenes);

	var trackBankContainer = new TrackBankContainer(trackBank);
	var efxTrackBankContainer = new EffectBankContainer(host.createEffectTrackBank(7, numScenes), host.createMasterTrack(numScenes));
	var trackViewContainer = new TrackViewContainer(trackBankContainer, efxTrackBankContainer);

	var sceneView = new SceneLaunchView(trackBank, numScenes, numTracks);
	var noteView = gNoteViewManager.createNoteLayoutView(noteInput);
	var drumpadView = new DrumPadView(noteInput, cursorTrack);

	var clipView = new ClipLaunchView(trackBankContainer);
	clipView.setIndication(true);

	var cliplaunchMode = new ClipMode(clipView, trackViewContainer, sceneView, trackViewContainer.getMixerView().trackStates());
	var padMode = new PadMode(noteView, drumpadView, trackViewContainer, sceneView, clip, cursorDevice, sceneView);
	var stepMode = new StepMode(noteView, drumpadView, trackViewContainer, trackHandler, clip,cursorDevice, sceneView);

	var efxClipView = new ClipLaunchView(efxTrackBankContainer);
	var effectMode = new ClipMode(efxClipView, trackViewContainer, sceneView, trackViewContainer.getEffectView().trackStates());
	currentMode = cliplaunchMode;
	currentMode.enter();

	trackBankContainer.clipView = clipView;
	efxTrackBankContainer.clipView = clipView;

	controls.sliderBank = new SliderModeHandler(trackBankContainer, efxTrackBankContainer, numTracks, cursorDevice, trackHandler);

    var mainKnobControl = new MainKnobKontrol(cursorTrack, transport.transport(), clip, cursorDevice);
    knobControl = mainKnobControl;

	var modeHandler = new ModeHandler(cliplaunchMode, padMode, stepMode, effectMode, clip, trackHandler, trackViewContainer);

	TrackModifierInit(trackViewContainer, mainKnobControl, patternLengthView);

	var project = host.getProject();
	var rootTrack = project.getRootTrackGroup();
	initCursorTrack(cursorTrack, cursorDevice, padMode, stepMode);
	controls.init();

	var stopAllButton = controls.createButton(MAIN_BUTTONS.IN_BUTTON);
	stopAllButton.setCallback(function (value) {
		stopAllButton.sendValue(value);
		if (value > 0) {
			rootTrack.stop();
		}
	});

	var primaryDevice = cursorTrack.createCursorDevice("Primary", 0);

	primaryDevice.hasDrumPads().addValueObserver(function (hasPads) {
		modeHandler.setCrrentHasDrumPads(hasPads);
	});

	shiftReceivers.push(mainKnobControl);
	shiftReceivers.push(modifiers);
	shiftReceivers.push(transport);
	shiftReceivers.push(modeHandler);

	handleblink();
    host.scheduleTask(handleBatchUpdate, null, 1);
    println(" #### Maschine JAM Marc Version " + versionController + " ######");
       
	notificationSettings = host.getNotificationSettings();
	host.scheduleTask(function () {
		var unsIsEnabeld = notificationSettings.getUserNotificationsEnabled();
		unsIsEnabeld.set(false);
	}, null, 100);
}


/**
 * @param {PatternLengthView} patternLengthView View for showing and adjusting Pattern Length 
 * @param {Clip} clip  
 */
function GlobalClipView(patternLengthView, clip) {

	var clipSelected = false;
	/** @type {Clip} */
	var clipTrackType = "EMPTY";
    var track = clip.getTrack();
    var doubleToggle = false;

	this.duplicateContent = function () {
        clip.duplicateContent();
        doubleToggle = true;
    };

    this.resetDoubleToggle = function () {
        doubleToggle = false;
    }

    this.getDoubleToggle = function () {
        return doubleToggle;
    }

	track.exists().addValueObserver(function (value) {
		clipSelected = value;
	});

	track.addTrackTypeObserver(16, "EMPTY", function (type) {
		clipTrackType = type;
	});

	this.clipColorChanged = function (color) {
		patternLengthView.setColor(color);
	};

	this.isClipSelected = function () {
		return clipSelected;
	};

	this.isInstrumentTrack = function () {
		return clipTrackType === "Instrument";
	};

	this.emptySlotSelected = function () {
		return clipTrackType === "EMPTY";
	};

}

/**
 * @param {TrackBank} trackBank
 * */
function TrackBankContainer(trackBank) {
	this.bank = trackBank;
	this.size = 8;
	this.clipView = null;
}

TrackBankContainer.prototype.selectClipInSlot = function (trackIndex) {
	if (this.clipView) {
		this.clipView.selectClipInSlot(trackIndex);
	}
};


TrackBankContainer.prototype.getTrack = function (index) {
	return this.bank.getChannel(index);
};

TrackBankContainer.prototype.hasAuxChannel = function () {
	return true;
};

/**
 * @param {TrackBank} trackBank
 * */
function EffectBankContainer(trackBank, masterTrack) {
	TrackBankContainer.call(this, trackBank);
	this.masterTrack = masterTrack;
}

EffectBankContainer.prototype.getTrack = function (index) {
	return index < 7 ? this.bank.getChannel(index) : this.masterTrack;
};

EffectBankContainer.prototype.hasAuxChannel = function () {
	return true;
};

EffectBankContainer.prototype.selectClipInSlot = function (trackIndex) {
	if (this.clipView) {
		this.clipView.selectClipInSlot(trackIndex);
	}
};



/**
 * @param {Track} cursorTrack
 * @param {Device} cursorDevice
 * @param {NoteView} noteView
 */
function initCursorTrack(cursorTrack, cursorDevice, padMode, stepMode) {
	var nameMapping = {};
	var nameMappingSize = 0;
        
        cursorDevice.hasDrumPads().addValueObserver(function (hasPads) {
		stepMode.setHasDrumPads(hasPads);
           });
           
        /** @type {DrumPadBank|Channel} drumPadBank */
	var drumPadBank = cursorDevice.createDrumPadBank(16);
	drumPadBank.setChannelScrollStepSize(4);
        
	function DrumPad() {
		/**
		 * @param {Channel} channel
		 */
		function registerDrumPadChannel(index, channel) {
			channel.addColorObserver(function (red, green, blue) {
				var color = convertColor(red, green, blue);
			});
		}

		for (var i = 0; i < 16; i++) {
			var channel = drumPadBank.getChannel(i);
			registerDrumPadChannel(i, channel);
		}

		drumPadBank.addChannelScrollPositionObserver(function (pos) {
			println(" DP Scroll " + pos);
		}, -1);
	}

	// DrumPad();

	cursorTrack.addNoteObserver(function (noteon, note, velocity) {
		currentMode.receiveNote(noteon, note, velocity);
	});

	cursorTrack.addPitchNamesObserver(function (key, name) {
		if (key in nameMapping) {
			if (name === null) {
				delete nameMapping[key];
				nameMappingSize--;
			} else {
				nameMapping[key] = name;
				nameMappingSize++;
			}
		} else if (name !== null) {
			nameMapping[key] = name;
			nameMappingSize++;
		}

		padMode.updatePitchNames(nameMappingSize, nameMapping, key, name);
		// stepMode.updatePitchNames(nameMappingSize, nameMapping,key, name);
	});

	cursorTrack.addColorObserver(function (red, green, blue) {
		var color = convertColor(red, green, blue);
		padMode.updateTrackColor(color);
		controls.sliderBank.updateTrackColor(color);
	});
}


var aninamtionCycle = 0;

/**
 * Task to handle Flashing
 */
function handleblink() {
	currentMode.handleBlink();
	host.scheduleTask(handleblink, null, 50);
}

/**
 * @param {string} which
 * @param {string} param
 **/
function debug(which, param) {
	var app = applicationControl.getApplication();
	switch (which) {
		case "action":
			/** @type {Action} */
			var actions = app.getActions();
			for (i = 0; i < actions.length; i++) {
				var id = actions[i].getId();
				if (!param || id.match(param)) {
					println(" [" + id + "]");
				}
			}
			break;
	}
}

function handleBatchUpdate() {
	actions = 10;
	while (updateQueue.length > 0 && actions > 0) {
		if (shutdown) {
			return;
		}
		var message = updateQueue.shift();
		host.getMidiOutPort(0).sendMidi(message[0], message[1], message[2]);
		actions--;
	}
	host.scheduleTask(handleBatchUpdate, null, 1);
}

/**
 * Midi Message is stored in the queue that is then polled in handleBatchUpdate
 */
function queueMidi(status, data1, data2) {
	if (data2 === undefined) {
		println(" Undefined Midi Data ");
		return;
	}
	updateQueue.push([status, data1, data2]);
}

/**
 * @param {TrackView} trackView
 * @param {MainKnobControl} mainKnob Main Knob Control
 * @param {PatternLengthView} patternLengthView Pattern 
 */
function TrackModifierInit(trackView, mainKnob, patternLengthView) {
	var muteButton = controls.createButton(TRANSPORT_SECTION.MUTE);
	muteButton.setCallback(function (value) {
		muteButton.sendValue(value);
		if (value === 0) {
			trackView.toDefaultMode();
		} else {
			trackView.enterMuteMode();
		}
	});
	var soloButton = controls.createButton(TRANSPORT_SECTION.SOLO);

	patternLengthView.setExitCallback(function () {
		mainKnob.exitPatternLenMode(soloButton);
		soloButton.sendValue(0);
	});
	soloButton.setCallback(function (value) {
		if (modifiers.isShiftDown()) {
			if (value > 0 && patternLengthView.canEnter()) {
				mainKnob.enterPatternLenMode(soloButton, function () {
					currentMode.exitIntermediateView();
				});
				currentMode.switchToIntermediateView(patternLengthView);
				applicationControl.showNoteEditor();
			}
		} else {
			if (mainKnob.inPatternLenMode()) {
				if (value > 0) {
					mainKnob.exitPatternLenMode(soloButton);
					currentMode.exitIntermediateView();
					soloButton.sendValue(0);
				}
			} else {
				if (value === 0) {
					trackView.toDefaultMode();
					soloButton.sendValue(value);
				} else {
					trackView.enterSoloMode();
					soloButton.sendValue(value);
				}
			}
		}
	});
	var gridButton = controls.createButton(TRANSPORT_SECTION.GRID);
	gridButton.setCallback(function (value) {
		if (value === 0) {
			if (!trackView.inArmMode()) {
				gridButton.sendValue(mainKnob.inGridMode() ? 127 : 0);
			}
		} else {
			if (modifiers.isShiftDown()) {
				if (trackView.inArmMode()) {
					trackView.toDefaultMode();
					gridButton.sendValue(mainKnob.inGridMode() ? 127 : 0);
				} else if (trackView.canArm()) {
					trackView.enterArmMode();
					gridButton.sendValue(127);
				}
			} else {
				if (trackView.inArmMode()) {
					trackView.toDefaultMode();
				} else if (!mainKnob.inGridMode()) {
					mainKnob.enterGridMode(gridButton);
				} else {
					mainKnob.exitGridMode();
				}
				gridButton.sendValue(mainKnob.inGridMode() ? 127 : 0);
			}
		}
	});

}

/**
 *
 * Handles switch between the different Modes
 *
 * 1. Clip Launcher Mode
 * 2. Pad Mode
 * 3. Step Mode
 * 4. Effect Launcher Mode (Not yet implemented)
 *
 * @param {ClipMode} cliplaunchMode
 * @param {PadMode} padMode
 * @param {StepMode} stepMode
 * @param {EffectMode} effectMode
 * @param {Clip} cursorClip
 * @param {TrackHandler} trackHandler
 * @param {TrackViewContainer} trackViewContainer
 * 
 */
function ModeHandler(cliplaunchMode, padMode, stepMode, effectMode, cursorClip, trackHandler, trackViewContainer) {
	var stepButton = controls.createButton(MAIN_BUTTONS.STEP);
	var padButton = controls.createButton(MAIN_BUTTONS.PAD);
	var fxButton = controls.createButton(MAIN_BUTTONS.PERFORM);
	var cursorTrackHasPads = false;
	var currentTrackType = "EMPTY";

	padMode.selbutton = padButton;
	stepMode.selbutton = stepButton;
	cliplaunchMode.selbutton = new EmptyButton();
	effectMode.selbutton = fxButton;
	padButton.sendValue(0);
	stepButton.sendValue(0);
	stepMode.setExitHandler(forceExit);

	function forceExit() {
		if (currentMode === stepMode || currentMode == padMode) {
			currentMode.selbutton.sendValue(0);
			currentMode.exit();
			cliplaunchMode.enter();
			toClipTrackContol();
			currentMode = cliplaunchMode;
		}
	}

	trackHandler.getCursorTrack().addTrackTypeObserver(10, "EMPTY", function (type) {
		currentTrackType = type;
		if (type !== "Instrument") {
			forceExit();
		}
	});

	this.setCrrentHasDrumPads = function (value) {
		cursorTrackHasPads = value;
		if (currentMode === stepMode) {
			if (stepMode.isInDrumMode() && !cursorTrackHasPads) {
				stepMode.setToPianoMode();
				stepMode.enter();
			} else if (!stepMode.isInDrumMode() && cursorTrackHasPads) {
				stepMode.setToDrumMode();
				stepMode.enter();
			}
		} else if (currentMode === padMode) {
			if (padMode.inDrumView() && !cursorTrackHasPads) {
				padMode.setToNoteView();
				padMode.enter();
			} else if (!padMode.inDrumView() && cursorTrackHasPads) {
				padMode.setToDrumView();
				padMode.enter();
			}
		}
	};

	this.notifyShift = function (value) {
		currentMode.notifyShift(value);
	};

	stepButton.setCallback(function (value) {
		if (value > 0) {
			if (currentMode === stepMode) {
				if (modifiers.isSelectDown()) {
					trackHandler.selectNextSlotInTrack();
				} else if (modifiers.isShiftDown()) {
					if (stepMode.isInDrumMode()) {
						stepMode.setToPianoMode();
					} else {
						stepMode.setToDrumMode();
					}
					stepMode.enter();
				} else {
					currentMode.selbutton.sendValue(0);
					currentMode.exit();
					cliplaunchMode.enter();
					toClipTrackContol();
					currentMode = cliplaunchMode;
				}
			} else {
				if (!globalClipView.isClipSelected()) {
					var status = trackHandler.getTrackStatus();
					if (status.selected === -1) {
						host.showPopupNotification(" No content to be edited. Corresponding track needs to be selected");
						return;
					} else {
						trackHandler.createClip();
					}
				} else if (!globalClipView.isInstrumentTrack() || currentTrackType !== "Instrument") {
					if(!globalClipView.isInstrumentTrack()) {
						host.showPopupNotification(" Track of selected clip is not an Instrument track");
					} else {
						host.showPopupNotification(" Selected track is not an Instrument track");
					}
					return;
				}
				stepButton.sendValue(127);
				currentMode.selbutton.sendValue(0);
				currentMode.exit();
				if (cursorTrackHasPads) {
					stepMode.setToDrumMode();
				} else {
					stepMode.setToPianoMode();
				}
				stepMode.enter();
				currentMode = stepMode;
			}
		}
	});

	padButton.setCallback(function (value) {
		if (value > 0) {
			if (modifiers.isSelectDown() && currentMode === padMode) {
				padMode.selectionModAction();
			} else if (currentMode === padMode) {
				if (modifiers.isShiftDown()) {
					if (padMode.inDrumView()) {
						padMode.setToNoteView();
					} else {
						padMode.setToDrumView();
					}
				} else {
					currentMode.selbutton.sendValue(0);
					currentMode.exit();
					cliplaunchMode.enter();
					toClipTrackContol();
					currentMode = cliplaunchMode;
				}
			} else {
				padButton.sendValue(127);
				currentMode.selbutton.sendValue(0);
				currentMode.exit();
				if (cursorTrackHasPads) {
					padMode.setToDrumView();
				} else {
					padMode.setToNoteView();
				}
				padMode.enter();
				currentMode = padMode;
			}
		}
	});

	function toClipTrackContol() {
		if (controls.sliderBank.inEffectMode()) {
			controls.sliderBank.switchToTrackMode();
			cliplaunchMode.setIndication(true);
			effectMode.setIndication(false);
			trackViewContainer.toMixerView();
		}
	}

	fxButton.setCallback(function (value) {
		if (value === 0) {
			return;
		}
		if (currentMode === effectMode) {
			currentMode.selbutton.sendValue(0);
			currentMode.exit();
			cliplaunchMode.enter();
			currentMode = cliplaunchMode;
			controls.sliderBank.switchToTrackMode();
			trackViewContainer.toMixerView();
			cliplaunchMode.setIndication(true);
			effectMode.setIndication(false);
		} else {
			currentMode.selbutton.sendValue(0);
			currentMode.exit();
			effectMode.enter();
			trackViewContainer.toEffectView();
			currentMode = effectMode;
			currentMode.selbutton.sendValue(127);
			controls.sliderBank.switchToEffectMode();
			cliplaunchMode.setIndication(false);
			effectMode.setIndication(true);
		}
	});
}

function animate() {
	if (aninamtionCycle > 7) {
		controls.buttonMatrix.showPattern(Pattern1, aninamtionCycle);
		return;
	}
	controls.buttonMatrix.showPattern(Pattern1, aninamtionCycle);
	aninamtionCycle++;
	host.scheduleTask(animate, null, 400);
}

function initLeftButtons() {
	controls.setButtonMatrixCallback(
		function (sender, row, col, value, notenr) {
			currentMode.handleEvent(sender, row, col, value, notenr);
		});
	var dirPadUp = controls.createButton(DirectionPad.TOP);
	var dirPadLeft = controls.createButton(DirectionPad.LEFT);
	var dirPadRight = controls.createButton(DirectionPad.RIGHT);
	var dirPadDown = controls.createButton(DirectionPad.DOWN);
    var speed = 6;
    var i = 0;

	dirPadUp.setCallback(
		function (value) {

			if (value !== 0) {
                if (knobControl.getBrowsing()) {

                    if (modifiers.isShiftDown()) {
                        for (i = 0; i < speed; i++) {
                            knobControl.getBrowser().getCursorFilter().createCursorItem().selectPrevious();
                        }
                    }
                    else {
                        knobControl.getBrowser().getCursorFilter().createCursorItem().selectPrevious();
                    }
                }
                else {
                    currentMode.navigate(DirectionPad.TOP);
                }
			}
		});
	dirPadLeft.setCallback(
		function (value) {
			if (value !== 0) {
                if (knobControl.getBrowsing()) {
                    knobControl.getBrowser().getCursorFilter().selectPrevious();
                } else {
                    currentMode.navigate(DirectionPad.LEFT);
                }
			}
		});
	dirPadRight.setCallback(
		function (value) {
			modifiers.setDpadRightDown(value);
			if (value !== 0) {
                if (knobControl.getBrowsing()) {
                    knobControl.getBrowser().getCursorFilter().selectNext();
                } else {
                    currentMode.navigate(DirectionPad.RIGHT);
                }
			}
		});
	dirPadDown.setCallback(
		function (value) {
			if (value !== 0) {
                if (knobControl.getBrowsing()) {
                    if (modifiers.isShiftDown()) {
                        for (i = 0; i < speed; i++) {
                        knobControl.getBrowser().getCursorFilter().createCursorItem().selectNext();
                        }
                    }
                    else {
                        knobControl.getBrowser().getCursorFilter().createCursorItem().selectNext();
                    }
                }
                else { currentMode.navigate(DirectionPad.DOWN); }
			}
		});

	dirPadUp.sendValue(0, true);
	dirPadDown.sendValue(0, true);
	dirPadLeft.sendValue(0, true);
	dirPadRight.sendValue(0, true);
}

function onMidi(status, data1, data2) {
	if (!controls.handleMidi(status, data1, data2)) {
		//println(" Got MIDI " + (status&0xF) + " " + data1 + " " + data2 + " " + (status>>4));
		println(" Unmapped MIDI " + (status & 0xF) + " " + data1 + " " + data2 + " " + (status >> 4));
	}
}

function onSysex(data) {
	var i;

	if (data === "f000210915004d5000014d01f7") {
		for (i = 0; i < shiftReceivers.length; i++) {
			shiftReceivers[i].notifyShift(true);
		}
	} else if (data === "f000210915004d5000014d00f7") {
		for (i = 0; i < shiftReceivers.length; i++) {
			shiftReceivers[i].notifyShift(false);
		}
	} else if (data === "f000210915004d5000014601f7") {
		currentMode.update();
		controls.fullUpdate();
	} else {
		println(" RECEIVED SysEx = " + data);
	}
}

function exit() {
	println(" ==== Shutting Down ===== ");
	controls.exit();
}