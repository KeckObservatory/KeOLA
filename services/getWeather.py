from datetime import datetime, timedelta

class Weather:
    def __init__(self, telescope=1):
        self.now = self.last_update = datetime.utcnow()-timedelta(days=1)
        self.tel = telescope

    def current(self):
        self.now = datetime.utcnow()
        if (self.now - self.last_update) > timedelta(minutes=1):
            self.cur = self.fromLog()
        return self.cur
        
    def fromLog(self):
        # Note: This would be much more efficient with 
        # calls to unix head and tail commands, but this
        # is realtively fast for now
        with open("/s/nightly"+str(self.tel)+"/"+self.now.strftime("%y/%m/%d")+"/envMet.arT", "r") as f:
            log = f.readlines()

        # Get the keys from the first line of the log
        keys = [str.replace( k.strip().strip('"'), ".", "-" ) for k in log[1].split(",") ]

        # Get the current values from the last line of the log
        vals = [v.strip() for v in log[-1].split(",") ]
        
        # Return the two zipped together
        return dict( zip(keys, vals) ) 
        


        

