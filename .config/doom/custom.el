(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(magit-todos-insert-after '(bottom) nil nil "Changed by setter of obsolete option `magit-todos-insert-at'")
 '(safe-local-variable-values
   '((magit-gptcommit-prompt . "You are an expert programmer writing a commit message. You went over every file diff that was changed in it. Summarize the commit into a single specific and cohesive theme. Remember to write in only one line, no more than 50 characters. Write your response using the imperative tense following the kernel git commit style guide. Write a high level title. THE FILE DIFFS:```%s```. Now write Commit message in follow template: [one line of summary]")
     (lsp-eslint-working-directories . \./src)
     (lsp-pylsp-plugins-ruff-enabled . t)
     (poetry-tracking-strategy . "projectile")
     (poetry-tracking-mode quote projectile)
     (poetry-tracking-strategy quote projectile)
     (projectile-project-compilation-cmd . "npm run python:lint")
     (projectile-project-run-cmd . "npm start")
     (projectile-project-test-cmd . "npm run python:unit")
     (lsp-pylsp-plugins-pydocstyle-enabled)
     (projectile-project-run-cmd . "make up")
     (python-pytest-executable . "docker-compose run --rm -e CI=True app python -m pytest")
     (projectile-project-test-cmd . "make test")
     (lsp-pylsp-plugins-flake8-enabled))))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(font-lock-comment-face ((t (:slant italic))))
 '(font-lock-keyword-face ((t (:slant italic)))))
