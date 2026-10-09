# Security & Isolation Overview

OKEng enforces a defense-in-depth security model across both the private workspace console and embedded customer widgets.

## Dual Independent RBAC
Platform administration roles (`PLATFORM_OWNER`, `PLATFORM_ADMIN`) are completely isolated from customer workspace roles (`WORKSPACE_OWNER`, `WORKSPACE_USER`). Platform operators do not automatically receive access to customer workspaces.

## The "Nothing Shown" Rule
If an embedded user asks about a topic covered only in a restricted collection (`members` or `admins`) for which they lack clearance, OKEng never reveals that a restricted document exists. It responds: *"I couldn't find that information in the available documentation."*
