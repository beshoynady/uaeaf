# UAEAF Project — Claude Code Instructions

## Project Context

This is the UAE Athletics Federation (UAEAF) website.

The project follows the UAEAF Enterprise Design System Framework v1.0.0,
Brand Visual Language, UI/UX governance, accessibility requirements,
RTL requirements, and documented ADRs.

The Design System documentation is the source of truth.

---

## Core Rule

DO NOT make arbitrary visual or UX decisions.

Before changing any UI, inspect the existing Design System, tokens,
components, typography rules, spacing rules, layout rules, accessibility
rules, and relevant ADRs.

Prefer existing canonical tokens and components over creating new values.

Never normalize values merely because they "look close".

Every design correction must have an evidence-based reason.

---

# Skills

The following skills are available globally and should be used when relevant:

- figma
- find-skills
- frontend-design
- nextjs-seo
- ui-ux-pro-max
- wcag-audit-patterns
- web-design-guidelines

## Skill Usage

### Figma

Use the Figma skill when:
- inspecting Figma designs
- reading Figma structure
- checking component hierarchy
- checking spacing
- checking typography
- checking variables
- comparing design against implementation
- validating visual consistency

### UI/UX Pro Max

Use when evaluating:
- visual hierarchy
- spacing rhythm
- typography hierarchy
- component composition
- responsive behavior
- navigation
- CTA hierarchy
- information architecture
- usability

### Frontend Design

Use when implementing or correcting:
- page layout
- section composition
- responsive layouts
- component structure
- visual hierarchy
- frontend UI

### WCAG Audit Patterns

Use when checking:
- contrast
- typography size
- accessibility
- focus states
- keyboard accessibility
- touch targets
- semantic structure
- RTL accessibility

### Web Design Guidelines

Use when reviewing:
- web UI quality
- interaction patterns
- navigation
- responsive behavior
- forms
- buttons
- links
- accessibility
- usability

### Next.js SEO

Use when reviewing:
- metadata
- semantic HTML
- structured data
- SEO
- indexability
- OpenGraph
- canonical URLs
- page architecture

### Find Skills

Use when:
- an appropriate skill does not exist among the currently available skills
- another specialized skill may materially improve the task

Do not install or introduce new skills unnecessarily.

---

# Design System Rules

The UAEAF Design System is authoritative.

Never invent:
- colors
- font sizes
- spacing values
- radii
- shadows
- breakpoints
- component variants
- button styles
- badge styles

unless the Design System explicitly allows it or an ADR is created/approved.

Use canonical tokens whenever available.

---

# Typography

Typography must follow the canonical UAEAF type scale.

Do not fix typography by choosing the nearest numerical value.

Determine the semantic role first:

- Hero
- H1
- H2
- H3
- H4
- Subtitle
- Body
- Label
- Caption
- Overline
- Numeric/stat display

Then map the element to the correct canonical token.

Respect the documented minimum font-size rules.

---

# Layout

Use the governed container and breakpoint system.

The public desktop maximum container is:

1440px

Do not introduce alternative desktop container widths unless explicitly documented.

Do not solve a container problem by scaling individual children.

Prefer correcting:
1. root container
2. section wrapper
3. grid
4. component
5. instance
6. individual node

in that order.

---

# Spacing

Use the UAEAF spacing scale.

Do not introduce arbitrary fractional values such as:

15.9px
23.85px
27.83px
31.8px

unless explicitly required by the Design System.

Avoid fixing descendants individually when the parent/container is the root cause.

---

# Components

Prefer real reusable components.

Do not duplicate components unnecessarily.

When repeated UI patterns exist, determine whether they should be:
- shared components
- variants
- data-driven components
- tokens

before implementing duplicated markup.

---

# RTL

Arabic is a first-class language.

The application must support:

RTL Arabic
LTR English

Do not use hardcoded left/right positioning where logical properties are appropriate.

Prefer:

margin-inline
padding-inline
inset-inline
text-align: start/end

when applicable.

---

# Homepage Review Protocol

When asked to review or improve the UAEAF Homepage:

DO NOT immediately edit.

First inspect the relevant implementation and Design System.

Perform an audit covering:

1. Information Architecture
2. Section ordering
3. Typography
4. Font sizes
5. Font weights
6. Line heights
7. Container widths
8. Grid
9. Section spacing
10. Card dimensions
11. Border radius
12. Buttons
13. Badges
14. Icons
15. Images
16. RTL
17. Accessibility
18. Responsive behavior
19. Navigation
20. CTA hierarchy
21. Content hierarchy
22. SEO
23. Performance
24. Component reuse

Identify root causes instead of treating symptoms.

---

# Root Cause Rule

If multiple elements have proportional errors, do not fix each element individually.

Investigate:

- parent dimensions
- container width
- grid width
- scaling
- component instance geometry
- Auto Layout
- responsive constraints
- tokens
- variables

Fix the highest-level root cause first.

---

# No Guessing Rule

If a value is not defined by the Design System:

DO NOT guess.

Instead:
1. identify the missing design decision
2. explain why it matters
3. identify the affected components
4. propose the smallest reasonable design-system addition
5. document it as an ADR if required

---

# Editing Policy

Before making changes:

- inspect the current state
- identify the root cause
- explain what will change
- make the smallest necessary change

Do not redesign working areas merely to make them "better".

Do not modify unrelated components.

Do not change content unless explicitly requested.

Do not change brand colors unless the Design System requires it.

Do not replace working components with new implementations without evidence.

---

# Verification

After every meaningful UI change:

- run the relevant checks
- inspect affected sections
- verify responsive behavior
- verify RTL
- verify typography
- verify spacing
- verify accessibility
- verify no unintended regressions

For visual changes, use screenshots when available.

---

# Completion Standard

The task is NOT complete merely because the UI looks acceptable.

A task is complete only when:

- Design System compliance is verified
- UI/UX hierarchy is verified
- typography is canonical
- spacing is canonical
- geometry is consistent
- RTL is correct
- accessibility is checked
- responsive behavior is checked
- no unexplained arbitrary values remain
- no unrelated regressions were introduced

If something cannot be fixed because of a platform/tool limitation,
document it explicitly instead of pretending it is fixed.