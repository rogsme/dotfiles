function source-bash
    for line in (bash -c "source $argv; env")
        set var_name (echo $line | cut -d= -f1)
        set var_value (echo $line | cut -d= -f2-)
        if test -n "$var_name" -a -n "$var_value"
            set -lx $var_name $var_value
        end
    end
end
