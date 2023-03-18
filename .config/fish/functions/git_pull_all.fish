function git_pull_all
         for branch in (git branch | sed -E 's/^\*/ /' | awk '{print $1}');
             git checkout $branch;
             git pull -p;
             printf "\n";
         end
end
