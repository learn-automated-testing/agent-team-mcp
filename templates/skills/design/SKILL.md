---
name: design
description: Creates UI components, screens, and design system elements that are consistent, accessible, and production-ready. Use when the user says "design", "build a UI", "create a component", "make it look good", or needs a new screen or feature frontend.
---

# Skill: design

## Purpose
Create UI components, screens, and design system elements that are consistent, accessible, and production-ready.

## When to trigger this skill
- User says "design", "build a UI", "create a component", "make it look good"
- A new screen or feature needs a frontend implementation
- Existing UI needs a redesign or polish pass
- A design system token or component needs to be added

## Prerequisites
- Know the tech stack: React, Vue, plain HTML, etc.
- Know the styling approach: Tailwind, CSS modules, styled-components, etc.
- Have access to any existing design system or component library in use
- If a Figma link or screenshot is provided, read it before writing code

## Steps

1. **Understand the intent**
   - What is this screen/component for?
   - Who is the user? What are they trying to do?
   - Is there an existing design to follow, or is this greenfield?

2. **Check for existing components first**
   - Look in `components/`, `ui/`, or `src/components/`
   - Reuse before creating. Extend before duplicating.

3. **Plan the component structure**
   - Break the UI into the smallest reusable pieces
   - Identify: layout wrapper → sections → individual components
   - Name components clearly: `UserCard`, `InvoiceTable`, `NavBar`

4. **Build mobile-first**
   - Start with the smallest viewport
   - Add responsive breakpoints after the base design works

5. **Apply design principles**
   - Consistent spacing: use the spacing scale (4px base unit)
   - Typography hierarchy: one heading size per level, clear body/caption distinction
   - Color: limit to the defined palette — do not introduce new hex values
   - Interactive states: every clickable element needs hover, focus, active states
   - Loading states: every async action needs a skeleton or spinner

6. **Accessibility (non-negotiable)**
   - Semantic HTML: use `<button>` not `<div onClick>`
   - All images have `alt` text
   - Form inputs have associated `<label>` elements
   - Focus is visible and logical
   - Colour contrast meets WCAG AA (4.5:1 for text)

7. **Deliver the component**
   - Working code with no placeholder text (use realistic dummy data)
   - Props documented with types
   - One example usage in a comment at the bottom

## Rules and constraints
- Never use inline styles for design decisions — use classes or tokens
- Never hardcode colours — use CSS variables or Tailwind config values
- Never ship a component with console errors or warnings
- Never leave TODO comments in delivered code
- Dark mode: if the app supports it, the component must too

## Output format
Deliver the component file with:
1. The component code
2. A short usage example
3. A list of any props the component accepts
