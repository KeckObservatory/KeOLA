### Imports ###

# Our module for grabbing schedules
import getSchedules

# Import python mongoDB driver
import pymongo

# Library for dealing with dates
from datetime import datetime, date, timedelta
import time

errors=[]
# Open a connection to the obsLog mongoDB database
db = pymongo.Connection().obsLog

# define the date range
start_date = date(2013,8,1)
end_date = date(2013,10,22)

d = start_date
delta = timedelta(days=1)
while d <= end_date:
    print d.strftime("%Y-%m-%d")
    d += delta
    # Pull Schedules from the web for today, and generate logs for them
    for log in getSchedules.genLogs( d, db, errors ):
        # Save each new log to the database
        # db.logs.save( log )
        print ""
        print "Instrument: "+log["instrument"]
        print "Project:    "+log["project"]
        print "PI:         "+log["pi"]
        print "Observers:  "+log["observers"]
        print "SA:         "+log["sa"]

        # look for the log with this project:
        projects=0
        projects = db.logs.find({"project": log["project"]}).count()
        if (projects):
            old_log = db.logs.find_one({"project": log["project"]},{"pi":1,"observers":1})
            update_log = False
            if old_log["observers"]==log["observers"]:
                print "Current observers: "+old_log["observers"]
                print "From schedule:     "+log["observers"]
                print "Adding PI as:      "+log["pi"]
                update_log = True
            else:
                print "********** Observers have changed! *****"
                print "Current observers: "+old_log["observers"]
                print "From schedule:     "+log["observers"]
                print "********* NOT ADDING PI ****************"
                answer = raw_input('Would you like to add the PI anyway (y/n)?')
                if answer=="y":
                    update_log = True
                    print "Ok, will update this log"
                else:
                    update_log = False
                    print "Ok, not updating this log"
            if (update_log):
                print "WARNING!!! UPDATING LOGS"
                db.logs.update({"project": log["project"]},{"$set": {"pi": log["pi"]}},False,False)


        else:
            print "There is no project "+log["project"]+" in the database"

