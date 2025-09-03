describe('HN Newest feed e2e', () => {
  it('adds the HN newest feed and can view articles', () => {
    cy.stubHnRss();
    cy.visit('/');

    // Add the HN newest feed
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/newest');
    cy.findByTestId('add-feed-button').click();

    // Open the newly added feed by clicking inside the row link
    cy.findAllByTestId('feed-row').first().findByTestId('feed-open').click({ force: true });

    // Ensure the articles list appears and has at least one article
    cy.findByTestId('articles-list', { timeout: 15000 });
    cy.findAllByTestId('article-row').first().click();

    // Article view should render with content
    cy.findByTestId('article-view');
  });
});

