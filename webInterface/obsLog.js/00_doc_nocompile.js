// KeOLA : Keck Observing Log Archive
// - - - - - - - - - - - - - - - - -
// Author: Ian Cunnyngham
// Mentor: Dr. Luca Rizzi
//
//      Backend.js driven script for interacting with observation
//  logs and all associated functionality.
//
//      Broadly, this code is organized around Backbone routes, 
//  which represent different application "windows".  Each route --
//  such as "admin/logs/create", which opens a log creation window
//  -- spawns views and removes old ones. As such, it is best to start 
//  reading the code from the end, in the routes definition.
//
//  ( As this code is "compiled" (minified using Google's Closure
//  Compiler), all comments and structure are stripped before 
//  reaching the webpage.  To read the annotated source, see the
//  github repo and browse to the webInterface/obsLog.js/ directory
//  where things have been split up into a logical directory 
//  structure. )


/// Libraries utilized
/// - - - - - - - - - -

/// Backbone.js: http://backbonejs.org/
/// - - - - - - - - - - - - - - - - - -
///     Providing "Model, View, Controller" type functionality, this
/// framework facilitates a very clean codebase for the frontend.
///
///     Briefly: models store the data, are informed of what urls
/// on the server to talk to in order to fetch new data and store 
/// user created data, etc.  Backbone talks to the server over RESTful 
/// URLs, and data is transmitted in JSON.  Having functionality
/// built in which automatically handles issusing these requests,
/// translating between the served data and script-local models,
/// and throwing up events which can be bound to callbacks when
/// data is changed --  all behind the scenes -- saves us hugely in 
/// programming and code complexity.
///
///     Views provide a bunch of functionality as to how a given
/// model is actually rendered in the webpage.  Views are typically
/// bound both to a given model, and to specific UI elements which 
/// represent them (for instance, a <LI> list element or a whole 
/// <DIV> section.)  They can then respond to any events triggered 
/// by the model changing, or by the user interacting with the UI
/// element.  
///
///     Routes provide URL triggers to the application, allowing
/// deep-linking into specific application windows.  For instance,
/// if you go to a hash URL like "#logs/<log id>", the router 
/// captures the request and then passes the log ID into a 
/// function which then spawns a view for that log as well as 
/// cleaning up any previous views that we may have switched from.
/// Therefore, the router serves something like the traditional
/// "controller" functionality and provide the actual application
/// logic which spawns and destroys views.

/// Underscore.js: http://underscorejs.org/
/// - - - - - - - - - - - - - - - - - - - - 
///     This library provides a lot of very helpful functional 
/// programming underpinnings to javascript.  Any call that starts
/// with "_." is a call to the underscore.js library.  Backbone
/// relies heavily on these underpinning, and some functionality
/// is utilized directly in this script as well.

/// jQuery: http://jquery.com/
/// - - - - - - - - - - - - - -
///     Another foundational library that provides a huge amount
/// of underlying functionality.  Backbone relies on it for many
/// things including event handling, DOM traversal, and AJAX calls.
/// Any call starting with "$" is actually shorthand for a jQuery
/// call.  

/// jQuery UI: http://jqueryui.com/
/// - - - - - - - - - - - - - - - - 
///     This is the library currently utilized to provide a rich
/// UI experience to the user without a ton of custom CSS, 
/// javascript, etc. having to be written by hand.  This is what
/// gives us our nice dialog windows, tabs, buttons, "accordian"
/// widget, and generally keeps our UI constitent.
///
/// Abolution: https://github.com/michaelvanderheeren/Absolution
///     This is the theme utilized by  jQuery UI for this script.  
/// It helps significantly in making jQueryUI look as though it 
/// belongs in this decade.

/// SlickGrid: https://github.com/mleibman/SlickGrid/wiki
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - 
///     Provides our very nice data grid functionality.

/// SlickBack: http://teleological.github.com/slickback/
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - 
///     Provides integration between SlickGrid and Backbone

/// Elegantly Expanding Textareas: 
/// https://github.com/matthooks/jquery-elegant-expanding-textareas
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
///     Elegant piece of code, built on top of jQuery, which allows 
/// input textareas to grow as more text is added to them.  Used
/// in my custom SlickBack text cell editor, and also in log 
/// comment input.


