#!/bin/bash
# This is a cron that runs every 15 mins and populates my emacs diary file with my calendar items

# Downloading calendar
echo "Downloading Calendar"
mkdir -p /tmp/calendar
cd /tmp/calendar
wget "https://cloud.rogs.me/remote.php/dav/public-calendars/kRMMJ2CArQeCPzRi/?export" -O "personal-calendar.ics" -c
wget "https://files-f1.motorsportcalendars.com/f1-calendar_qualifying_sprint_gp.ics" -O "f1.ics" -c

# Merge the calendars
cat f1.ics >> personal-calendar.ics

#Generating the file

echo "#Generating the file"
rm ~/.emacs.d/.local/cache/diary
emacs --batch -l ~/.doom.d/scripts/ics-to-org.el

echo "#Deleting everything"
#Deleting everything
rm -r /tmp/calendar
