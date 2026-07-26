#!/usr/bin/env node
/** Canonical trial onboarding URL for maintainer scripts (not user secrets). */
export const TRIAL_ONBOARDING_START_URL =
  process.env.BASER_TRIAL_START_URL?.trim()
  || "https://baser-edge-trial-host.papehiko.workers.dev/start/";
