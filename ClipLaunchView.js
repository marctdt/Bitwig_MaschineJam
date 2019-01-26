/**
 * @param {TrackBankContainer} trackBank
 *
 * @returns {ClipView}
 **/
function ClipLaunchView(trackBank) {
    /** @type {PlayState} */
    var playState = [];
    var flashCount = 0;
    var active = false;
    var trackStates = null;
    var sceneStates = null;
    var duplicateCopyToggle = false;

    var sendToJam = function (index, color, queued, force) {
        if (!active) {
            return;
        }
        controls.buttonMatrix.sendValue(index, color, queued, force);
    };

    this.setTrackStates = function (states) {
        trackStates = states;
    };

    this.setSceneStates = function (states) {
        sceneStates = states;
    };

    this.selectClipInSlot = function (trackIndex) {
        if (modifiers.isSelectDown()) {
            return;
        }
        var selIndex = -1;
        var playIndex = -1;
        var lastContent = -1;
        for (var sindex = 0; sindex < 8; sindex++) {
            var _index = gGlipOrientation === ORIENTATION.TrackBased ? sindex * 8 + trackIndex : trackIndex * 8 + sindex;
            var state = playState[_index];
            if (state.hascontent) {
                lastContent = sindex;
            }
            if (state.selected) {
                selIndex = sindex;
            }
            if (state.playing) {
                playIndex = sindex;
            }
        }
        if (selIndex === -1) {
            if (playIndex >= 0) {
                trackBank.getTrack(trackIndex).getClipLauncherSlots().select(playIndex);
            } else if (lastContent >= 0) {
                // trackBank.getTrack(trackIndex).getClipLauncherSlots().select(lastContent);
            }
        }
    };

    /**
     * @param {Track} track
     * @param {int} tindex
     **/
    function registerTrack(track, tindex) {
        var slot = track.getClipLauncherSlots();
        /**
         * Slot Section
         **/

        slot.addColorObserver(function (sindex, red, green, blue) {
            var _index = gGlipOrientation === ORIENTATION.TrackBased ? sindex * 8 + tindex : tindex * 8 + sindex;
            var color = convertColor(red, green, blue);
            playState[_index].basecolor = color;
            sendToJam(_index, playState[_index].color(), true);
        });
        slot.addHasContentObserver(function (sindex, hascontent) {
            
            var _index = toIndex(sindex, tindex);
            var _state = playState[_index];
            if (_state.basecolor === 0 && hascontent) {
                playState[_index].basecolor = 72;
                sendToJam(_index, playState[_index].color(), true);
                //host.showPopupNotification("has content");
                
            }else{
                sendToJam(_index, 0, true);
               }
            _state.hascontent = hascontent;
        });
        slot.addIsPlayingObserver(function (sindex, playing) {
            var _index = toIndex(sindex, tindex);
            var _state = playState[_index];
            _state.playing = playing;
        });
        slot.addIsSelectedObserver(function (sindex, isselected) {
            var _index = toIndex(sindex, tindex);
            var _state = playState[_index];
            _state.selected = isselected;
        });

        slot.addPlaybackStateObserver(function (sindex, state, queued) {
            var _index = toIndex(sindex, tindex);
            var _state = playState[_index];
            var prev_flash = _state.isFlashing();

            _state.setPlayState(state, queued);
            sendToJam(_index, _state.color(), true);
            if (prev_flash !== _state.isFlashing()) {
                if (!prev_flash) {
                    flashCount++;
                } else {
                    flashCount--;
                }
            }
        });
    }

    (function () {
        for (var i = 0; i < 64; i++) {
            playState.push(new PlayState());
        }
        for (i = 0; i < 8; i++) {
            registerTrack(trackBank.getTrack(i), i);
        }
    })();

    this.setIndication = function (indication) {
        for (var i = 0; i < 8; i++) {
            trackBank.getTrack(i).getClipLauncher().setIndication(indication);
        }
    };

    var toIndex = function (trackIndex, sceneIndex) {
        return gGlipOrientation === ORIENTATION.TrackBased ? trackIndex * 8 + sceneIndex : sceneIndex * 8 + trackIndex;
    };

    this.blink = function (blinkstate) {
        if (flashCount > 0) {
            for (var i = 0; i < 64; i++) {
                var state = playState[i];
                switch (state.flashState()) {
                    case FlashStates.QUEUED: //
                        if (blinkstate > 3) {
                            sendToJam(i, playState[i].color() + 3);
                        } else {
                            sendToJam(i, playState[i].color());
                        }
                        break;
                    case FlashStates.REC:
                        if (blinkstate > 3) {
                            sendToJam(i, JAMColor.RED + 5);
                        } else {
                            sendToJam(i, playState[i].color());
                        }
                        break;
                    case FlashStates.RECQUEUE:
                        if ((blinkstate % 4) > 1) {
                            sendToJam(i, JAMColor.RED + 5);
                        } else {
                            sendToJam(i, playState[i].color());
                        }
                        break;
                }
            }
        }
    };

    this.recalcView = function () {
        for (var i = 0; i < 64; i++) {
            var val1 = playState[i];
            var _row = Math.floor(i / 8);
            var _col = (i % 8);
            if (_col < _row) {
                var tindex = _row + _col * 8;
                playState[i] = playState[tindex];
                playState[tindex] = val1;
            }
        }
        resendColors();
    };

    this.update = function () {
        resendColors();
    };

    var resendColors = function () {
        if (!active) {
            return;
        }
        for (var i = 0; i < 64; i++) {
            sendToJam(i, playState[i].color(), true, true);
        }
    };

    this.enter = function () {
        active = true;
        resendColors();
    };

    this.exit = function () {
        active = false;
    };

    this.navigate = function (direction) {
        switch (direction) {
            case DirectionPad.TOP:
                if (gGlipOrientation === ORIENTATION.TrackBased) {
                    if (modifiers.isShiftDown()) {
                        trackBank.bank.scrollScenesUp();
                    } else {
                        trackBank.bank.scrollScenesPageUp();
                    }
                } else {
                    if (modifiers.isShiftDown()) {
                        trackBank.bank.scrollTracksPageUp();
                    } else {
                        trackBank.bank.scrollTracksUp();
                    }
                }
                break;
            case DirectionPad.DOWN:
                if (gGlipOrientation === ORIENTATION.TrackBased) {
                    if (modifiers.isShiftDown()) {
                        trackBank.bank.scrollScenesDown();
                    } else {
                        trackBank.bank.scrollScenesPageDown();
                    }
                } else {
                    if (modifiers.isShiftDown()) {
                        trackBank.bank.scrollTracksPageDown();
                    } else {
                        trackBank.bank.scrollTracksDown();
                    }
                }
                break;
            case DirectionPad.LEFT:
                if (gGlipOrientation === ORIENTATION.TrackBased) {
                    if (modifiers.isShiftDown()) {
                        trackBank.bank.scrollTracksUp();
                    } else {
                        trackBank.bank.scrollTracksPageUp();
                    }
                } else {
                    if (modifiers.isShiftDown()) {
                        trackBank.bank.scrollScenesUp();
                    } else {
                        trackBank.bank.scrollScenesPageUp();
                    }
                }
                break;
            case DirectionPad.RIGHT:
                if (gGlipOrientation === ORIENTATION.TrackBased) {
                    if (modifiers.isShiftDown()) {
                        trackBank.bank.scrollTracksDown();
                    } else {
                        trackBank.bank.scrollTracksPageDown();
                    }
                } else {
                    if (modifiers.isShiftDown()) {
                        trackBank.bank.scrollScenesDown();
                    } else {
                        trackBank.bank.scrollScenesPageDown();
                    }
                }
                break;
        }
    };

    var handleEventJAM = function (row, col, value) {
        if (value === 0) {
            return;
        }
        resendColors();
        var rowt = gGlipOrientation === ORIENTATION.TrackBased ? row : col;
        var colt = gGlipOrientation === ORIENTATION.TrackBased ? col : row;
        var _index = rowt * 8 + colt;
        if (modifiers.isShiftDown()) {
            applicationControl.exec(row * 8 + col);
            return;
        }

        if (!trackStates[colt].exists || !sceneStates[rowt]) {
            return;
        }
        /** @type {Track} */
        var track = trackBank.getTrack(colt);
        var slots = track.getClipLauncherSlots();

        if (modifiers.isSelectDown()) {//------------------------------SELECT
            track.selectInMixer();
            slots.select(rowt);
            slots.showInEditor(rowt);
        } else if (modifiers.isClearDown()) {//------------------------CLEAR
            //CLEAR verursacht probleme mit duplicate
            slots.deleteClip(rowt);
            applicationControl.setClearUsed(true);
        } else if (modifiers.isMacroDown()) {//------------------------MACRO
            slots.createEmptyClip(rowt, 4);
        } else if (modifiers.isDuplicateDown()) {//--------------------DUPLICATE
            applicationControl.focusClipLauncher();
            slots.select(rowt);
            if (false === duplicateCopyToggle) {
                applicationControl.exec(8);
                duplicateCopyToggle = true;                
            } else {
                applicationControl.exec(10);
                playState[_index].hascontent = true;
            }
            resendColors();
            //resendColors
        } else {
            /** @type {PlayState} */
            var state = playState[_index];
            //println(" > " + trackStates[colt].type + " > " + state.hascontent);
            //println(" T: " + trackStates[colt].armed );
            //eprintln(" STATE > " + state.info());
            if (state.hascontent) {
                if (state.playing || state.isQueued()) {
                    slots.stop();
                } else {
                    slots.launch(rowt);
                    if (selectAndLaunch) {
                        slots.select(rowt);
                    }
                }
            } else {
                if (trackStates[colt].armed) {
                    if (trackStates[colt].type === TrackTypes.Instrument) {
                        slots.createEmptyClip(rowt, 4.0);
                        slots.launch(rowt);
                        if (selectAndLaunch) {
                            slots.select(rowt);
                        }
                        showInEditor(slots, rowt);
                    } else {
                        slots.record(rowt);
                        slots.launch(rowt);
                    }
                } else {
                    slots.createEmptyClip(rowt, 4.0);
                    if (selectAndLaunch) {
                        slots.select(rowt);
                    }
                    showInEditor(slots, rowt);
                }
            }
            //trackBank.getTrack(colt).getClipLauncherSlots().launch(rowt);
        }
    };

    this.resetDuplicateCopyToggle = function () {
        duplicateCopyToggle = false;
    }

    this.getDuplicateCopyToggle = function () {
        return duplicateCopyToggle ;
    }

    function showInEditor(slots, row) {
        applicationControl.showNoteEditor();
        slots.showInEditor(row);
        applicationControl.getApplication().focusPanelBelow();
        applicationControl.getApplication().zoomToFit();
    }

    this.handleEvent = handleEventJAM;

    this.handleEventStd = function (row, col, value) {
        if (value === 0) {
            return;
        }
        var rowt = gGlipOrientation === ORIENTATION.TrackBased ? row : col;
        var colt = gGlipOrientation === ORIENTATION.TrackBased ? col : row;
        if (modifiers.isSelectDown()) {
            trackBank.getTrack(colt).getClipLauncherSlots().select(rowt);
        } else if (modifiers.isClearDown()) {
            trackBank.getTrack(colt).getClipLauncherSlots().deleteClip(rowt);
            recalcView();
            host.showPopupNotification("should be recalc");
            applicationControl.setClearUsed(true);
        } else if (modifiers.isMacroDown()) {
            trackBank.getTrack(colt).getClipLauncherSlots().createEmptyClip(rowt, 4);
        } else if (modifiers.isDuplicateDown()) {
            trackBank.getTrack(colt).getClipLauncherSlots().select(rowt);
            applicationControl.execAction("Duplicate");
        } else if (modifiers.isShiftDown()) {
            applicationControl.exec(row * 8 + col, function () {
                trackBank.getTrack(colt).getClipLauncherSlots().select(rowt);
            });
        } else {
            trackBank.getTrack(colt).getClipLauncherSlots().launch(rowt);
        }
    };

}

/**
 *
 *    Class PlaySate
 *
 **/
function PlayState() {
    var pstate = 0;
    var queued = false;
    this.basecolor = 0;
    this.hascontent = false;
    this.playing = false;
    var flashing = false;
    var flashState = FlashStates.NONE;
    this.exists = false;
    this.selected = false;

    this.color = function () {
        //this.basecolor === 0
        if (this.hascontent === false){
            return 0;
        }
        if (this.basecolor === 0) {
            return 0;
        }
        if (this.playing || pstate === 2) {
            return this.basecolor + 2;
        }
        return this.basecolor;
    };

    this.setPlayState = function (pState, pQueued) {
        pstate = pState;
        queued = pQueued;
        if (pstate === 2) {
            flashing = true;
            flashState = queued ? FlashStates.RECQUEUE : FlashStates.REC;
        } else {
            if (pstate === 0 && queued) {
                flashing = false;
            } else {
                flashing = queued;
            }
            flashState = flashing ? FlashStates.QUEUED : FlashStates.NONE;
        }
    };

    this.flashState = function () {
        return flashState;
    };

    this.isFlashing = function () {
        return flashing;
    };

    this.isRecording = function () {
        return pstate === 2;
    };

    this.isQueued = function () {
        return queued;
    };

    this.info = function () {
        return "Q: " + queued + " S:" + pstate + " Contents=" + this.hascontent + " Play=" + this.playing + " Exist=" + this.exists;
    };
}

/*  END clas PlayState */