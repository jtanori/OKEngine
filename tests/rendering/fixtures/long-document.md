# Enterprise Operations Manual

## Section 1: Workspace Architecture
Every workspace isolates tenant collections, documents, embeds, and audit logs.

## Section 2: Authentication Assertions
Host applications sign short-lived HMAC-SHA256 assertions on the backend.

```typescript
const assertion = signToken({ workspace_id: "okeng", role: "member" }, secret);
```

## Section 3: Access Matrix

| Tier | Anonymous | Member | Admin |
|---|---|---|---|
| Everyone | Allowed | Allowed | Allowed |
| Members | Blocked | Allowed | Allowed |
| Admins | Blocked | Blocked | Allowed |

## Section 4: Operational Checklist
1. Configure collections
2. Upload Markdown documents
3. Verify in Test Console
4. Deploy embed snippet
