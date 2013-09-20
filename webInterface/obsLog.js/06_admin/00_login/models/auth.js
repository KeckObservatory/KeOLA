
    /// Auth Model
    /// - - - - - - - - 
    ///    This model will be used as a convenience to pass in 
    /// a usernmae and password, and then to store the session
    /// received for use by views that need authenticated

    var AuthModel = Backbone.Model.extend({
        urlRoot : "/admin/login"
    });

