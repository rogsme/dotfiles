;;; setup-flycheck-mode.el --- rogs default flycheck mode configuration
;;
;;; Commentary:
;;
;; My default configuration for flycheck mode
;;
;;; Code:

;; FlyCheck configs
;; More help: http://codewinds.com/blog/2015-04-02-emacs-flycheck-eslint-jsx.html#configuring_emacs
;; http://www.flycheck.org/manual/latest/index.html
;; http://codewinds.com/blog/2015-04-02-emacs-flycheck-eslint-jsx.html
(require 'flycheck)

;; Turn on flychecking globally
(add-hook 'after-init-hook #'global-flycheck-mode)

;; Disable jshint since we prefer eslint checking
(setq-default flycheck-disabled-checkers
  (append flycheck-disabled-checkers
          '(javascript-jshint)))

;; Use eslint with web-mode for jsx files
(flycheck-add-mode 'javascript-eslint 'web-mode)

;; Customize flycheck temp file prefix
(setq-default flycheck-temp-prefix ".flycheck")

;; Disable json-jsonlist checking for json files
(setq-default flycheck-disabled-checkers
  (append flycheck-disabled-checkers
          '(json-jsonlist)))

;; Use local eslint from node_modules before global
;; http://emacs.stackexchange.com/questions/21205/flycheck-with-file-relative-eslint-executable
(defun my/use-eslint-from-node-modules ()
  (let* ((root (locate-dominating-file
                (or (buffer-file-name) default-directory)
                "node_modules"))
         (eslint (and root
                      (expand-file-name "node_modules/eslint/bin/eslint.js"
                                        root))))
    (when (and eslint (file-executable-p eslint))
      (setq-local flycheck-javascript-eslint-executable eslint))))
(add-hook 'flycheck-mode-hook #'my/use-eslint-from-node-modules)

;; https://github.com/purcell/exec-path-from-shell
;; Only need exec-path-from-shell on OSX
;; This hopefully sets up path and other vars better
(when (memq window-system '(mac ns))
  (exec-path-from-shell-initialize))

(provide 'setup-flycheck-mode)
;;; setup-flycheck-mode.el ends here
