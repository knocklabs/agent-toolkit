---
"@knocklabs/agent-toolkit": patch
---

Fix `get_user_preferences` and `set_user_preferences` calling the Knock SDK with its pre-1.x argument shape. The preference set id was passed inside an options object, which the current SDK stringifies into the request path as `[object Object]`; the write call also sent the preferences body in the id slot with no body at all. Both tools now pass the preference set id as the positional string argument.
