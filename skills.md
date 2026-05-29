# SKILLS.md

## Project Name

Radius Slack Display

## Project Goal

Build a small read-only web app that displays recent messages from the Radius Cowork Slack `#general` channel on a TV in a common area.

The app should run as a web page hosted on Vercel. A TV with a built-in browser should be able to open the page, enter full-screen mode, and show recent Slack messages that refresh automatically.

## Core Use Case

People in the coworking space may not always have Slack open. This display lets people walking through the common area see recent community updates from Slack `#general`, such as lunch plans, events, reminders, member questions, or general announcements.

## Stack

Use:

* Next.js
* TypeScript
* Vercel
* Slack Web API
* Plain CSS or CSS Modules

Do not add a database for version 1.

Do not add authentication beyond a simple display key for version 1.

## Architecture

Use a server-side API route to call Slack.

The browser must never receive the Slack bot token.

Flow:

1. TV browser loads `/display?key=DISPLAY_KEY`
2. Display page calls `/api/messages?key=DISPLAY_KEY`
3. API route validates the key
4. API route calls Slack `conversations.history`
5. API route cleans the response
6. API route returns simple JSON to the display page
7. Display page refreshes every 30 seconds

## Slack Workspace

Workspace URL:

`https://radiuscowork.slack.com`

Target channel:

`#general`

The actual Slack channel ID must be stored in an environment variable. Do not hardcode the channel ID unless needed for a local throwaway test.

## Slack App Requirements

Create a Slack app named:

`Common Area Display`

The Slack app should be installed in the Radius Cowork Slack workspace.

The Slack app should have read-only access to the `#general` channel.

Required bot token scopes for public channel reading:

* `channels:read`
* `channels:history`

After install, the bot should be invited to `#general`.

Example Slack command inside `#general`:

`/invite @Common Area Display`

## Environment Variables

Create the following environment variables.

```env
SLACK_BOT_TOKEN=
SLACK_CHANNEL_ID=
DISPLAY_KEY=
```

Optional:

```env
SLACK_MESSAGE_LIMIT=15
SLACK_REFRESH_SECONDS=30
```

Rules:

* Never expose `SLACK_BOT_TOKEN` to the browser.
* Do not prefix private variables with `NEXT_PUBLIC_`.
* Only the server-side API route should read `SLACK_BOT_TOKEN`.
* `DISPLAY_KEY` should be a long random value.

## App Routes

Use the Next.js App Router.

Recommended structure:

```txt
app/
  display/
    page.tsx
  api/
    messages/
      route.ts
components/
  DisplayFeed.tsx
  FullScreenButton.tsx
lib/
  slack.ts
  formatSlackMessage.ts
styles/
  display.css
```

## Display Page

Route:

`/display`

Expected URL format:

`/display?key=DISPLAY_KEY`

The display page should:

* Fill the full browser viewport
* Show a full-screen button
* Show the latest Slack messages
* Refresh every 30 seconds
* Show the last updated time
* Show a friendly error if messages cannot load
* Keep the last successful messages on screen if a refresh fails
* Be readable from across a room
* Work on a TV browser as much as possible

Do not show:

* Message input
* Slack workspace controls
* DMs
* Private channels
* Admin links
* Raw JSON
* Slack token
* Internal errors

## Display Layout

Suggested screen layout:

Top:

* “Radius Cowork Updates”
* “Live from Slack #general”

Main area:

* Recent messages
* Sender name
* Message text
* Message time

Bottom:

* “Last updated 10:42 AM”
* “Visible in the common area”

## Message Order

Use oldest-to-newest order on screen.

Slack may return newest first. Reverse the final display array so the conversation reads naturally from top to bottom.

## Message Limit

Default to 15 messages.

Use Slack API limit:

`limit=15`

If an environment variable is used, keep the max reasonable. Do not request hundreds of messages.

## Refresh Behavior

Frontend:

* Refresh every 30 seconds
* Use `setInterval`
* Also fetch once on page load
* Keep last good result if a request fails

Backend:

* Add caching if practical
* Use a cache time of 30 to 60 seconds
* Avoid sending unnecessary repeated calls to Slack

## Full-Screen Behavior

The page should include a button:

“Enter Full Screen”

On click, call:

```ts
document.documentElement.requestFullscreen()
```

Do not try to force full screen on page load. Most browsers require a user action.

If full screen is unsupported, the app should still work.

## API Route

Route:

`/api/messages`

Required query parameter:

`key`

If the key is missing or invalid, return:

```json
{
  "ok": false,
  "error": "Unauthorized"
}
```

Use HTTP status:

`401`

If Slack fails, return:

```json
{
  "ok": false,
  "error": "Unable to load messages"
}
```

Do not return Slack’s raw error response to the browser unless it is safe.

Successful response shape:

```json
{
  "ok": true,
  "updatedAt": "2026-05-29T14:30:00.000Z",
  "messages": [
    {
      "id": "1717000000.000000",
      "userName": "Sean",
      "userImage": null,
      "text": "Anyone want to go to lunch?",
      "time": "11:42 AM",
      "timestamp": "1717000000.000000"
    }
  ]
}
```

## Slack API Call

Use Slack `conversations.history`.

Endpoint:

`https://slack.com/api/conversations.history`

Send token in the Authorization header:

```txt
Authorization: Bearer SLACK_BOT_TOKEN
```

Use query params:

```txt
channel=SLACK_CHANNEL_ID
limit=15
```

## Message Formatting

Create a formatter that converts Slack messages into display-safe messages.

Handle:

* Plain text
* Basic Slack user mentions like `<@U123>`
* Basic links like `<https://example.com|Example>`
* Basic links like `<https://example.com>`
* Newlines
* Emoji text can remain as-is for version 1

For version 1, it is acceptable to show unknown user mentions as “@member” or leave the raw mention if user lookup is not implemented.

Do not render untrusted HTML from Slack.

Escape message text by default.

## User Names

Version 1 acceptable approach:

* Show the Slack user ID if name lookup is not implemented
* Better: call Slack user lookup and cache user names

If implementing user lookup, use Slack `users.info` and add needed scope only if required.

Keep version 1 simple unless the app already has the right Slack permissions.

## Filtering Rules

For version 1, include normal user messages from `#general`.

Hide or skip:

* Deleted messages
* Bot/system messages, unless they are useful
* Messages without text
* Thread-only messages, unless they appear in channel history
* File previews, unless support is intentionally added

Do not show messages from private channels or DMs.

## Styling Requirements

Design for a TV in a common space.

Use:

* Large font sizes
* High contrast
* Simple layout
* Generous spacing
* Minimal animation
* No tiny text
* No complex interactions
* No horizontal scrolling

The design should fit both:

* 1920x1080
* 3840x2160

The display should remain usable if the TV browser shows a small browser bar.

## Error States

If the key is invalid:

* Show “Display access is not configured.”

If Slack cannot load:

* Show “Unable to load new messages.”
* Keep the last successful messages on screen if available.

If no messages are available:

* Show “No recent messages.”

If the app is missing environment variables:

* Server should return a safe error.
* Server logs should include the specific missing variable.
* Browser should not show secret values.

## Security Requirements

Must:

* Keep Slack token server-side
* Use environment variables
* Require a display key
* Prevent search indexing
* Avoid raw HTML rendering
* Avoid exposing detailed server errors
* Avoid exposing Slack token in logs
* Avoid exposing private workspace data

Add a `robots.txt` or metadata noindex rule.

Recommended metadata:

```ts
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
}
```

## Accessibility Requirements

The display is not primarily interactive, but it should still be readable and accessible.

Use:

* Semantic HTML where practical
* High contrast
* Readable type sizes
* Button text that clearly says what it does
* No flashing content
* No auto-scrolling that makes text hard to read

## Local Development

Create `.env.local`:

```env
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CHANNEL_ID=C123456789
DISPLAY_KEY=your-local-display-key
```

Run:

```bash
npm install
npm run dev
```

Test:

`http://localhost:3000/display?key=your-local-display-key`

## Deployment

Deploy to Vercel.

In Vercel project settings, add:

* `SLACK_BOT_TOKEN`
* `SLACK_CHANNEL_ID`
* `DISPLAY_KEY`

Test the deployed URL:

`https://your-project.vercel.app/display?key=DISPLAY_KEY`

## Acceptance Criteria

The app is done when:

* The display page loads on desktop
* The display page loads on the TV browser
* The display page shows recent messages from Slack `#general`
* The display refreshes every 30 seconds
* The display has a working full-screen button where supported
* The Slack token is never visible in browser code
* The API rejects requests with a missing or wrong key
* The app handles Slack errors without showing raw technical details
* The latest successful feed remains visible if a refresh fails
* The page is readable from several feet away
* The app is deployed on Vercel

## Version 1 Do Not Build

Do not build these in version 1:

* Posting messages from the TV
* Slack login
* Admin dashboard
* Database
* Multi-channel support
* File preview support
* Image moderation
* Message approval queue
* Complex user permissions
* Thread expansion
* Calendar integration
* Weather integration

## Possible Version 2 Features

Later improvements:

* Show emoji reactions
* Show profile photos
* Show only messages from the last 24 hours
* Add an announcement mode
* Add a “pinned message” area
* Add multi-channel support
* Add a settings page
* Add a custom theme
* Add a room schedule panel
* Add weather or date display
* Add moderation or approval controls

## Notes for Codex

Prioritize a simple working app over extra features.

Start with:

1. Next.js app structure
2. API route that validates `DISPLAY_KEY`
3. Slack API call
4. Message formatter
5. Display page
6. Refresh behavior
7. Full-screen button
8. Error states
9. Basic TV-friendly styling

Keep the implementation small, secure, and easy to maintain.
