// Modified version of the original SlickBack.TextCellEditor to render expanding cells
// from: https://github.com/teleological/slickback/blob/master/lib/slickback/text_cell_editor.js
// modified by Ian Cunnyngham

(function() {
  "use strict";

  var exportNamespace = Slickback;

  function ExpandingCellEditor(args) {
    this.container    = args.container;
    this.column       = args.column;
    this.defaultValue = null;
    this.$input       = this.createExpandingElement();
  }

  var createExpandingElement = function() {
    // Use the code from the ElegantExpand example, sans the "form" element 
    // which was causing problems
    var $input = $('<div id="exCellEditor" class="expandingArea"><pre><span></span><br></pre><textarea></textarea></div>');

    // Many calls rely on this.$input.val() to work correctly,
    // so we need to reach into the element and talk to the 
    // textarea's .val() function for them to function.
    $input.val = function(inVal) { 
      if (inVal) return $("#exCellEditor textarea").val(inVal) ;
      else return $("#exCellEditor textarea").val();
    };
    
    $input.bind("keydown.nav", function(e) {
      if (e.keyCode === $.ui.keyCode.LEFT ||
          e.keyCode === $.ui.keyCode.RIGHT) {
        e.stopImmediatePropagation();
      }
    });
    $input.appendTo(this.container);

    // Now the the element is realized in the document,
    // bind the expandElegantly functionality to it
    $input.expandElegantly();

    this.focusInput();
    return $input;
  };

  var serializeValue = function() {
    return this.$input.val();
  };

  var validateText = function() {
    var column = this.column;
    return column.validator ?
      column.validator(this.$input.val()) : { valid: true, msg: null };
  };

  var focusInput = function() {
    // Reach into the object and focus the textbox
    $("#exCellEditor textarea").focus();
  };

  var loadValueFromModel = function(model) {
    var editValue = this.formattedModelValue(model);
    this.defaultValue = editValue;
    this.$input.val(editValue);
    this.$input[0].defaultValue = editValue;
    this.$input.select(); // ok for selects?

    // After text is added to the cell from the model,
    // trigger the "input" event so ElegantExpand knows to 
    // resize the box.
    // This is the only reason I overloaded this function
    this.$input.trigger("input");
  };

  // Overload the EditorMixin functions with the ones I have 
  // written above.
  _.extend(ExpandingCellEditor.prototype, Slickback.EditorMixin, {
    serializeValue: serializeValue,
    validate:       validateText,
    createExpandingElement: createExpandingElement,
    focusInput:     focusInput,
    loadValue: loadValueFromModel
  });

  exportNamespace.ExpandingCellEditor = ExpandingCellEditor;

}).call(this);
