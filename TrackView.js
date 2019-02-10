var TrackViewModes = {
    FORCE_ARM: 0,
    SELECT: 1,
    MUTE: 2,
    SOLO: 3,
    ARM: 4
};


var TrackViewBasicMode = {
    TRACK: 0,
    EFX: 1
};

var TrackTypes = {
    Instrument: 0,
    Audio: 1,
    Group: 2,
    Effect: 3,
    Master: 4,
    Empty: 5
};

var TrackTypeMapping = {
    "Instrument": TrackTypes.Instrument,
    "Audio": TrackTypes.Audio,
    "Group": TrackTypes.Group,
    "Effect": TrackTypes.Effect,
    "Master": TrackTypes.Master,
    "EMPTY": TrackTypes.Empty
};

function TrackViewState() {
    this.armed = false;
    this.exists = false;
    this.basecolor = 0;
    this.selected = false;
    this.mute = false;
    this.solo = false;

    this.color = function (mode) {
        if (!this.exists) {
            return 0;
        }
        //		if (this.basecolor === 0) {
        //			return 0;
        //		}
        switch (mode) {
            case TrackViewModes.SELECT:
                return this.basecolor + (this.selected ? 2 : 0);
            case TrackViewModes.MUTE:
                return 12 + (this.mute ? 2 : 0);
            case TrackViewModes.SOLO:
                return 20 + (this.solo ? 2 : 0);
            case TrackViewModes.ARM:
                return 4 + (this.armed ? 2 : 0);
        }
    };

    this.setType = function (typeName) {
        if (typeName in TrackTypeMapping) {
            this.type = TrackTypeMapping[typeName];
        }
    };

    this.type = TrackTypes.Empty;
}

/**
 * @param {TrackBankContainer} trackBankContainer
 * @param {TrackBankContainer} efxTrackBankContainer
 * 
 */
function TrackViewContainer(trackBankContainer, efxTrackBankContainer,cursorTrack) {
    var mixerView = new TrackView(trackBankContainer, this, TrackViewBasicMode.TRACK,cursorTrack);
    var efxView = new TrackView(efxTrackBankContainer, this, TrackViewBasicMode.EFX,cursorTrack);

    this.mode = TrackViewModes.SELECT;

    currentView = mixerView;

    this.enter = function () {
        currentView.enter();
    };

    this.exit = function () {
        currentView.exit();
    };

    this.handleEvent = function (index, value) {
        currentView.handleEvent(index, value);
    };

    this.update = function () {
        currentView.update();
    };

    this.toMixerView = function () {
        if (currentView !== mixerView) {
            currentView.exit();
            currentView = mixerView;
            currentView.enter();
        }
    };

    this.toEffectView = function () {
        if (currentView !== efxView) {
            currentView.exit();
            currentView = efxView;
            currentView.enter();
        }
    };

    this.getMixerView = function () {
        return mixerView;
    };

    this.getEffectView = function () {
        return efxView;
    };

    this.enterMuteMode = function () {
        this.mode = TrackViewModes.MUTE;
        mixerView.update();
        efxView.update();
    };

    this.enterSoloMode = function () {
        this.mode = TrackViewModes.SOLO;
        mixerView.update();
        efxView.update();
    };

    this.enterArmMode = function () {
        this.mode = TrackViewModes.ARM;
        mixerView.update();
        efxView.update();
    };

    this.toDefaultMode = function () {
        this.mode = TrackViewModes.SELECT;
        mixerView.update();
        efxView.update();
    };

    this.inArmMode = function () {
        return this.mode === TrackViewModes.ARM;
    };

    this.canArm = function () {
        return mixerView.isActive();
    };
}

/**
 * @param {TrackBank} trackBank
 * @param {TrackViewContainer} parent
 * 
 */
function TrackView(trackBank, parent, basemode,cursorTrack) {
    var active = false;
    var states = [];

    for (var ic = 0; ic < 8; ic++) {
        states.push(new TrackViewState());
    }

    this.isActive = function () {
        return active;
    };

    this.enter = function () {
        active = true;
        this.update();
    };

    this.exit = function () {
        active = false;
    };

    this.trackStates = function () {
        return states;
    };

    this.update = function () {
        if (!active) {
            return;
        }
        for (var i = 0; i < 8; i++) {
            sendToJam(i, states[i].color(parent.mode));
        }
    };

    this.handleEvent = function (index, value) {
        if (value === 0) {
            return;
        }

        var track = trackBank.getTrack(index);
        
        if (modifiers.isShiftDown()) {
            
            switch (index) {
                case 0:
                    applicationControl.showDevices();
                    break;
                case 1:
                    applicationControl.getApplication().activateEngine();
                    break;
                case 2:
                    applicationControl.hideSubPanel();
                    break;
                case 3:
                    applicationControl.getApplication().previousProject();
                    break;
                case 4:
                    applicationControl.getApplication().nextProject();
                    break;
                case 5:
                    applicationControl.showAutomationEditor();
                    break;
                case 6:
                    host.showPopupNotification("Save Project");
                    applicationControl.invokeAction("Save");
                    break;
                case 7:
                    applicationControl.showNoteEditor();
                    break;
            }
            return;
        }

        switch (parent.mode) {
            case TrackViewModes.SELECT:
                if (modifiers.isDuplicateDown()) {
                    if (states[index].exists) {
                        track.duplicate();
                    }
                } else if (modifiers.isDpadRightDown()) {
                    if (basemode === TrackViewBasicMode.TRACK) {
                        applicationControl.getApplication().createInstrumentTrack(-1);
                    } else {
                        applicationControl.getApplication().createEffectTrack(-1);
                    }
                } else if (modifiers.isClearDown()) {
                    if (states[index].exists) {

                        applicationControl.focusTrackHeaderArea();
                        track.makeVisibleInArranger();
                        track.selectInMixer();
                        applicationControl.getApplication().remove();
                        applicationControl.setClearUsed(true);
                    }
                } else {
                    if (states[index].exists) {
                        track.selectInMixer();
                        trackBank.selectClipInSlot(index);
                        track.makeVisibleInMixer();
                        //cursorTrack.isPinned().set(false);
                        //cursorTrack.select();
                        applicationControl.getApplication().focusPanelBelow();
                    } else {
                        if (basemode === TrackViewBasicMode.TRACK) {
                            if (modifiers.isSelectDown()) {
                                applicationControl.getApplication().createAudioTrack(-1);
                            } else {
                                applicationControl.getApplication().createInstrumentTrack(-1);
                            }
                        } else {
                            applicationControl.getApplication().createEffectTrack(-1);
                        }
                    }
                }
                break;
            case TrackViewModes.MUTE:
                track.getMute().toggle();
                break;
            case TrackViewModes.SOLO:
                track.getSolo().toggle();
                break;
            case TrackViewModes.ARM:
                track.getArm().toggle();
                break;
        }
    };

    var sendToJam = function (index, color) {
        if (!active) {
            return;
        }
        controls.groupRow.sendValue(index, color);
    };

    function registerTrack(track, tindex) {
        track.addColorObserver(function (red, green, blue) {
            states[tindex].basecolor = convertColor(red, green, blue);

            if (parent.mode === TrackViewModes.SELECT) {
                sendToJam(tindex, states[tindex].color(parent.mode));
            }
        });

        track.getArm().addValueObserver(function (val) {
            states[tindex].armed = val;
            if (parent.mode === TrackViewModes.SELECT || parent.mode === TrackViewModes.ARM) {
                sendToJam(tindex, states[tindex].color(parent.mode));
            }
        });
        track.getSolo().addValueObserver(function (val) {
            states[tindex].solo = val;
            if (parent.mode === TrackViewModes.SOLO) {
                sendToJam(tindex, states[tindex].color(parent.mode));
            }
        });
        track.getMute().addValueObserver(function (val) {
            states[tindex].mute = val;
            if (parent.mode === TrackViewModes.MUTE) {
                sendToJam(tindex, states[tindex].color(parent.mode));
            }
        });
        track.exists().addValueObserver(function (val) {
            states[tindex].exists = val;

            if (parent.mode === TrackViewModes.SELECT) {
                sendToJam(tindex, states[tindex].color(parent.mode));
            }
        });
        track.addIsSelectedInMixerObserver(function (val) {
            states[tindex].selected = val;
            if (parent.mode === TrackViewModes.SELECT) {
                sendToJam(tindex, states[tindex].color(parent.mode));
            }
        });
        track.addTrackTypeObserver(16, "EMPTY", function (type) {
            states[tindex].setType(type);
        });

    }

    for (var i = 0; i < 8; i++) {
        registerTrack(trackBank.getTrack(i), i);
    }
}