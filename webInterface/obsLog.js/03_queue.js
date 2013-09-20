
    /// Request Queue
    /// - - - - - - - 
    ///     The purpose of this object is to provide a named request 
    /// queue for the script.  Its raison d'etre is that it will 
    /// only allow a request with a given name to be sent once
    /// and block any further requests until there is a success
    /// or error callback.  Additionally, for request that need to 
    /// be continuously executed at regular intervals, monitor 
    /// functionality is encompassed.  Finally, this queue should
    /// provide consistent error handling behavior for all requests.

    // (shorthand for request (q)ueue) 
    var q = {

        // Create an empty qStore object to be added to by this.start()
        // and accessed by everything else, storing named "request definitons'
        qStore: {},

        start: function( name, requestDef ) {
            // Insert a new "request definition" into storage for future use
            
            /////// 
            // Inputs
            // - - - - - 
            // "name" : string to be used as a key to refer to requests later
            //
            // requestDef is an object which has the following poperties:
            // requestDef.code    : A single function call without arguments which
            //                       will be called to update a data store
            // requestDef.context : This context within which to execute "code"
            //                       ( will probably ussualy be "this" )
            // (optional)
            // requestDef.preArgs : Arguments that should be passed before
            //                      and seperately from normal arguments
            //                      ( I'm looking at you, dumb Backbone.model.save() syntax! )
            // requestDef.args    : Argument object to be passed when code is 
            //                       called.  Success and error callbacks will
            //                       be appended to this automatically.
            // requestDef.success 
            //                    : function to be called after in-built success callback
            // requestDef.error
            //                    : fucntion to be called after in-built error callback

            // Add success and error callbacks to the arguments object that will 
            // be passed along when "code" is executed.  This way, all requests
            // will handle successes and errors consistently.
            if ( !("args" in requestDef) ) {
                // If no args were passed, make an empty object to add to
                requestDef.args = {};
            }
            requestDef.args.success = q.succ( name );
            requestDef.args.error = q.err( name ); 

            // Set this request to not paused by default
            requestDef.paused = false;

            // Store the request definition for use by other functions of q
            this.qStore[ name ] = requestDef;
        },

        // Try to execute a request definition's code, if it isn't already running
        // passing along the store code arguments (args)
        request: function( name ) {
            // Retrieve the request definition with name passed in rd 
            var rd = this.qStore[ name ];
            
            // If this type of request isn't paused, run its code
            if (!rd.paused) {

                // Call the code, sending rd.context as this, and rd.args as the options
                // (Thank goodness for call()!!)
                if (rd.preArgs) {
                    rd.code.call(rd.context, rd.preArgs, rd.args );
                } else {
                    rd.code.call(rd.context, rd.args );
                }

                // Pause this request type.  This will block further requests of
                // this type  until this one's success or error callbacks unpause it
                this.pause( name );
            }
        },

        // Pause a named request type (disallowing further requests for now)
        pause: function( name ) {
            this.qStore[ name ].paused = true;
        },

        // Unpause a named request type
        unpause: function( name ) {
            this.qStore[ name ].paused = false;
        },

        /// Monitoring functionality
        /// - - - - - - - - - - - - 
        ///     All of the above was for defining, and then issuing a single
        /// request.  Bellow we define functionality to continuously issue
        /// requests at regular intervals.  This is defined so that only one
        /// kind of request can be updating regularly at any given time.
        
        // On initialization, monitoring hasn't started yet
        // so set the initial state to false until we kick things off
        monitorRunning: false,

        // Set a default monitor update interval
        monitorInterval: 120000,

        // Use this function to start issuing requests of type "name"
        // trying to issue the request every "interval" milliseconds
        // (This overwrites any previous "name" or "interval" so that
        //  next time a cycle hits, this request will be run)
        monitor: function( name, interval ) {
            // Assign (or reassign) which named request that monitor
            // should be running
            this.monitorName = name;

            // If passed, update the time between monitor updates
            if (interval) {
                this.monitorInterval = interval;
            }

            if (this.monitorRunning) {
                // If the monitor is already running, try and issue a request
                // of "name" type right away while we wait for the next cycle
                this.request( name )
            } else {
                // Otherwise, kick off monitoring by running cycle the first time
                // manually, and then set monitorRunning to true
                this.monitorCycle();
                this.monitorRunning = true;
            }
        },

        // This function continuously calls itself, trying to issue a 
        // request of whatever type is currently stored in this.monitorName
        // with a delay of this.montiorInterval. 
        monitorCycle: function() {
            // If a request that has previously been monitoring is deleted,
            // this.monitorName will be empty.  In that case, we need to
            // stop the monitoring cycle.  Otherwise, run as normal.
            if (this.monitorName != "") {
                // Try to issue a request with the stored name
                this.request( this.monitorName );

                // Call this function again after the specified interval
                _.delay( this.monitorCycle, this.monitorInterval);
            } else {
                this.monitorRunning = false;
            }
        },
        
        /// Callback helpers
        /// - - - - - - - - -
        ///     These functions -- which are automatically added to each request 
        /// definition's code -- provide a consistent set of behavior for every
        /// kind of request executed 

        // function to pass as success callback within request code
        succ: function( name ) {
            return _.bind( function(model, response) {
                var rd = this.qStore[ name ];
                if ("retries" in rd) {
                    delete rd.retries;
                }
                this.unpause( name );
                if (rd.success) {
                    rd.success(model, response);
                }
            }, this);
        },

        // function to pass as error callback within request code
        // TODO: Handle this better!
        err: function( name ) {
            return _.bind( function(model, response) {
                var rd = this.qStore[ name ];
                if (response.status == 401) {
                    keOLARouter.navigate("admin/login", {trigger:true} );
                } else {
                    this.unpause( name );

                    if (! ("retries" in rd) ) {
                        rd.retries = 3;
                        this.request( name );
                    } else if ( rd.retries > 0) {
                        rd.retries -= 1 ;
                        this.request( name );
                    } else {
                        alert( name + " request failed after 3 retries!  Giving up...");
                    }
                }
                if (rd.error) {
                    rd.error(model, response);
                }
            }, this);
        },

        /// Cleanup code
        /// - - - - - - -
        ///   Remove a named request
        remove: function( name ) {
            // Stop this request from further monitoring
            if (this.monitorName == name) {
                this.monitorName = "";
            }

            // Delete the "request definiton"
            delete this.qStore[ name ];
        }
    };
    // Make sure all functions of q have a consistent "this" context
    _.bindAll( q );
