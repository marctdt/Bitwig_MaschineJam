/**
 * @classdesc Mode in which the Pads are used to play Notes
 * @class
 * @augments JamMode
 * 
 * @param {NoteView} noteView 
 * @param {DrumPadView} drumPadView 
 * @param {TrackViewContainer} trackView reference to Clip Mode object
 * @param {SceneView} sceneView reference to Clip Mode object
 * @param {Clip} cursorClip
 *
 * @returns {PadMode}
 */

function PadMode(noteView, drumPadView, trackView, sceneView, cursorClip, cursorDevice, sceneView) {
    JamMode.call(this, noteView, trackView, sceneView);
    var handleEvent = this.handleEvent;

    this.updatePitchNames = function (size, mapping, key, name) {
        drumPadView.updatePitchNames(size, mapping, key, name);
    };

    this.handleEvent = function (sender, row, col, value, notenr) {
        handleEvent.call(this,sender, row, col, value, notenr);
        var note = 0;
        if (this.mainView === drumPadView) {
            note = ((7 - row) * 4) + 36 + (col - 4);
            cursorDevice.selectParent();
            cursorDevice.selectFirstInKeyPad(note);

        }
    };

    this.receiveNote = function (on, note, velocity) {
        this.mainView.receiveNote(on, note, velocity);
    };

    this.updateTrackColor = function (color) {
        noteView.updateTrackColor(color);
        drumPadView.updateTrackColor(color);
    };

    this.inNoteView = function () {
        return this.mainView === noteView;
    };

    this.inDrumView = function () {
        return this.mainView === drumPadView;
    };

    this.setToNoteView = function () {
        if (this.mainView !== noteView) {
            this.mainView.exit();
            this.mainView = noteView;
            this.mainView.enter();
        }
    };

    this.setToDrumView = function () {
        drumPadView.setStepMode(false);
        if (this.mainView !== drumPadView) {
            this.mainView.exit();
            this.mainView = drumPadView;
            this.mainView.enter();
        }
    };

    this.selectionModAction = function () {
        noteView.selectionModAction();
    };

    this.update = function () {
        sceneView.update();
        this.mainView.update();
    };


    this.notifyShift = function (shiftDown) {
        this.mainView.notifyShift(shiftDown);
    };

    this.notifyModifier = function (modifierState) {
        this.mainView.notifyModifier(modifierState);
    };

    /**
     * @return {NoteView}
     */
    this.getNoteView = function () {
        return noteView;
    };

    this.navigate = function (direction) {
        this.mainView.navigate(direction);
    };

    this.notifyClear = function (clearDown) {
        if (clearDown)
            cursorClip.clearSteps();
    };

    this.postEnter = function () {
        modifiers.setLockButtonState(false);
        modifiers.setLockButtonHandler(function (value) {

        });
    };

}

