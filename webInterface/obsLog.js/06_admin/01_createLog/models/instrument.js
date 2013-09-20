
    /// Instrument Model
    /// - - - - - - - - 
    ///     Corresponds with the db.instruments collection
    /// on the backend.  Contains a list of instruments
    /// and suggested dataDir's to be used on the creation
    /// of a new observing log.

    // Model representing a single instrument.
    var Instrument = Backbone.Model.extend({

        // We must tell Backbone which attribute
        // in the model provides the unique id.
        // MongoDB stores the id field as "_id", 
        idAttribute: "_id"

    });

    // Model representing a collection of Instruments.
    var InstrumentList = Backbone.Collection.extend({
        model: Instrument,

        // By specifying the url to fetch new data, backbone
        // now can provide all the functionality to poll the
        // server and store our script-local data.
        url: "/admin/instruments"
    });

