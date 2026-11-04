import asyncio
import json

from dojo_ai import create_model
from dojo_ai.testing import fake_model, respond

from main import calibrate, compare_pairwise, judge_answer

RUBRIC = {
    "criteria": [
        {"name": "accuracy", "description": "Every claim matches the refund policy."},
        {"name": "tone", "description": "Polite, calm and free of blame."},
    ],
    "scale": {"min": 1, "max": 5},
}

QUESTION = "When do I get my money back?"
GOOD = "Refunds reach the original card within 5 business days."
VAGUE = "Refunds usually take a while, please be patient."


def compact_json(value):
    return json.dumps(value, separators=(",", ":"))


def fair_verdict(request, context):
    text = "\n".join(message["content"] for message in request["messages"])
    return respond.json({"reasoning": "Gives the exact timing", "winner": "first" if text.find(GOOD) < text.find(VAGUE) else "second"})


async def main():
    judge = create_model("judge")

    print("Rubric judgments")
    fake_model.reply(
        respond.truncated(compact_json({"reasoning": "Correct timing", "scores": {"accuracy": 5, "tone": 4}}), 0.5),
        respond.json({"reasoning": "Correct timing", "scores": {"accuracy": 5, "tone": 4}}),
        respond.json({"reasoning": "No timing given", "scores": {"accuracy": 2, "tone": 4}}),
        respond.text("This answer seems fine to me."),
        respond.json({"scores": {"accuracy": 7, "tone": 3}}),
    )
    for answer in [GOOD, VAGUE, "Refunds are instant and guaranteed."]:
        judgment = await judge_answer(judge, rubric=RUBRIC, question=QUESTION, answer=answer)
        if judgment["valid"]:
            summary = f"scores {compact_json(judgment['scores'])} overall {judgment['overall']:g}"
        else:
            summary = f"no usable judgment ({judgment['reason']})"
        print(f'  "{answer[:40]}..." -> {summary} after {judgment["attempts"]} attempt(s)')

    print("\nCalibration against 12 human labels")
    human = ["pass", "pass", "fail", "pass", "fail", "pass", "pass", "fail", "pass", "pass", "fail", "pass"]
    candidates = {
        "strict judge": ["pass", "pass", "fail", "pass", "fail", "pass", "fail", "fail", "pass", "pass", "fail", "pass"],
        "lenient judge": ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "fail", "pass", "pass", "pass", "pass"],
    }
    for name, labels in candidates.items():
        calibration = calibrate(labels, human, min_kappa=0.6)
        disagreements = ", ".join(str(index) for index in calibration["disagreements"])
        print(f"  {name:<13} agreement {calibration['agreement']:.2f}  kappa {calibration['kappa']:.2f}  trusted={calibration['trusted']}  disagrees on cases {disagreements}")

    print("\nPairwise comparison, both orders")
    fake_model.handle(lambda request, context: respond.json({"reasoning": "The first answer reads better", "winner": "first"}))
    biased = await compare_pairwise(judge, question=QUESTION, answer_a=VAGUE, answer_b=GOOD)
    print(f"  position-biased judge: votes {' / '.join(biased['votes'])} -> winner {biased['winner']}, consistent={biased['consistent']}")
    fake_model.handle(fair_verdict)
    fair = await compare_pairwise(judge, question=QUESTION, answer_a=VAGUE, answer_b=GOOD)
    print(f"  fair judge:            votes {' / '.join(fair['votes'])} -> winner {fair['winner']}, consistent={fair['consistent']}")


if __name__ == "__main__":
    asyncio.run(main())
