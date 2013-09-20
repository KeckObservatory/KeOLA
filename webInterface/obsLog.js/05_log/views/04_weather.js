
    /// Weather View
    /// - - - - - - - - 
    ///   Manages the weather tab, inserting the iFrame and resizing it

    var WeatherView = Backbone.View.extend({
        template: _.template($("#weatherFrame-template").html()),

        load: function() {
            // Insert the generated HTML into this view's containing element
            this.$el.html(this.template());
        },

        resize: function() {
            // Account for the size of the log controls above the iFrame
            this.$el.css({
                "top" : $("#accordian-header").height() + $("#tab-header").height()
            });
        }
    });

