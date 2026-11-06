# Verification

## Local

- Eight simulation tests pass, including solo target completion with two circulating builds; unique stamps; human takeover; departure; eight seats; traffic adjustment; pause/finish/rematch; input validation; incomplete deployment rejection.
- Real WebSocket test passes: solo ships two builds, observes two circulating builds, grows to eight humans, ninth spectates, a departed seat is claimed, and the same round returns to solo with its target preserved.
- Production TypeScript and Vite build pass.
- Browser rendered the Babylon.js scene and showed approvals / helper returns. Desktop view and 390px phone layout inspected; phone document width equals viewport width (390px), with no horizontal overflow. No browser warning/error logs in inspected session.

## Render

Deployment and remote evidence will be recorded after the live release is verified.
