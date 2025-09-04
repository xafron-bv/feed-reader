describe('Feed loading placeholder', () => {
  it('shows a loading row while analyzing a newly added feed', () => {
    cy.stubHnRss();
    // Slow down the frontpage feed response to simulate loading
    cy.intercept('GET', 'https://hnrss.org/frontpage*', { fixture: 'hn-frontpage.xml', delayMs: 800 }).as('hnFrontSlow');
    cy.intercept('GET', 'https://go.x2u.in/proxy?*url=https%3A%2F%2Fhnrss.org%2Ffrontpage*', { fixture: 'hn-frontpage.xml', delayMs: 800 }).as('hnFrontAltSlow');

    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/frontpage');
    cy.findByTestId('add-feed-button').click();

    // Placeholder should appear quickly
    cy.findByTestId('feed-row-loading');

    // After the delayed response resolves, the real row should appear and placeholder disappear
    cy.findAllByTestId('feed-row').first().contains('HN Frontpage');
    cy.findAllByTestId('feed-row-loading').should('have.length', 0);
  });
});

