
    /// Active Log View
    /// - - - - - - - -
    ///     Represents the list of currently active logs
    /// to the user.  If there are active logs to display,
    /// they are shown in the opening window of KeOLA.
    /// If there are none, it remains hidden.  Users can 
    /// click on an active log to open it in the interface

    // View representing an invidual active Log list entry
    var ActiveLogView = Backbone.View.extend({

        // Each view is bound within a "button" element
        tagName: "button",

        // Attach CSS class for this element
        className: "activeLogButton",
        
        // Store the location of the javascript template to use
        template: _.template($('#activeLog-template').html()),

        // Bind this.openLog() to fire when this view's element is clicked
        events: {"click" : "openLog" },

        initialize: function () {
            // Bind a call to this.render() which fires when the model
            // that this view is bound to is added to a collection
            this.model.on("add", this.render, this);
        },

        render: function() {
            // Render the JS template, store it in this view's element
            this.$el.html(this.template(this.model.toJSON()));

            // Bind jQueryUI button functionality to this element
            // and give the button a nice icon
            this.$el.button({
		  icons:{primary: "ui-icon-triangle-1-e"} 
            });

            // Return this view to its parent to be inserted there
            return this;
        },

        // When this active log is clicked, go to the route which 
        // opens up the full view for that log
        openLog: function() {
            keOLARouter.navigate("logs/"+this.model.id, {trigger: true}); 
        },

        onClose: function() {
            this.model.off("add");
            this.$el.button("destroy");
        }
    });


    // View representing the entire collection of active logs
    var ActiveLogListView = Backbone.View.extend({
        // Template for this view
        template: _.template($('#activeLogList-template').html()),

        initialize: function() {
            // Make sure all functions within ActiveLogListView have the correct context for "this"
            _.bindAll(this);

            // An array of all views currently displayed
            this.viewCollection = [];

            // Since fetch always only triggers a reset event (instead of a series of 
            // add, destroy or change event on individual models like I would prefer), 
            // run this.update() every time to deal with all additions and deletions.
            this.collection.on("reset", this.update);

            // Create a "request definition" for this view for use by the request queue
            q.start("actLog", {
                code: this.collection.fetch,
                context: this.collection
            });

            // Start monitoring the list
            this.monitor();
        },

        render: function() {
            // On initial rendering of the active log list, before any models 
            // have been fetched, there is nothing to show, so hide the view's element.
            this.$el.hide();

            // Render this view's template, insert it into it's element 
            this.$el.html(this.template());

            // Return this view to be inserted by parent 
            return this;
        },

        update: function() {

            // Go through the newly updated collection, check if any of the models aren't
            // already represented by a view. If they aren't, create a new view, render it,
            // and then append it to viewCollection
            this.collection.each( function( activeLog ) {

                // Use the underscore.js "any" function to test for any matches between
                // the current model's id, and all the viewCollection view's model.ids
                if( !_.any( this.viewCollection, function(view) { return view.model.id==activeLog.id ; } ) ) {

                    // No view found representing this model, so create a new one
                    var view = new ActiveLogView({ model: activeLog });

                    // Render it and append it to this view's element
                    this.$el.append(view.render().el);

                    // Append the new view into our list of views 
                    this.viewCollection.push( view );
                }
            }, this);

            // Now go through the viewCollection, check that each still has a model in
            // this.collection.  While we loop through, actively create the new version
            // of viewCollection via reduce.  Make sure active views stay by appending
            // them to the reduce output.  Else, remove the model and the view, and don't
            // include it in the reduce output (just pass on memo unchanged.)
            this.viewCollection = _.reduce( this.viewCollection, function(memo, view ) {

                // Again, utilize the underscore.js "any" function, but now finding
                // any matches between the current view's model.id and all the models
                // in this.collection's ids.
                if( _.any( this.collection.models, function(model) { return view.model.id==model.id ; } ) ) {

                    // This view has an associated model in this.collection, so
                    // append it to the output array of the reduce function
                    return memo.concat([view]);

                } else {

                    // View doesn't have associated model in this.collection, so close it
                    view.close();

                    // and don't include it in the next version of this.viewCollection
                    return memo;
                }
            },[], this);

            // After all the updates, see if there is now anything to display.
            // Show container if there is, hide otherwise
            if (this.collection.length) {
                this.$el.show();
            } else {
                this.$el.hide();
            }
        },

        monitor: function() {
            // Use the request queue monitor to continuously poll for new active logs
            q.monitor("actLog", 15000);
        },

        onClose: function() {
            this.collection.off("update");

            q.remove("actLog");

            _.each(this.viewCollection, function(view) {
                view.close();
            });
        }
    });

