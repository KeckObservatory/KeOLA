import psutil,os
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
import subprocess

# E-mail address to send messages to
emailTo = "lrizzi@keck.hawaii.edu"

# Address that the message should be from
emailFrom = "keola@observinglogs.localdomain"

# SMTP server
smtpServer = "localhost"

def check_if_running():
  for proc in psutil.process_iter():
    cmdline = proc.cmdline
    if len(cmdline)>1 and 'python' in cmdline[0] and 'dataMon.py' in cmdline[1] and 'supervisor' not in cmdline[1]:
        p = psutil.Process(proc.pid)
        status = str(p.status)
        #print "Data Monitor is "+status+" PID: "+str(p.pid)
        return p.pid


monitor_on = False
pid=check_if_running()
if pid:
    monitor_on = True

if monitor_on == False:
    print ("Data monitor has stopped")
    print ("Attempting to restart...")
    email_body = ""
    proc = subprocess.Popen("python /home/keola/obsMonitor/services/dataMon.py",shell=True)
    print (proc.pid)
    # send email with results
    email_body = "DataMon was found not running"
    email_body = email_body+'\n'+"Attempting to restart"
    email_body = email_body+'\n It should now be running under pid '+str(proc.pid)
    pid=check_if_running()
    email_body = email_body+'\n Checking again:  pid '+str(pid)
    msg = MIMEText ( email_body )
    msg['Subject'] = "dataMon.py problem"
    msg['From'] = emailFrom
    msg['to'] = emailTo
    s = smtplib.SMTP( smtpServer )

    s.sendmail(emailFrom, [emailTo], msg.as_string())
    s.quit()


