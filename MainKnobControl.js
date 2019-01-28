
/**
 * @param {Track} cursorTrack
 * @param {Transport} transport
 * @param {Clip} cursorClip
 * @param {Device} cursorDevice
 */
function MainKnobKontrol(cursorTrack, transport, cursorClip, cursorDevice) {
    var Modes = {
        MST: 0,
        GROUP: 1,
        METRO: 2,
        TEMPO: 3,
        NONE: 4,
        PATTERN_LEN: 5,
        GRID_LEN: 6,
        SWING: 7,
        BROWSER: 8
    };
    var SwingModes = {
        ShuffleAmt: {name: "Shuffle Amount"},
        ShuffleRate: {name: "Shuffle Rate "}
    };
    var paramRes = 200;

    var application = host.createApplication();
    var mainEncoder = controls.createButton(MASTER_SECTION.ENCODER);
    var mainPress = controls.createButton(MASTER_SECTION.ENCODER_BUTTON);
    var touch = controls.createButton(MASTER_SECTION.ENCODER_TOUCH);
    var masterButton = controls.createButton(MASTER_SECTION.MST);
    var groupButton = controls.createButton(MASTER_SECTION.GRP);
    var cueButton = controls.createButton(MASTER_SECTION.CUE);
    var tempoButton = controls.createButton(TRANSPORT_SECTION.TEMPO); // + TAP
    var swingButton = controls.createButton(MAIN_BUTTONS.SWING);
    var masterTrack = host.createMasterTrack(8);
    var browserButton = controls.createButton(MAIN_BUTTONS.BROWSE);
    //var selectButton = controls.createButton(MAIN_BUTTONS.SELECT);
    var mode = Modes.MST;
    var vuMode = Modes.MST;
    var masterVolume = 0;
    var cursorVolume = 0;
    var currentTempo = 20.0;
    var metronomeVolume = 0;
    var clipLength = 0.0;
    var cursorTrackDeviceBank = cursorTrack.createDeviceBank(8);
    var browsing = false;


    this.getBrowsing = function () {
        return browsing;
    };

    var cursorBrowsingSession = null;

    this.getBrowser = function () {
        return cursorBrowsingSession;
    };

    var stackMode = -1;

    var swingEditMode = SwingModes.ShuffleAmt;

    var emptyCallback = function () {};

    var grabCallback = emptyCallback;

    var noneButton = {
        sendValue: function () {}
    };

    var bankNrOfDevices = 0;

    var deviceBrowser = cursorDevice.createDeviceBrowser(1, 1);
    //var deviceBrowser = cursorTrackDeviceBank.getDevice(0).createDeviceBrowser(4,4);

    cursorTrackDeviceBank.addDeviceCountObserver(function (nrOfDevices) {
        //println(" Number of Devices in Bank > " + nrOfDevices);
        bankNrOfDevices = nrOfDevices;
    });

    cursorClip.getLoopLength().addRawValueObserver(function (length) {
        clipLength = length;
    });


    cursorBrowsingSession = deviceBrowser.createCursorSession();
            cursorBrowsingSession.getCursorFilter().addNameObserver(99, "", function (value) {
                if (value !== "") {
                    host.showPopupNotification(value);
                    println(value);
                }
            });


    var groove = host.createGroove();
    var grooveActive = false;
    var grooveAmount = 0;
    var shuffleRate = 0;

    var currentButton = masterButton;

    var pressed = false;
    var shift = false;
    //var selectPressed = false;

    masterButton.sendValue(127);

    this.notifyShift = function (shiftDown) {
        shift = shiftDown;
    };
    //selectButton.setCallback(function (value) {
    //    selectDown = value === 127;
    //    selectButton.sendValue(value);

    //    if (selectDown) {
    //        selectPressed = true;
    //    } else {
    //        selectPressed = false;
    //    }
    //}); 

    groove.getEnabled().addValueObserver(2, function (value) {
        grooveActive = value > 0;
        swingButton.sendValue(grooveActive ? 127 : 0, true);
    });

    groove.getShuffleAmount().addValueObserver(201, function (value) {
        grooveAmount = value;
    });

    groove.getShuffleRate().addRawValueObserver(function (value) {
        // Shuffle Rate 0 = 1/8  1 = 1/6
        shuffleRate = value;
    });

    groove.getAccentRate().addRawValueObserver(function (value) {
        // 0 = 1/4   1= 1/8  2= 1/16
        //println(" ACC RT = " + value);
    });

    groove.getAccentAmount().addValueObserver(201, function (value) {
        //println(" ACC AMT = " + (value/2) + " %");
    });

    groove.getAccentPhase().addValueObserver(101, function (value) {
        //println(" ACC PHS = " + value);
    });

    groove.getShuffleAmount().addValueDisplayObserver(10, "", function (display) {
        if (mode === Modes.SWING) {
            host.showPopupNotification("Shuffle Amount " + display);
        }
    });

    groove.getShuffleRate().addValueDisplayObserver(10, "", function (display) {
        if (mode === Modes.SWING) {
            host.showPopupNotification("Shuffle Rate " + display);
        }
    });

    swingButton.setCallback(function (value) {
        if (value > 0) {
            if (modifiers.isShiftDown()) {
                if (grooveActive) {
                    groove.getEnabled().set(0, 2);
                } else {
                    groove.getEnabled().set(1, 2);
                }
            } else {
                if (mode !== Modes.SWING) {
                    stackMode = mode;
                    mode = Modes.SWING;
                    host.showPopupNotification("Edit " + swingEditMode.name);
                    currentButton.sendValue(0);
                }
            }
        } else {
            if (!modifiers.isShiftDown()) {
                mode = stackMode;
                stackMode = -1;
                currentButton.sendValue(127);
            }
        }
    });

    touch.setCallback(function (value) {
        if (value === 0) {
            return;
        }
        switch (mode) {
            case Modes.GRID_LEN:
                currentMode.modifyGrid(0, true);
                break;
        }
    });

    mainEncoder.setCallback(function (value) {
        //println("test" + value);
        var speed = 4;
        var i = 0;
        switch (mode) {
            case Modes.NONE:
                if (value === 1) {
                    if (modifiers.isSelectDown())
                        cursorTrack.selectNext();
                    else if (modifiers.isShiftDown())
                        for (i = 0; i < speed; i++)
                            transport.fastForward();
                    else
                            transport.fastForward();
                }
                else {
                    if (modifiers.isSelectDown())
                        cursorTrack.selectPrevious();
                    else if(modifiers.isShiftDown())
                        for (i = 0; i < speed; i++)
                            transport.rewind();
                    else
                            transport.rewind();
                }
                break;
            case Modes.MST:
                var inc = (value === 1 ? 1 : -1) * (shift ? 1 : 6);
                var newval = Math.min(Math.max(0, masterVolume + inc), paramRes - 1);
                masterTrack.getVolume().set(newval, paramRes);
                break;
            case Modes.BROWSER:
                //println(value);
                var speedBrowser = 6;
                if (value === 1) {
                    if (modifiers.isShiftDown()) {
                        cursorBrowsingSession.selectNext();
                    } else {
                        if (modifiers.isSelectDown()) {
                            for (i = 0; i < speedBrowser; i++) {
                                //application.arrowKeyDown();
                                cursorBrowsingSession.getCursorResult().selectNext();
                            }
                        }
                        else {
                                cursorBrowsingSession.getCursorResult().selectNext();
                                //application.arrowKeyDown();
                        }
                    }
                } else {
                    if (modifiers.isShiftDown()) {
                        cursorBrowsingSession.selectPrevious();
                    } else {
                    if (modifiers.isSelectDown()) {
                        for (i = 0; i < speedBrowser; i++) {
                            cursorBrowsingSession.getCursorResult().selectPrevious();
                            //application.arrowKeyUp();
                            }
                        } else {
                            cursorBrowsingSession.getCursorResult().selectPrevious();
                            //application.arrowKeyUp();
                        }
                    }
                }
                break;
            case Modes.GROUP:
                inc = (value === 1 ? 1 : -1) * (shift ? 1 : 6);
                newval = Math.min(Math.max(0, cursorVolume + inc), paramRes - 1);
                cursorTrack.getVolume().set(newval, paramRes);
                break;
            case Modes.METRO:
                inc = (value === 1 ? 3 : -1) * (shift ? 1 : 6);
                newval = Math.min(Math.max(0, metronomeVolume + inc), 127);
                transport.setMetronomeValue(newval, 128);
                break;
            case Modes.TEMPO:
                inc = (value === 1 ? 1 : -1) * (shift ? (pressed ? 0.01 : 0.1) : (pressed ? 10 : 1));
                newval = Math.min(Math.max(20, currentTempo + inc), 666);
                transport.getTempo().setRaw(newval);
                break;
            case Modes.PATTERN_LEN:
                var factor = (shift ? (pressed ? 0.25 : 1.0) : 4.0);
                inc = (value === 1 ? 1 : -1) * factor;
                if (clipLength > 0) {
                    var newLen = Math.max(factor, clipLength + inc);
                    if (newLen !== clipLength) {
                        host.showPopupNotification("Adjusting Clip Length to " + newLen + " Bars ");
                        cursorClip.getLoopLength().setRaw(newLen);
                        applicationControl.getApplication().focusPanelBelow();
                        applicationControl.getApplication().zoomToFit();
                    }
                }
                break;
            case Modes.GRID_LEN:
                inc = (value === 1 ? 1 : -1);
                currentMode.modifyGrid(inc, shift);
                break;
            case Modes.SWING:
                if (swingEditMode === SwingModes.ShuffleAmt) {
                    inc = (value === 1 ? 1 : -1) * (pressed ? 1 : 10);
                    groove.getShuffleAmount().set(Math.min(Math.max(grooveAmount + inc, 0), 200), 201);
                } else if (swingEditMode === SwingModes.ShuffleRate) {
                    groove.getShuffleRate().setRaw(value === 1 ? 1 : 0);
                }
                break;
        }
    });

    function disableMode() {
        currentButton.sendValue(0);
        currentButton = noneButton;
        mode = Modes.NONE;
        vuMode = Modes.MST;
        queueMidi(0xB0, 38, 0);
        queueMidi(0xB0, 39, 0);
    }

    this.enterPatternLenMode = function (patternButton, modeExitCallback) {
        if (mode === Modes.PATTERN_LEN) {
            return;
        }
        grabCallback(mode);
        currentButton.sendValue(0);
        currentButton = patternButton;
        currentButton.sendValue(127);
        mode = Modes.PATTERN_LEN;
        vuMode = Modes.MST;
        grabCallback = modeExitCallback;
        queueMidi(0xB0, 38, 0);
        queueMidi(0xB0, 39, 0);
    };


    this.exitPatternLenMode = function () {
        disableMode();
    };

    this.inPatternLenMode = function () {
        return mode === Modes.PATTERN_LEN;
    };

    deviceBrowser.addIsBrowsingObserver(function (value) {
        browsing = value;
        browserButton.sendValue(browsing ? 127 : 0, true);
    });
    var workaroundBrowsing = false;
    browserButton.setCallback(function (value) {
        if (value === 0) {
            if (workaroundBrowsing) {
                application.arrowKeyDown();
                application.arrowKeyRight();
                workaroundBrowsing = false;
            }
            return;
        }
        if (browsing) {
            deviceBrowser.cancelBrowsing();
            //mode = Modes.MST;
            disableMode();
        } else {
            
            //noch nich ganz am worken
            
            

            //if (shift) {
            if (modifiers.isShiftDown()) {
                cursorDevice.beforeDeviceInsertionPoint().browse();
                workaroundBrowsing = true;
                mode = Modes.BROWSER;
            }
            else if (modifiers.isSelectDown()) {
                cursorDevice.afterDeviceInsertionPoint().browse();
                workaroundBrowsing = true;
                mode = Modes.BROWSER;
            }else {
                deviceBrowser.activateSession(deviceBrowser.getDeviceSession());
                deviceBrowser.startBrowsing();
                workaroundBrowsing = true;
                mode = Modes.BROWSER;
            }
        }
    });

    masterButton.setCallback(function (value) {
        if (value === 0)
            return;
        if (mode === Modes.MST) {
            disableMode();
            return;
        }
        grabCallback(mode);
        mode = Modes.MST;
        vuMode = Modes.MST;
        currentButton.sendValue(0);
        currentButton = masterButton;
        currentButton.sendValue(127);
        grabCallback = emptyCallback;
        queueMidi(0xB0, 38, 0);
        queueMidi(0xB0, 39, 0);
    });

    groupButton.setCallback(function (value) {
        if (value === 0)
            return;
        if (mode === Modes.GROUP) {
            disableMode();
            return;
        }
        grabCallback(mode);
        mode = Modes.GROUP;
        vuMode = Modes.GROUP;
        currentButton.sendValue(0);
        currentButton = groupButton;
        currentButton.sendValue(127);
        grabCallback = emptyCallback;
        queueMidi(0xB0, 38, 0);
        queueMidi(0xB0, 39, 0);
    });

    tempoButton.setCallback(function (value) {
        if (modifiers.isShiftDown()) {
            if (mode !== Modes.TEMPO)
                tempoButton.sendValue(value);
            if (value !== 0) {
                transport.tapTempo();
            }
        } else {
            if (value === 0)
                return;

            if (mode === Modes.TEMPO) {
                disableMode();
                return;
            }
            grabCallback(mode);
            mode = Modes.TEMPO;
            vuMode = Modes.MST;
            grabCallback = emptyCallback;
            queueMidi(0xB0, 38, 0);
            queueMidi(0xB0, 39, 0);
            currentButton.sendValue(0);
            currentButton = tempoButton;
            currentButton.sendValue(127);
        }
    });

    cueButton.setCallback(function (value) {
        if (value === 0)
            return;
        if (mode === Modes.METRO) {
            disableMode();
        } else {
            grabCallback(mode);
            mode = Modes.METRO;
            vuMode = Modes.METRO;
            currentButton.sendValue(0);
            currentButton = cueButton;
            currentButton.sendValue(127);
            grabCallback = emptyCallback;
            queueMidi(0xB0, 38, metronomeVolume);
            queueMidi(0xB0, 39, metronomeVolume);
        }
    });

    this.inGridMode = function () {
        return mode === Modes.GRID_LEN;
    };

    this.enterGridMode = function (gridButton) {
        if (mode !== Modes.GRID_LEN) {
            grabCallback(mode);
            mode = Modes.GRID_LEN;
            vuMode = Modes.MST;
            grabCallback = emptyCallback;
            queueMidi(0xB0, 38, 0);
            queueMidi(0xB0, 39, 0);
            currentButton.sendValue(0);
            currentButton = gridButton;
            currentButton.sendValue(127);
        }
    };

    this.exitGridMode = function () {
        if (mode === Modes.GRID_LEN) {
            disableMode();
        }
    };

    mainPress.setCallback(function (value) {
        pressed = value !== 0;
        switch (mode) {
            case Modes.BROWSER:
                //application.enter();
                deviceBrowser.commitSelectedResult();
                disableMode();
                break;
            case Modes.GRID_LEN:
                currentMode.pushAction(value);
                break;
            case Modes.SWING:
                if (value > 0) {
                    return;
                }
                if (swingEditMode === SwingModes.ShuffleAmt) {
                    swingEditMode = SwingModes.ShuffleRate;
                    host.showPopupNotification(" Edit Shuffle Rate");
                } else if (swingEditMode === SwingModes.ShuffleRate) {
                    swingEditMode = SwingModes.ShuffleAmt;
                    host.showPopupNotification(" Edit Shuffle Amount");
                }
                break;
        }

    });

    masterTrack.getVolume().addValueObserver(paramRes, function (value) {
        masterVolume = value;
    });
    cursorTrack.getVolume().addValueObserver(paramRes, function (value) {
        cursorVolume = value;
    });

    transport.getTempo().addRawValueObserver(function (value) {
        currentTempo = value;
    });

    transport.addMetronomeVolumeObserver(function (value) {
        metronomeVolume = Math.floor((1 - value / -48) * 127);

        if (vuMode === Modes.METRO) {
            queueMidi(0xB0, 38, metronomeVolume);
            queueMidi(0xB0, 39, metronomeVolume);
        }
    });

    masterTrack.addVuMeterObserver(125, 0, true, function (value) {
        if (vuMode === Modes.MST) {
            if (value === 128) {
                queueMidi(0xB0, 38, 127);
            } else {
                queueMidi(0xB0, 38, value);
            }
        }
    });
    masterTrack.addVuMeterObserver(125, 1, true, function (value) {
        if (vuMode === Modes.MST) {
            if (value === 128) {
                queueMidi(0xB0, 39, 127);
            } else {
                queueMidi(0xB0, 39, value);
            }
        }
    });
    cursorTrack.addVuMeterObserver(125, 0, true, function (value) {
        if (vuMode === Modes.GROUP) {
            if (value === 128) {
                queueMidi(0xB0, 38, 127);
            } else {
                queueMidi(0xB0, 38, value);
            }
        }
    });
    cursorTrack.addVuMeterObserver(125, 1, true, function (value) {
        if (vuMode === Modes.GROUP) {
            if (value === 128) {
                queueMidi(0xB0, 39, 127);
            } else {
                queueMidi(0xB0, 39, value);
            }
        }
    });
}
