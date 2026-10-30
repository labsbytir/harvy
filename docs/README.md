# Harvy documentation

This directory is the current documentation set for the new Harvy repository.

- [PLAN.md](PLAN.md): one canonical delivery plan and status.
- [DEVELOPMENT.md](DEVELOPMENT.md): engineering, data, access, API, AI, and contribution standards.
- [UI_SPEC.md](UI_SPEC.md): website and product UI components, Drizzle Cube integration, and acceptance.
- [BUILD_AGENT_PROMPT.md](BUILD_AGENT_PROMPT.md): copyable agent handoff with continuous local checks.
- [REPO_INDEX.md](REPO_INDEX.md): actual clean-repo contents, target stack, live-resource evidence, and documentation drift.
- [CONNECTOR_PLAN.md](CONNECTOR_PLAN.md): complete source inputs, adoption rules, priority order, and adapter batches.
- [SECURITY_VULNERABILITY_REPORTING.md](SECURITY_VULNERABILITY_REPORTING.md): private vulnerability reporting route.

The moved legacy repository is a reference source. Its older guides are not active instructions here.

## Developer documentation site

The published developer docs are built with Quartz from this `docs/` directory:

```sh
npm run docs:build
```

Start at [[index|Harvy Developer Documentation]], then see [[CODEBASE|Codebase map]], [[API_REFERENCE|API reference]], [[STATUS|Implementation status]], and [[DATASET_ENGINEERING|Dataset engineering]]. The build output is `dist/docs` and the published host is `https://docs.harvy.dev`.
