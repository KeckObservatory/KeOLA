import smtplib

from email.mime.text import MIMEText

errors = "Blah blah blah\nBlah blah"

msg = MIMEText( errors )

me = "nobody@dr5"
you =  "icunnyngham@keck.hawaii.edu"

msg['Subject'] = "Observation Log spawn errors"
msg['From'] = me
msg['To'] = you 

s = smtplib.SMTP('localhost')
s.sendmail(me, [you], msg.as_string())
s.quit
