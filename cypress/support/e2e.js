import '@testing-library/cypress/add-commands';

// Custom helper to stub HN RSS feeds
Cypress.Commands.add('stubHnRss', () => {
  const newest = '/cypress/fixtures/hn-newest.xml';
  const front = '/cypress/fixtures/hn-frontpage.xml';
  cy.intercept('GET', 'https://hnrss.org/newest*', { fixture: 'hn-newest.xml' }).as('hnNewest');
  cy.intercept('GET', 'https://hnrss.org/frontpage*', { fixture: 'hn-frontpage.xml' }).as('hnFront');
  // AllOrigins fallback
  cy.intercept('GET', 'https://api.allorigins.win/raw?*hnrss.org/newest*', { fixture: 'hn-newest.xml' }).as('hnNewestAlt');
  cy.intercept('GET', 'https://api.allorigins.win/raw?*hnrss.org/frontpage*', { fixture: 'hn-frontpage.xml' }).as('hnFrontAlt');
});