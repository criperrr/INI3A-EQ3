/**
 * Presco k6 Combined Multi-Persona User Journeys
 * Simulates concurrent realistic human behavior across three distinct user roles:
 * 1. Anonymous Shoppers: High volume catalog discovery and staple product searches
 * 2. Active Collaborators: Price submissions, outlier validation, and community voting
 * 3. Power Shoppers: Account registration, cosmetics shop exploration, and avatar customization
 */

import anonymousBrowserJourney from './anonymous_browser.js';
import activeCollaboratorJourney from './active_collaborator.js';
import powerShopperJourney from './power_shopper.js';
import { LOAD_THRESHOLDS } from '../config/thresholds.js';

export const options = {
  scenarios: {
    anonymous_browsers: {
      executor: 'constant-vus',
      vus: 4,
      duration: '25s',
      exec: 'runAnonymousBrowser',
    },
    active_collaborators: {
      executor: 'constant-vus',
      vus: 3,
      duration: '25s',
      exec: 'runActiveCollaborator',
    },
    power_shoppers: {
      executor: 'constant-vus',
      vus: 2,
      duration: '25s',
      exec: 'runPowerShopper',
    },
  },
  thresholds: LOAD_THRESHOLDS,
};

export function runAnonymousBrowser() {
  anonymousBrowserJourney();
}

export function runActiveCollaborator() {
  activeCollaboratorJourney();
}

export function runPowerShopper() {
  powerShopperJourney();
}

export default function () {
  anonymousBrowserJourney();
}
