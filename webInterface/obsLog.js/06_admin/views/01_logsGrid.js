    /// Logs Grid view
    /// - - - - - - -
    ///     Provides a nice SlickGrid view of all logs to admins

    var LogsGrid = Backbone.View.extend({
        initialize: function() {
            _.bindAll(this);

            // Create an array of sub-views (like edit and delete)
            // so they can be properly cleaned up when the page leaves
            this.subViews = [];

            // Set default options for our grid view.
            var gridOptions = {
                formatterFactory: Slickback.BackboneModelFormatterFactory
            };

            // Define the columns we want to view on the grid
            var logColumns = [
                {
                    id: 'date',
                    name: 'Date',
                    field: 'date',
                    width: 110
                },
                {
                    id: 'project',
                    name: 'Project',
                    field: 'project',
                    width: 180 
                },
                {
                    id: 'observers',
                    name: 'Observers',
                    field: 'observers',
                    width: 180 
                },
                {
                    id: 'instrument',
                    name: 'Instrument',
                    field: 'instrument',
                    width: 93
                },
                {
                    id: 'sa',
                    name: 'SA',
                    field: 'sa',
                    width: 110
                },
                {
                    id: 'oa',
                    name: 'OA',
                    field: 'oa',
                    width: 110
                },
                {
                    id: 'open',
                    name: 'Open',
                    field: 'open',
                    width: 55,
                    cssClass: "cellLink",
                    formatter: Slickback.NameFormatter
                },
                {
                    id: 'edit',
                    name: 'Edit',
                    field: 'edit',
                    width: 46,
                    cssClass: "cellLink",
                    formatter: Slickback.NameFormatter
                },
                {
                    id: 'delete',
                    name: 'Delete',
                    field: 'delete',
                    width: 70,
                    cssClass: "cellLink",
                    formatter: Slickback.NameFormatter
                },
                {
                    id: 'active',
                    name: 'Active?',
                    field: 'active',
                    width: 70,
                    cssClass: "center",
                    formatter: Slickback.CheckFormatter
                }
            ];

            // Instantiate the grid
            this.grid = new Slick.Grid('#logGrid', this.collection, logColumns, gridOptions);

            // Pass onClick events to our handleClick function 
            this.grid.onClick.subscribe( this.handleClick );

            // When the log collection is fetched, reset the grid
            this.collection.on("reset", this.resetGrid);
        },

        handleClick: function(e) {
            var cell = this.grid.getCellFromEvent(e);

            var colID = this.grid.getColumns()[cell.cell].id;
            if (colID == "open") {
                // Get the log associated with this row
                var log = this.collection.at(cell.row);

                // Navigate the app to open that log
                keOLARouter.navigate("logs/" + log.id, {trigger: true});
            } else if (colID == "edit") {
                var log = this.collection.at(cell.row);

                // Create edit dialog prompt, passing in the log modal
                var editPrompt = new LogEditor({
                    model: log,
                    parent: this
                });

                // Start the dialog window
                editPrompt.startDialog();

                this.subViews.push( editPrompt );

            } else if (colID == "delete") {
                var log = this.collection.at(cell.row);

                // Create a delete dialog prompt, passing in the log model
                // and a reference to this view so the grid can be reset
                var deletePrompt = new DeleteLogView({
                    model: log,
                    parent: this
                });

                // Start the dialog window
                deletePrompt.startDialog();

                this.subViews.push( deletePrompt )

            } else if (colID == "active") {
                var log = this.collection.at(cell.row);

                // Pull the current value of active and toggle it
                var newVal = !log.get("active");

                // Create a SetActiveLog model to save the desired status
                // to the server.  Save it
                var sal = new SetActiveLog()
                sal.save({logID: log.id, active: newVal});

                // Update the data in the model, and then update the grid row
                log.set("active", newVal);
                this.grid.updateRow(cell.row);

                // Reset the pages "selection" to remove the anoying
                // highlight of the check image when it is updated
                var body = document.getElementsByTagName("body")[0];
                window.getSelection().collapse(body,0);

                // Don't let the event continue to trigger other functions
                e.stopPropagation();
            }
        },

        resetGrid: function() {
            // When the collection is updated, this is how we tell
            // Slick.Grid to update
            this.grid.invalidateAllRows();
	    this.grid.updateRowCount();
            this.grid.render();
        },
        
        onClose: function() {
            this.collection.off("reset");
            this.grid.onClick.unsubscribe( this.handleClick );
            delete this.grid;
            $("#logGrid").off();
            _.each( this.subViews, function( subView ) {
                subView.close();
            });
        }
    });

 
