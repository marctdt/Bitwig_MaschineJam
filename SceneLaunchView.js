/**
 * @param {TrackBank} trackBank
 * @param {int} numTracks
 * @param {int} numScenes
 */
function SceneLaunchView(trackBank, numScenes, numTracks) {
    var active = true;
    var exist = [];
    var hasclips = [];
    var globalScrollPosition = 0;
    var sceneBank = host.createSceneBank(numScenes);
    //var allSceneBank = host.createSceneBank(0);

    sceneBank.addScrollPositionObserver(function (scrollPosition) {
        globalScrollPosition = scrollPosition;
        for (var i = 0; i < numScenes; i++) {
            sendToJam(i, getSceneColor(i, scrollPosition));
        }
    }, 0);

    this.enter = function () {
        active = true;
        //numTracks
        for(var i=0;i<numScenes;i++) {        
            sendToJam(i, getSceneColor(i, globalScrollPosition));
        }
    };

    this.exit = function () {
        active = false;
    };

    for (var i = 0; i < numScenes; i++) {
        registerScene(i);
        exist.push(false);
    }

    this.update = function () {
        //numTracks
        for(var i=0;i<numScenes;i++) {       
            sendToJam(i, getSceneColor(i));
        }
    };

    this.sceneStates = function () {
        return exist;
    };

    var sendToJam = function (index, color) {
        if (!active) {
            return;
        }
        controls.sceneRow.sendValue(index, color);
    };

    function getSceneColor(sceneindex) {
        
        if (hasclips[sceneindex] > 0) {
            if (sceneindex < 8)
            {
                return JAMColorBase.WHITE;
            } else if (sceneindex < 16)
            {
                return JAMColorBase.YELLOW;
            } else if (sceneindex < 24)
            {
                return JAMColorBase.LIME;
            } else if (sceneindex < 32)
            {
                return JAMColorBase.GREEN;
            } else {
                return JAMColorBase.MINT;
            }
        } else if (exist[sceneindex]) {
            return JAMColorBase.FUCHSIA;
        }
        return JAMColor.OFF;
    }
    
    //added: scene coloring by scene index
    function getSceneColor(sceneindex, scrollPosition) {
        if(undefined === scrollPosition){
            scrollPosition = 0;
        }
        if (hasclips[sceneindex] > 0) {
            if (sceneindex + scrollPosition < 8) {
                return JAMColorBase.ORANGE;
            } else if (sceneindex + scrollPosition < 16) {
                return JAMColorBase.YELLOW;
            } else if (sceneindex + scrollPosition < 24) {
                return JAMColorBase.LIME;
            } else if (sceneindex + scrollPosition < 32) {
                return JAMColorBase.GREEN;
            } else {
                return JAMColorBase.MINT;
            }
        } else if (exist[sceneindex]) {
            return JAMColorBase.FUCHSIA;
        }
        return JAMColor.OFF;
    }

    function registerScene(sceneindex) {
        var scene = sceneBank.getScene(sceneindex);
        
        //does scene exist ?
        scene.exists().addValueObserver(function (pExists) {           
            exist[sceneindex] = pExists;
            sendToJam(sceneindex, getSceneColor(sceneindex, globalScrollPosition));
        });

        //has scene clips?
        scene.addClipCountObserver(function (count) {           
            hasclips[sceneindex] = count;
           sendToJam(sceneindex, getSceneColor(sceneindex, globalScrollPosition));
        });
    }

    this.navigate = function (direction) {
        switch (direction) {
            case DirectionPad.TOP:
                if (gGlipOrientation === ORIENTATION.TrackBased) {
                    if (modifiers.isShiftDown()) {
                        sceneBank.scrollUp();
                    } else {
                        sceneBank.scrollPageUp();
                    }
                }
                break;
            case DirectionPad.DOWN:
                if (gGlipOrientation === ORIENTATION.TrackBased) {
                    if (modifiers.isShiftDown()) {
                        sceneBank.scrollDown();
                    } else {
                        sceneBank.scrollPageDown();
                    }
                }
                break;
            case DirectionPad.LEFT:
                if (gGlipOrientation === ORIENTATION.SceneBased) {
                    if (modifiers.isShiftDown()) {
                        sceneBank.scrollUp();
                    } else {
                        sceneBank.scrollPageUp();
                    }
                }
                break;
            case DirectionPad.RIGHT:
                if (gGlipOrientation === ORIENTATION.SceneBased) {
                    if (modifiers.isShiftDown()) {
                        sceneBank.scrollDown();
                    } else {
                        sceneBank.scrollPageDown();
                    }
                }
                break;
        }
    };

    this.handleEvent = function (index, value) {
        if (exist[index]) {
            var color = getSceneColor(index);
            sendToJam(index, value === 0 ? color : color + 1);
        }
        if (value === 0) {
            return;
        }

        if (modifiers.isDpadRightDown() || !exist[index] || modifiers.isShiftDown()) {
            applicationControl.invokeAction("Create Scene");
        } else {
            sceneBank.launchScene(index);
        }

        var scene = sceneBank.getScene(index);
        //added: duplicate or remove
        if (modifiers.isDuplicateDown()) {

            applicationControl.focusClipLauncher();
            scene.showInEditor();
            scene.selectInEditor();
            applicationControl.getApplication().duplicate();


        } else if (modifiers.isClearDown()) {

            host.showPopupNotification("clear down has not been tested extensively");
            applicationControl.focusClipLauncher();
            scene.showInEditor();
            scene.selectInEditor();
            applicationControl.getApplication().remove();
        }


    };

    //trackBank.addSceneCountObserver( function(scenecount) {
    //  println(" Scene Counts = " + scenecount);
    //allSceneBank = host.createSceneBank(scenecount);
    //});

}
