    
    /// Start View
    /// - - - - - -
    ///     View displayed for the default, or root route.
    /// When the application is first opened with no URL,
    /// this window is what is displayed.

    var StartView = Backbone.View.extend({
        initialize: function() {
            _.bindAll(this);

            // Create an emtpy collection of activeLogs
            activeLogs = new ActiveLogList;

            // Instatiate a view which will represent the list of active logs
            this.activeLogsView = new ActiveLogListView({ collection: activeLogs });

            // Insert the element representing the active logs into this view's element
            this.$el.html( this.activeLogsView.render().el );

            // Append this element directly into the page's body
            $("body").append( this.el );
        },

        // Called after the basic container represening this view is injected into 
        // the body, this function binds the jQueryUI's dialog functionality onto it
        startDialog: function() {
            this.$el.dialog({

                // Open this window on page load
                autoOpen: true,

                // The window's title
                title: "Open Running Log, or Create New",

                width: 700,
                position: ["center", "top"],

                // Don't close this window when the escape button is pressed
                closeOnEscape: false,

                // Extra code to run after the dialog opens
                open: function() {
                    // Move the dialog window 75px from the top of the page
                    $("div.ui-dialog").css({"top": "75px"});

                    // Find the close button and hide it
                    $(".ui-dialog-titlebar-close").hide();
                }
            });
        },

        onClose: function() {
            this.activeLogsView.close();
            this.$el.dialog("destroy");
        }

    });

