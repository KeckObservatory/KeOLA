### Imports ###

# Our module for grabbing schedules
import getSchedules

# Import python mongoDB driver
import pymongo

# Library for dealing with dates
from datetime import datetime, date, timedelta

# For sending mail
import smtplib
from email.mime.text import MIMEText

# general
import sys


### Configuration ###

# Should we remove old active logs when this script is run?
cleanLogs = True

# degub mode
debug = False

# Should we email the errors?
emailErrors = False
# Should we email the results ?
emailResults = True

# E-mail address to send messages to
emailTo = "lrizzi@keck.hawaii.edu"

# Address that the message should be from
emailFrom = "keola@observinglogs"

# SMTP server
smtpServer = "localhost"


# Alternatively, should we output errors to a log file?
outputErrorLog = True
    
# Log directory
logDir = "."


### Main program ###

# Start a list of strings that will be used to store any errors.  If errors
# are generated, these will be emailed to a Support Astronomer
errors = [] 

# Open a connection to the obsLog mongoDB database
conn = pymongo.MongoClient('observinglogs:27017')
db = conn.obsLog


# Mark old logs as inactive if cleanLogs is True ###
#if cleanLogs:
#    # Remove all active logs by deleting the whole collection
#    db.drop_collection("activeLogs")

# Get today's date and store it
d = date.today()

# print "New logs for "+str(d)+"."

email_body = "New logs for "+str(d)+"."

# Pull Schedules from the web for today, and generate logs for them
for log in getSchedules.genLogs_multiple_instruments( d, db, errors ):
    # Save each new log to the database
    print("")
    print(log)

    if debug is False:
        answer = raw_input("do you want to create this log?")
        if 'y' in answer:
            db.logs.save( log )
            db.activeLogs.save({"logID": log["_id"]})
    else:
        print("Instrument: "+log["instrument"])
        print("Project:    "+log["project"])
        print("Observers:  "+log["observers"])
        print("SA:         "+log["sa"])
        print("ActiveDirs: "+log["dataDirs"][0])
    email_body = email_body+"\n"+"Instrument: "+log["instrument"]
    email_body = email_body+"\n"+"Project:    "+log["project"]
    email_body = email_body+"\n"+"PI:         "+log["pi"]
    email_body = email_body+"\n"+"Observers:  "+log["observers"]
    email_body = email_body+"\n"+"SA:         "+log["sa"]



# If any error messages have built up
if len(errors) != 0:
    # Buid up a date string
    dString = d.strftime("%Y-%m-%d") 

    errorOut = "\n".join(errors) + "\n"

    # Send an email if emailErrors is set to True
    if emailErrors:
        msg = MIMEText( errorOut )

        msg['Subject'] = dString + " Observation Log spawn errors"
        msg['From'] = emailFrom 
        msg['To'] = emailTo

        s = smtplib.SMTP( smtpServer )
        s.sendmail(emailFrom, [emailTo], msg.as_string())
        s.quit()

    # Write an output log if outputErrorLog is set to True
    if outputErrorLog:
        with open( logDir +"/" + dString + "_error.log" , "w") as f:
            f.write( errorOut )

if emailResults and debug is False:
    msg = MIMEText ( email_body )
    msg['Subject'] = " Observation Log: New logs for today."
    msg['From'] = emailFrom
    msg['to'] = emailTo
    s = smtplib.SMTP( smtpServer )
    s.sendmail(emailFrom, [emailTo], msg.as_string())
    s.quit()

