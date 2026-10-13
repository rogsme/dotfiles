## Model routing

A ticket can name the model that should implement it in a `## Model routing` section. The section's first line is `Model: <id>` or `Model: frontier`, sometimes with a condition. The rest holds what that model needs: the guardrails to check its plan against, how its captures get checked, and what to read before planning.

- Models: frontier is {{FILL: the model or family used for frontier work}}; the cheaper option is {{FILL: the cheaper model id or ids}}.
- A ticket without the section goes to a frontier model.
- A bundle runs on one model, and that is a cheaper model only when every member's section names it.
- Route a ticket to a cheaper model when tests or a browser pass can prove the change right. Keep work where passing tests do not prove correctness (answer quality, failure paths of streaming, concurrency) on a frontier model.
- Criteria and history: {{FILL: where the project records its routing criteria, or "this section"}}.
