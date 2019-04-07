# Library that enables  HTTP requests
try:
    from urllib.request import urlopen
except ImportError:
    from urllib2 import urlopen

from datetime import date, timedelta, datetime
import sys
import json

def getTwilight(inDate):
    """ Pulls twilight info for a given date from the website and parses them into a dictionary """
    url = "https://www.keck.hawaii.edu/software/db_api/metrics_api.php?date=" + inDate.strftime("%Y-%m-%d")

    response = urlopen( url )
    print(url)
    result = response.read().decode('utf-8')
    result = json.loads(result)
    return result

def findInstrEntry( dbInstruments, instrStr ):
    """ Find the matching instrument db entry for a given instrument string """
    for instrument in dbInstruments:
        if instrument["name"] in instrStr:
            return instrument
    return instrStr


def getSchedule(inDate, telescope):
    """ Pulls schedules for a given date from the website and parses them into a dictionary """
    url = "https://www.keck.hawaii.edu/software/db_api/telSchedule.php?cmd=getSchedule&date=" + inDate.strftime(
        "%Y-%m-%d")

    url = url + "&telnr=%d" % telescope
    response = urlopen(url)
    print(url)
    result = response.read().decode('utf-8')
    result = json.loads(result)
    return result


def getNightStaff(inDate):
    """ Pulls WMKO staff for a given date from the website and parses them into a dictionary """
    url = "https://www.keck.hawaii.edu/software/db_api/telSchedule.php?cmd=getNightStaff&date=" + inDate.strftime(
        "%Y-%m-%d")

    schedules = []

    response = urlopen(url)
    result = response.read().decode('utf-8')

    return json.loads(result)



def genLogs( d, db, errors ):
    """ Parses out database log entries from the schedule for a given date """

    # An empty list to append output logs
    outLogs = []

    # List of months to be used for really lame lower casing method
    mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    night_staff = getNightStaff(d)

    suffixes = ['', '_B', '_C', '_D', '_E']
    instruments_used_tonight = []

    employees = getNightStaff(d)

    for telescope in [1, 2]:
        suffix_index = 0
        schedules = getSchedule(d, telescope)
        for run in schedules:
            log = {}

            log['project'] = run['ProjCode']
            log['observers'] = run['Observers']
            log['pi'] = run['PiLastName']

            # use default values to prevent failures when either the OA or teh SA are not specified
            log['oa'] = log['sa'] = 'UNKNOWN'

            # retrieve OA name
            for staff in filter(
                    lambda nightstaff: (('oa' in nightstaff['Type']) and (nightstaff['TelNr'] == str(telescope))),
                    employees):
                log['oa'] = staff['FirstName'] + " " + staff['LastName']
            # retrieve SA name
            for staff in filter(
                    lambda nightstaff: (('sa' in nightstaff['Type']) and (nightstaff['TelNr'] == str(telescope))),
                    employees):
                log['sa'] = staff['FirstName'] + " " + staff['LastName']

            log['utcDate'] = datetime.utcnow()
            # retrieve protodirs structure
            print("Looking for database entry for instrument: <%s>" % run['Instrument'])
            if '-' in run['Instrument']:
                run['Instrument'] = run['Instrument'].split('-')[0]
            if 'HIRES' in run['Instrument']:
                run['Instrument'] = 'hires'
            if 'LRIS' in run['Instrument']:
                run['Instrument'] = 'lris'


            curInstrument = db.instruments.find_one({'name': run['Instrument'].upper()})
            if curInstrument is not None:
                log['instrument'] = run['Instrument'].upper()
                obs = {}
                obs['date'] = d + timedelta(days=1)
                obs['accountID'] = "".join([str(s) for s in run['Account'] if s.isdigit()])
                instruments_used_tonight.append(log['instrument'])
                number_of_occurrences_of_this_instrument = instruments_used_tonight.count(log['instrument'])
                suffix_index = number_of_occurrences_of_this_instrument-1
                obs['dateSuffix'] = suffixes[suffix_index]

                suffix_index += 1
                dataDirs = []
                for pd in curInstrument["protoDirs"]:
                    dir = pd.format(**obs)
                    for m in mons:
                        if m in dir:
                            dir = dir.replace(m, m.lower())
                    dataDirs.append(dir)
                log['dataDirs'] = dataDirs
                log['activeDirs'] = []
                outLogs.append(log)
            else:
                print("No instrument entry for <%s>" % (run['Instrument'].upper()))
    # Return the log entries generated
    return outLogs

def genLogs_multiple_instruments( d, db, errors ):
    """ Parses out database log entries from the schedule for a given date """

    # An empty list to append output logs
    outLogs = []

    # List of months to be used for really lame lower casing method
    mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    night_staff = getNightStaff(d)

    suffixes = ['', '_B', '_C', '_D', '_E']
    instruments_used_tonight = []

    employees = getNightStaff(d)

    for telescope in [1, 2]:
        suffix_index = 0
        schedules = getSchedule(d, telescope)
        for run in schedules:
            # array containing the log for this telescope
            logs = []

            project = run['ProjCode']
            observers = run['Observers']
            pi = run['PiLastName']

            # use default values to prevent failures when either the OA or teh SA are not specified
            oa = sa = 'UNKNOWN'

            # retrieve OA name
            for staff in filter(
                    lambda nightstaff: (('oa' in nightstaff['Type']) and (nightstaff['TelNr'] == str(telescope))),
                    employees):
                oa = staff['FirstName'] + " " + staff['LastName']
            # retrieve SA name
            for staff in filter(
                    lambda nightstaff: (('sa' in nightstaff['Type']) and (nightstaff['TelNr'] == str(telescope))),
                    employees):
                sa = staff['FirstName'] + " " + staff['LastName']

            utcDate = datetime.utcnow()
            # retrieve protodirs structure
            # it is possible to have more than 1 instrument per run, separated by the + sign
            instruments = run['Instrument'].split('+')
            for index in range(len(instruments)):
                print("Looking for database entry for instrument: <%s>" % instruments[index])
                if '-' in instruments[index]:
                    instruments[index] = instruments[index].split('-')[0]
                if 'HIRES' in instruments[index]:
                    instruments[index] = 'hires'
                if 'LRIS' in instruments[index]:
                    instruments[index] = 'lris'
            
            # now loops through the instruments for this run, and generate the logs
            for instrument in instruments:
                log = {}
                curInstrument = db.instruments.find_one({'name': instrument.upper()})
                if curInstrument is not None:
                    log_instrument = instrument.upper()
                    obs = {}
                    obs['date'] = d + timedelta(days=1)
                    obs['accountID'] = "".join([str(s) for s in run['Account'] if s.isdigit()])
                    instruments_used_tonight.append(instrument)
                    number_of_occurrences_of_this_instrument = instruments_used_tonight.count(instrument)
                    suffix_index = number_of_occurrences_of_this_instrument-1
                    obs['dateSuffix'] = suffixes[suffix_index]

                    suffix_index += 1
                    dataDirs = []
                    for pd in curInstrument["protoDirs"]:
                        dir = pd.format(**obs)
                        for m in mons:
                            if m in dir:
                                dir = dir.replace(m, m.lower())
                        dataDirs.append(dir)
                    log['dataDirs'] = dataDirs
                    log['activeDirs'] = []
                    log['sa'] = sa
                    log['oa'] = oa
                    log['project'] = project
                    log['observers'] = observers
                    log['pi'] = pi
                    log['instrument'] = instrument
                    outLogs.append(log)
                else:
                    print("No instrument entry for <%s>" % (run['Instrument'].upper()))
    # Return the log entries generated
    return outLogs
