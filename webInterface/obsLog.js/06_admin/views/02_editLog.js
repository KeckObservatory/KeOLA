    
    /// Log Edit view
    /// - - - - - - - - - 
    ///   This view provides the log edit window

    // "Edit Log" window
    var LogEditor = Backbone.View.extend({
        template: _.template( $("#logEdit_template").html() ),

        // Append ".logCreator" CSS class to this element
        className: "logCreator",

        initialize: function() {
            _.bindAll(this);

            // Render the initial template and insert it into
            // this view's element
            this.$el.html( this.template( this.model.toJSON() ));

            // Append this view's element directly into the body
            $("body").append( this.el );
        },

        // After the element has been inserted, this function is
        // called to bind the jQueryUI's dialog functionality to it
        startDialog: function() {
            this.$el.dialog({
                autoOpen: true,
                title: "Edit Log",
                width: 700,
                position: ["center", "top"],
                buttons: {
                    "Cancel": this.close, 
                    "Save": this.submit 
                },
                modal: true,
                open: function() {
                    $("div.ui-dialog").css({"top": "75px"});
                    $(".ui-dialog-titlebar-close").hide();
                }
            });
        },

        // Post a new log and open up the running log view
        submit: function() {
            // Create a request definition for submitting this edit
            // to allow for authentication error handling
            q.start("editLog", {
                code: this.model.save,
                preArgs: {
                    project: this.$("#log-pname").val(),
                    observers: this.$("#log-obsv").val(),
                    pi: this.$("#log-pi").val(),
                    sa: this.$("#log-sa").val(),
                    oa: this.$("#log-oa").val()
                },
                context: this.model,
                success: this.submitSuccess
            });
            
            q.request("editLog");
        },

        submitSuccess: function(model, response) {
            this.close();
            q.remove("editLog");
            this.options.parent.resetGrid();
        },

        onClose: function() {
            this.$el.dialog("destroy");
        }
    });
