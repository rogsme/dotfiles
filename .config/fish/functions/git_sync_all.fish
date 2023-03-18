function git_sync_all
        for branch in (git branch --all | grep '^\s*remotes' | egrep --invert-match '(:?HEAD|master)$');
            git checkout (echo $branch | awk -F'/' '{print $1="\r"; $2="\r"; print;}' | xargs | sed 's/ /\//g');
            git pull -p
        end
end
