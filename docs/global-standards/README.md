# Global project standards

This directory contains project-wide standards that apply across implementation
plans, design work, documentation, reviews, and future feature development.

Use this directory as the source of truth for rules that are broader than a
single feature, page, or implementation task. When a change touches an area with
a matching standard, read that standard before designing, editing, or reviewing
the work.

## Directory structure

Standards are grouped by domain. Add new folders when a rule applies across the
project and does not belong to one feature-specific spec.

- `ui/`: UI, UX, visual design, themes, icons, illustrations, motion, and
  page-level layout standards.

## Maintenance rules

Global standards must stay stable, reusable, and domain-focused.

- Put feature-specific requirements in `docs/superpowers/specs/`.
- Put implementation plans in `docs/superpowers/plans/`.
- Put page-level UI descriptions in `docs/ui-pages/`.
- Put cross-cutting project rules in this directory.
- Keep each standard in the most specific domain folder that fits.
- Update `AGENTS.md` only for directory-level guidance, not every individual
  standard file.
