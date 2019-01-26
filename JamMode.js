/**
 * @classdesc Abstract class that represents a General Mode for the Matrix Buttons
 * @class
 * 
 **/
function JamMode(mainView, trackView, sceneView) {
    var intermediateView = null;
    this.mainView = mainView;

    this.handleEvent = function (/*sender, row, col, value , notenr*/ ) {
    };

    this.receiveNote = function (/*on, note, velocity */) {
    };

    this.notifyShift = function (/*shiftDown*/) {
    };

    this.notifyModifier = function (/*modifierState*/) {
    };

    this.modifyGrid = function (/*incValue, pressedModifier*/) {
    };

    this.pushAction = function (/* value */) {
    };

    this.notifyClear = function (/*clearDown*/) {
    };

    this.recalcView = function () {
    };

    this.navigate = function (/*direction*/) {
    };

    this.handleBlink = function () {
    };

    this.update = function () {
        this.mainView.update();
        sceneView.update();
        trackView.update();
    };

    this.handleEvent = function (sender, row, col, value, notenr) {
        
        switch (sender.id) {
            case GroupControlsId.BUTTON:
                if (intermediateView) {
                    intermediateView.handleEvent(row, col, value);
                } else {
                    this.mainView.handleEvent(row, col, value, notenr);
                }
                break;
            case GroupControlsId.GROUP:
                trackView.handleEvent(col, value);
                break;
            case GroupControlsId.SCENE:
                sceneView.handleEvent(col, value);
                break;
        }
    };

    this.switchToIntermediateView = function (view) {
        intermediateView = view;
        this.mainView.exit();
        intermediateView.enter();
    };

    this.exitIntermediateView = function () {
        if (intermediateView) {
            intermediateView.exit();
            intermediateView = null;
            this.mainView.enter();
        }
    };

    this.enter = function () {
        sceneView.enter();
        trackView.enter();
        this.mainView.enter();
        this.postEnter();
    };

    this.postEnter = function () {

    };

    this.exit = function () {
        this.mainView.exit();
        sceneView.exit();
        trackView.exit();
        if (intermediateView) {
            intermediateView.exit();
            intermediateView = null;
        }
    };

}