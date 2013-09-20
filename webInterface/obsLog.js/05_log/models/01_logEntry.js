
    /// Log Entry Model
    /// - - - - - - - -
    ///     These models correspond with the "entries" collection
    /// in the database.  A log entry could be a lot of things,
    /// and we're deliberately keeping it really flexible.
    /// Sample types might include  a notification that a new
    /// file has been tracked, weather info, an observers comment, etc.
    ///
    ///     The template rendering each entry will vary based on type 
    /// and each type will then expect different sets of data.

    // Represents a single log entry
    var LogEntry = Backbone.Model.extend({
        idAttribute: "_id",
        urlRoot: "/entries"
    });

    // Represents all entries for this log
    var LogEntryList = Backbone.Collection.extend({
        model: LogEntry,

        // On initialization, the log's id must be passed so
        // that a URL can be constructed which tells the 
        // server which entries to serve up.
        initialize: function(logID) {
            this.logID = logID ;
            this.url = "/entries/" + this.logID;
        }
    });

