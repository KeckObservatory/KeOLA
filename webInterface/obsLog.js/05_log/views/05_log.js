
    /// Log View
    /// - - - - - 
    ///   This view represents an opened log window and as
    /// such, calls many sub-views including logEntries, fits,
    /// and weather.

    var LogView = Backbone.View.extend({
        template: _.template($("#log_template").html()),

        initialize: function() {
            _.bindAll(this);

            // Start the log when the model changes.  This
            // will only happen once at the start of this view.
            this.model.on("change", this.startLog);
        },

        startLog: function() {
            // Catch if the user has been redirected to another log
            // and alert them of the redirection
            if (this.model.get("redirect")) {
                alert("A log for this data directory already exists! You are being redirected to that log...");
            }

            // Insert the initial template HTML into this view's element
            this.$el.html( this.template({ log: this.model }) ); 

            // Insert the view's element directly into the body of the page
            $("body").append( this.el );

            // Create new log entries collection and start log entries view
            this.entries = new LogEntryList( this.model.id );
            this.entryView = new LogEntryListView({ 
                el: this.$("#entry-list"),
                collection: this.entries 
            });

            // Create new fits collection and start fits view 
            // NOTE: the fits collection which is supplied to the grid
            //       is a Slickback.Collection!  
            this.fits = new FitsCollection( this.model.id );
            this.fitsGrid = new FitsGrid({
                el: this.$("#grid"),
                collection: this.fits, 
                instrument: this.model.get("instrument") 
            });

            // Start weather frame view
            this.weather = new WeatherView({
                el: this.$("#weather")
            });


            /// Bind jQuery UI functionality to this view's elements

            // Enable jQueryUI tabs functionality on #tabs element
            // See: http://jqueryui.com/demos/tabs/
            this.$( "#tabs" ).tabs({selected: 1});

            this.$( "#control-tabs").tabs({selected: 0});

            // Turn radio inputs into a nice buttonset
            this.$("#entryScroll").buttonset();

            // Bind the "accordian" widget functionality on the header
            this.$("#accordian-header").accordion({
                animated: false,
                collapsible: true,
                header: "h3",
                autoHeight: false
            });

            // Bind the "elegantly expanding textarea" functionality onto the
            // log entry comment's input textarea
            this.$("#entryComment .expandingArea").expandElegantly();

            // Bind all the nice looking button style and mouse interaction to the
            // log entry comment submit button
            this.$("#entryComment button").button();

            this.$("#viewConfig").button({icons: {primary: "ui-icon-wrench"}, text: false})

            this.$("#printGrid").button({icons: {primary: "ui-icon-print"} })

            this.$("#requestWeather").button({icons:{primary: "ui-icon-note"} })

            this.$("#gotoComment").button({icons:{primary: "ui-icon-comment"} })


            /// Bind functions to UI events

            // Bind the tab selection event to this view's tabSelect handler
            // in order to switch which data is being actively monitored
            this.$("#tabs").on("tabsshow", this.tabSelect);

            // Run this.resize() on log control tab selection
            this.$("#control-tabs").on("tabsshow", this.resize);

            // On accordian's change event, run this.resize
            this.$("#accordian-header").on("accordionchange", this.resize);

            this.$("#showhideLink").on("click", this.showhideDirs);
        },

        // When tab selection is changed, and the associated event fires
        // this function, it passes an "event" and "object" variable.
        // The "object" variable which is passed has an "index" attribute 
        // which we use to distinguish which tab has been selected.  We then 
        // change which data collection is actively monitored based on which 
        // is visible and resize things.
        tabSelect: function(e, o) {
            if (o["index"] == 0) { 
                this.entryView.monitor();
                this.entryView.resize();
            }
            else if (o["index"] == 1) {
                this.fitsGrid.monitor();
                this.fitsGrid.resizeGrid();
            }
            else if (o["index"] == 2) {
                this.weather.resize();
                this.weather.load();
            }
        },

        // Resize all containers to accomodate changes in UI sizes
        resize: function() {
            this.entryView.resize();
            this.fitsGrid.resizeGrid();
            this.weather.resize();
        },

        showhideDirs: function() {
            $('#showhideDirs').toggle();
            this.resize();
        },

        onClose: function() {
            this.model.off("change");

            this.entryView.close();
            this.fitsGrid.close();
            this.weather.close();

            this.$("#tabs").off();
            this.$( "#control-tabs").off();
            this.$("#accordian-header").off();
            this.$("#showhideLink").off();

            this.$( "#tabs" ).tabs("destroy");
            this.$( "#control-tabs").tabs("destroy");
            this.$("#entryScroll").buttonset("destroy");
            this.$("#accordian-header").accordion("destroy");

            this.$("#entryComment .expandingArea").off();

            this.$("#entryComment button").button("destroy");
            this.$("#viewConfig").button("destroy");
            this.$("#printGrid").button("destroy");
            this.$("#requestWeather").button("destroy");
            this.$("#gotoComment").button("destroy");
        }
    });

