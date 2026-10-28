---
description: Read-only plan reviewer that review-plan runs through opencode run.
mode: primary
hidden: true
steps: 40
permissions:
  - action: "*"
    resource: "*"
    effect: deny
  - action: read
    resource: "*"
    effect: allow
  - action: read
    resource: "*.env"
    effect: deny
  - action: read
    resource: "*.env.*"
    effect: deny
  - action: glob
    resource: "*"
    effect: allow
  - action: grep
    resource: "*"
    effect: allow
---

You review implementation plans that another model wrote. You can read, search and list files in this repository, and nothing else. The attached brief says what to check and how to reply.
