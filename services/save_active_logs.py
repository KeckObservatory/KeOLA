import pymongo
import urllib2
# For sending mail
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
import random
import shutil
import glob, os

# Default connection options work for now
#connection = pymongo.Connection()
connection = pymongo.MongoClient('observinglogs,observinglogs2,observinglogs3',replicaSet='KEOLA')
# Connection to obsLog database
db = connection.obsLog

# Should we email the results ?
emailResults = True

# E-mail address to send messages to
emailTo = "lrizzi@keck.hawaii.edu"

# Address that the message should be from
emailFrom = "keola@observinglogs.localdomain"

# SMTP server
smtpServer = "localhost"

# Directory where to save the user logs after adding the random string
UserLogsDirectory = "/home/keola/obsMonitor/USER_LOGS"
# Directory where the logs are saved when the user hits the "SAVE" button or at 2pm every day
SavedLogsDirectory = "/home/keola/obsMonitor/SAVED_LOGS"

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

email_body = ""


# Iterate through the cursor returned
for al in aLogs:
    # Get the log entry for this active log
    # print "Retrieving information for log ID: "+str(al["logID"])
    email_body = email_body+"\n"+"Retrieving information for log ID: "+str(al["logID"])
    mylog = db.logs.find_one({"_id": al["logID"]}, {"project":1, "utcDate":1, "instrument":1})
    filename = mylog["utcDate"].strftime("%y-%m-%d")+"_"+mylog["instrument"]+"_"+mylog["project"]
    # print "Instrument is "+mylog["instrument"]
    email_body = email_body+"\n"+"Instrument is "+mylog["instrument"]
    # print "Looking for "+mylog["instrument"]+" fitsViews..."
    email_body = email_body+"\n"+"Looking for "+mylog["instrument"]+" fitsViews..."
    fitsview = db.fitsViews.find_one({"instrument": mylog["instrument"]},)
    # print "found: "+str(fitsview["_id"])
    email_body = email_body+"\n"+"found: "+str(fitsview["_id"])
    email_body = email_body+"\n"+"http://observinglogs/SAVED_LOGS/"+filename+".html"
    email_body = email_body+"\n"
    f = urllib2.urlopen("http://observinglogs/save/"+str(al["logID"])+"/"+str(fitsview["_id"]))

    # generate a random string to add to the file name
    RandomString = ('%06x' % random.randrange(16**6)).upper()
    randomFileName = filename+"_"+RandomString+".html"
    # copy the file and add the random string
    # 1. check if a file with the same date and project already exists in the User Logs Directory
    logfiles = glob.glob(UserLogsDirectory+"/"+filename+"*.html")
    if logfiles:
        print "The file already exists:"+filename
        for logfile in logfiles:
            os.remove(logfile)

    shutil.copy(SavedLogsDirectory+"/"+filename+".html",UserLogsDirectory+"/"+randomFileName)
    # 2. Copy to the remote webserver
    # This is currently disabled as Julia has replaced it with a cron job that runs on the web server
    #try:
    #    os.system('scp "%s" "%s"' % (UserLogsDirectory+"/"+randomFileName, "www:/www/public/realpublic/inst/observinglogs"))
    #except:
    #    print "Error in transferring file to the remote webserver"

if emailResults:
    email_body = email_body+"\n"
    email_body = email_body+"\n"
    email_body = email_body+"\n"+"You can see the list of saved logs at:"
    email_body = email_body+"\n"+"http://observinglogs/loglist"

    msg = MIMEText ( email_body )
    msg['Subject'] = " Observation Log: Logs saved."
    msg['From'] = emailFrom
    msg['to'] = emailTo
    s = smtplib.SMTP( smtpServer )

    s.sendmail(emailFrom, [emailTo], msg.as_string())
    s.quit()



