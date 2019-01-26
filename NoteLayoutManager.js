load("NoteView.js");

function NoteLayoutManager() {
    this.createNoteLayoutView = function(noteInput) {
        return new NoteView(noteInput);  
    };
}

var gNoteViewManager = new NoteLayoutManager();