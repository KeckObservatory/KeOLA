
    /// Fits Model
    /// - - - - - -
    ///     These models correspond with the "fits" collection
    /// in the database, and represents all the .FITS files tracked
    /// for this log.  However, instead of containing all of the data
    /// of each entry, it only contains info specified by the currently
    /// selected "fitsView" columns.

    // Represents a single fits file
    var Fits = Backbone.Model.extend({
        idAttribute: "_id",
        urlRoot: "/fits/"
    });
    
    // Represents all fits files associated with this log,
    // with a specified fitsView applied
    // !! NOTE: This is a Slickback.Collection, not Backbone.Collection
    //          the extra functionality provided is needed for it to work with Slickgrid
    var FitsCollection = Slickback.Collection.extend({
        model: Fits,
        
        // URLs generated each time they are called so that they
        // may specify the proper logID and fitsView ID.  This
        // allows the server to know which data to include in each fits entry.
        url: function() { return "/fits/" + this.logID + "/" + this.viewID ; },
        printURL: function() { return "/print/" + this.logID + "/" + this.viewID ; },

        initialize: function(logID, viewID) {
            this.logID = logID ;

            // Default viewID to empty if no value passed
            this.viewID = viewID || "";
        }
    });

