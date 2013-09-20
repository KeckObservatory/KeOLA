
    /// Set Active Log Model 
    /// - - - - - 
    ///     This model simply used to pass requests to set a specified
    /// log as active or not

    var SetActiveLog = Backbone.Model.extend({
        idAttribute: "_id",
        urlRoot: "/admin/logs/setActive"
    });

