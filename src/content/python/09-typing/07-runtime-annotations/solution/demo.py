import dataclasses
import json
import typing

from main import Coupon, Order, annotation_text, build_schema

print("field.type:", dataclasses.fields(Order)[1].type)
print("get_type_hints:", typing.get_type_hints(Order)["customer"])
print("source text:", annotation_text(Order))

schema = build_schema(Order)
print("required:", schema["required"])
for name, fragment in schema["properties"].items():
    print(f"  {name}: {json.dumps(fragment)}")
print("Coupon:", json.dumps(build_schema(Coupon)["properties"]))
