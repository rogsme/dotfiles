function uft
         rm -f ~/Documents/Gastos/Saved/import/import.csv
         /usr/bin/ls -tr ~/Documents/Gastos/Saved/*.csv | tail -n 2 | xargs grep -Fxvf > ~/Documents/Gastos/Saved/import/import.csv
         cat -n ~/Documents/Gastos/Saved/import/import.csv
end
