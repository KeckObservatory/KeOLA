
    /// Active Log Model
    /// - - - - - - - - 
    ///     These models corresponds to the "activeLogs" collection
    /// in the database.  They represents all the logs currently 
    /// marked as active, allowing users to jump into already
    /// running logs.

    var ActiveLog = Backbone.Model.extend({
        // Each active log is uniquely identified by an _id attribute
        idAttribute: "_id",
        urlRoot: "/activeLogs"
    });

    var ActiveLogList = Backbone.Collection.extend({
        // The collection is comprised of individual ActiveLog models
        model: ActiveLog,

        // The URL from which to populate this collection
        url: "/activeLogs"
    });

