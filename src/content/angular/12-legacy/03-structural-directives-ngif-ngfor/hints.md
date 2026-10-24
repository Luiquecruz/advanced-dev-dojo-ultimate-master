Standalone components must import the directives they use: `imports: [NgIf, NgFor]` (or `CommonModule`).
---
The else branch references a template variable: `<ul *ngIf="users.length > 0; else empty">` and somewhere below `<ng-template #empty><p>No users found</p></ng-template>`.
---
Locals and trackBy go after semicolons: `*ngFor="let user of users; let i = index; trackBy: trackById"`, and `trackById` returns `user.id`.
