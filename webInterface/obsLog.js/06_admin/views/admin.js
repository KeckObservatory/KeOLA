    
    /// Admin View
    /// - - - - - -
    ///   This creates the admin window

    var AdminView = Backbone.View.extend({
        template: _.template($("#admin_template").html()),

        initialize: function() {
            _.bindAll(this);

            this.filter = this.options.adminFilter;

            // Insert the initial template HTML into this view's element
            this.$el.html( this.template() );

            // Append this view's element directly into the body
            $("body").append( this.el );

            // Create a logs collection, start the logs grid view
            // NOTE: the logs collection which is supplied to the grid
            //       is a Slickback.Collection!
            this.logs = new LogCollection([], {
                adminFilter: this.filter
            });
            this.logsGrid = new LogsGrid({
                collection: this.logs
            });

            // Create a request definition for fetching logs
            q.start("fetchLogs", {
                code: this.logs.fetch,
                context: this.logs
            });


            /// Bind jQuery datepicker functions
            this.$("#utcFrom").datepicker({
                showOn: "both",
                autoSize: true
            });
            this.$("#utcTo").datepicker({
                showOn: "both",
                autoSize: true
            });


            /// Populate the filter inputs with previously filled out data 
            /// if it exists, otherwise fill in defaults.

            if (this.filter.search) {
                this.$("#textFilter").val( this.filter.search ); 
            }

            if (this.filter.utcTo) {
                this.$("#utcTo").val( this.filter.utcTo );
            } else {
                /// Unfortunately, we get to muck about with javascript's date
                /// format to get the date's text boxes populated the way I would like

                // Create a new Date() (defaults to now), create a UTC date
                // string by calling each function individually, and then
                // insert it into the text box
                var toDate = new Date();
                var prettyToDate = (toDate.getUTCMonth() + 1).toString() + "/" + 
                                 toDate.getUTCDate().toString() + "/" +
                                 toDate.getUTCFullYear().toString();
                this.$("#utcTo").val(prettyToDate);
            }

            if (this.filter.utcFrom) {
                this.$("#utcFrom").val( this.filter.utcFrom );
            } else {
                // Do the same as preivously, but subtract 10 days in miliseconds 
                // from the starting date.
                var fromDate = new Date(Date.now() - 864000000);
                var prettyFromDate = (fromDate.getUTCMonth() + 1).toString() + "/" + 
                                 fromDate.getUTCDate().toString() + "/" +
                                 fromDate.getUTCFullYear().toString();
                this.$("#utcFrom").val(prettyFromDate);
            }


            // Update the filters sent to the server when
            // the date values are changed
            this.$("#utcFrom").on("change", this.updateFilter);
            this.$("#utcTo").on("change", this.updateFilter);

            // Update the filters when the search box is typed in
            // but slow it down so that it only will do it every
            // .3 of a second, not totally real time
            var throttleUpdate = _.debounce(this.updateFilter, 300);
            this.$("#textFilter").on("keyup", throttleUpdate);


            // Go ahead and parse in the filter values and send 
            // the initial fetch reqeust
            this.updateFilter();
        },

        startDialog: function() {
            this.$el.dialog({

                // Open this window on page load
                autoOpen: true,

                title: "Administration",

                width: 1080,
                position: ["center", "top"],

                // Create a button with text "Create New Log" that triggers a
                // submit event on this element when pressed
                buttons: {
                    "Create New Log": function() { keOLARouter.navigate("admin/logs/create", {trigger: true}); }
                },

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

        updateFilter: function() {
            this.filter.utcFrom = this.$("#utcFrom").val();
            this.filter.utcTo = this.$("#utcTo").val();
            this.filter.search = this.$("#textFilter").val();
            q.request("fetchLogs");
        },

        onClose: function() {
            this.logsGrid.close();
            this.$el.dialog("destroy");

            this.$("#textFilter").off();
            this.$("#utcFrom").off();
            this.$("#utcTo").off();

            this.$("#utcFrom").datepicker("destroy");
            this.$("#utcTo").datepicker("destroy");
        }

    });

