
    /// Fits View Model
    /// - - - - - - - -
    ///     These models corresponds to the "fitsViews" collection in
    /// the database.  Each "fits view" represents a set of columns
    /// in the fits data grid as well as settings passed to SlickGrid
    /// which specify how to display them

    // A single "fitsView" entry which contains a set of columns for the datagrid
    var FitsView = Backbone.Model.extend({
        idAttribute: "_id",

        initialize: function() {
            _.bindAll(this);

            // Get the columns attribute within the fitsView model
            this.cols = this.get("columns");
        },

        // When a fits grid is instantiated, this function is 
        // called to provide the columns definition
        columns: function() {
            // Make a copy of the view columns
            var out = this.cols.splice(0);

            // Append a comments column to pass to SlickGrid
            out.push({
                "id": "comment",
                "name": "Comment",
                "field": "comment",
                "width": 400,
                editable: true,
                editor: Slickback.ExpandingCellEditor
            });

            return out;
        }
    });


    // Represents a collection of "fits view" models 
    var FitsViewList = Backbone.Collection.extend({
        model: FitsView,

        initialize: function( instrName ) {
            // On initialization, pass the name of the instrument
            // being used by this log so the server can return
            // the subset of "fits views" that apply to it.
            this.instrName = instrName;
            this.url = "/fitsViews/" + this.instrName;
        }
    });


