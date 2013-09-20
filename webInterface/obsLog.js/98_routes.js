
    /// Routes Code
    /// - - - - - - - - - - - - - - -
    ///   This code manages which views are displayed and handles 
    /// hash urls such as "#/log/[log id] opening a log view.
    /// This is what manages the creation of "real" working instances 
    /// of everything we've previously defined.  Additionally it is what 
    /// kicks everything off when the page loads.

    // Directly stealing the approach to page switiching laid out in this post:
    // http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/
    Backbone.View.prototype.close = function () {
        if (this.onClose) {
            this.onClose();
        }
        this.unbind();
        this.remove();
    };

    var KeOLARouter = Backbone.Router.extend({
        initialize: function() {
            _.bindAll(this);

            // Create adminFilters in the router context so that
            // it can be consistent when they move between frames
            this.adminFilter = {}
        },
       
        // Close previous views when a new one is instantiated
        cleanView: function(view) {
            if (this.currentView)
                this.currentView.close();

            this.currentView = view;
        },

        authed: function() {
            if (this.auth && this.auth.get("success")) {
                return true;
            } else {
                this.navigate("admin/login", {trigger: true});
            }
        },

        // The routes that this application will respond to
        // and the associated functions called for each one
        routes: {
            "": "start",
            "logs/:id": "openLog",
            "admin/login": "checkLogin",
            "admin": "startAdmin",
            "admin/logs/create": "createLog",
            "close": "close"
        },

        start: function() {
            // Show the KeOLA header
            $("#KeOLA").show();

            // Start the initial dialog
            var startPage = new StartView();

            // Bind the jQueryUI dialog functionality to the new view
            startPage.startDialog();

            // Make sure any previous views are closed
            this.cleanView( startPage );
        },

        // Called when opening a new log for viewing, opens the log with id specified
        openLog: function(id){
            $("#KeOLA").hide();

            // Create a Log model with the correct id
            var newLog = new ActiveLog({"_id": id });

            // Create the view to represent log
            var newLogView = new LogView({model: newLog});
            
            // Update the data in the log model.  Once the data
            // arrives, This triggers the log view to initialize
            // the interface.
            newLog.fetch();
            
            // Close any previous views
            this.cleanView( newLogView );
        },

        checkLogin: function() {
            this.auth = new AuthModel();

            this.auth.save({}, {
                success: function() {
                    window.history.back();
                }, 
                error: this.loginView
            });
        },

        loginView: function() {
            $("#KeOLA").show();

            // Start the initial dialog
            var loginPage = new LoginView({ model: this.auth });

            loginPage.startDialog();

            // Make sure any previous views are closed
            this.cleanView( loginPage );
        },


        startAdmin: function() {
            if( this.authed() ) {
                $("#KeOLA").show();

                // Start the initial dialog
                var adminPage = new AdminView({
                    adminFilter: this.adminFilter
                });

                adminPage.startDialog();

                // Make sure any previous views are closed
                this.cleanView( adminPage );
            }
        },


        createLog: function() {
            if( this.authed() ) {
                $("#KeOLA").show();

                // Open the log creator dialog
                var logCreate = new LogCreator();

                logCreate.startDialog();

                // Make sure any previous views are closed
                this.cleanView( logCreate );
            }
        },

        close: function(view) {
            if (this.currentView)
                this.currentView.close();
        }
    });

    // Instantiate the router
    var keOLARouter = new KeOLARouter();

    // Start tracking the history
    Backbone.history.start();


