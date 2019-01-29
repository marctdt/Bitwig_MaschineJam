/**
 * @param {TrackHandler} trackHandler
 * @param {Device} cursorDevice
 */
function TransportHandler(trackHandler, cursorDevice) {
    var transport = host.createTransport();
    var shift = false;
    var playing = false;
    var launchOverdub = false;
    var launchAuto = false;
    var loop = false;
    var click = false;

    var canNavDeviceLeft = false;
    var canNavDeviceRight = false;
    var canNavDeviceUp = false; // If Device is Nested
    var canNavDeviceDown = false; // If Device has Slots
    var currentSlotList = [];

    var deviceControlButtonDown = false;

    var NavButtonMode = {
        None: 0,
        Shift: 1,
        Device: 2,
        Parameter: 3,
        Select: 4
    };

    var defaultNavMode = NavButtonMode.None;
    var navMode = NavButtonMode.None;
    /** type {DeviceSliderControl} */
    var parameterControl = null;

    var playButton = controls.createButton(TRANSPORT_SECTION.PLAY);
    var recButton = controls.createButton(TRANSPORT_SECTION.REC);
    var leftNavButton = controls.createButton(TRANSPORT_SECTION.LEFT); // + METRO
    var rightNavButton = controls.createButton(TRANSPORT_SECTION.RIGHT); // + LOOP 
    var autoButton = controls.createButton(ENCODERBUTTON.AUTO);

    cursorDevice.addCanSelectNextObserver(function (canSelectNext) {
        canNavDeviceRight = canSelectNext;
        if (deviceControlButtonDown) {
            updateNavButtons();
        }
    });

    cursorDevice.addCanSelectPreviousObserver(function (canSelectPrev) {
        canNavDeviceLeft = canSelectPrev;
        if (deviceControlButtonDown) {
            updateNavButtons();
        }
    });

    cursorDevice.isNested().addValueObserver(function (value) {
        canNavDeviceUp = value;
        if (deviceControlButtonDown) {
            updateNavButtons();
        }
    });

    cursorDevice.hasSlots().addValueObserver(function (value) {
        canNavDeviceDown = value;
        if (deviceControlButtonDown) {
            updateNavButtons();
        }
    });

    cursorDevice.getCursorSlot().addNameObserver(16, "/NOSLOT/", function (name) {
        // println(" Slot Name = " + name);
    });

    cursorDevice.addSlotsObserver(function (slotlist) {
        
         //if(slotlist) {
         //println("SLOTS = > " + slotlist.length);
         //for(var i=0;i<slotlist.length;i++) {
         //println(" " + slotlist[i]); 
         //} 
         //}
        currentSlotList = slotlist;
    });

    this.setParameterControl = function (control) {
        parameterControl = control;
    };

    this.activateParameterNavMode = function () {
        defaultNavMode = NavButtonMode.Parameter;
        if (navMode === NavButtonMode.None) {
            navMode = NavButtonMode.Parameter;
            updateNavButtons();
        }
    };

    this.deactivateParameterNavMode = function () {
        defaultNavMode = NavButtonMode.None;
        if (navMode === NavButtonMode.Parameter) {
            navMode = NavButtonMode.None;
            updateNavButtons();
        }
    };

    /**
     * @param {Transport} transport
     * */
    this.transport = function () {
        return transport;
    };
    /**
     * @param {bool} shiftState
     */
    this.notifyShift = function (shiftState) {
        shift = shiftState;
        if (navMode === NavButtonMode.Device) {
            // This needs to be tested to see if it might get stuck somehow
            updateNavButtons();
        } else if (shift) {
            navMode = NavButtonMode.Shift;
            updateNavButtons();
        } else {
            navMode = defaultNavMode;
            updateNavButtons();
        }
    };

    this.notifyModButton = function (buttonId, isDown) {
        if (buttonId === ENCODERBUTTON.MACRO || buttonId === ENCODERBUTTON.CONTROL) {
            if (isDown) {
                navMode = NavButtonMode.Device;
                deviceControlButtonDown = true;
                updateNavButtons();
            } else {
                navMode = defaultNavMode;
                deviceControlButtonDown = false;
                updateNavButtons();
            }
        }
    };


    function updateNavButtons() {
        switch (navMode) {
            case NavButtonMode.None:
                rightNavButton.sendValue(0);
                leftNavButton.sendValue(0);
                break;
            case NavButtonMode.Shift:
                leftNavButton.sendValue(click ? 127 : 0);
                rightNavButton.sendValue(loop ? 127 : 0);
                break;
            case NavButtonMode.Device:
                if (shift) {
                    leftNavButton.sendValue(canNavDeviceUp ? 127 : 0);
                    rightNavButton.sendValue(canNavDeviceDown ? 127 : 0);
                } else {
                    leftNavButton.sendValue(canNavDeviceLeft ? 127 : 0);
                    rightNavButton.sendValue(canNavDeviceRight ? 127 : 0);
                }
                break;
            case NavButtonMode.Parameter:
                if (parameterControl) {
                    rightNavButton.sendValue(parameterControl.canGoRight() ? 127 : 0);
                    leftNavButton.sendValue(parameterControl.canGoLeft() ? 127 : 0);
                } else {
                    rightNavButton.sendValue(0);
                    leftNavButton.sendValue(0);
                }
                break;
        }
    }

    this.updateNavButton = updateNavButtons;


    transport.addLauncherOverdubObserver(function (pLaunchOverdub) {
        launchOverdub = pLaunchOverdub;
        recButton.sendValue(launchOverdub ? 127 : 0);
    });

    transport.addIsWritingClipLauncherAutomationObserver(function (pAutomation) {
        launchAuto = pAutomation;
        autoButton.sendValue(launchAuto ? 127 : 0);
    });

    transport.addIsLoopActiveObserver(function (pLoop) {
        loop = pLoop;
        if (shift) {
            rightNavButton.sendValue(loop ? 127 : 0);
        }
    });

    transport.addClickObserver(function (pClick) {
        click = pClick;
        if (shift) {
            leftNavButton.sendValue(click ? 127 : 0);
        }
    });

    transport.addIsPlayingObserver(function (pPlaying) {
        playing = pPlaying;
        if (playing) {
            playButton.turnOn();
        } else {
            playButton.turnOff();
        }
    });

    playButton.setCallback(function (value) {
        if (value === 0) {
            return;
        }
        if (modifiers.isShiftDown()) {
            transport.stop();
        } else {
            if (playing) {
                transport.stop();
            }
            else {
                transport.play();
            }
        }
    });

    recButton.setCallback(function (value) {
        if (value === 0) {
            return;
        }
        if (modifiers.isShiftDown()) {
            transport.toggleLauncherOverdub();
        } else {
            var status = trackHandler.getTrackStatus();
            //println(" STATUS SEL = " + status.selected + " PLAY=" + status.playing + " REC=" + status.recording );
            var slots = trackHandler.getSlots();
            if (status.selected >= 0) {
                if (status.selected === status.playing) {
                    transport.toggleLauncherOverdub();
                } else {
                    slots.launch(status.selected);
                    if (!launchOverdub) {
                        transport.toggleLauncherOverdub();
                    }
                }
                slots.showInEditor(status.selected);
                applicationControl.getApplication().zoomToFit();
                applicationControl.getApplication().zoomToSelection();
            } else if (status.recording >= 0) {
                slots.launch(status.recording);
                slots.showInEditor(status.recording);
                applicationControl.getApplication().zoomToFit();
                applicationControl.getApplication().zoomToSelection();
            } else if (status.playing >= 0) {
                slots.record(status.playing);
                slots.launch(status.playing);
                slots.showInEditor(status.playing);
                transport.toggleLauncherOverdub();
            } else {
                var lci = trackHandler.getFirstEmptySlot();
                if (lci >= 0) {
                    slots.select(lci);
                    slots.record(lci);
                    slots.launch(lci);
                    slots.showInEditor(lci);
                    applicationControl.getApplication().zoomToFit();
                    applicationControl.getApplication().zoomToSelection();
                } else {
                    // println(" No Play No Rec No Select = " + lci);
                }

            }
        }
    });

    autoButton.setCallback(function (value) {
        if (value === 0) {
            return;
        }
        transport.toggleWriteClipLauncherAutomation();
    });

    leftNavButton.setCallback(function (value) {

        
            switch (navMode) {
                case NavButtonMode.None:
                    leftNavButton.sendValue(value);
                    break;
                case NavButtonMode.Shift:
                    if (value !== 0) {
                        transport.toggleClick();
                    }
                    modifiers.isShiftDown();
                    break;
                case NavButtonMode.Device:
                    if (value !== 0) {
                        if (modifiers.isShiftDown()) {
                            cursorDevice.selectParent();
                            cursorDevice.selectInEditor();
                        } else {
                            cursorDevice.selectPrevious();
                            cursorDevice.selectInEditor();
                        }
                    } else {
                        if (parameterControl) {
                            parameterControl.showParamAssignments();
                        }
                    }
                    break;
                case NavButtonMode.Parameter:
                    if (value !== 0 && parameterControl) {
                        parameterControl.navigateParameter(-1);
                    }
                    break;
            }
        
    });

    rightNavButton.setCallback(function (value) {

        
            switch (navMode) {
                case NavButtonMode.None:
                    rightNavButton.sendValue(value);
                    break;
                case NavButtonMode.Shift:
                    if (value !== 0) {
                        transport.toggleLoop();
                    }
                    modifiers.isShiftDown();
                    break;
                case NavButtonMode.Device:
                    if (value !== 0) {
                        if (modifiers.isShiftDown()) {
                            if (currentSlotList && currentSlotList.length > 0) {
                                cursorDevice.selectFirstInSlot(currentSlotList[0]);
                            }
                        } else {
                            cursorDevice.selectNext();
                        }
                        cursorDevice.selectInEditor();
                    } else {
                        if (parameterControl) {
                            parameterControl.showParamAssignments();
                        }
                    }
                    break;
                case NavButtonMode.Parameter:
                    if (value !== 0 && parameterControl) {
                        parameterControl.navigateParameter(1);
                    }
                    break;
            }
        
    });
}

