/// Using the model of slickback's choice_formatter.js
/// Written by Ian C
(function() {
  "use strict";

  var exportNamespace = Slickback;

  // Replaces true/false valued columns with checkboxes
  function checkFormatter(row,cell,value,col,data) {
    var chosen = data.get(col.field); 
    return chosen ? "<img src='/static/images/tick.png'>" : "<img src='/static/images/x.png'>";
  }
  exportNamespace.CheckFormatter = checkFormatter;

  // Simply repeats the name of the column into each cell regardless of value
  function nameFormatter(row,cell,value,col,data) {
    return col.name;
  }
  exportNamespace.NameFormatter  = nameFormatter;
  

}).call(this);

