`form(this.model)` returns a **field tree** with the same shape as the model: `profileForm.name`, `profileForm.address.city`. It must be created in an injection context, so a class field initializer is perfect.
---
In the template, pass the field (not its value) to the directive: `<input [formField]="profileForm.name" />`. The directive handles text, number and checkbox inputs.
---
Calling a field returns its **state**: `profileForm()` is the root state with `dirty()`, `touched()`, `valid()`, `value()` and `reset()`.
---
`loadSample()` is just `this.model.set({...})`, the form follows the signal. `reset()` is `this.profileForm().reset(EMPTY_PROFILE)`.
