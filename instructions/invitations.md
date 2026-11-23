# Follows, invitations and collaborators

The design is in `docs/plans/40-follows-invitations-collaborators.md`.

## What it does

- **Follow** someone (no approval). A user's Followers / Following lists are seen by themselves and by the people they collaborate
  with, not by their followers.
- An item's **creator** (its owner) invites a person **they follow** to be a collaborator: **Author** (`editor`: read and edit) or
  **Read only** (`reader`). Projects, folders, articles and maps take invitations; notes don't (they keep the collaborators they had).
- The person sees it in their **inbox** (the navbar's Inbox, `/inbox`): Accept makes them a collaborator with that role; Decline
  changes nothing. The creator can **unsend** it while unanswered, and change a collaborator's role or remove them (the privacy panel).
- Unfollowing someone cancels the invitations you sent them that wait for an answer. Accepting one whose item is in its owner's Trash
  or gone answers `410 NOT_AVAILABLE` and removes it.
- Nobody is added to an item directly: `POST /api/object-rights` is refused and `/apply` only sets the visibility and removes people.

## Where things are

```
packages/shared/src/follows.ts, invitations.ts   contract (zod + types); INVITABLE in data.config.ts; ROLE_LABEL in rights.ts
backend/src/resources/follows/                   /api/follows (crudRoutes) + GET /counts
backend/src/resources/invitations/               /api/invitations (crudRoutes) + GET /pending-count
backend/src/resources/invitations/types/         what each kind checks on send and writes on accept
backend/src/resources/rights/                    the collaborators (/api/object-rights)
backend/drizzle/0017_*, 0018_*                   the tables, maps made shareable, the cleanup triggers
app/src/features/follows/                        followStore, FollowButton, PeopleCard (profile page)
app/src/features/inbox/                          inboxStore, InboxButton (navbar), cards per kind; pages/Inbox/InboxPage.tsx
app/src/features/sharing/                        useSharing + PrivacyPanel: Invite / Waiting / Collaborators
app/src/features/collaborators/                  CollaboratorsList (article footer, Leave), MyCollaborations (profile), RoleChoice
```

## Adding a kind of invitation

1. `packages/shared/src/invitations.ts`: add the name to `INVITATION_TYPES`, its payload schema to `INVITATION_PAYLOADS`, and its
   variant to `invitationInput`.
2. `backend/src/db/schema.ts` builds the CHECK from `INVITATION_TYPES`: `npx drizzle-kit generate` makes the migration (a rebuild of
   `invitations`: keep its triggers, as 0017 does for `object_rights`).
3. `backend/src/resources/invitations/types/<kind>.ts`: what to check when it is sent and the statement accepting runs; add both to
   `KINDS` in `invitations.repo.ts`. The routes do not change.
4. `app/src/features/inbox/cards/<Kind>Card.tsx` and its line in `InvitationCard.tsx`.

## Check

```
npm run test --workspace backend
npm run test --workspace app
npm run build --workspace app
```
