import pymongo
import urllib2

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


# Get a list of currently active logs and append some useful info
# Start an empty list to store output records in
outLogs = []

# Query for all current activeLogs
aLogs = db.activeLogs.find()

# Iterate through the cursor returned
for al in aLogs:
    # Get the log entry for this active log
    print "Retrieving information for log ID: "+str(al["logID"])
    mylog = db.logs.find_one({"_id": al["logID"]}, {"project":1, "utcDate":1, "instrument":1})
    print "Instrument is "+mylog["instrument"]
    print "Looking for "+mylog["instrument"]+" fitsViews..."
    fitsview = db.fitsViews.find_one({"instrument": mylog["instrument"]},)
    print "found: "+str(fitsview["_id"])
    f = urllib2.urlopen("http://observinglogs/save/"+str(al["logID"])+"/"+str(fitsview["_id"]))


