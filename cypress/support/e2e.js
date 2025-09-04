import '@testing-library/cypress/add-commands';

// Custom helper to stub HN RSS feeds
Cypress.Commands.add('stubHnRss', () => {
  const newest = '/cypress/fixtures/hn-newest.xml';
  const front = '/cypress/fixtures/hn-frontpage.xml';
  cy.intercept('GET', 'https://hnrss.org/newest*', { fixture: 'hn-newest.xml' }).as('hnNewest');
  cy.intercept('GET', 'https://hnrss.org/frontpage*', { fixture: 'hn-frontpage.xml' }).as('hnFront');
  // Proxy fallback
  cy.intercept('GET', 'https://go.x2u.in/proxy?*url=https%3A%2F%2Fhnrss.org%2Fnewest*', { fixture: 'hn-newest.xml' }).as('hnNewestAlt');
  cy.intercept('GET', 'https://go.x2u.in/proxy?*url=https%3A%2F%2Fhnrss.org%2Ffrontpage*', { fixture: 'hn-frontpage.xml' }).as('hnFrontAlt');
  // Site homepage for favicon discovery
  cy.intercept('GET', 'https://news.ycombinator.com/', { fixture: 'hn-home.html', headers: { 'content-type': 'text/html' } }).as('hnHome');
  cy.intercept('GET', 'https://go.x2u.in/proxy?*url=https%3A%2F%2Fnews.ycombinator.com*', { fixture: 'hn-home.html', headers: { 'content-type': 'text/html' } }).as('hnHomeAlt');
});