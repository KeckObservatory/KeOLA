    
    /// Delete Log Prompt
    /// - - - - - -
    ///   Simple prompt confirming log deletion 

    var DeleteLogView = Backbone.View.extend({
        template: _.template($("#deleteLog_template").html()),

        initialize: function() {
            _.bindAll(this);

            // Insert the initial template HTML into this view's element
            this.$el.html(this.template( this.model.toJSON() ));

            // Insert the view's element directly into the body of the page
            $("body").append( this.el );
        },

        startDialog: function() {
            this.$el.dialog({

                // Open this window on page load
                autoOpen: true,

                width: 600,

                title: "Delete Log?",

                position: ["center", "middle"],

                // Create a button with text "Create New Log" that triggers a
                // submit event on this element when pressed
                buttons: {
                    "Cancel": this.close,
                    "Delete": this.deleteLog,
                    "Delete (+ FITS)": this.fullDeleteLog
                },

                // Disable everything else on the page while open
                modal: true,

                // Make sure it's on top
                zIndex: 9999,

                // Don't close this window when the escape button is pressed
                closeOnEscape: true
            });
        },

        deleteLog: function() {
            this.model.destroy();
            this.options.parent.resetGrid();
            this.close();
        },

        fullDeleteLog: function() {
            this.model.urlRoot = "/admin/logs/fullDelete";
            this.model.destroy();
            this.options.parent.resetGrid();
            this.close();
        },

        onClose: function() {
            this.$el.dialog("destroy");
        }
    });

