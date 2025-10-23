function git_sync_all_repos_in_dir
    find . -type d -name .git -exec sh -c 'cd "{}" && cd .. && pwd && git pull' \;
end
