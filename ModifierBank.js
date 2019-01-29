/**
 * 
 */
function ModifierBank() {
    
    var clearButton = controls.createButton(MAIN_BUTTONS.CLEAR);
    var selectButton = controls.createButton(MAIN_BUTTONS.SELECT);
    var duplicateButton = controls.createButton(MAIN_BUTTONS.DUPLICATE);
    var lockButton = controls.createButton(MAIN_BUTTONS.LOCK);
    var lockbuttonHandler = null;

    var selectDown = false;
    var macroDown = false;
    var shiftDown = false;
    var clearDown = false;
    var duplicateDown = false;
    var dpadRightDown = false;

    selectButton.setCallback(function (value) {
        //println("select is Down");
        selectDown = value === 127;
        selectButton.sendValue(value);
        currentMode.notifyModifier((selectDown ? ModifierMask.Select : 0) | (shiftDown ? ModifierMask.Shift : 0));
    });

    /*macrcoButton.setCallback(function(value) {
     macroDown = value == 127;
     macrcoButton.sendValue(value);
     });*/
    
    clearButton.setCallback(function (value) {
        clearDown = value === 127;
        currentMode.notifyClear(clearDown);
        clearButton.sendValue(value);
    });

    duplicateButton.setCallback(function (value) {
        //println("duplicate is down");
        duplicateButton.sendValue(value);
        duplicateDown = value;
        currentMode.notifyModifier((selectDown ? ModifierMask.Select : 0) | (shiftDown ? ModifierMask.Shift : 0) | (duplicateDown ? ModifierMask.Duplicate : ModifierMask.DuplicateUp));
    });

    lockButton.setCallback(function (value) {
        if (lockbuttonHandler) {
            lockbuttonHandler(value);
        }
    });

    this.setLockButtonState = function (state) {
        lockButton.sendValue(state ? 127 : 0);
    };

    this.setLockButtonHandler = function (handler) {
        lockbuttonHandler = handler;
    };

    this.setDpadRightDown = function (value) {
        dpadRightDown = value;
    };
    var shiftOn = false;
    this.notifyShift = function (shiftDownValue) {
        shiftDown = shiftDownValue;
        if (!shiftDownValue) 
            shiftOn = !shiftOn;

        if (shiftOn || shiftDownValue)
                host.showPopupNotification("Shift On");
            else
                host.showPopupNotification("Shift Off");


        currentMode.notifyModifier((selectDown ? ModifierMask.Select : 0) || (shiftDown ? ModifierMask.Shift : 0) || (duplicateDown ? ModifierMask.Duplicate : 0));
    };

    this.isDpadRightDown = function () {
        return dpadRightDown;
    };

    this.isSelectDown = function () {
        //println("select down: " + selectDown);
        return selectDown;
    };

    this.isClearDown = function () {
        return clearDown;
    };

    this.isShiftDown = function () {
        var tmp = shiftOn;
        if (shiftDown)
        shiftOn = true;
        return shiftDown  || tmp;
    };

    this.isDuplicateDown = function () {
        return duplicateDown;
    };

    this.isMacroDown = function () {
        return macroDown;
    };
}

