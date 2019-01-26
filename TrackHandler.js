/**
 * General Track handler follows the Cursor Track around
 *
 * @param {Track} cursorTrack
 * @param {int} numScenes
 * @param {CursorDevice} cursorDevice
 */

function TrackHandler(cursorTrack, numScenes, cursorDevice) {
    var trackViews = [];
    var selectedSlotIndex = -1;
    var playingSlotIndex = -1;
    var recordingSlotIndex = -1;

    this.selectFirstDevice = function () {
        // cursorTrac
    };

    function init() {
        for (var i = 0; i < numScenes; i++) {
            trackViews.push({ selected: false, content: false, playing: false, recording: false });
        }
    }
    init();

    var slots = cursorTrack.getClipLauncherSlots();

    cursorTrack.addIsSelectedInMixerObserver(function (isSelected) {
        cursorDevice.selectFirstInChannel(cursorTrack);
    });


    slots.addIsSelectedObserver(function (slotindex, selected) {
        trackViews[slotindex].selected = selected;
        if (selected) {
            selectedSlotIndex = slotindex;
        } else if (slotindex === selectedSlotIndex) {
            selectedSlotIndex = -1;
        }
    });

    slots.addIsPlayingObserver(function (slotindex, playing) {
        trackViews[slotindex].playing = playing;
        if (playing) {
            playingSlotIndex = slotindex;
        } else {
            playingSlotIndex = -1;
        }
    });


    slots.addIsRecordingObserver(function (slotindex, recording) {
        trackViews[slotindex].recording = recording;
        if (recording) {
            recordingSlotIndex = slotindex;
        } else {
            recordingSlotIndex = -1;
        }
    });

    this.getCursorTrack = function() {
        return cursorTrack;
    };

    this.getTrackStatus = function () {
        return { selected: selectedSlotIndex, playing: playingSlotIndex, recording: recordingSlotIndex };
    };

    slots.addHasContentObserver(function (slotindex, hasContent) {
        trackViews[slotindex].content = hasContent;
    });

    function getFirstEmptySlot() {
        for (var i = 0; i < numScenes; i++) {
            if (!trackViews[i].content) {
                return i;
            }
        }
        return -1;
    }

    this.getFirstEmptySlot = function () {
        var lastEmptySlotIndex = -1;
        var lastContentIndex = -1;
        for (var i = 0; i < numScenes; i++) {
            if (trackViews[i].content) {
                lastContentIndex = i;
            } else {
                lastEmptySlotIndex = i;
            }
        }
        if (lastContentIndex < 0) {
            return 0;
        }
        if (lastContentIndex < (numScenes - 1)) {
            return lastContentIndex + 1;
        }
        return lastEmptySlotIndex;
    };

    function getLastContentSlot() {
        for (var i = numScenes - 1; i >= 0; i--) {
            if (trackViews[i].content) {
                return i;
            }
        }
        return -1;
    }

    function getFirstContentSlot() {
        for (var i = 0; i < numScenes; i++) {
            if (trackViews[i].content) {
                return i;
            }
        }
        return -1;
    }

    this.createClip = function () {
        if (selectedSlotIndex === -1) {
            return;
        }
        slots.createEmptyClip(selectedSlotIndex, 4.0);
        slots.select(selectedSlotIndex);
        slots.launch(selectedSlotIndex);
    };

    function selectSlot(inc, launchCreate) {
        if (selectedSlotIndex >= 0) {
            if (!trackViews[selectedSlotIndex].content && launchCreate) {
                slots.createEmptyClip(selectedSlotIndex, 4.0);
            } else if (selectedSlotIndex + inc < numScenes && selectedSlotIndex >= 0) {
                if ((selectedSlotIndex + inc) >= 0 && selectedSlotIndex < trackViews.length) {
                    if (!trackViews[selectedSlotIndex + inc].content && launchCreate) {
                        slots.createEmptyClip(selectedSlotIndex + inc, 4.0);
                    }
                    slots.select(selectedSlotIndex + inc);
                    if (launchCreate) {
                        slots.launch(selectedSlotIndex + inc);
                    }
                }
            }
        } else {
            var contentIndex = inc > 0 ? getLastContentSlot() : getLastContentSlot();
            if (contentIndex !== -1) {
                slots.select(contentIndex);
            } else {
                if (launchCreate) {
                    slots.createEmptyClip(0, 4.0);
                }
                slots.select(selectedSlotIndex + inc);
            }
        }
    }

    this.selectSlotInDirection = function (dir, launchCreate) {
        selectSlot(dir, launchCreate);
    };

    this.selectNextSlotInTrack = function () {
        selectSlot(1, true);
    };

    /**
     *
     * @returns {ClipLauncherSlots }
     * */
    this.getSlots = function () {
        return slots;
    };

    this.fireTrack = function () {
        if (selectedSlotIndex >= 0) {
            slots.record(selectedSlotIndex);
            slots.launch(selectedSlotIndex);
        } else {
            var idx = getFirstEmptySlot();
            if (idx >= 0) {
                slots.select(idx);
                slots.record(idx);
                slots.launch(idx);
            }
        }
    };
}

