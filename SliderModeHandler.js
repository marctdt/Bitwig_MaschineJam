/**
 * General Handler for Controlling the modes of the Touchstrips
 *
 * @param {TrackBankContainer} mixerTrackBank
 * @param {TrackBankContainer} effectTrackBank
 * @param {int} numTracks
 * @param {ClipLaunchView} clipview
 * @param {Device} cursorDevice
 * @param {TrackHandler} trackHandler
 */
function SliderModeHandler(mixerTrackBank, effectTrackBank, numTracks, cursorDevice, trackHandler) {
    var levelButton = controls.createButton(ENCODERBUTTON.LEVEL);
    var auxButton = controls.createButton(ENCODERBUTTON.AUX);
    var deviceButton = controls.createButton(ENCODERBUTTON.CONTROL);
    var macrcoButton = controls.createButton(ENCODERBUTTON.MACRO);

    var deviceControl = new DeviceSliderControl(cursorDevice, trackHandler);
    var mixerControl = new MixerSliderControl("mixer", mixerTrackBank, host.createEffectTrackBank(8, 8));
    var efxControl = new MixerSliderControl("effect", effectTrackBank);
    var sliderView = new SliderView(numTracks);

    transport.setParameterControl(deviceControl);

    var masterMode = mixerControl;
    var currentMode = mixerControl;

    var controlMode = ControlModes.VOLUME;

    mixerControl.setDisplay(sliderView);
    currentMode.setMode(controlMode);

    /**
     * Make Select the Touch Strip Slider Mode Butto according to current mode
     **/
    function radioModes() {
        levelButton.sendValue(controlMode === ControlModes.VOLUME || controlMode === ControlModes.PAN ? 127 : 0);
        auxButton.sendValue(controlMode === ControlModes.AUX ? 127 : 0);
        deviceButton.sendValue(controlMode === ControlModes.DEVICE || controlMode === ControlModes.MIDI_CC ? 127 : 0);
        macrcoButton.sendValue(controlMode === ControlModes.MACRO ? 127 : 0);
    }

    radioModes();

    this.updateTrackColor = function (color) {
        deviceControl.updateTrackColor(color);
    };

    this.switchToEffectMode = function () {
        if (masterMode === efxControl) {
            return;
        }
        masterMode = efxControl;
        if (currentMode.isMixer()) {
            currentMode.setDisplay(null);
            currentMode = efxControl;
            currentMode.setDisplay(sliderView);
            if (controlMode === ControlModes.AUX) {
                controlMode = ControlModes.VOLUME;
                currentMode.setMode(controlMode);
                radioModes();
            }
            refreshMixerMode();
        }
    };

    this.inEffectMode = function () {
        return masterMode !== mixerControl;
    };

    this.switchToTrackMode = function () {
        if (masterMode === mixerControl) {
            return;
        }
        masterMode = mixerControl;
        if (currentMode.isMixer()) {
            currentMode.setDisplay(null);
            currentMode = mixerControl;
            currentMode.setDisplay(sliderView);
            refreshMixerMode();
        }
    };

    function getOffset(slider, value) {
        var offset = 0;
        if (slider.touched) {
            slider.touched = false;
            slider.downValue = value;
        } else {
            var diff = (value - slider.downValue);
            // Diff needs to be greater than 1 to adjust value in smaller increments
            if (Math.abs(diff) > 1) {
                offset = diff > 0 ? 1 : -1;
                slider.downValue = value;
            }
        }
        return offset;
    }

    function changeCCValue(value, slider, index) {
        noteInput.sendRawMidiEvent(0xB0, 45 + index, value);
    }

    function changeDeviceValue(value, slider, index) {
        var offset = getOffset(slider, value);
        if (modifiers.isShiftDown()) {
            if (offset === 0)
                return;
        } else {
            currentMode.setDeviceValue(index, value);
        }
    }

    function changeMacroValue(value, slider, index) {
        var offset = getOffset(slider, value);
        if (modifiers.isShiftDown()) {
            if (offset === 0)
                return;
            currentMode.setMacroValue(index, currentMode.getMacroValue(index) + offset);
        } else {
            currentMode.setMacroValue(index, value);
        }
    }

    function changeSendLevel(value, slider, index) {
        var offset = getOffset(slider, value);
        if (modifiers.isShiftDown()) {
            if (offset === 0)
                return;
            currentMode.setSendLevel(index, currentMode.getSendValue(index) + offset);
        } else {
            currentMode.setSendLevel(index, value);
        }
    }

    function handleSliderTouch(index, value) {
        if (value === 0) {
            var trackValues = currentMode.values();
            currentMode.cleanUpView(index, trackValues[index].volume);
        }
    }

    function changeMixerLevels(value, slider, index) {
        var offset = getOffset(slider, value);
        var trackValues = currentMode.values();
        if (modifiers.isShiftDown()) {
            if (offset === 0)
                return;
            currentMode.setVolume(index, trackValues[index].volume + offset);
        } else {
            currentMode.setVolume(index, value);
        }
    }

    function changePan(value, slider, index) {
        var offset = getOffset(slider, value);
        var trackValues = currentMode.values();
        if (modifiers.isShiftDown()) {
            if (offset === 0)
                return;
            currentMode.setPan(index, trackValues[index].pan + offset);
        } else {
            currentMode.setPan(index, value);
        }
    }

    sliderView.assignSliderCallback(changeMixerLevels, handleSliderTouch);
    masterMode.setSendsToZeroListener(function () {
        setToVolumeMode();
    });

    function setToVolumeMode(showNotification) {
        switchToMixerMode(ControlModes.VOLUME);
        controlMode = ControlModes.VOLUME;
        currentMode.setMode(controlMode);
        barmode = BarModes.DUAL;
        sliderView.assignSliderCallback(changeMixerLevels, handleSliderTouch);
        var trackValues = currentMode.values();
        sliderView.setStripValues(BarModes.DUAL, currentMode.getVolume, trackValues);
        radioModes();
        if (showNotification) {
            host.showPopupNotification("Touchstrip controls Volume");
        }
    }

    function setToPanMode(showNotification) {
        switchToMixerMode(ControlModes.PAN);
        controlMode = ControlModes.PAN;
        sliderView.assignSliderCallback(changePan);
        sliderView.setStripValues(BarModes.PAN, currentMode.getPan, currentMode.values());
        radioModes();
        if (showNotification) {
            host.showPopupNotification("Touchstrip controls Panning");
        }
    }

    function refreshMixerMode() {
        switch (controlMode) {
            case ControlModes.VOLUME:
                setToVolumeMode(true);
                break;
            case ControlModes.PAN:
                setToPanMode(true);
                break;
            case ControlModes.AUX:
                setToAuxMode(true);
                break;
        }
    }

    function setToAuxMode(showNotification) {
        switchToMixerMode(ControlModes.AUX);
        controlMode = ControlModes.AUX;
        sliderView.assignSliderCallback(changeSendLevel);
        sliderView.setStripValues(BarModes.DOT, currentMode.getSendValue, currentMode.values());
        radioModes();
        currentMode.showSendIndex();
    }

    function switchToMixerMode(newMode) {
        if (!currentMode.isMixer()) {
            currentMode.setDisplay(null);
            currentMode.setMode(newMode);
            currentMode = masterMode;
            currentMode.setDisplay(sliderView);
        }
        currentMode.setMode(newMode);
    }

    function switchToDeviceMode(newMode) {
        if (currentMode.isMixer()) {
            currentMode.setDisplay(null);
            currentMode.setMode(newMode);
            currentMode = deviceControl;
            currentMode.setDisplay(sliderView);
        }
        currentMode.setMode(newMode);
    }

    levelButton.setCallback(function (value) {
        if (value === 0) {
            return;
        }

        if (modifiers.isShiftDown()) {
            if (controlMode !== ControlModes.PAN) {
                setToPanMode();
            }
        } else {
            if (controlMode !== ControlModes.VOLUME) {
                setToVolumeMode();
            }
        }
    });

    auxButton.setCallback(function (value) {
        if (value === 0 || masterMode.numberOfSends() === 0) {
            return;
        }
        if (controlMode !== ControlModes.AUX) {
            setToAuxMode();
        } else {
            currentMode.incrementSendIndex();
        }
    });

    deviceButton.setCallback(function (value) {
        transport.notifyModButton(ENCODERBUTTON.CONTROL, value > 0);
        if (value === 0) {
            return;
        }
        if (modifiers.isShiftDown()) {
            if (controlMode !== ControlModes.MIDI_CC) {
                switchToDeviceMode(ControlModes.MIDI_CC);
                controlMode = ControlModes.MIDI_CC;
                sliderView.assignSliderCallback(changeCCValue);
                sliderView.refresh();
                currentMode.updateSliders();
                radioModes();
                host.showPopupNotification("Touchstrip controls Midi CC");
            }
            return;
        } else if (controlMode !== ControlModes.DEVICE) {
            if (!deviceControl.hasDevice()) {
                return;
            }
            switchToDeviceMode(ControlModes.DEVICE);
            controlMode = ControlModes.DEVICE;
            sliderView.assignSliderCallback(changeDeviceValue);
            sliderView.refresh();
            currentMode.updateSliders();
            radioModes();
            cursorDevice.selectInEditor();
            if (modifiers.isSelectDown()) {
                cursorDevice.isWindowOpen().toggle();
            }
            host.showPopupNotification("Touchstrip controls Device");
        } else if (modifiers.isSelectDown()) {
            cursorDevice.isWindowOpen().toggle();
        } else if (modifiers.isClearDown()){
            host.showPopupNotification("TODO clear device ... mit enter ?");
            applicationControl.focusDevicePanel();
            cursorDevice.selectInEditor();
            applicationControl.getApplication().remove();
            applicationControl.setClearUsed(true);
        }
        currentMode.showParamAssignments();
    });

    macrcoButton.setCallback(function (value) {
        transport.notifyModButton(ENCODERBUTTON.MACRO, value > 0);
        if (value === 0) {
            return;
        }
        if (controlMode !== ControlModes.MACRO) {
            switchToDeviceMode(ControlModes.MACRO);
            controlMode = ControlModes.MACRO;
            sliderView.assignSliderCallback(changeMacroValue);
            sliderView.refresh();
            currentMode.updateSliders();
            radioModes();
            applicationControl.showDevices();
            host.showPopupNotification("Touchstrip controls Macros");
        }
    });

    this.exit = function () {
        host.getMidiOutPort(0).sendSysex("f000210915004d5000010500000000000000000000000000000000f7");
    };

}
