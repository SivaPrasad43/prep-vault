/**
 * Built-in, read-only guide shown to every user at /notes/guide.
 * Shipped with the app (not stored in Supabase): edit this file and deploy to update it.
 * Written in the same markdown the note editor uses, so it renders exactly like a note.
 */
export const GUIDE_TITLE = 'How to use PrepDay';

export const GUIDE_MARKDOWN = `Welcome to **PrepDay**, your desk for interview prep notes. This guide is built in and read-only. It's always here if you need a refresher.

## Create a note

1. Click the round **+** button (or **New note**).
2. Type a title, press **Enter**, and start writing.
3. That's it. There's no Save button to remember.

> **Tip:** A brand-new note is only created once you type something, so empty notes never clutter your list.

## Writing

Type **/** on an empty line to open the block menu: headings, bulleted, numbered and to-do lists, quotes, code blocks and dividers.

Markdown shortcuts work as you type:

- \`#\`, \`##\`, \`###\` + space for headings
- \`-\` + space for a bulleted list, \`1.\` + space for a numbered list
- \`[]\` + space for a to-do item
- \`>\` + space for a quote
- three backticks (\`\`\`) for a code block

Select any text to get the formatting toolbar: **bold**, *italic*, \`inline code\`, links and highlights.

- [x] Read the guide
- [ ] Write your first note
- [ ] Mark a topic as revised

## Navigate long notes

- **Contents:** click the list icon in a note's top bar to open an outline of your headings. Expand or collapse sections with the arrows, and click a heading to jump to it. On a phone it slides up from the bottom.
- **Find in note:** press **Ctrl/Cmd + F** (or click the 🔍 icon) to search only this note's text, code blocks included. Every match is highlighted. Press **Enter** / **Shift + Enter** to move between them and **Esc** to close.

## Code blocks

Pick the language from the menu in the block's top-left corner to get syntax highlighting, and use **Copy** in the top-right corner to copy the code.

\`\`\`go
// Reverse a string safely, rune by rune
func reverse(s string) string {
	r := []rune(s)
	for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
		r[i], r[j] = r[j], r[i]
	}
	return string(r)
}
\`\`\`

## Neon highlights

Select text, then click the highlighter in the toolbar. The small arrow next to it opens six neon colours: <mark data-color="lime">lime</mark>, <mark data-color="cyan">cyan</mark>, <mark data-color="pink">pink</mark>, <mark data-color="yellow">yellow</mark>, <mark data-color="orange">orange</mark> and <mark data-color="violet">violet</mark>.

In light mode they look like a highlighter pen. In dark mode they glow. Press **Ctrl/Cmd + Shift + H** to toggle a quick highlight.

## Saving

- Everything **saves automatically** a moment after you stop typing. The top bar shows when the note was last edited and whether it's saved.
- Press **Ctrl/Cmd + S** to save immediately.
- If you're offline, PrepDay keeps retrying until the save goes through.
- Cleared a note completely (no title, no text)? It's deleted automatically when you leave it, so empty "Untitled" notes never pile up.

## Organise and revise

- **Category:** pick one from the menu under the title. Use the category filter above your notes to narrow the list.
- **Confidence:** <mark data-color="pink">Need practice</mark> → <mark data-color="yellow">Getting there</mark> → <mark data-color="lime">Confident</mark>. Set it from the menu under the title. Click a coloured dot above your notes to show only that level, and click it again to show everything.
- **Bookmark** a note with the bookmark icon in its top-right corner to find it under **Saved**.
- **Mark revised** each time you review a topic. It counts your revisions and keeps your day streak going.

## Track your progress

Open **Progress** from the side menu to see:

- **Review next:** the notes that most need a revision. Weak and long-untouched notes come first.
- Your **day streak**. A day counts when you write a note or mark one revised.
- An **activity** calendar, and your **confidence by category** so weak areas stand out. Click any bar to open those notes.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Save now | Ctrl/Cmd + S |
| Find in note | Ctrl/Cmd + F |
| Next / previous match | Enter / Shift + Enter |
| Close find or contents | Esc |
| Block menu | / |
| Bold / Italic | Ctrl/Cmd + B / I |
| Inline code | Ctrl/Cmd + E |
| Highlight | Ctrl/Cmd + Shift + H |
| Jump from title to body | Enter |

Happy prepping, and good luck with your interviews!
`;
