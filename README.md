# Personal Portfolio Site (MkDocs Material)

This repository hosts Zach King's portfolio site built with MkDocs Material. It contains project write-ups, lab notes, and a Street Fighter 6 matchup analytics app rendered as a static site.

## Quick Start

- Install dependencies:
  ```bash
  python -m venv .venv
  ./.venv/Scripts/activate
  pip install -r requirements.txt
  ```
- Serve locally:
  ```bash
  mkdocs serve
  ```
- Build static site:
  ```bash
  mkdocs build
  ```

## Structure

- `docs/` — site content (Markdown), custom JS/CSS, and assets
  - `work/` — portfolio projects (e.g., SF6 Matchup Lab)
  - `lab/` — experiments and notes
  - `javascripts/` — page scripts
  - `stylesheets/` — custom styles
  - `assets/` — images and data used by pages
- `mkdocs.yml` — site configuration and navigation
- `tools/` — local Python scripts used to generate data for the site

## Deployment (Netlify)

Netlify builds are configured via `netlify.toml`:

```toml
[build]
command = "python -m pip install -r requirements.txt && mkdocs build"
publish = "site"

[build.environment]
PYTHON_VERSION = "3.11"
```

Deploy steps:
- Push to `main` on GitHub
- Create a Netlify site from this repo
- Set build command to `python -m pip install -r requirements.txt && mkdocs build`
- Set publish directory to `site`

## Editing

- Use the navigation in `mkdocs.yml` to organize pages.
- To customize the landing page, edit templates under `docs/overrides/`.
- Include small, optimized images under `docs/assets/images/`.

## License

Content is personal portfolio material; please do not reuse without permission.
