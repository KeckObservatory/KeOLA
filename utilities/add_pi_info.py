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
    current_UT_date = (d+delta+delta).strftime("%Y-%m-%d")
    print "*****************************************************************************"
    print d.strftime("%Y-%m-%d")
    # Pull Schedules from the web for today, and generate logs for them
    for log in getSchedules.genLogs( d, db, errors ):
        # Save each new log to the database
        # db.logs.save( log )
        print ""
        print "Instrument:  "+log["instrument"]
        print "Project:     "+log["project"]
        print "PI:          "+log["pi"]
        print "Observers:   "+log["observers"]
        print "SA:          "+log["sa"]
        print "UT date      "+current_UT_date

        # look for the log with this project:
        projects=0
        projects = db.logs.find({"project": log["project"],"twilight.udate": current_UT_date}).count()
        #projects_found = db.logs.find({"project": log["project"]},{"utcDate":1,"project":1, "twilight":1})
        #for proj in projects_found:
        #    print proj["project"],proj["utcDate"],proj["twilight"]
        if (projects):
            old_log = db.logs.find_one({"project": log["project"],"twilight.udate": current_UT_date},{"utcDate":1,"pi":1,"observers":1})
            update_log = False
            print "UT DATE OF OLD LOG:"+old_log["utcDate"].strftime("%Y-%m-%d")
            print "CURRENT UT:       :"+current_UT_date
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
                db.logs.update({"project": log["project"],"twilight.udate": current_UT_date},{"$set": {"pi": log["pi"]}},False,False)


        else:
            print "There is no project "+log["project"]+" in the database"
    d += delta

