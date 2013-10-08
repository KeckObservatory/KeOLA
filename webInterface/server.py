import pymongo
from bson.objectid import ObjectId
import json_util
from flask import Flask, render_template, url_for, json, request, session, send_from_directory
from functools import wraps
from datetime import datetime
from hashlib import md5


# Redirect output to std_err to allow for error logging
# in a hosted environment (such as under Apache + WSGI)
# (Note, all regular output will no longer be shown on the 
# console when the server is running standalone)
import logging, sys
logging.basicConfig(stream=sys.stderr)


### Start a Flask app ###

app = Flask(__name__)

app.secret_key = "NotVeryGoodSecretKey"+str( datetime.utcnow() )


### Connect to MongoDB ###

# Default connection options work for now
connection = pymongo.Connection()

# Connection to obsLog database
db = connection.obsLog


### JSON parsing handlers ###

# Left unchanged from TODOs example, helps serialize 
# datatypes stored in MongoDB into proper JSON for the browser

def json_load(data):
    return json.loads(data, object_hook=json_util.object_hook)

def json_dump(data):
    return json.dumps(data, default=json_util.default)


### Function decorators ###
### - - - - - - - - - - 
###     These can be used via syntax like 
###
### @requires_auth
### def my_func():
###     ...
###
###     The purpose is to wrap a function with some 
### extra code.  For instance, @requires_auth is used
### to control access to functions.  If access is
### allowed, the original function passes through.
### Otherwise, a 401 permission denied is issued.


def requires_auth(f):
    """ Decorator for functions which require a successful login """
    # use functools wraps to perform convenience renaming functions for our decorator
    @wraps(f)

    def decorated(*args, **kwargs):
        # Access the session variable logged_in.  If it doesn't exist, or is not true
        # return a 401, permission denied error
        if not session.get('logged_in'):
            return app.make_response( ('You must be logged in to do that\n', 401, '') )

        # Otherwise, return the original function so it can then be run
        return f(*args, **kwargs)

    return decorated


### obsLog Routes ###

# Return the full front end template 
@app.route('/')
def obsLog_index():
    return render_template('index.html')


# Get a list of currently active logs and append some useful info
@app.route('/activeLogs')
def list_activeLogs():
    # Start an empty list to store output records in
    outLogs = []

    # Query for all current activeLogs
    aLogs = db.activeLogs.find()

    # Iterate through the cursor returned
    for al in aLogs:
        # Get the log entry for this active log
        log = db.logs.find_one({"_id": al["logID"]}, {"project":1, "utcDate":1, "instrument":1})

        # Add a human readable datestamp
        log["datestamp"] = log["utcDate"].strftime("%m/%d/%y (UTC)")

        # Append filled out record to output
        outLogs.append( log )

    # Return JSON encoded list of records
    return json_dump( list(outLogs) )


# Pull a specific log that already exists
@app.route('/activeLogs/<id>')
def get_log(id):
    # Get the log requested
    log = db.logs.find_one({"_id": ObjectId(id) } )
    
    # Append a human readable date for the print view
    log["datestamp"] = log["utcDate"].strftime("%Y-%m-%d (UTC)")

    # Return the log encoded in JSOn
    return json_dump( log )


# Get a list of log entries for a given logID
@app.route('/entries/<logID>')
def list_entries(logID):
    # Start an empty list to store output records in
    outLogs = []
    
    # Append human readable timestamps to all the entries for use by the front end
    for entry in db.entries.find({'logID': ObjectId( logID ) }).sort("utcDate"):
        entry["timestamp"] = entry["utcDate"].strftime("(UTC) %H:%M:%S")
        outLogs.append( entry )
    
    # Return the augmented entries
    return json_dump( list( outLogs ) )


# Allow posting of an entry
@app.route('/entries', methods=['POST'])
def post_entry():
    # Load in the JSON encoded log entry from the request
    entry = json_load(request.data)

    # Append the current UTC datetime to the log
    entry["utcDate"] = datetime.utcnow()

    # Store the log in the DB
    db.entries.save( entry )

    # Augment the entry with a human readable timestamp for the front end
    entry["timestamp"] = entry["utcDate"].strftime("(UTC) %H:%M:%S")

    # reutrn a JSON encoded version of the log entry
    return json_dump( entry )


# Allow updating of an entry
@app.route('/entries/<entryID>', methods=['PUT'])
def update_entry(entryID):
    # Load in the JSON encoded log entry from the request
    entry = json_load(request.data)

    if entry["type"] != "comment":
        return "Updating entry of this type not allowed"

    # Convert the object id string into the correct BSON ObjectId
    entry["logID"] = ObjectId( entry["logID"] )

    # Store the log in the DB
    db.entries.save( entry )

    # reutrn a JSON encoded version of the log entry
    return json_dump( entry )

# Get a specific fits view
@app.route('/fitsView/<viewID>')
def get_view(viewID):
    view = db.fitsViews.find_one({"_id": ObjectId( viewID )})

    # Generate the "id" and "field" for each column for grid views
    # ( Since there are two different ways of specifying what fits
    #   info we want, we distinguish between them and determine
    #   the approrpiate values differently)
    for c in view["columns"]:
        if "fitsAttr" in c:
            c["field"] = c["id"] = c["fitsAttr"][-1]
        if "dec2sexAttr" in c:
            c["field"] = c["id"] = c["dec2sexAttr"][-1]
        if "enumAttr" in c:
            c["field"] = c["id"] = c["enumAttr"]["attr"][-1]
        if "multiEnumAttr" in c:
            c["field"] = c["id"] = c["multiEnumAttr"]["tag"]
        elif "condAttr" in c:
            c["field"] = c["id"] = c["condAttr"][ "tag" ] 

    return json_dump( view )

# Get a listing of views for a specific instrument
@app.route('/fitsViews/<instrument>')
def view_list(instrument):
    # Try and find a set of views for this instrument
    views = db.fitsViews.find({"instrument": instrument},{"_id": 1})

    # If relevant views are not found, use the default "filenames" view 
    if not views.count():
        views = db.fitsViews.find({"name": "filenames", "instrument": "all"}, {"_id":1} )

    out = []
    for view in views:
        out.append( json_load( get_view( view["_id"] ) ) )

    return json_dump( list( out ) )


# Get a list of fits files for a given logID
@app.route('/fits/<logID>/<viewID>')
def list_fits(logID, viewID):

    # Pull out all fits entries related to the logID from the DB
    fits = db.fits.find({"logID": ObjectId(logID) }).sort( [("last_modified", 1),("filename", 1)] )

    # Get the fitsView specified by the passed viewID
    fitsView = db.fitsViews.find_one({"_id": ObjectId( viewID ) })

    # Create an empty array to store all our output fits entries
    outList=[]

    # Iterate through each entry returned
    for f in fits:
        # Create an empty dict to store our filtered fits entry
        row = {}
        
        # Iterate through the columns in the view 
        for c in fitsView["columns"]:

            # If there is a simple list, specifying how to reach into the fits 
            # entry by providing each index in order, try and do so recursively
            # with a "reduce" method.  This simply accesses each index in turn,
            # forwarding the resultant object to the next iteration until the 
            # last index is reached, the value of which is ultimately returned
            #
            # For instance: ["headers", 0, "AIRMASS"]
            # would access fits["headers"][0]["AIRMASS"]
            # This is the way all further "attr" keywords are defined
            if "fitsAttr" in c:
                fitsAttr = c["fitsAttr"]
                tag = fitsAttr[-1]
                try:
                    row[ tag ] = reduce(lambda memo, i: memo[i], fitsAttr, f)
                except KeyError:
                    row[ tag ] = "!KeyError!"
            
            # If an attribute needs to be converted from decimal to sexagesimal
            # perform the conversion here
            elif "dec2sexAttr" in c:
                attr = c["dec2sexAttr"]
                tag = attr[-1]
                try:
                    decVal = reduce(lambda memo, i: memo[i], attr, f)
                except KeyError:
                    row[ tag ] = "!KeyError!"
                else:
                    if decVal < 0:
                        pm = "-"
                    else:
                        pm = "+"
                    a = abs(decVal/15)
                    dd = int( a )
                    mm = int((a-dd)*60)
                    ss = (a - dd - (mm/60.0))*3600
                    row[ tag ] = "{0}{1:02d}:{2:02d}:{3:05.2f}".format(pm, dd, mm, ss)

            # If there is a "enumAttr", find the fits attribute specified, and then
            # replace its value with the one specified by the enum if possible
            elif "enumAttr" in c:
                enumAttr = c["enumAttr"]
                tag = enumAttr["attr"][-1]

                # Dig into the fits entry to find the attribute specified
                try:
                    attr = str( reduce(lambda memo, i: memo[i], enumAttr["attr"], f) )
                except KeyError:
                    row[ tag ] = "!CondKeyError!"
                else:
                    # Take the value returned by the above attribute, and try and access
                    # a corresponding enum value in the "enumAttr" dictionary whose 
                    # key matches it.
                    try:
                        val = enumAttr[ attr ] 
                    except KeyError:
                        # If no enum replacement defined, simply return the original value
                        row[ tag ] = attr
                    else:
                        row[ tag ] = val

            # If there is a "multiEnumAttr", find all the FITS attributes requested by
            # the attrs list, then try and find a key which matches the values returned
            # by that list of attributes.
            elif "multiEnumAttr" in c:
                multiEnumAttr = c["multiEnumAttr"]
                tag = c["multiEnumAttr"]["tag"] 

                # Dig into all the attributes specified by the attrs list, return a list of their values
                try:
                    attrs = [ str( reduce(lambda memo, i: memo[i], a, f) ) for a in multiEnumAttr["attrs"] ]
                except KeyError:
                    row[ tag ] = "!CondKeyError!"
                else:
                    # Take the values returned by the above, convert it into a comma separated
                    # string, and then try and access a corresponding enum value in the 
                    # "multiEnumAttr" dictionary whose key matches all values.
                    attrsStr = ", ".join( attrs )
                    try:
                        val = multiEnumAttr[ attrsStr ] 
                    except KeyError:
                        # If no enum replacement defined, return the comma separated string
                        row[ tag ] = attrsStr 
                    else:
                        row[ tag ] = val

            # If, instead, there is a "condtional attribute", we try and follow
            # the logic provided by it.  We pull out the value in the tag specified 
            # by "attr".  We then look for a key in the dictionary that matches that
            # returned value.  If the key is found, we dig into the attribute it 
            # specifies and return it.  Otherwise, if a key isn't found that matches,
            # we just return "N/A".  This is useful as a catchall, as 
            elif "condAttr" in c:
                condAttr = c["condAttr"]
                tag = condAttr[ "tag" ]
                
                # Dig into the current fits entry, finding the attribute whose value we 
                # use as the input for our conditional selection.
                try:
                    condition = str( reduce(lambda memo, i: memo[i], condAttr["attr"], f) )
                except KeyError:
                    row[ tag ] = "!KeyError!"
                else:
                    # Take the value returned by the above attribute, and try and access
                    # a corresponding index accessor list in the "condAttr" dictionary whose 
                    # key matches it.
                    try:
                        attr = condAttr[ condition ] 
                    except KeyError:
                        row[ tag ] = "N/A"
                    else:
                        # Finally, if all has been sucessful, try and dig into the fits entry
                        # using the accessor list provided
                        try:
                            row[ tag ] = reduce(lambda memo, i: memo[i], attr, f) 
                        except KeyError:
                            row[ tag ] = "!KeyError!"

              # allow columns to accept a format
            if "decimals" in c: 
                try:
                    row[ tag ] = round(row[ tag ],c["decimals"])
                except KeyError:
                    row[ tag ] = "!KeyError!"

        # Include the "_id" to allow for fits comment posting
        row["_id"] = f["_id"]

        # Check to see if there is a comment, and if so, attach it
        # Otherwise, attach an empty string for the front end
        if "comment" in f:
            row["comment"] = f["comment"]
        else:
            row["comment"] = ""

        # Append a group if it exists, False otherwise
        if "group" in f:
            row["group"] = f["group"]
        else:
            row["group"] = False

        # If there is a "childenExpand" attribute, add it
        if "childrenExpand" in f:
            row["childrenExpand"] = f["childrenExpand"]

        # Append our newly created row to the output list
        outList.append( row )

    # Encode the output list into JSON and return it
    return json_dump( list( outList) )


# Serve up a printable view of a given log, with a given view applied to the data
@app.route('/print/<logID>/<viewID>')
def print_log(logID, viewID):
    # Pull the log requested directly via a call to the relevant route function
    log = json_load( get_log( logID ) )

    # Get the columns of the fitsView requested
    fvCols = json_load( get_view(viewID) )["columns"]

    # Get all log entries 
    entries = json_load( list_entries(logID) )

    # Get all the relevant fits entries
    fits = json_load( list_fits(logID, viewID) )

    filteredFits = []
    expanded = {}
    for f in fits:
        if "childrenExpand" in f:
            expanded[ f["group"] ] = f["childrenExpand"]
            filteredFits.append( f )
        elif f["group"] != False :
            if expanded[ f["group"] ]:
                filteredFits.append( f )
        else:
            filteredFits.append( f )

    # Pass all this info to the print template and render it
    return render_template("print.html", fits=filteredFits, log=log, fvCols=fvCols, entries=entries)


# Serve up a printable view of a given log, with a given view applied to the data
@app.route('/save/<logID>/<viewID>')
def save_log(logID, viewID):
    # Pull the log requested directly via a call to the relevant route function
    log = json_load( get_log( logID ) )

    # Get the columns of the fitsView requested
    fvCols = json_load( get_view(viewID) )["columns"]

    # Get all log entries 
    entries = json_load( list_entries(logID) )

    # Get all the relevant fits entries
    fits = json_load( list_fits(logID, viewID) )

    filteredFits = []
    expanded = {}
    for f in fits:
        if "childrenExpand" in f:
            expanded[ f["group"] ] = f["childrenExpand"]
            filteredFits.append( f )
        elif f["group"] != False :
            if expanded[ f["group"] ]:
                filteredFits.append( f )
        else:
            filteredFits.append( f )
    
     
    # Pass all this info to the save template and render it
    
    output_from_template = render_template("save.html", fits=filteredFits, log=log, fvCols=fvCols, entries=entries)
    project = log["project"]
    logutdate = log["utcDate"].strftime("%y-%m-%d")
    instrument = log["instrument"]
    #print "saving to"+output_directory+" for project "+project
    output_file = logutdate+"_"+instrument+"_"+project+".html"
    with open("/home/keola/obsMonitor/SAVED_LOGS/"+output_file, "wb") as f:
        f.write(output_from_template)
    return send_from_directory("/home/keola/obsMonitor/SAVED_LOGS/",output_file, as_attachment=True)
    #return render_template("save.html", fits=filteredFits, log=log, fvCols=fvCols, entries=entries)

# Allow comment's to be PUT into existing fits entries
@app.route('/fits/<fitsID>', methods=['PUT'])
def update_fits_comment(fitsID):
    # Pull in the new "fits" entry.  This entry is actually a subset of the fits
    # entry generated for the grid view.  We don't want to save this as such...
    inFits =  json_load(request.data)

    # Pull out the complete, original entry
    fullFits = db.fits.find_one({"_id": ObjectId(fitsID)})

    # Update or insert the comment into the complete entry, then save it
    fullFits["comment"] = inFits["comment"]

    if inFits["group"] == False and "group" in fullFits:
        # If the group has been set to False by the client, remove
        # that attribute from the full entry and as well as
        # the childrenExpand attribute if it exists
        del fullFits["group"]
        if "childrenExpand" in inFits:
            del inFits["childrenExpand"]
        if "childrenExpand" in fullFits:
            del fullFits["childrenExpand"]
    elif inFits["group"] != False:
        # If the group is not false, set the group passed in
        fullFits["group"] = inFits["group"]

        # If the chidlrenExpand attribute is set, pass it in
        # if not, make sure it is deleted
        if "childrenExpand" in inFits:
            fullFits["childrenExpand"] = inFits["childrenExpand"]
        else:
            if "childrenExpand" in inFits:
                del inFits["childrenExpand"]
            if "childrenExpand" in fullFits:
                del fullFits["childrenExpand"]


    db.fits.save( fullFits )

    # Pass back the grid view entry
    return json_dump( inFits )


### Admin Routes ###

@app.route('/admin/login', methods=['POST'])
def login():
    """ If not logged in, expects a JSON object with username and password, attempts authentication """

    # If there is a session for this user already, 
    # return JSON object indicating success
    if session.get('logged_in'):
        return json_dump( {"success": True} )

    # Load the JSON object passed
    auth_details = json_load(request.data)

    # Try to access the username and password attributes in it, if they don't exist
    # return a 401 error and tell them it isn't the right format 
    try:
        username, password = auth_details["username"], auth_details["password"]
    except KeyError:
        return app.make_response( ('Please supply both username and password in JSON object\n', 401, '') )

    # Try and see if any entries in the database match this username and md5 hashed password
    userRecords = db.users.find({ "username": username, "password": md5( password ).hexdigest() })

    # If not, return 401
    if userRecords.count() == 0:
        return app.make_response( ('Incorrect username or password\n', 401, '') )

    # Else, start a session with "logged_in" set to true, and convenience JSON object for the script
    session["logged_in"] = True
    return json_dump( {"success": True} )


# Get a list of all logs
@app.route('/admin/logs')
@requires_auth
def list_logs():

    # Get the bounding dates from the request or False if not correct or present
    try:
        utcFrom = datetime.strptime( request.args.get("utcFrom", ""), "%m/%d/%Y")
    except ValueError:
        utcFrom = False 
    try:
        utcTo = datetime.strptime( request.args.get("utcTo", "")+" 23:59:59", "%m/%d/%Y %H:%M:%S")
    except ValueError:
        utcTo = False

    # Get the search filter from the request, defaulting to "" if it doesn't exist
    search = request.args.get("search", "")

    # Build up a list of conditions that must be met
    filters = []
    if utcFrom:
        filters.append( {"utcDate": {"$gt": utcFrom}} )
    if utcTo:
        filters.append( {"utcDate": {"$lt": utcTo}} )
    if search:
        # Build up list of fields to search simultaneously
        orList = []

        # Do a simple, case insensitive, regular expression match for search filter
        orList.append( {"observers": {"$regex": "(?i)"+search}} )
        orList.append( {"project": {"$regex": "(?i)"+search}} )
        orList.append( {"instrument": {"$regex": "(?i)"+search}} )

        # Search all these things simultaneously by using an "$or" search
        # which accepts a list of arguments to test
        filters.append( {"$or": orList} )

    # If filters is non-empty ...
    if len(filters) > 0:
        # Apply the filters we have built up, applying them all simultaneously
        # via the "and" opperator which accepts a non-zero length array
        logs = db.logs.find({"$and": filters } )
    else:
        # Else, pull all log records
        logs = db.logs.find()
    
    # Start an empty list to store output records in
    outLogs = []

    # Get the IDs of all logs that are active.  
    # Use distinct because it returns a nice array instead of a cursor
    activeLogs = db.activeLogs.distinct("logID")

    # Sort the logs reverse chronologically
    for log in logs.sort( [("utcDate", -1)] ):
        # Append human readable dates to all the logs for use by the front end
        log["date"] = log["utcDate"].strftime("%Y/%m/%d")

        # Mark each log as active or not
        log["active"] = ( log["_id"] in activeLogs )
        outLogs.append( log )
    
    # Return the augmented entries
    return json_dump( list( outLogs ) )


# Delete a given log
@app.route('/admin/logs/<logID>', methods=['DELETE'])
@requires_auth
def deleteLog(logID):
    id = ObjectId( logID )

    # Delete from activeLogs
    db.activeLogs.remove({"logID": id})

    # Delete all entries
    db.entries.remove({"logID": id})

    # Delete the log itself
    db.logs.remove({"_id": id})

    return ""


# Delete a given log and its FITS entries also
@app.route('/admin/logs/fullDelete/<logID>', methods=['DELETE'])
@requires_auth
def fullDeleteLog(logID):
    deleteLog( logID )

    db.fits.remove({"logID": ObjectId( logID ) })

    return ""


# Set a given log to active or inactive
@app.route('/admin/logs/setActive', methods=['POST'])
@requires_auth
def setActive():
    """ Expects a JSON object with a 'logID' and 'active' bool attribute """
    # Load the JSON object passed
    req = json_load(request.data)

    # Create a simple activeLog entry to use to query the db
    entry = {"logID": ObjectId( req["logID"] ) }
    
    # Determine if there are any entries already for this log
    results = db.activeLogs.find( entry )
    
    if req["active"] and results.count() == 0:
        # If there aren't, and the request specifies the log should be active, add the entry
        db.activeLogs.save( entry )
    elif not req["active"] and results.count() > 0:
        # If there is, and the request specifies an inactive log, remove the entry
        db.activeLogs.remove( entry )

    return json_dump( req )


# Get a list of instruments 
@app.route('/admin/instruments')
@requires_auth
def list_instruments():
    return json_dump( list( db.instruments.find({}, {"activeDirs": 0}) ) )


# Create new log via POST 
@app.route('/admin/logs', methods=['POST'])
@requires_auth
def new_log():
    # Load in the JSON encoded log from the request
    log = json_load(request.data)

    dataDir = log["dataDir"].strip().rstrip('/')

    ### Check to see if log's data directory is already represented 
    prevLog = db.logs.find_one({"dataDirs": dataDir })

    # If it is, make sure it's marked as active again, add a log entry stating
    # as much, then return it with a "redirect" attribute so the log knows to
    # that the user has been redirected.
    if prevLog:
        if not db.activeLogs.find_one({"logID": prevLog["_id"]}):
            db.activeLogs.save({"logID": prevLog["_id"]}) 
            db.entries.save( {"logID": prevLog["_id"],
                "type": "alert", 
                "title": "Log returned to active status", 
                "utcDate": datetime.utcnow()})
        prevLog["redirect"] = True
        return json_dump( prevLog )

    # If not, continue on...

    # Append the current UTC datetime to the log
    log["utcDate"] = datetime.utcnow()
    
    # Delete the singledata directory passed from the log entry and append 
    # it to the dataDirs list
    del log["dataDir"]
    log["dataDirs"] = [ dataDir ]

    # Create an empty activeDirs list
    log["activeDirs"] = []

    # Store the log in the DB
    db.logs.save( log )

    # Set this log to active
    db.activeLogs.save( {"logID": log["_id"]} ) 

    # Create an initial entry 
    db.entries.save( {"logID": log["_id"],"type": "alert", "title": "New Log started", "utcDate": datetime.utcnow()})

    # reutrn a JSON encoded version of the log after creation
    return json_dump( log )

# Edit log via PUT
@app.route('/admin/logs/<id>', methods=['PUT'])
@requires_auth
def edit_log(id):
    # Load in the JSON encoded log from the request
    log = json_load(request.data)

    # Delete stuff we don't need to update or insert into a log entry
    if "active" in log:
        del log["active"]
    if "date" in log:
        del log["date"]
    
    # Save the stripped log entry
    db.logs.save( log )

    # Return the original entry back to the front end
    return request.data

### Start standalone server if script called by itself ###

# In debug mode right now to allow automatic reloading of code
# For production: turn off debug
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
    # app.run(host='0.0.0.0', port=5500, debug=True)

