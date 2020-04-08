;;; setup-yaml-mode.el --- rogs default yaml mode configuration
;;
;;; Commentary:
;;
;; My default configuration for yaml mode
;;
;;; Code:

(require 'yaml-mode)
  (add-to-list 'auto-mode-alist '("\\.yml\\'" . yaml-mode))
  (add-to-list 'auto-mode-alist '("\\.yaml\\'" . yaml-mode))

(add-hook 'yaml-mode-hook
      '(lambda ()
        (define-key yaml-mode-map "\C-m" 'newline-and-indent)))

(provide 'setup-yaml-mode)
;;; setup-yaml-mode.el ends here
