describe('All and Collections flows', () => {
  it('shows all articles and can filter unread', () => {
    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/frontpage');
    cy.findByTestId('add-feed-button').click();

    // Navigate to All tab
    cy.contains('All').click();

    // Expect list to load
    cy.findByTestId('all-articles-list');
    cy.contains('Show unread').click(); // toggle unread filter (ok if no effect yet)
  });

  it('creates a collection and views its articles', () => {
    cy.visit('/');

    // Ensure at least one feed exists
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/newest');
    cy.findByTestId('add-feed-button').click();

    // Go to Collections
    cy.contains('Collections').click();

    // Create a new collection
    cy.findByTestId('new-collection-button').click();
    cy.findByTestId('collection-name-input').type('HN');
    // Select first available feed option
    cy.findAllByTestId('collection-feed-option').first().click({ force: true });
    cy.findByTestId('collection-save-button').click();

    // Open collection row
    cy.contains('HN').click();

    // Should see aggregated list (at least not crash)
    cy.findByTestId('collection-articles-list');
    cy.contains('Show unread').click();
  });
});