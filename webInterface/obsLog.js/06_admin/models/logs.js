
    /// Log Model 
    /// - - - - - 
    ///     This model corresponds to a single entry in the 
    /// "logs" database collection.  Used only by admins

    var Log = Backbone.Model.extend({
        idAttribute: "_id",
        urlRoot: "/admin/logs"
    });


    // !! NOTE: This is a Slickback.Collection, not Backbone.Collection
    //          the extra functionality provided is needed for it to work with Slickgrid

    var LogCollection = Slickback.Collection.extend({
        // The collection is comprised of individual Log models
        model: Log,

        // The URL from which to populate this collection
        url: function() { return "/admin/logs" + "?" + $.param( this.filter ); },

        initialize: function(models, options) {
            this.filter = options.adminFilter;
        }
    });


