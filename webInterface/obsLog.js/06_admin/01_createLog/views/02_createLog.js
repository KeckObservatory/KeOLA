    
    /// Log Creation view
    /// - - - - - - - - - 
    ///   This view provides the log creation window and invokes
    /// the instruments sub-view

    // "Create New Log" window
    var LogCreator = Backbone.View.extend({
        template: _.template( $("#logCreate_template").html() ),

        // Append ".logCreator" CSS class to this element
        className: "logCreator",

        initialize: function() {
            _.bindAll(this);

            // Create a new collection of instruments
            var instruments = new InstrumentList();

            // Render the initial template and insert it into
            // this view's element
            this.$el.html( this.template());

            // Instantiate a instrument selector view, pass it the collection
            this.instrSelect = new InstrumentsView({
                el: this.$("#instrSelect"),
                collection: instruments
            });

            // Append this view's element directly into the body
            $("body").append( this.el );
        },

        // After the element has been inserted, this function is
        // called to bind the jQueryUI's dialog functionality to it
        startDialog: function() {
            this.$el.dialog({
                autoOpen: true,
                title: "Start New Log",
                width: 700,
                position: ["center", "top"],
                buttons: {
                    "Create New Log": this.submit
                },
                closeOnEscape: false,
                open: function() {
                    $("div.ui-dialog").css({"top": "75px"});
                    $(".ui-dialog-titlebar-close").hide();
                }
            });
        },

        // Post a new log and open up the running log view
        submit: function() {
            // Get the instrument drop down selector's value
            var instrVal = this.$("#instrSelect").val()

            if (instrVal == "") {
                // Protect against empty instrument selections
                alert("Please select an instrument");
            } else {
                // Create a new log, populate it with the form data
                var newLog = new Log();

                // Create a request definition for submitting it
                // to allow for authentication error handling
                q.start("newLog", {
                    code: newLog.save,
                    preArgs: {
                        project: this.$("#log-pname").val(),
                        observers: this.$("#log-obsv").val(),
                        sa: this.$("#log-sa").val(),
                        oa: this.$("#log-oa").val(),
                        instrument: instrVal,
                        dataDir: this.$("#log-dir").val()
                    },
                    context: newLog,
                    success: function(model, response) {
                        keOLARouter.navigate("logs/"+model.id, {trigger:true});
                        q.remove("newLog");
                    }
                });
                
                q.request("newLog");
            }
        },

        onClose: function() {
            this.instrSelect.close();
            this.$el.dialog("destroy");
        }
    });
