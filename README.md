# rdbl

**Reactive DOM Binding Library** — pronounced *"riddle"*

Signals-based reactivity wired directly to plain HTML attributes. No build step. No virtual DOM. No template expressions. Just readable markup and a single file.

```html
<div text="user.name"></div>
<input model="query">
<ul each="results" key="id">
  <template><li text="title"></li></template>
</ul>
```

```js
import { bind, signal, computed } from 'rdbl'

const state = {
  user: { name: signal('Joey') },
  query: signal(''),
  results: signal([])
}

bind(document.querySelector('#app'), state)
```

That's it.

---

## Why rdbl?

Most reactive libraries ask you to learn a new template language or move your logic into your markup. rdbl goes the other way: your HTML stays plain and readable, your JS stays in JS.

- **No `{{}}` expressions** — bindings are attribute paths, not code
- **No `x-` prefixes** — plain attributes: `text`, `show`, `model`, `each`
- **No build step** — single ES module, import and go
- **No virtual DOM** — direct DOM updates, batched via microtask
- **Signals all the way down** — `signal`, `computed`, `effect` are the entire reactive model

---

## Install

```bash
bun add rdbl
```

Or copy the single file directly — rdbl has no dependencies.

```js
import { bind, signal, computed, effect, batch, Context, getItemContext, createScope } from 'rdbl'
```

---

## Core Concepts

### Signals

A signal holds a value. Read it by calling it. Write it with `.set()`.

```js
const count = signal(0)

count()         // 0  — read
count.set(5)    // write
count.peek()    // 5  — read without tracking dependencies
```

### Computed

Derived state. Lazy-evaluated and cached until dependencies change.

```js
const double = computed(() => count() * 2)
double()  // 10
```

### Effect

Runs immediately and re-runs whenever its dependencies change.

```js
effect(() => {
  console.log('count is', count())
  return () => console.log('cleanup')  // optional
})
```

### Batch

Defer effect execution until all mutations are complete.

```js
batch(() => {
  a.set(1)
  b.set(2)
  // effects fire once, after batch
})
```

---

## HTML Directives

Directives are plain HTML attributes. No special syntax — just a dot-separated path into your scope.

### `text="path"`

Sets `textContent`. If the element already has text content when `bind()` is called, rdbl preserves it on the first render — no attribute required. Once the signal changes, the DOM updates normally.

```html
<!-- Server-rendered: "Dev Hub" is preserved on bind, then updates reactively -->
<span text="name">Dev Hub</span>

<!-- Client-only: starts empty, signal sets the value immediately -->
<span text="user.name"></span>
```

### `html="path"`

Sets `innerHTML`. Same auto-preservation behavior as `text` — existing content is kept on first bind.

```html
<div html="article.body"></div>
```

### `show="path"`

Toggles visibility via the `hidden` attribute. Works with `<dialog>` — calls `showModal()` / `close()` automatically.

```html
<div show="isVisible"></div>
<dialog show="modalOpen">...</dialog>
```

### `cls="path"`

Sets classes. Accepts a string (replaces `className`) or an object (toggles individual classes).

```html
<div cls="statusClass"></div>
```

```js
// string form
statusClass: computed(() => isActive() ? 'active' : 'inactive')

// object form
statusClass: computed(() => ({ active: isActive(), disabled: isDisabled() }))
```

### `attr="name:path; name2:path2"`

Sets arbitrary attributes. Removes the attribute when value is `false` or `null`.

```html
<button attr="aria-label:label; data-id:item.id"></button>
```

### `model="path"`

Two-way binding for form elements. Path must resolve to a signal.

```html
<input model="query">
<input type="checkbox" model="isChecked">
<select model="selectedTab"></select>
<textarea model="notes"></textarea>
```

### `each="path" key="idPath"`

Keyed list rendering. Requires a `<template>` child for new items. Efficiently diffs and reorders DOM nodes.

```html
<ul each="todos" key="id">
  <template>
    <li>
      <input type="checkbox" model="done">
      <span text="text"></span>
      <button onclick="removeTodo">x</button>
    </li>
  </template>
</ul>
```

Inside list items, the scope includes all item properties directly, plus `$item` and `$index`.

**SSR-rendered lists:** Add `data-key` on each server-rendered row matching the item's key value. rdbl adopts the existing DOM nodes into the live map — no replacement on first bind. The `<template>` is used only when new items are added.

```html
<ul each="items" key="id">
  <li data-key="1" text="name">Alpha</li>
  <li data-key="2" text="name">Beta</li>
  <template><li text="name"></li></template>
</ul>
```

```js
// Initialize scope with the same data the server used
const scope = { items: signal([{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }]) }
bind(document.querySelector('ul'), scope)
```

### `on<event>="path"`

Event binding. Path resolves to a function in your scope.

```html
<button onclick="handleClick">Submit</button>
<input oninput="handleInput">
```

The handler receives `(event, element, context)`. Return `false` to call both `preventDefault()` and `stopPropagation()`.

```js
const state = {
  handleClick(event, el, ctx) {
    // do something
  }
}
```

---

## List Items and `getItemContext`

Inside an `each` list, use `getItemContext(element)` in your event handlers to access the item data for the row that was interacted with.

```js
import { getItemContext } from 'rdbl'

const state = {
  todos: signal([{ id: 1, text: 'write docs', done: false }]),

  toggleTodo(event, el) {
    const { item } = getItemContext(el)
    state.todos.set(
      state.todos().map(t => t.id === item.id ? { ...t, done: !t.done } : t)
    )
  }
}
```

---

## Context

DOM-scoped context, looked up by walking the element tree. Avoids prop drilling for shared services like routers or loggers.

```js
import { Context } from 'rdbl'

Context.provide(document.querySelector('#app'), {
  router: { go: path => history.pushState({}, '', path) },
  log: console.log
})
```

Context is available as the third argument in event handlers:

```js
function handleNav(event, el, ctx) {
  ctx.router.go('/dashboard')
}
```

Read context directly anywhere you have an element:

```js
const ctx = Context.read(someElement)
```

---

## bind()

```js
const app = bind(rootElement, scope, options)
```

### Options

| Option | Default | Description |
|---|---|---|
| `dev` | `true` | Log warnings for missing paths, bad values, missing keys |
| `autoBind` | `false` | Use `MutationObserver` to auto-bind dynamically added DOM |
| `ignoreSelector` | `[data-no-bind]` | CSS selector to opt subtrees out of binding |

### `app.bindSubtree(element, scope)`

Bind a sub-element with its own scope. The sub-scope falls back to the parent scope for unresolved paths.

```js
const app = bind(root, parentScope)
app.bindSubtree(cardElement, cardScope)
```

### `app.dispose()`

Tear down all effects and event listeners created by this binding.

```js
app.dispose()
```

---

## createScope()

Create a child scope that falls back to a parent for unresolved properties.

```js
import { createScope } from 'rdbl'

const child = createScope(parentScope, {
  title: signal('Local Title')
})
```

---

## Full Example

```html
<div id="app">
  <h1 text="title"></h1>
  <input model="newTodo" placeholder="Add a task...">
  <button onclick="addTodo">Add</button>

  <ul each="todos" key="id">
    <template>
      <li>
        <input type="checkbox" model="done">
        <span text="text" cls="itemClass"></span>
        <button onclick="remove">Delete</button>
      </li>
    </template>
  </ul>

  <p text="summary"></p>
</div>
```

```js
import { bind, signal, computed, getItemContext } from 'rdbl'

const todos = signal([
  { id: 1, text: 'Read the docs', done: false },
  { id: 2, text: 'Build something', done: false }
])

const newTodo = signal('')

const state = {
  title: 'My Todos',
  todos,
  newTodo,
  summary: computed(() => {
    const all = todos()
    const done = all.filter(t => t.done).length
    return `${done} of ${all.length} done`
  }),

  addTodo() {
    const text = newTodo().trim()
    if (!text) return
    todos.set([...todos(), { id: Date.now(), text, done: false }])
    newTodo.set('')
  },

  remove(event, el) {
    const { item } = getItemContext(el)
    todos.set(todos().filter(t => t.id !== item.id))
  }
}

bind(document.querySelector('#app'), state, { dev: true })
```

---

## Islands

Islands are independently bound components. Each element with an `[island]` attribute is its own binding root — rdbl stops traversal at nested island boundaries, so parent and child islands never interfere.

The `island` attribute value is a module path. Each island module exports a default factory function that receives the root element and `window`, reads shared state from `Context`, and returns its scope.

### Island module

```js
// /components/SyncStatus.js
import { computed, Context } from 'rdbl'

export default function syncStatus(root, window) {
  const { pageState } = Context.read(document.body)

  const statusText = computed(() =>
    pageState.connected() ? 'Synced' : 'Connecting...'
  )

  const indicatorCls = computed(() =>
    pageState.connected() ? 'dot synced' : 'dot pending'
  )

  return { statusText, indicatorCls }
}
```

### Island HTML

```html
<section island="/components/SyncStatus.js">
  <span cls="indicatorCls"></span>
  <span text="statusText"></span>
</section>
```

### init() — binding all islands at startup

This pattern auto-discovers every `[island]` element, dynamically imports its module, and calls `bind()` with the returned scope.

```js
import { bind, Context } from 'rdbl'

async function init(window) {
  const roots = [...document.querySelectorAll('[island]')]
  const instances = {}
  let i = 0

  for await (const root of roots) {
    const key = root.getAttribute('island')
    try {
      const scopeFactory = (await import(key)).default
      const scope = scopeFactory(root, window)
      instances[`${key}:${i++}`] = bind(root, scope, { dev: true })
    } catch (err) {
      console.error(`Failed to load island "${key}":`, err)
    }
  }

  return instances
}

// Provide shared state on the body so any island can read it
Context.provide(document.body, { pageState })

const app = await init(window)
```

Each island gets its own binding instance and can be disposed independently. Shared state lives in `Context` — islands read it without being passed props.

---

## Server-Side Rendering

rdbl is designed to work with server-rendered HTML without flicker or replacement.

### Text and HTML — auto-preserved

If a `text` or `html` element already has content when `bind()` is called, rdbl skips the first render and leaves the server-rendered content in place. Once the signal changes, normal reactive updates apply.

```html
<!-- No special attributes needed — content is auto-preserved on bind -->
<h1 text="greeting">Hello, Joey</h1>
<p text="summary">3 of 10 tasks complete</p>
```

```js
// Initialize signals to match what the server rendered
const scope = {
  greeting: signal('Hello, Joey'),
  summary: signal('3 of 10 tasks complete')
}
bind(document.querySelector('#app'), scope)
```

### Lists — `data-key`

For server-rendered lists, add `data-key` on each row with its item key value. rdbl adopts those DOM nodes into the live map on bind — existing nodes stay in place and become reactive. The `<template>` is used only for items added after bind.

```html
<ul each="products" key="id">
  <li data-key="1" text="name">Widget A</li>
  <li data-key="2" text="name">Widget B</li>
  <template><li text="name"></li></template>
</ul>
```

```js
const scope = {
  products: signal([
    { id: 1, name: 'Widget A' },
    { id: 2, name: 'Widget B' }
  ])
}
bind(document.querySelector('ul'), scope)
```

### Passing data from server to client

**Embedded JSON** — embed state as JSON, read it before binding:

```html
<script type="application/json" id="page-data">
  { "user": { "name": "Joey", "plan": "pro" } }
</script>

<div id="app" island="/components/Dashboard.js">
  <h1 text="greeting">Hello, Joey</h1>
</div>
```

```js
// /components/Dashboard.js
import { signal, computed } from 'rdbl'

export default function dashboard(root, window) {
  const raw = JSON.parse(document.getElementById('page-data').textContent)
  const user = signal(raw.user)
  const greeting = computed(() => `Hello, ${user().name}`)
  return { user, greeting }
}
```

**Data attributes** — for smaller per-component values:

```html
<section island="/components/UserBadge.js"
         data-name="Joey"
         data-plan="pro">
  <span text="name">Joey</span>
  <span cls="badgeCls" text="plan">pro</span>
</section>
```

```js
// /components/UserBadge.js
import { signal, computed } from 'rdbl'

export default function userBadge(root, window) {
  const name = signal(root.dataset.name)
  const plan = signal(root.dataset.plan)
  const badgeCls = computed(() => `badge badge-${plan()}`)
  return { name, plan, badgeCls }
}
```

### `data-ssr`

For `show`, `attr`, `cls`, and `model` directives there is no content to inspect, so auto-detection doesn't apply. Use `data-ssr` on those elements to skip the first render when you can't initialize the signal to match the server-rendered state.

```html
<div show="panelOpen" data-ssr>...</div>
<a attr="href:url" data-ssr>Read more</a>
```

### Hydrating from storage

```js
import { bind, signal, effect } from 'rdbl'

const theme = signal('light')
const tasks = signal([])

const stored = localStorage.getItem('app-state')
if (stored) {
  const snap = JSON.parse(stored)
  theme.set(snap.theme ?? 'light')
  tasks.set(snap.tasks ?? [])
}

effect(() => {
  localStorage.setItem('app-state', JSON.stringify({ theme: theme(), tasks: tasks() }))
})

bind(document.querySelector('#app'), { theme, tasks })
```

---

## Design Principles

1. **HTML is structure.** Directives describe *what* to bind, not *how*.
2. **No expressions in markup.** Paths only — logic lives in JS.
3. **Signals are the model.** One reactive primitive, no magic objects.
4. **DOM-first.** No virtual DOM, no diffing overhead beyond list keys.
5. **Single file.** Copy it, own it. No build pipeline required.

---

## Size

~4KB gzipped. Zero dependencies.

---

## License

MIT
