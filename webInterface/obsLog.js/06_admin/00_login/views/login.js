    
    /// Login view
    /// - - - - - - - - - 
    ///   This window will pop up when a view requirs authentication
    /// and the user has not yet logged in.  Is passed in a auth model, 
    /// fills it out, and attempts to save it

    var LoginView = Backbone.View.extend({
        template: _.template( $("#loginView_template").html() ),

        // Append ".logCreator" CSS class to this element
        className: "logCreator",

        initialize: function() {
            _.bindAll(this);

            // Render the initial template and insert it into
            // this view's element
            this.$el.html( this.template());

            // Append this view's element directly into the body
            $("body").append( this.el );
        },

        // After the element has been inserted, this function is
        // called to bind the jQueryUI's dialog functionality to it
        startDialog: function() {
            this.$el.dialog({
                autoOpen: true,
                title: "Login",
                width: 700,
                position: ["center", "top"],
                buttons: {
                    "Submit": this.submit 
                },
                closeOnEscape: false,
                open: function() {
                    $("div.ui-dialog").css({"top": "75px"});
                    $(".ui-dialog-titlebar-close").hide();
                }
            });
        },

        // Try and login
        submit: function() {
            this.model.save({
                "username": $("#login-username").val(),
                "password": $("#login-password").val()
            }, {
                error: this.error, 
                success: function() {window.history.back();}
            } );
        },

        error: function(model, response) {
            if (response.status = 401) {
                this.$(".error").html( response.responseText )
            } else {
                this.$(".error").html( "An unexpected error has occured while logging in" )
            }
        },

        onClose: function() {
            this.$el.dialog("destroy");
        }
    });
