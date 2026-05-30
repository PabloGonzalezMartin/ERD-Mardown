# Changelog

All notable changes to **ERD Markdown** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.0] - 2026-05-29

### Added

- **Crow's foot notation** — Relations now render with proper ERD markers (`||`, `o|`, `o{`, `|{`) at each end; cardinality is configured independently per end in the edit panel
- **Identifying vs non-identifying relations** — Solid line for identifying (child depends on parent), dashed for non-identifying
- **Smart edge routing** — Edges automatically exit from the nearest side of each table (right→left or left→right) based on bounding-box geometry; updates live when tables are dragged
- **Column-anchored edges** — Relations connect from the exact column row rather than the center of the table edge
- **Crow's foot legend** — Click `?` in the sidebar for a full reference of key icons, cardinality endings, line styles and shortcuts
- **Dark / Light theme** — Toggle between dark and light mode; persists across sessions
- **Slim sidebar** — All tools moved to an icon sidebar with flyout panels, freeing canvas space
- **Comment nodes** — Free-floating text annotations with font, color, and background styling; auto-focus on create
- **Implementation status** — Mark tables and columns as `implemented`, `planned`, or `proposed` with visual color tints and badges
- **Unified CSV import** — One CSV covers tables, columns, relations, design notes, and implementation status; paste directly or upload a file; auto-layout fires after import
- **Paste CSV** — Paste CSV text directly into the import dialog without needing a file
- **Column design note indicator** — Columns with a design note show a note icon; click to reveal the note as a popover in the diagram view
- **Relation comment indicator** — Relations with a comment show a note icon on the edge; click to reveal
- **Headers-only mode** — Collapse all tables to headers for a high-level overview
- **Region & comment node styling** — Full color, font, and border control on region group boxes and text comments
- **Search focus** — Search highlights matching columns and dims everything else; relation lines fade
- **Relation focus** — Click a relation to dim all other edges and highlight the connected columns; view centers on the two tables
- **Auto-layout on import** — Tables are arranged automatically after a CSV import

### Changed

- Name mode toggle is now a two-button group (Logical / Physical) instead of a single cycling button
- Auto-layout "Best fit" mode picks the direction that produces the most balanced bounding box rather than a fixed heuristic