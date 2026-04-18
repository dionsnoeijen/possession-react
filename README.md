# possession-react

AI takes control of your UI. React bindings for possession.

Drop this into your existing React app. Wrap your forms, define some zones, render a chat panel. Your agent (powered by the [`possession`](https://github.com/polysynergy/possession) backend) can now navigate your views, fill your forms, and render custom components anywhere you want.

## See it in action

https://github.com/polysynergy/possession-react/raw/main/docs/demo-1.mp4

https://github.com/polysynergy/possession-react/raw/main/docs/demo-2.mp4

> If the videos do not play inline, download them from [`docs/demo-1.mp4`](docs/demo-1.mp4) and [`docs/demo-2.mp4`](docs/demo-2.mp4).

## What it does

- `useWebSocket`: connects to your possession backend, handles the full message protocol, reconnects automatically, supports JWT auth
- `Possession`: wraps any existing form and lets the agent fill its fields with a typewriter animation, without modifying the form itself
- `useFormFill`: processes the form fill queue, exposes animation state, triggers page switches via a callback
- `PossessionZone`: named drop zones where the agent can render components
- `Chat`: a chat panel with markdown, tool call badges, and streaming
- `UIRenderer`: renders built-in types (table, card, metric, list, chart, notifications) or your own custom components

Your app stays exactly as it is. `possession-react` adds a layer on top.

## Install

Not yet on npm. Three options:

**From a local path** (for development):
```bash
npm install /path/to/possession-react
```

**From GitHub**:
```bash
npm install github:polysynergy/possession-react
```

**Once published**:
```bash
npm install possession-react
```

Peer dependencies you also need:
```bash
npm install react react-dom react-markdown remark-gfm
```

## Quick start

```tsx
"use client";

import {
  useWebSocket,
  useFormFill,
  Possession,
  PossessionZone,
  Chat,
} from "possession-react";
import "possession-react/styles";

const FIELD_PAGES: Record<string, number> = {
  company_name: 0, kvk_number: 0,
  contact_name: 1, contact_email: 1,
};

export default function App() {
  const { jwt } = useAuth(); // from your auth system (NextAuth, Clerk, custom)

  const ws = useWebSocket("wss://api.example.com/ws/chat", {
    token: jwt,
    onUnauthorized: () => router.push("/login"),
  });

  const [page, setPage] = useState(0);
  const fill = useFormFill({
    formFillQueue: ws.formFillQueue,
    shiftFormFill: ws.shiftFormFill,
    instantFields: new Set(["industry"]),
    onBeforeFill: (field) => setPage(FIELD_PAGES[field] ?? 0),
  });

  return (
    <div className="flex h-screen">
      <main className="flex-1">
        {/* Your existing form, unmodified */}
        <Possession
          animatingField={fill.animatingField}
          animatingValue={fill.animatingValue}
          aiFilledFields={fill.aiFilledFields}
          onFieldChange={fill.setField}
        >
          {page === 0 && (
            <>
              <input name="company_name" />
              <input name="kvk_number" />
            </>
          )}
          {page === 1 && (
            <>
              <input name="contact_name" />
              <input name="contact_email" type="email" />
            </>
          )}
        </Possession>

        {/* Agent can render here */}
        <PossessionZone
          name="notifications"
          components={ws.components}
          className="fixed top-4 right-4 w-96 space-y-2"
        />
      </main>

      <aside className="w-96 border-l">
        <Chat
          messages={ws.chat}
          streaming={ws.streaming}
          connected={ws.connected}
          onSend={ws.sendMessage}
          onReconnect={ws.reconnect}
        />
      </aside>
    </div>
  );
}
```

## Auth

The backend verifies your JWT. The frontend just passes the token along.

```tsx
const ws = useWebSocket("wss://api.example.com/ws/chat", {
  token: session.jwt,
  onUnauthorized: () => {
    // Backend rejected the token (close code 4401).
    // Redirect to login, refresh the token, whatever your app needs.
    router.push("/login");
  },
});
```

The token is appended to the URL as `?token=...`. WebSocket clients in browsers cannot set custom headers, so the query-param approach is standard.

If no `token` is passed, the URL is used as-is. If your backend does not use auth, just leave it out.

## Concepts

There are two things the agent can do with your UI:

### 1. Navigation

The agent drives your existing app. It opens views, filters tables, fills forms. You use `useWebSocket` to receive navigation events and wire them into your own router and context:

```tsx
useEffect(() => {
  if (ws.pendingNavigate) {
    router.push(ws.pendingNavigate.view);
    ws.clearPendingNavigate();
  }
}, [ws.pendingNavigate]);
```

### 2. Generation

The agent renders ad-hoc content in named zones. You define zones wherever you want, the agent targets them by name:

```tsx
<PossessionZone
  name="notifications"
  components={ws.components}
  customRenderers={{
    reminder_card: MyReminderCard,
    confirmation: MyConfirmation,
  }}
  className="fixed top-4 right-4 w-96"
/>
```

## Possession (the component)

`Possession` wraps any form and possesses its fields. It finds elements by their `name` attribute, applies a typewriter overlay when the agent is filling, flashes green when done, and dispatches native `input` and `change` events so React stays in sync.

Your form does not need to know. Any existing form works:

```tsx
<Possession
  animatingField={fill.animatingField}
  animatingValue={fill.animatingValue}
  aiFilledFields={fill.aiFilledFields}
  onFieldChange={fill.setField}
>
  <form>
    <input name="email" value={values.email} onChange={...} />
    <select name="country">
      <option>NL</option>
      <option>BE</option>
    </select>
    <textarea name="notes" />
  </form>
</Possession>
```

## Form fill with multi-page support

Possession does not know what a page is. You do. Map field names to pages in your app, and switch pages in `onBeforeFill`:

```tsx
const FIELD_PAGES = { company_name: 0, contact_email: 1, package: 2 };

const fill = useFormFill({
  formFillQueue: ws.formFillQueue,
  shiftFormFill: ws.shiftFormFill,
  onBeforeFill: (field) => setPage(FIELD_PAGES[field]),
  instantFields: new Set(["industry", "package"]),
});
```

`instantFields` are fields that should be set immediately (typically selects). Other fields get the typewriter animation.

## Custom components

Register your own renderers. The agent refers to them by type name:

```tsx
function KanbanBoard({ props }) {
  return <div>{/* your kanban */}</div>;
}

<PossessionZone
  name="main"
  components={ws.components}
  customRenderers={{
    kanban: KanbanBoard,
    timeline: TimelineView,
  }}
/>
```

On the backend:

```python
self.ui.render_in_zone(
    zone="main",
    component_type="kanban",
    props={"columns": [...], "cards": [...]},
)
```

## Chat component

The `Chat` component renders assistant messages as markdown (with GFM for tables), user messages as plain blocks, and tool calls as compact badges. Customize the badge labels:

```tsx
<Chat
  messages={ws.chat}
  streaming={ws.streaming}
  waiting={ws.waiting}
  activeTools={ws.activeTools}
  connected={ws.connected}
  onSend={ws.sendMessage}
  onReconnect={ws.reconnect}
  toolLabels={{
    search_contacts: "Contacts searched",
    create_reminder: "Reminder drafted",
  }}
  placeholder="Type a message..."
  emptyMessage="Start a conversation..."
  sendLabel="Send"
/>
```

Extra props for richer feedback:

- `waiting` — user sent a message but nothing has come back yet. Shows bouncing dots immediately instead of leaving the chat silent.
- `activeTools` — tools that have started but not yet completed. Rendered as pending badges with spinners; disappear when the tool completes and the normal completed badge takes over.
- `hideToolBadges` — suppress both completed and pending tool badges in the chat. Useful when you render tool activity elsewhere (e.g. a dedicated activity stream in the main view) and want the chat to show only messages.

## Hooks

| Hook | Purpose |
|------|---------|
| `useWebSocket(url, options?)` | Connect to the possession backend. Options: `token`, `onUnauthorized`, `onCustomMessage`. Returns `connected`, `chat`, `streaming`, `waiting`, `activeTools`, `reasoning`, `components`, `pendingNavigate`, `viewData`, `formFillQueue`, `highlightItemId`, plus senders (`sendMessage`, `sendNavigation`, `sendTypedMessage`) and reconnect. |
| `useFormFill(options)` | Process the form fill queue |
| `usePossession(duration)` | Track highlight states for navigation and actions |

## Components

| Component | Purpose |
|-----------|---------|
| `Possession` | Wraps a form, possesses its fields |
| `PossessionZone` | A named drop zone for agent-rendered components |
| `Chat` | Chat panel with markdown and tool badges |
| `UIRenderer` | Renders a single component (used internally by PossessionZone) |
| `TypewriterValue` | The typewriter animation as a reusable primitive |
| `PossessionProvider` | Context provider (optional, for possession effects) |

## License

MIT
