
    /// Log Entry View
    /// - - - - - - - -
    ///     Once a new log is opened, these views go about representing
    /// all the log entries for it.  This list of entries updates
    /// in real time, adding new entries at the bottom as the show up.
    /// Additionally, comments can be added as entries with 
    /// type="comment".  Each different type of entry should have its
    /// own view in the javascript "entry-template", allowing many
    /// different types of data to be represented.

    // View for a single entry
    var LogEntryView = Backbone.View.extend({
        
        // Each entry is contained in a <LI> eleemtn
        tagName: "li",

        // Store the javascript template
        template:  _.template($('#entry-template').html()),

        initialize: function () {
            // Use underscore.js call to make sure all functions
            // in this view have the same "this" context
            _.bindAll(this);

            // Bind this.render() to run when the log entry changes
            this.model.on("change", this.render);
            
            // Clean up this view when the model it represents
            // is removed from its collection
            this.model.on("remove", this.onClose);
        },

        render: function() {
            // Render the template, insert it into the element
            this.$el.html(this.template(this.model.toJSON()));

            // If the model is of type "comment", make some extra
            // calls while rendering this entry
            if (this.model.get("type") == "comment") {
                // Bind "elegant expanding textarea" functionality to 
                // the textarea that has been inserted 
                this.$(".expandingArea").expandElegantly();

                // Store a shortcut to this elements textarea element
                this.commentArea = this.$("textarea")

                // Insert this models comment into the textarea
                this.commentArea.val( this.model.get("comment") ); 

                // Make sure the textarea resizes after input
                this.commentArea.trigger("input");
            }

            return this;
        },

        // When the textarea loses focus, run this.updateComment()
        events: { "blur textarea": "updateComment" },

        // Get the value in the textarea and save it
        updateComment: function() {
            this.model.save( { comment: this.commentArea.val() } );
        },

        onClose: function() {
            this.model.off("remove");
            this.model.off("change");
            // Try and remove any events associated with
            // elegantlyExpandingTextarea functionality
            if (this.model.get("type") == "comment") 
                this.$(".expandingArea").off();
                this.commentArea.off();
            this.$el.remove();
        }
    });


    // View for all entries in the log
    var LogEntryListView = Backbone.View.extend({
        initialize: function() {
            _.bindAll(this);

            // When a single entry is added, call this.addOne()
            this.collection.on("add", this.addOne);

            // When all entries are updated, call addAll()
            this.collection.on("reset", this.addAll);

            // Bind this.gotoComment() to the click event of button 
            // with id="gotoComment"
            $("#gotoComment").on("click", this.gotoComment);

            // Bind this.requestWeather() to the click event of 
            // button with id="requestWeather"
            $("#requestWeather").on("click", this.requestWeather);

            // Bind this.addComment() to be called when the button
            // contained in the div with id="entryComment" is pressed
            $("#entryComment button").on("click", this.addComment );

            // Create a shortcut to the insert comment textarea element
            this.commentText = $("#entryComment textarea");

            // Define a request type in the queue for getting log entries 
            q.start("fetchEntries", {
                code: this.collection.fetch,
                context: this.collection,
                args: {add: true}
            });

            // Get the initial set of log entries
            q.request("fetchEntries");
        },

        // Resize to accomdate the "accordian-header" and tabs at the top 
        // of the page as well as the comment entry box at the bottom
        resize: function() {
            // Inject css into this view's parent element which 
            // specifies the gap between it and the top of the window
            $("#entryView").css({
                "top": $("#accordian-header").height() + $("#tab-header").height()
            });

            // ... and the same for the gap at the bottom of the window
            $("#entryView").css({"bottom": $("#entryComment").innerHeight() });
        },

        addOne: function(entry) {
            // Create a new view for the passed log entry model and then render it
            var view = new LogEntryView({model: entry}).render();

            if ($.trim( view.$el.html() ) !="") {
                // Render the view, append it into this views <UL> container
                this.$el.append(view.el);

                // Scroll the window to the last entry if it is enabled
                if ($("#entryScroll input:radio:checked").val()=="on") {
                    this.$el.scrollTop( this.$el[0].scrollHeight );
                }
            }
        },

        addAll: function() {
            // Iterate through all entries in the collection
            // calling this.addOne for each 
            this.collection.each( this.addOne );
        },

        gotoComment: function() {
            // Switch to the entries tab
            $("#tabs").tabs("select", 0);

            // Put keyboard focus into the text area
            this.commentText.focus();

            // Execute a nice highlight effect on the textarea 
            // to bring it to the attention of the user
            this.commentText.effect("highlight", {color: "#9090A7"}, 2000);
        },

        requestWeather: function() {
            // Replace the text of the button
            $("#requestWeather").button("option", "label", "Request Sent ...");

            // Create a new log entry of type "weatherRequest" which 
            // will inform the data monitor to append a weather entry
            var requestEntry = new LogEntry({
                type: "weatherRequest",
                logID: this.collection.logID
            });

            // Save the entry
            requestEntry.save()

            // Wait a couple seconds then revert the button to its original state
            _.delay(function() {
                $("#requestWeather").button("option", "label", "Requst weather entry");
                $("#requestWeather").blur();
            }, 2000);

            // Wait 10 seconds to try and allow time for the new weather
            // entry to be added, then request an update to log entries
            _.delay(function() {
                q.request("fetchEntries");
            }, 10000);
        },

        addComment: function() {
            // Try to pull any text entered into the comment textarea
            comment = this.commentText.val();

            // If the textarea wasn't blank
            if (comment) {

                // Temporarily disable the textarea via this.disableComment()
                this.disableComment();

                // Create a new comment log entry
                var newEntry = new LogEntry({
                    type: "comment",
                    comment: comment,
                    logID: this.collection.logID
                });

                // Attempt to save the comment.  If it is successful, reenable the
                // textarea, if an error is thrown, run this.failComment()
                newEntry.save({},{success: this.enableComment, error: this.failComment});

                // Update the collection of entries to show the new comment
                q.request("fetchEntries");
            }
        },

        disableComment: function() {
            // Set the textarea to disabled and gray it out
            this.commentText.attr('disabled', 'disabled');
            this.commentText.css({"background": "#ddd"});
        },

        enableComment: function() {
            // Re-enable textarea, make it white again, delete the text inside
            this.commentText.css({"background": "#fff"});
            this.commentText.removeAttr('disabled');
            this.commentText.val("");
            
            // Make sure the comment box resizes 
            this.commentText.trigger("input");
        },

        failComment: function() {
            // Inform the user that comment has failed to post, 
            alert("Posting your comment to the log failed.  Maybe it was a glitch?  Try again or contact IT.");

            // Re-enable the textarea (but leave the text in place so they can try agian)
            this.commentText.css({"background": "#fff"});
            this.commentText.removeAttr('disabled');
        },

        monitor: function() {
            // Switch the monitor to run "fetchEntries" every 2 minutes
            q.monitor("fetchEntries", 120000);
        },

        onClose: function() {
            q.remove("fetchEntries");

            // Try and remove all events we've bound to UI elements
            // so that they can be cleaned up properly
            $("#gotoComment").off();
            $("#requestWeather").off();
            $("#entryComment button").off();

            this.collection.off("add");
            this.collection.off("reset");
        }
    });

