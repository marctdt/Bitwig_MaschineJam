var FlashStates = {
    NONE: 0,
    QUEUED: 1,
    RECQUEUE: 2,
    REC: 3
};

/**
 * @classdesc Represents the general Clip Launching Mode
 * @class
 * @augments JamMode
 * 
 * @param {ClipLaunchView} clipView
 * @param {TrackViewContainer} trackView
 * @param {SceneView} sceneView
 */
function ClipMode(clipView, trackView, sceneView, trackStates) {
    JamMode.call(this, clipView, trackView, sceneView);
    this.mainView.setTrackStates(trackStates);
    this.mainView.setSceneStates(sceneView.sceneStates());
    var blinkstate = 0;

    this.recalcView = function () {
        this.mainView.recalcView();
    };

    this.navigate = function (direction) {
        this.mainView.navigate(direction);
        sceneView.navigate(direction);
    };

    this.handleBlink = function () {
        blinkstate = (blinkstate + 1) % 8;
        this.mainView.blink(blinkstate);
    };

    this.setIndication = function (indication) {
        this.mainView.setIndication(indication);
    };

    this.notifyModifier = function (modifierState) {
        if (modifierState === 8) {
            if (!clipView.getDuplicateCopyToggle() && !globalClipView.getDoubleToggle()) {
                applicationControl.duplicate();
                host.showPopupNotification("Duplicate");
            }
            modifierState = 0;
        }

        if (modifierState === 0) {

            clipView.resetDuplicateCopyToggle();
            globalClipView.resetDoubleToggle();
            clipView.update();
        }
        else if (modifierState === 5) {
            globalClipView.duplicateContent(); // Duplicate + Shift
            host.showPopupNotification("Double");

        }


    };
	/**
	 * @return {ClipView}
	 */
    this.getClipView = function () {
        return clipLauncher;
    };

    this.postEnter = function () {
        modifiers.setLockButtonState(false);
        modifiers.setLockButtonHandler(function (value) {

        });
    };

}

