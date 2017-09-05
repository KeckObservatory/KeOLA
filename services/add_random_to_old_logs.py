import pymongo
import urllib2
# For sending mail
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
import random
import shutil
import glob, os


# Directory where to save the user logs after adding the random string
UserLogsDirectory = "/home/keola/obsMonitor/USER_LOGS"
# Directory where the logs are saved when the user hits the "SAVE" button or at 2pm every day
SavedLogsDirectory = "/home/keola/obsMonitor/SAVED_LOGS"

logfiles = glob.glob(SavedLogsDirectory+"/*.html")

for logfile in logfiles:
    print logfile
    RandomString = ('%06x' % random.randrange(16**6)).upper()
    filename = logfile.split('/')[5]
    filename = filename[:-5]
    print filename
    randomFileName = filename+"_"+RandomString+".html"
    print "The new file is:"
    print randomFileName
    logfiles_new = glob.glob(UserLogsDirectory+"/"+filename+"*.html")
    if logfiles_new:
        print "The file already exists:"+filename
    else:
        shutil.copy(SavedLogsDirectory+"/"+filename+".html",UserLogsDirectory+"/"+randomFileName)
