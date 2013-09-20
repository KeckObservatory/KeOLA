
    /// Instrument View
    /// - - - - - - - - 
    ///    Provides the logic which binds the instrument 
    /// collection to the UI.  Incarnates as a simple
    /// selection box in the new log creation dialog.

    // View representing the whole list of instruments
    var InstrumentsView = Backbone.View.extend({
        template: _.template($("#instrSelect_template").html()),

        initialize: function() {
            // Bind the function "this.render()" to be run when
            // the collection of instruments is updated 
            this.collection.on('reset', this.render, this);

            // Fetch instruments
            this.collection.fetch();
        },

        render: function() {
            // Insert the generated template into this view's containing element
            this.$el.html(this.template({ instruments: this.collection }) );
        },

        onClose: function() {
            this.collection.off("reset");
        }
    });

