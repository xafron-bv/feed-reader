describe('All and Collections flows', () => {
  it('shows all articles and can filter unread', () => {
    cy.stubHnRss();
    cy.visit('/');
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/frontpage');
    cy.findByTestId('add-feed-button').click();

    // Navigate to All via tab button to avoid SSR hydration issues
    cy.contains('All').click();

    cy.findAllByTestId('router_error_message').should('have.length', 0);
    cy.findByTestId('all-articles-list', { timeout: 15000 });
    cy.contains('Show unread').click();
  });

  it('creates a collection and views its articles', () => {
    cy.stubHnRss();
    cy.visit('/');

    // Ensure at least one feed exists
    cy.findByTestId('feed-url-input').clear().type('https://hnrss.org/newest');
    cy.findByTestId('add-feed-button').click();

    // Go to Collections by clicking tab label
    cy.contains('Collections').click();

    // Create a new collection
    cy.findByTestId('new-collection-button').click();
    cy.findByTestId('collection-name-input').type('HN');
    cy.findAllByTestId('collection-feed-option').first().click({ force: true });
    cy.findByTestId('collection-save-button').click();

    // Open first collection row via Pressable
    cy.findAllByTestId('collection-row').first().click();

    cy.findAllByTestId('router_error_message').should('have.length', 0);
    cy.findByTestId('collection-articles-list', { timeout: 15000 });
    cy.contains('Show unread').click();
  });
});