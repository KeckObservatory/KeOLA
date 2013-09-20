
    /// "fitsView" View
    /// - - - - - - - - 
    ///     Contains the UI logic behind selecting and configuring
    /// new fits data views for the grid.


    // View representing the whole list of "fitsViews"
    var FitsViewSelector = Backbone.View.extend({
        template: _.template($("#view_select_template").html()),
        initialize: function() {
            _.bindAll(this);

            // Bind the function "this.render()" to be run when
            // the collection of fitsViews is updated 
            this.collection.on('reset', this.render);
        },

        // When the fits view dropdown selection on the front end
        // changes, run this.setSelected()
        events: {"change": "setSelected"},

        setSelected: function() {
            // Find the name of the view that has been selected
            var nameSelected = this.$el.val();

            // Find the model for the view 
            this.selected = this.collection.where({name: nameSelected})[0];

            // Trigger a "submit" event which other views can listen for
            this.$el.trigger("submit");
        },

        render: function() {
            // Pass this view's template this.collection, allowing it
            // to render the whole list in one pass, then insert
            // the rendered template into this view's element
            this.$el.html( this.template({ views: this.collection }) );

            // Do an initial view selection after the list is rendered
            this.setSelected();
        },

        onClose: function() {
            this.collection.off("reset");
        }
    });

