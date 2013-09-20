    /// Fits View
    /// - - - - - 
    ///     This view spawns a data grid (via SlickBack and SlickGrid)
    /// What columns are displayed is governed by "fitsViews", but 
    /// there is always a "comments" column that, when clicked, spawns
    /// a nice expanding textarea to enter comments in for a specific 
    /// fits file.  When closed, the comment is saved to the database.
    /// When switched to the data grid tab of the interface, the fits
    /// data begins continual polling (monitoring) until the tab is 
    /// left again.


    var FitsGrid = Backbone.View.extend({
        initialize: function() {
            _.bindAll(this);

            // Pull the instrument name from the passed options
            this.instrName = this.options.instrument;

            // Variable to keep track of previous row counts
            // to allow the view a simple way to track if 
            // it should scroll the grid to the bottom
            this.prevCount = 0;


            // Instantiate a new list of fitsViews, populate it from server
            this.fitsViews = new FitsViewList( this.instrName );

            // Instantiate a view for managing the fitsView dropdown menu 
            this.viewSelector = new FitsViewSelector({ 
                el: $("#viewSelect"),
                collection: this.fitsViews 
            });
            
            // When a view is selected, run this.bindView()
            // Note: monitoring of fits entries doesn't start 
            // until a fitsView has been specified.
            // So things don't kick off until fitsView is 
            // is established.
            this.viewSelector.$el.on("submit", this.bindView);

            // Create a request type for fetching fits entries
            q.start("fetchFits", {
                code: this.collection.fetch,
                context: this.collection
            });

            // Fetch an initial set of fitsViews, and wait for that to 
            // update before beginning to fetch fits data
            this.fitsViews.fetch();


            // When the fits collection is first updated, default to
            // calling this.checkStart() each time.  This stands in
            // for the real functionality while the collection is still 
            // empty, and spawns the actual grid when data is finally added.
            this.collection.on("reset", this.checkStart);
        },

        bindView: function() {
            // Pull out the selected fitsView model
            this.fView = this.viewSelector.selected;

            // Pull the id of the fits view selected to let
            // the server know which data to serve up for each fits entry
            this.collection.viewID = this.fView.id ;

            // Start monitoring the fits data
            this.monitor();
        },

        checkStart: function() {
            // Check to see if there are any fits in our collection yet
            if (this.collection.length > 0) {
                // Now that there are, remove the "No data yet..." header
                $("#noGrid").hide();

                // Remove the call which calls this function on fits refresh
                this.collection.off("reset", this.checkStart);

                // Spawn the real data grid
                this.startGrid();
            }
        },

        startGrid: function() {
            // Set this view's element to visible
            this.$el.show();

            // Bind this.printGrid() to run when the print button is pressed
            $("#printGrid").on("click", this.printGrid );


            // Append a custom formatter to the first column of the grid
            // which will handle grouping and indentation
            columns = this.fView.columns();
            columns[0].formatter = this.groupFormatter;


            // Set some options for our grid view.  Setting editable to true
            // will allow comment fields to be modified.
            var gridOptions = {
              editable: true,
              enableCellNavigation: true,
              formatterFactory: Slickback.BackboneModelFormatterFactory
            };

            // Instantiate a grid in element with id "#grid", with collection of data
            // from this.collection, with data column views taken from fView.columns()
            // and finally passing the gridOptions from above.
            this.grid = new Slick.Grid('#grid',this.collection,columns,gridOptions);


            // Make rows selectable by using the RowSelectionModel
            this.grid.setSelectionModel(new Slick.RowSelectionModel());

            // Include the RowMoveManager plugin, mostly because it
            // suppresses text selection
            this.grid.registerPlugin( new Slick.RowMoveManager() );

            // Subscribe a function to handle row toggle clicks
            this.grid.onClick.subscribe( this.clickGrid );

            // Subscribe a function to handle right clicks and spawn a context menu
            this.grid.onContextMenu.subscribe( this.contextMenu );

            // Subscribe a function to handle clicks on the context menu
            $("#groupMenu").on("click", this.contextClick);


            // When a particular row is changed (i.e. comment added),
            // save the changes via this.saveChanges().
            this.collection.on("change", this.saveChanges);

            // Ensure comment editing doesn't get interupted by grid update.
            // Pause monitoring on editor creation, unpause on editor destroy
            this.grid.onBeforeEditCell.subscribe( function() { q.pause("fetchFits");} );
            this.grid.onBeforeCellEditorDestroy.subscribe( function () { q.unpause("fetchFits") ;} );

            // When the collection of fits is refreshed, rerender the whole grid
            this.collection.on("reset", this.resetGrid);

            // Now that the grid is instantiated, replace dummy function
            // this.resizeGrid() with the real function this.resize()
            this.resizeGrid = this.resize;

            // On window resize, SlickGrid must be told to redraw things
            $(window).on("resize", this.resizeGrid);

            // Additionally, we need to do it when things are first rendered
            this.resizeGrid();

            // Reset the grid so that filtering is applied
            this.resetGrid();
        },


        // Define a formatter function which will handle the display 
        // of grouping and indenting 
        groupFormatter: function(row, cell, v, columnDef, dataContext) {
            value = dataContext.get( columnDef.field );
            if ( dataContext.has("childrenExpand") ) {
                if (dataContext.get("childrenExpand")) {
                    return "<div class='toggle collapse'>" + value +"</div>";
                } else {
                    return "<div class='toggle expand'>" + value + "</div>";
                }
            } else if ( dataContext.get("group") ) {
                return "<span class='groupSpacer'></span>" + value;
            } else {
                return value;
            }
        },

        // Function to handle mouse clicks on the grid
        // If user clicks on div with class "toggle", expands or collapses group
        clickGrid: function(e, args) {
            if ($(e.target).hasClass("toggle")) {
                var entry = this.collection.at(args.row);
                if ( entry.get("childrenExpand") ) {
                    entry.set({"childrenExpand": false}); 
                } else {
                    entry.set({"childrenExpand": true}); 
                }
                e.stopImmediatePropagation();
                this.resetGrid();
            }            
        },

        // Handles right clicks on the grid.  Provides grouping and ungrouping
        // option menu if user clicks within selected rows
        contextMenu: function(e) {
            $("#groupMenu").hide();
            var selection = this.grid.getSelectedRows();
            var cell = this.grid.getCellFromEvent(e);
            if ($.inArray(cell.row, selection) != -1) {
                e.preventDefault();
                var entry = this.collection.at( cell.row );
                e.preventDefault();
                $("#groupMenu")
                    .data("row", cell.row)
                    .css("top", e.pageY)
                    .css("left", e.pageX)
                    .show();
                $("body").one("click", function () {
                    $("#groupMenu").hide();
                });
            }
        },

        // Handles clicking on the context menu itself.  Calls
        // group and ungroup functions as approriate
        contextClick: function(e) {
            var clicked = $(e.target).attr("data");
            var selection = this.grid.getSelectedRows();
            if (clicked == "group") {
                this.groupRows( selection );
            } else if (clicked == "ungroup") {
                this.removeRowGroups( selection );
            }
        },

        // Groups the set of rows selected, gets rid of any previous
        // groups that the rows were a part of 
        groupRows: function(selection) {
            selection.sort();

            this.first = selection[0];
            this.group = this.collection.at( this.first ).id;

            this.groupsToRemove = [];
            _.each( selection, function( r ) {
                entry = this.collection.at( r )

                prevGroup = entry.get("group");
                if ( prevGroup && $.inArray( prevGroup, this.groupsToRemove ) == -1) {
                    this.groupsToRemove.push( prevGroup );
                }

                if (r == this.first) {
                    entry.set({"childrenExpand": true, "group": this.group});
                } else {
                    entry.unset("childrenExpand", {silent:true});
                    entry.set({"group": this.group});  
                }
            }, this);

            this.removeGroups( this.groupsToRemove );
        }, 

        // Find all the distinct groups in the row selection and then call removeGroups
        removeRowGroups: function(selection) {
            this.groupsToRemove = [];
            _.each( selection, function( r ) {
                prevGroup = this.collection.at( r ).get("group");
                if ( prevGroup && $.inArray( prevGroup, this.groupsToRemove ) == -1) {
                    this.groupsToRemove.push( prevGroup );
                }
            }, this);

            this.removeGroups( this.groupsToRemove );
        },

        // Iteratively removes the group and childrenExpand attribute from
        // all rows which belong to each of the groups passed in the list
        removeGroups: function(groups) {
            _.each( groups, function( group ){
                _.each( this.collection.where({"group": group}), function (ent) {
                    ent.unset("childrenExpand", {silent:true});
                    ent.set({"group": false});
                });
            }, this);

            this.resetGrid();
        },


        // Before the grid is instantiated, we don't need to do anything on resize,
        // so put a dummy function for now, and link to the real one below later.
        resizeGrid: function() {;},

        // Account for the UI gap at the top, tell the grid to resize its canvas
        resize: function() {
            // Inject CSS into the grid div which specifies the gap to the top
            // of the window, allowing space for the log controls 
            $("#grid").css({
                "top" : $("#accordian-header").height() + $("#tab-header").height()
            });

            // Tell the grid to re-render
            this.grid.resizeCanvas();

            // Scroll the grid to the bottom for good measure 
            this.grid.scrollRowIntoView( this.collection.length-1 );
        },

        // When the collection is updated, this is how we filter the 
        // data and then tell Slick.Grid to update 
        resetGrid: function() {
            // Manually set the grid data by running through
            // the collection with a reduce command, ommitting
            // any elements which are grouped, and that group
            // is collapsed.  In the future, more filters could
            // be put in place here.
            this.grid.setData(
                this.collection.reduce( function( memo, entry ) {
                    group = entry.get("group");
                    if (group && !entry.has("childrenExpand") ) {
                        parent = this.collection.get( group );
                        if (parent.get("childrenExpand") == false) {
                            return memo;
                        }
                    }
                    return memo.concat(entry);
                }, [], this)
            );

            // Tell Slick.Grid to update
            this.grid.invalidateAllRows();
            this.grid.render();

            // If new row added, scroll to it
            if ( $("#entryScroll input:radio:checked").val()=="on"
                && this.collection.length != this.prevCount){

                this.grid.scrollRowIntoView( this.collection.length-1 ); 
                this.prevCount = this.collection.length;
            }
        },
        
        saveChanges:function( changed ) {
            // When the collection is changed, it passes the changed model 
            // to this function, and we simply save that model 
            changed.save();
        },
 
        printGrid: function() {
            // Open a new window, sending it to the appropriate
            // logID and fitsView ID for printing
            window.open(this.collection.printURL());
        },

        monitor: function() {
            // Switch monitoring to fetching fits data every 2 min
            q.monitor( "fetchFits", 120000);
        },

        onClose: function() {
            q.remove("fetchFits");
            this.collection.off("change");
            this.collection.off("reset");
            this.viewSelector.$el.off();
            this.viewSelector.close();
            $("#printGrid").off();
            $(window).off("resize");
            $("#groupMenu").off();
            if (this.grid) {
                this.grid.onBeforeEditCell.unsubscribe();
                this.grid.onBeforeCellEditorDestroy.unsubscribe();
                this.grid.onClick.unsubscribe();
                this.grid.onContextMenu.unsubscribe();
                delete this.grid; 
            }
            $("#grid").off();
        }
    });


