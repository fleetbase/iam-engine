> v0.1.13 ~ "Extensions can add columns, actions and buttons to IAM tables and dialogs"

---
## Highlights

- **Resource view registries.** Extensions can add the following for `user`, `group`, `role` and `policy`:
  - columns, row actions, bulk actions and toolbar buttons, through `iam:<resource>:table:<slot>`;
  - buttons and menu items in the edit dialogs, through `iam:<resource>:details:<slot>`.
- **Groups, roles and policies use the standard table layout**, with filters and a column picker, like users.
- **Fix: the delete-groups confirmation read a misspelt translation key.**

---
## Upgrading
Needs fleetbase/ember-core v0.3.25 and fleetbase/ember-ui v0.4.5.

---
## Need help?
- [GitHub Discussions](https://github.com/fleetbase/fleetbase/discussions)
- [Discord](https://discord.gg/HnTqQ6zAVn)
---
