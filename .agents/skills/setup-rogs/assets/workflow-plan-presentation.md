## Plan presentation

When plan presentation is on, start-ticket calls `present-plan` after optional plan review to display the complete settled report in its plan viewer, where the user comments on it and can approve it. Plan review and presentation are independent features. A missing `Plan presentation` feature row means off.

- Presenter: `present-plan`'s viewer, plain JavaScript on Node.js 22+. It loads Marked, Mermaid and fonts from `cdn.jsdelivr.net` at pinned versions with integrity hashes, and installs nothing.
- Artifact root: {{FILL: absolute external directory allowed by the planning agent, owned by this user and writable by no one else; the default is /tmp/present-plan}}.
- Port: {{FILL: the stable unprivileged port every review shares, such as 4388 when free}}.
- Listen: {{FILL: all to reach the viewer from other machines, loopback for this machine only, or one IP address}}.
- Failure policy: return the complete canonical report in the terminal with `Not presented: <reason>`. Keep every review finding or `Not reviewed:` warning.
- Approval: explicit approval in the agent conversation, or the viewer's Approve button on the current canonical revision and digest, which also starts `work-ticket`. Comments, a closed tab and an ended review never approve.
- Privacy: each review link carries its own token, and the server answers only to it. With `Listen: all` the traffic is plain HTTP on the network. No hosted sharing. Preserve other reviews and private artifacts.
