import sys, os

# Make sure to replace "/KeOLA/webInterface" with the actual working directory 
# of server.py
sys.path.insert(0,'/home/keola/obsMonitor/webInterface')

from server import app as application
