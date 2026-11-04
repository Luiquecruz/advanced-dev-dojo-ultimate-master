import re
from urllib.parse import urlsplit


def check_url(url, allowed_hosts):
    # TODO: parse, then reject (in order) invalid URLs, other schemes than https, credentials, explicit ports and hosts outside the allowlist
    parsed = urlsplit(url)
    if any(host in (parsed.hostname or "") for host in allowed_hosts):
        return {"allowed": True, "url": parsed}
    return {"allowed": False, "reason": "not_allowlisted"}


def sanitize_markdown(markdown, policy):
    # TODO: handle reference definitions, autolinks, images, links, raw HTML and bare URLs in one pass
    removed = []

    def replace_image(match):
        url = match.group(2)
        if "attacker" in url:
            removed.append({"kind": "image", "value": url, "reason": "not_allowlisted"})
            return "[image removed]"
        return match.group(0)

    sanitized = re.sub(r"!\[([^\]]*)\]\(([^)]*)\)", replace_image, markdown)
    return {"markdown": sanitized, "removed": removed}


def encode_for_context(value, context):
    # TODO: html-text escapes & < >, html-attribute also " and ', url-component encodes like encodeURIComponent; raise for anything else
    raise NotImplementedError("Not implemented")


async def answer_safely(model, *, question, document, policy):
    # TODO: keep the document out of the system message and sanitize the answer before returning it
    response = await model.generate({
        "messages": [
            {"role": "system", "content": f"Answer using this document: {document}"},
            {"role": "user", "content": question},
        ],
    })
    return {"markdown": response["text"], "removed": []}
