<!--
SNAPSHOT  DOCS/sdk/network-information/mdn-networkinformation-effectivetype.md
source:   https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/networkinformation/effectivetype/index.md
fetched:  2026-11-06 (curl, verbatim)
version:  MDN content main branch on 2026-11-06
license:  CC-BY-SA 2.5 (MDN prose), CC0 (code samples)
-->

---
title: "NetworkInformation: effectiveType property"
short-title: effectiveType
slug: Web/API/NetworkInformation/effectiveType
page-type: web-api-instance-property
browser-compat: api.NetworkInformation.effectiveType
---

{{APIRef("Network Information API")}} {{AvailableInWorkers}}

The **`effectiveType`** read-only property of the
{{domxref("NetworkInformation")}} interface returns the effective type of the connection
meaning one of `slow-2g`, `2g`, `3g`, or `4g`. This value is determined using a
combination of recently observed, round-trip time and downlink values.

## Value

A string that is either `slow-2g`, `2g`, `3g`, or `4g`.

## Specifications

{{Specifications}}

## Browser compatibility

{{Compat}}

## See also

- [Effective Connection Type](/en-US/docs/Glossary/Effective_connection_type)
- {{HTTPHeader("ECT")}}
