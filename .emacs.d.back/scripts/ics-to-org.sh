#!/bin/bash
# This is a cron that runs every 15 mins and populates my emacs diary file with my calendar items

# Downloading calendar
echo "Downloading Calendar"
mkdir -p /tmp/calendar
cd /tmp/calendar
wget "https://cloud.rogs.me/remote.php/dav/public-calendars/5YgCPsaaye9KgbZr?export" -O "personal-calendar.ics" -c

#Generating the file

echo "#Generating the file"
rm ~/.emacs.d/diary
emacs --batch -l ~/.emacs.d/scripts/ics-to-org.el

echo "#Deleting everything"
#Deleting everything
rm -r /tmp/calendar
