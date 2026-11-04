import copy

LEGS = ["privateData", "untrustedContent", "externalCommunication"]

REMOVAL_PREFERENCE = ["externalCommunication", "untrustedContent", "privateData"]


def capabilities_of(tool_name, tools):
    profile = next((tool for tool in tools if tool["name"] == tool_name), None)
    if profile is None or "capabilities" not in profile:
        return list(LEGS)
    return [leg for leg in LEGS if leg in profile["capabilities"]]


def analyze_session(session, tools):
    legs = {leg: [] for leg in LEGS}
    for tool_name in session["tools"]:
        for leg in capabilities_of(tool_name, tools):
            if tool_name not in legs[leg]:
                legs[leg].append(tool_name)
    for label in session.get("untrustedInputs", []):
        legs["untrustedContent"].append(f"input:{label}")
    if session.get("rendersRemoteImages"):
        legs["externalCommunication"].append("remote-images")
    return {"sessionId": session["id"], "legs": legs, "lethal": all(legs[leg] for leg in LEGS)}


def analyze_agent(config):
    sessions = [analyze_session(session, config["tools"]) for session in config["sessions"]]
    return {
        "agent": config["name"],
        "sessions": sessions,
        "lethalSessions": [report["sessionId"] for report in sessions if report["lethal"]],
    }


def suggest_removal(report):
    if not report["lethal"]:
        return None
    leg = min(REMOVAL_PREFERENCE, key=lambda candidate: len(report["legs"][candidate]))
    return {"leg": leg, "sources": list(report["legs"][leg])}


def remove_leg(config, session_id, leg):
    if not any(session["id"] == session_id for session in config["sessions"]):
        raise ValueError(f'Unknown session "{session_id}"')
    fixed = copy.deepcopy(config)
    for session in fixed["sessions"]:
        if session["id"] != session_id:
            continue
        session["tools"] = [tool_name for tool_name in session["tools"] if leg not in capabilities_of(tool_name, config["tools"])]
        if leg == "untrustedContent":
            session["untrustedInputs"] = []
        if leg == "externalCommunication":
            session["rendersRemoteImages"] = False
    return fixed


class TrifectaGuard:
    """Tracks the legs present in one session and denies the call that would complete the trifecta."""

    def __init__(self, tools, initial_legs):
        self.tools = tools
        self.present = [leg for leg in LEGS if leg in initial_legs]

    def authorize(self, tool_name):
        tool_legs = capabilities_of(tool_name, self.tools)
        combined = [leg for leg in LEGS if leg in self.present or leg in tool_legs]
        if len(combined) == len(LEGS):
            return {"allowed": False, "reason": "lethal_trifecta", "legs": list(self.present)}
        self.present = combined
        return {"allowed": True, "legs": list(self.present)}

    def legs(self):
        return list(self.present)


def create_trifecta_guard(tools, *, initial_legs=()):
    return TrifectaGuard(tools, initial_legs)
