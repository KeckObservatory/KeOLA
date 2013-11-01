import psutil,os
import smtplib
from email.mime.text import MIMEText
from datetime import datetime


# E-mail address to send messages to
emailTo = "lrizzi@keck.hawaii.edu"

# Address that the message should be from
emailFrom = "keola@observinglogs.localdomain"

# SMTP server
smtpServer = "localhost"

monitor_on = False
for proc in psutil.process_iter():
    cmdline = proc.cmdline
    if len(cmdline)>1 and cmdline[0] == 'python' and cmdline[1] == 'dataMon.py':
        p = psutil.Process(proc.pid)
        status = str(p.status)
        #print "Data Monitor is "+status+" PID: "+str(p.pid)
        monitor_on = True

if monitor_on == False:
    print "Data monitor has stopped"
    print "Attempting to restart..."
    email_body = ""
    os.system("python dataMon.py &")

    # send email with results
    email_body = "DataMon was found not running"
    email_body = email_body+'\n'+"Attempting to restart"
    msg = MIMEText ( email_body )
    msg['Subject'] = "dataMon.py problem"
    msg['From'] = emailFrom
    msg['to'] = emailTo
    s = smtplib.SMTP( smtpServer )

    s.sendmail(emailFrom, [emailTo], msg.as_string())
    s.quit()


