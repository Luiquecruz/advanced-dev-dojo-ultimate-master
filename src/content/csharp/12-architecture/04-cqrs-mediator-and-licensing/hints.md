The command handler has no `await` inside, so it can return `Task.FromResult(order.Id)`. The query handler does the same with `Task.FromResult(summary)`, where `summary` is `null` when `orders.Find(query.OrderId)` found nothing; the `IOrderReader` constructor parameter only offers `Find`, which keeps the query from writing.
---
In the validator, start with `var errors = new List<string>();`, add one message per failed check (`if (command.Quantity <= 0) errors.Add("Quantity must be greater than 0.");`) and return the list. Checks are independent, so a command with four problems gets four messages.
---
The order of the two steps is the whole decorator: `var errors = validator.Validate(command);`, then `if (errors.Count > 0) throw new ValidationException(errors);`, and only after that `return await inner.HandleAsync(command, ct);`. Calling the inner handler first, or logging the errors and calling it anyway, means the invalid order is already stored when the error appears.
