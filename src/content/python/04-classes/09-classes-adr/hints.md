Start with the number: 1 000 000 line items times the measured bytes per item, divided by 10⁶, for each layout. Only one layout fits 100 MB, and the estimate must match the layout you put in `memory`.
---
For validation, ask two questions from the briefing: how many fields share each rule, and must the rule run when a field changes after construction? Only one mechanism answers both. Then read the spike result: which entity style keeps that mechanism working under the memory layout you chose?
---
Value objects are compared by value and used as dict keys. For shared behavior, "a different subset per entity type" rules out one inheritance chain; if you combine mixins, every `save` in the chain must call `super()`.
