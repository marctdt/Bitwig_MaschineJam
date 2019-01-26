/**
 * @param {Clip} cursorClip the cursor Clip
 */

function ApplicationControl(cursorClip) {
    var application = host.createApplication();
    var layout = "";

    var APPCOMMANDS = {
        UNDO: 0,
        REDO: 1,
        QUANT: 2,
        QUANT50: 3,
        SEMI_DOWN: 4,
        SEMI_UP: 5,
        OCTAVE_DOWN: 6,
        OCTAVE_UP: 7,
        COPY: 8,
        CUT: 9,
        PASTE: 10,
        TOGGLE_EDITOR: 56,
        TOGGLE_DEVICES: 57,
        TOGGLE_MIXER: 58,
        TOGGLE_AUTOMATION: 59
    };

    var arrangeButton = controls.createButton(MAIN_BUTTONS.ARRANGE);
    arrangeButton.setCallback(function (value) {
        //arrangeButton.sendValue(value);
        if (value !== 0) {
            if (modifiers.isShiftDown()) {
                if (gGlipOrientation == ORIENTATION.TrackBased) {
                    gGlipOrientation = ORIENTATION.SceneBased;
                } else {
                    gGlipOrientation = ORIENTATION.TrackBased;
                }
                currentMode.recalcView();
                // rotateView();
            } else {
                if (layout === "MIX") {
                    application.setPanelLayout("ARRANGE");
                } else if (layout == "ARRANGE") {
                    application.setPanelLayout("MIX");
                }
            }
        }
    });
    //TO GET ALL ACTIONS:
//    var actions = [];
//    actions = application.getActions();
//
//    for (var i = 0; i < actions.length; i++) {
//        println("id: " + actions[i].getId() + "action: " + actions[i].getName());
//    }

    //Focus/toggle Clip Launcher Panel
    //Select item at cursor
    //Focus Track Header Area

    application.addPanelLayoutObserver(function (newPanelLayout) {
        layout = newPanelLayout;
        if (layout === "MIX") {
            arrangeButton.sendValue(0);
        } else if (layout == "ARRANGE") {
            arrangeButton.sendValue(127);
        }
    }, 16);

    /***
     * @returns {Application}
     */
    this.getApplication = function () {
        return application;
    };


    this.showAudioEditor = function () {
        application.toggleDevices();
        application.toggleNoteEditor();
    };

    this.showNoteEditor = function () {
        application.toggleDevices();
        application.toggleNoteEditor();
    };

    this.showDevices = function () {
        application.toggleNoteEditor();
        application.toggleDevices();
    };

    this.invokeAction = function (actionName) {
        var action = application.getAction(actionName);
        if (action) {
            action.invoke();
        }
    };

    this.focusClipLaunch = function () {
        if (layout !== "MIX") {
            application.setPanelLayout("MIX");
        }
        application.focusPanelAbove();
        application.zoomToSelection();
    };

    this.focusTrackHeaderArea = function () {
        var action = application.getAction("focus_track_header_area");
        action.invoke();
    };
    
    this.focusDevicePanel = function () {
        this.focusTrackHeaderArea();
        var action = application.getAction("focus_or_toggle_device_panel");
        action.invoke();        
    }

    this.focusClipLauncher = function () {
        
        this.focusTrackHeaderArea();
        var action = application.getAction("focus_or_toggle_clip_launcher");
        action.invoke();
    };

    this.execAction = function (command) {
        var action = application.getAction(command);
        if (action) {
            this.focusClipLaunch();
            action.invoke();
        }
    };

    this.exec = function (command) {
        switch (command) {
            case APPCOMMANDS.UNDO:
                //application.undo();
                application.getAction("Undo").invoke();
                host.showPopupNotification("Undo");
                break;
            case APPCOMMANDS.REDO:
                application.getAction("Redo").invoke();
                // application.redo();
                host.showPopupNotification("Redo");
                break;
            case APPCOMMANDS.QUANT:
                this.showNoteEditor();
                application.focusPanelBelow();
                application.selectAll();
                host.showPopupNotification("Quantize");
                cursorClip.quantize(1.0);
                break;
            case APPCOMMANDS.QUANT50:
                this.showNoteEditor();
                application.focusPanelBelow();
                application.selectAll();
                host.showPopupNotification("Quantize 50%");
                cursorClip.quantize(0.5);
                break;
            case APPCOMMANDS.SEMI_UP:
                host.showPopupNotification("Transpose +1 Semi");
                cursorClip.transpose(1);
                break;
            case APPCOMMANDS.SEMI_DOWN:
                host.showPopupNotification("Transpose -1 Semi");
                cursorClip.transpose(-1);
                break;
            case APPCOMMANDS.OCTAVE_UP:
                host.showPopupNotification("Transpose +1 Octave");
                cursorClip.transpose(12);
                break;
            case APPCOMMANDS.OCTAVE_DOWN:
                host.showPopupNotification("Transpose -1 Octave");
                cursorClip.transpose(-12);
                break;
            case APPCOMMANDS.COPY:
                //this.focusClipLaunch();
                application.copy();
                host.showPopupNotification("Copy");
                break;
            case APPCOMMANDS.CUT:
                this.focusClipLaunch();
                application.cut();
                host.showPopupNotification("Cut");
                break;
            case APPCOMMANDS.PASTE:
                //this.focusClipLaunch();
                application.paste();
               host.showPopupNotification("Paste");
                break;
            case APPCOMMANDS.TOGGLE_EDITOR:
                application.toggleNoteEditor();
                host.showPopupNotification("Toggle Editor");
                break;
            case APPCOMMANDS.TOGGLE_DEVICES:
                application.toggleDevices();
                host.showPopupNotification("Toggle Devices");
                break;
            case APPCOMMANDS.TOGGLE_MIXER:
                application.toggleMixer();
                host.showPopupNotification("Toggle Mixer");
                break;
            case APPCOMMANDS.TOGGLE_AUTOMATION:
                application.toggleAutomationEditor();
                host.showPopupNotification("Toggle Automation");
                break;
            default:
                host.showPopupNotification("Unimplemented Command " + command);
        }
    };
}
