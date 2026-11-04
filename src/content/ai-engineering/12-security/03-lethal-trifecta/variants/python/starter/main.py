LEGS = ["privateData", "untrustedContent", "externalCommunication"]


def analyze_session(session, tools):
    # TODO: unlabeled or unknown tools count as every leg; add untrusted inputs ("input:<label>") and remote images ("remote-images")
    legs = {leg: [] for leg in LEGS}
    for tool_name in session["tools"]:
        profile = next((tool for tool in tools if tool["name"] == tool_name), None)
        for leg in (profile or {}).get("capabilities", []):
            legs[leg].append(tool_name)
    return {"sessionId": session["id"], "legs": legs, "lethal": all(legs[leg] for leg in LEGS)}


def analyze_agent(config):
    # TODO: analyze every session and list the ids of the lethal ones
    raise NotImplementedError("Not implemented")


def suggest_removal(report):
    # TODO: None when safe; otherwise the leg with the fewest sources (ties: externalCommunication, untrustedContent, privateData)
    raise NotImplementedError("Not implemented")


def remove_leg(config, session_id, leg):
    # TODO: return a new config whose session drops every tool, input or rendering that provides the leg; raise for an unknown session
    raise NotImplementedError("Not implemented")


class TrifectaGuard:
    """Tracks the legs present in one session and denies the call that would complete the trifecta."""

    def __init__(self, tools, initial_legs):
        self.tools = tools
        self.present = list(initial_legs)

    def authorize(self, tool_name):
        # TODO: deny (without recording) the call that would bring all three legs into the session
        return {"allowed": True, "legs": list(self.present)}

    def legs(self):
        return list(self.present)


def create_trifecta_guard(tools, *, initial_legs=()):
    return TrifectaGuard(tools, initial_legs)
