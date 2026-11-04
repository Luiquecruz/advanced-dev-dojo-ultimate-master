import asyncio

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import BudgetExceededError, create_budgeted_client, estimate_cost

PRICING = {"inputPerMillion": 3, "outputPerMillion": 15}
SYSTEM = {"role": "system", "content": "You are a support assistant for an online shop. Answer in at most three sentences."}


def ask(question):
    return [SYSTEM, {"role": "user", "content": question}]


def dollars(value):
    return f"${value:.6f}"


async def main():
    fake_model.configure(pricing=PRICING, tokenizer_drift=0.12)
    fake_model.reply(
        respond.slow(80, respond.text("Order 1042 left the warehouse yesterday and arrives on Thursday.")),
        respond.slow(35, respond.text("Yes, returns are free within 30 days.")),
    )

    question = ask("Where is order 1042?")
    naive = estimate_cost(question, 200, PRICING)
    safe = estimate_cost(question, 200, PRICING, 0.2)
    print(f"input tokens: local count {naive['inputTokens']}, with 20% margin {safe['inputTokens']}")

    client = create_budgeted_client(model=create_model(), pricing=PRICING, max_request_cost=0.004, max_session_cost=0.01)
    for prompt, max_tokens in [("Where is order 1042?", 200), ("Are returns free?", 200), ("Paste of a 40-page contract..." * 60, 200)]:
        try:
            result = await client.send(ask(prompt), max_tokens)
            print(f"sent: reported {result['usage']['inputTokens']} input tokens, estimated {dollars(result['estimatedCost'])}, paid {dollars(result['usage']['cost'])}, {result['latencyMs']} ms")
        except BudgetExceededError as error:
            print(f"refused before sending ({error.scope} budget): {error}")
    report = client.report()
    latencies = " / ".join(str(latency) for latency in report["latenciesMs"])
    print(f"session: {report['requests']} requests, {report['inputTokens'] + report['outputTokens']} tokens, {dollars(report['cost'])}, latencies {latencies} ms")


if __name__ == "__main__":
    asyncio.run(main())
