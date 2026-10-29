# Evidence for availability

Use this only when the update needs a deployed, live, or "now you can" claim. A merged PR, green tests, a preview deployment, or unrelated recent workflows cannot establish availability on the client's site.

1. Identify the repository, intended environment and component, and expected release SHA from the notes, client configuration or the actual deployment workflow. Check that the release contains the feature being described. Ask Roger when the intended target is unclear; never infer production from a GitHub environment named `Production` that could belong to a different project.
2. Discover the actual workflow with `gh workflow list --repo <repo>` or its local workflow definition. If checking runs, filter by that workflow and branch. A successful workflow is supporting evidence, not a substitute for its environment's deployed revision.
3. For GitHub deployment records, run the read-only helper:

   `python3 <skill-dir>/scripts/deployment_evidence.py --repo <owner/repo> --environment <exact-name> --sha <full-release-sha> [--workflow <deploy-workflow> --branch <branch>]`

   Save its JSON beside today's logs as `<today>.<target>.deployment.json`. It checks the latest deployment for that environment and task before comparing the revision. An older successful record cannot override a newer failed, pending or different release. `reported_success` records GitHub's deployment report; `availability_verified: false` explicitly leaves runtime behavior untested.
4. When the provider doesn't publish GitHub deployment records, use an existing approved read-only provider check or Roger's explicit observation. Record its source, target, revision if available, observed result and time. Missing access means unverified, not failed and not available. Do not provision resources, change DNS, trigger a deploy or broaden permissions to obtain evidence.
5. Record deployment and runtime acceptance separately. A web deployment doesn't establish backend rollout, email delivery, access control or end-to-end answer quality. Scope the public statement to what was actually observed.

Until evidence is sufficient, say the code merged and availability still needs checking. For a failed or running deployment, state the observed state; include a delivery time only if Roger supplied one. No "tomorrow" is inferred from a pending job.
