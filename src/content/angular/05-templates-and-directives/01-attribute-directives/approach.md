1. Give the directive an input named after its selector so `appHighlight="orange"` configures it.
2. Derive the effective color with a fallback for the valueless attribute.
3. Keep hover state in a signal and toggle it from `host` event listeners.
4. Bind `style.backgroundColor` in `host` to the color while hovered, `null` otherwise.
5. Compose the directive into `Card` with `hostDirectives`, exposing the input under the public name `highlightColor`.
